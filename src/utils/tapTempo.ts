/**
 * Tap-Tempo calculation utility.
 * Calculates average BPM based on consecutive user tap intervals.
 */

const TAP_RESET_TIMEOUT_MS = 2500; // Reset tap sequence if gap exceeds 2.5 seconds
const MAX_TAP_HISTORY = 6; // Keep up to 6 recent taps for responsive, stable averaging

export class TapTempoCalculator {
  private tapTimestamps: number[] = [];

  /**
   * Records a tap and returns the computed BPM if at least 2 taps are recorded.
   * Resets automatically if user pauses for more than 2.5 seconds.
   */
  public recordTap(now: number = Date.now()): number | null {
    if (this.tapTimestamps.length > 0) {
      const lastTap = this.tapTimestamps[this.tapTimestamps.length - 1];
      if (now - lastTap > TAP_RESET_TIMEOUT_MS) {
        this.tapTimestamps = [];
      }
    }

    this.tapTimestamps.push(now);
    if (this.tapTimestamps.length > MAX_TAP_HISTORY) {
      this.tapTimestamps.shift();
    }

    if (this.tapTimestamps.length < 2) {
      return null;
    }

    // Calculate intervals between consecutive taps
    const intervals: number[] = [];
    for (let i = 1; i < this.tapTimestamps.length; i += 1) {
      intervals.push(this.tapTimestamps[i] - this.tapTimestamps[i - 1]);
    }

    const averageIntervalMs = intervals.reduce((a, b) => a + b, 0) / intervals.length;
    if (averageIntervalMs <= 0) return null;

    const rawBpm = (60 * 1000) / averageIntervalMs;
    // Clamp to standard musical tempo range 40 - 240
    return Math.max(40, Math.min(240, Math.round(rawBpm)));
  }

  public reset(): void {
    this.tapTimestamps = [];
  }

  public getTapCount(): number {
    return this.tapTimestamps.length;
  }
}
