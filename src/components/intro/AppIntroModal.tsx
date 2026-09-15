interface AppIntroModalProps {
  onDismiss: () => void;
}

/**
 * Native iOS/Android fallback stub.
 * Keeps Remotion DOM player strictly on web to prevent native bundler regressions.
 */
export function AppIntroModal(_props: AppIntroModalProps) {
  return null;
}
