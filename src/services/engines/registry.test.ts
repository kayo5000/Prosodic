import { LYRIC_ENGINES } from './lyricEngines';
import {
  assertWeightsSumToOne,
  defineEngine,
  type EngineDefinition,
  resolveOrder,
  runEngines,
} from './registry';

interface TestInput {
  readonly value: number;
}

const engine = (
  id: string,
  requires: readonly string[] = [],
  weight = 0,
  run: (need: <T>(id: string) => T, input: TestInput) => unknown = () => id,
): EngineDefinition<TestInput> =>
  defineEngine<TestInput, unknown>({
    id,
    requires,
    compositeWeight: weight,
    compositeValue: weight > 0 ? () => 100 : undefined,
    run: (ctx) => run(ctx.need, ctx.input),
  });

describe('engine registry', () => {
  describe('ordering is derived from declared dependencies, not declaration order', () => {
    test('a dependency always runs before its dependent', () => {
      // 'b' is declared first but depends on 'a', so 'a' must still run first.
      const order = resolveOrder<TestInput>([engine('b', ['a']), engine('a')]);
      expect(order.indexOf('a')).toBeLessThan(order.indexOf('b'));
    });

    test('independent engines keep declaration order, so runs stay reproducible', () => {
      const order = resolveOrder<TestInput>([engine('x'), engine('y'), engine('z')]);
      expect(order).toEqual(['x', 'y', 'z']);
    });

    test('a cycle is an error, naming the loop', () => {
      expect(() =>
        resolveOrder<TestInput>([engine('a', ['b']), engine('b', ['a'])]),
      ).toThrow(/cycle/i);
    });

    test('requiring an engine that is not registered is an error', () => {
      expect(() => resolveOrder<TestInput>([engine('a', ['ghost'])])).toThrow(
        /requires "ghost"/,
      );
    });

    test('two engines cannot share an id', () => {
      expect(() => resolveOrder<TestInput>([engine('a'), engine('a')])).toThrow(/Duplicate/);
    });
  });

  /**
   * The point of the whole file. Removing an engine used to produce three
   * compile errors, and fixing those left the composite weights summing to
   * 0.85 — the index silently changed meaning with nothing to catch it.
   */
  describe('removing an engine fails loudly instead of changing the score', () => {
    test('weights that no longer sum to 1 are rejected before anything runs', () => {
      const full = [engine('a', [], 0.6), engine('b', [], 0.4)];
      expect(() => assertWeightsSumToOne(full)).not.toThrow();

      const withOneRemoved = full.slice(0, 1); // sums to 0.6
      expect(() => assertWeightsSumToOne(withOneRemoved)).toThrow(/sum to 0\.6000, not 1/);
    });

    test('a weighted engine with no way to read its value is rejected', () => {
      const broken = defineEngine<TestInput, unknown>({
        id: 'broken',
        requires: [],
        compositeWeight: 1,
        run: () => 1,
      });
      expect(() => assertWeightsSumToOne([broken])).toThrow(/no compositeValue/);
    });
  });

  describe('dependencies must be declared to be readable', () => {
    test('a declared dependency is handed over', () => {
      const result = runEngines<TestInput>(
        [
          engine('base', [], 0, (_need, input) => input.value * 2),
          engine('derived', ['base'], 0, (need) => need<number>('base') + 1),
        ],
        { value: 5 },
      );
      expect(result.outputs.derived).toBe(11);
    });

    test('reading an undeclared engine throws rather than returning undefined', () => {
      expect(() =>
        runEngines<TestInput>(
          [engine('base'), engine('sneaky', [], 0, (need) => need('base'))],
          { value: 1 },
        ),
      ).toThrow(/without declaring it in requires/);
    });
  });

  test('the composite is the weighted sum of each engine reading its own output', () => {
    const result = runEngines<TestInput>(
      [engine('a', [], 0.25), engine('b', [], 0.75)],
      { value: 0 },
    );
    expect(result.composite).toBeCloseTo(100, 6); // both stubs report 100
  });
});

describe('the real lyric engine registry', () => {
  test('its composite weights sum to 1', () => {
    expect(() => assertWeightsSumToOne(LYRIC_ENGINES)).not.toThrow();
  });

  test('it has no cycles and every dependency is registered', () => {
    expect(() => resolveOrder(LYRIC_ENGINES)).not.toThrow();
  });

  /**
   * The cross-engine dependency that used to be invisible — it lived in the
   * order two `const` lines happened to appear in, which is why removing
   * `concreteness` broke a block that never mentioned it by name.
   */
  test('aspirationGap declares the two engines it actually reads', () => {
    const gap = LYRIC_ENGINES.find((e) => e.id === 'aspirationGap');
    expect(gap?.requires).toEqual(expect.arrayContaining(['dissection', 'concreteness']));
  });

  test('every engine id is unique and non-empty', () => {
    const ids = LYRIC_ENGINES.map((e) => e.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(ids.every((id) => id.length > 0)).toBe(true);
  });
});
