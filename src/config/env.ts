export const env = {
  syncApiUrl: process.env.EXPO_PUBLIC_SYNC_API_URL ?? null,
  // KNOWN INSECURE PLACEHOLDER, not a real auth design: EXPO_PUBLIC_* vars
  // are compiled straight into the client bundle, so this is extractable
  // from the app binary by anyone, not just "not secret from other users."
  // It exists only so railwaySyncClient.ts's request shape can be built
  // and tested before a real backend exists. Before sync actually goes
  // live this must become a per-device token issued by the backend (e.g.
  // a one-time device registration exchange), with authorization enforced
  // server-side per device/table — not a value shipped in the bundle.
  syncApiKey: process.env.EXPO_PUBLIC_SYNC_API_KEY ?? null,
};
