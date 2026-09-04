/**
 * Single choke point for errors that are recovered from rather than
 * surfaced to the user. Swallowing them entirely hides real defects (a
 * failed autosave looks identical to a successful one); throwing would
 * take down a screen over a transient write failure.
 */
export function logError(context: string, error: unknown): void {
  if (typeof __DEV__ !== 'undefined' && __DEV__) {
    console.error(`[prosodic] ${context}:`, error);
  }
}
