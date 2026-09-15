import { CANONICAL_METRIC_DEFINITIONS } from '../data/canonicalMetrics';
import { declaredMetricIds } from './measurability';

/**
 * Adding a metric means editing three files by hand: `canonicalMetrics.ts`
 * declares it, `measurability.ts` says what input it needs, and
 * `calibration.ts` computes it. Nothing connected them, so they drifted — ten
 * canonical metrics had no measurability rule and could never be measured,
 * only declared.
 *
 * Nothing failed when that happened, which is the problem. The gate returns
 * `no_requirement_declared` and the metric quietly comes back absent forever.
 * A developer adds a metric, forgets the second file, and gets no error — just
 * a number that never appears.
 *
 * This test is the missing link. Drift is now a red build.
 */

const KNOWN_UNIMPLEMENTED = new Set<string>([
  // Declared in the canonical namespace ahead of the engines that will produce
  // them. Each needs a measurability rule at the moment it gains a real
  // implementation — until then it is deliberately absent, not forgotten.
  'audio.instrumental_pocket_alignment',
  'device.alliteration',
  'device.anadiplosis',
  'device.anaphora',
  'mastery.dynamic_range',
  'mastery.endurance_stability',
  'rhyme.chain_span',
  'rhyme.mosaic_rate',
  'rhyme.vocabulary_recycling_rate',
]);

describe('canonical namespace and measurability stay in step', () => {
  const canonicalIds = new Set(CANONICAL_METRIC_DEFINITIONS.map((m) => m.metricId));
  const measurableIds = declaredMetricIds();

  test('every measurability rule points at a real canonical metric', () => {
    const orphans = [...measurableIds].filter((id) => !canonicalIds.has(id));
    expect(orphans).toEqual([]);
  });

  test('every canonical metric either has a rule or is on the known-unimplemented list', () => {
    const missing = [...canonicalIds].filter(
      (id) => !measurableIds.has(id) && !KNOWN_UNIMPLEMENTED.has(id),
    );
    expect(missing).toEqual([]);
  });

  /**
   * Keeps the allow-list honest. Once a metric gains a real rule it must come
   * off this list, or the list slowly becomes a place to hide new drift.
   */
  test('nothing on the known-unimplemented list has quietly been implemented', () => {
    const stale = [...KNOWN_UNIMPLEMENTED].filter((id) => measurableIds.has(id));
    expect(stale).toEqual([]);
  });

  test('the known-unimplemented list only names metrics that actually exist', () => {
    const ghosts = [...KNOWN_UNIMPLEMENTED].filter((id) => !canonicalIds.has(id));
    expect(ghosts).toEqual([]);
  });
});
