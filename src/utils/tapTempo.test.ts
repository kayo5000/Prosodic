import { TapTempoCalculator } from './tapTempo';

describe('TapTempoCalculator', () => {
  let tapper: TapTempoCalculator;

  beforeEach(() => {
    tapper = new TapTempoCalculator();
  });

  it('returns null on single tap', () => {
    expect(tapper.recordTap(1000)).toBeNull();
    expect(tapper.getTapCount()).toBe(1);
  });

  it('calculates 90 BPM accurately with 666.7ms tap intervals', () => {
    tapper.recordTap(1000);
    tapper.recordTap(1667); // delta ~667ms
    const bpm = tapper.recordTap(2334); // delta ~667ms

    expect(bpm).toBe(90);
    expect(tapper.getTapCount()).toBe(3);
  });

  it('calculates 120 BPM accurately with 500ms intervals', () => {
    tapper.recordTap(0);
    tapper.recordTap(500);
    tapper.recordTap(1000);
    const bpm = tapper.recordTap(1500);

    expect(bpm).toBe(120);
  });

  it('resets tap history if time gap exceeds 2500ms', () => {
    tapper.recordTap(1000);
    tapper.recordTap(1500); // 120 bpm

    // Pause for 3000ms
    const afterPause = tapper.recordTap(4500);
    expect(afterPause).toBeNull(); // starts fresh
    expect(tapper.getTapCount()).toBe(1);
  });

  it('clamps extreme BPM values to 40 - 240 range', () => {
    // Ultra fast taps (50ms interval = 1200 bpm)
    tapper.recordTap(1000);
    const fastBpm = tapper.recordTap(1050);
    expect(fastBpm).toBe(240);

    // Reset and ultra slow
    tapper.reset();
    tapper.recordTap(1000);
    const slowBpm = tapper.recordTap(3000); // 2000ms = 30 bpm
    expect(slowBpm).toBe(40);
  });
});
