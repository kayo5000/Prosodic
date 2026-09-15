/**
 * The engine registry — the seam that makes engines collapsible.
 *
 * Before this, `analyzeLyricsMaster` called six engines by name in a fixed
 * order, hand-assembled their outputs, and computed a composite score from
 * hardcoded weights that referenced five of them directly. Removing one engine
 * produced three compile errors — but fixing those errors left the composite
 * weights summing to 0.85 instead of 1.0, so the "mastery index" silently
 * changed meaning with nothing to catch it. Adding one meant editing six files.
 *
 * Here an engine is a component with a declared interface:
 *
 *   provides  its `id`, and the shape its `run` returns
 *   requires  the ids of engines whose output it reads
 *
 * The runner topologically sorts by `requires`, so call order is derived from
 * declared dependencies rather than from the order somebody typed. A missing
 * dependency or a cycle is an error at run time, not a subtle wrong answer.
 *
 * Adding an engine is appending to a list. Removing one is deleting a line.
 * Neither requires understanding the order the others run in.
 */

export interface EngineContext<TInput> {
  readonly input: TInput;
  /**
   * Outputs of the engines this one declared in `requires`, keyed by id.
   * Reading an engine that was not declared throws rather than returning
   * undefined — an undeclared read is a hidden dependency, which is the exact
   * thing this registry exists to prevent.
   */
  readonly need: <T>(engineId: string) => T;
}

/**
 * An engine as the registry stores it, with its output type erased so engines
 * returning different shapes can live in one list.
 *
 * Do not build one of these by hand — use `defineEngine`, which keeps full
 * type safety at the declaration site and performs the erasure in exactly one
 * place.
 */
export interface EngineDefinition<TInput> {
  /** Stable identifier. Also the key its output is stored under. */
  readonly id: string;
  /** Ids of engines whose output `run` reads. The socket. */
  readonly requires: readonly string[];
  readonly run: (ctx: EngineContext<TInput>) => unknown;
  /**
   * Share of the composite index, 0 for engines that do not contribute.
   * The registry asserts the contributing weights sum to 1, so removing a
   * contributing engine fails loudly instead of quietly rescaling the score.
   */
  readonly compositeWeight: number;
  /** Pulls this engine's 0-100 contribution out of its own output. */
  readonly compositeValue?: (output: never) => number;
}

/**
 * Declares an engine with its real output type checked, then erases that type
 * for storage. The single `as` below is the only unchecked step in the
 * registry, and it is safe because `runEngines` only ever hands an engine's
 * own output back to its own `compositeValue`.
 */
export function defineEngine<TInput, TOutput>(definition: {
  readonly id: string;
  readonly requires: readonly string[];
  readonly run: (ctx: EngineContext<TInput>) => TOutput;
  readonly compositeWeight: number;
  readonly compositeValue?: (output: TOutput) => number;
}): EngineDefinition<TInput> {
  return definition as EngineDefinition<TInput>;
}

export class EngineRegistryError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'EngineRegistryError';
  }
}

export interface EngineRunResult {
  /** Every engine's output, keyed by id. */
  readonly outputs: Readonly<Record<string, unknown>>;
  /** Weighted composite on the engines' own 0-100 scale. */
  readonly composite: number;
  /** The order the engines actually ran in, derived from `requires`. */
  readonly order: readonly string[];
}

/**
 * Orders engines so every dependency runs before its dependent.
 *
 * Deliberately deterministic: ties keep declaration order, so the same
 * registry always produces the same order and a golden-master diff of engine
 * output stays meaningful.
 */
export function resolveOrder<TInput>(
  engines: readonly EngineDefinition<TInput>[],
): string[] {
  const byId = new Map<string, EngineDefinition<TInput>>();
  for (const e of engines) {
    if (byId.has(e.id)) {
      throw new EngineRegistryError(`Duplicate engine id "${e.id}".`);
    }
    byId.set(e.id, e);
  }

  for (const e of engines) {
    for (const dep of e.requires) {
      if (!byId.has(dep)) {
        throw new EngineRegistryError(
          `Engine "${e.id}" requires "${dep}", which is not registered.`,
        );
      }
    }
  }

  const order: string[] = [];
  const state = new Map<string, 'visiting' | 'done'>();

  function visit(id: string, trail: string[]): void {
    const seen = state.get(id);
    if (seen === 'done') return;
    if (seen === 'visiting') {
      throw new EngineRegistryError(
        `Dependency cycle: ${[...trail, id].join(' -> ')}.`,
      );
    }
    state.set(id, 'visiting');
    for (const dep of byId.get(id)!.requires) {
      visit(dep, [...trail, id]);
    }
    state.set(id, 'done');
    order.push(id);
  }

  for (const e of engines) visit(e.id, []);
  return order;
}

/**
 * Checks the composite weights before anything runs.
 *
 * Separated from `runEngines` so a test can assert it without executing any
 * analysis — this is the guard that makes removing an engine a failure rather
 * than a silent change of meaning.
 */
export function assertWeightsSumToOne<TInput>(
  engines: readonly EngineDefinition<TInput>[],
  tolerance = 1e-9,
): void {
  const contributing = engines.filter((e) => e.compositeWeight > 0);
  // A registry where nothing declares a weight has no composite to protect.
  // That is a legitimate configuration — a set of engines can be run purely
  // for their outputs — so there is nothing to assert.
  if (contributing.length === 0) return;

  for (const e of contributing) {
    if (!e.compositeValue) {
      throw new EngineRegistryError(
        `Engine "${e.id}" has a composite weight but no compositeValue to read.`,
      );
    }
  }
  const total = contributing.reduce((sum, e) => sum + e.compositeWeight, 0);
  if (Math.abs(total - 1) > tolerance) {
    throw new EngineRegistryError(
      `Composite weights sum to ${total.toFixed(4)}, not 1. ` +
        'An engine was probably added or removed without rebalancing — leaving ' +
        'this unchecked is how the index silently changes meaning.',
    );
  }
}

export function runEngines<TInput>(
  engines: readonly EngineDefinition<TInput>[],
  input: TInput,
): EngineRunResult {
  assertWeightsSumToOne(engines);
  const order = resolveOrder(engines);
  const byId = new Map(engines.map((e) => [e.id, e]));
  const outputs: Record<string, unknown> = {};

  for (const id of order) {
    const engine = byId.get(id)!;
    const allowed = new Set(engine.requires);
    const ctx: EngineContext<TInput> = {
      input,
      need: <T,>(wanted: string): T => {
        if (!allowed.has(wanted)) {
          throw new EngineRegistryError(
            `Engine "${id}" read "${wanted}" without declaring it in requires. ` +
              'An undeclared read is a hidden dependency and will break the ' +
              'moment either engine moves.',
          );
        }
        return outputs[wanted] as T;
      },
    };
    outputs[id] = engine.run(ctx);
  }

  let composite = 0;
  for (const engine of engines) {
    if (engine.compositeWeight > 0 && engine.compositeValue) {
      composite += engine.compositeWeight * engine.compositeValue(outputs[engine.id] as never);
    }
  }

  return { outputs, composite, order };
}
