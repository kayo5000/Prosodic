// Local-only opaque identifier for on-device rows (SongContext, Event, etc.).
// Not cryptographically secure and not a real UUID — this app has no
// native crypto module wired up yet, and nothing here needs collision
// resistance beyond "unique within one device's local SQLite file."
// Revisit if these IDs ever need to be globally unique across devices
// (e.g. if two devices create rows offline before their first sync).
export function generateId(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}
