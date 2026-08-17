// Deep-link config — the shared entry point every native quick-access
// path (iOS App Intents, Android App Actions / Quick Settings Tile) goes
// through. None of those platforms talk to React state directly; they
// all just open a URL, and this is what turns that URL into a real
// in-app navigation. Built and unit-testable entirely in JS — the native
// side (native/ios, native/android) only has to get a URL to the OS,
// this file does the rest.
//
// Phase 7, docs/BUILD_PLAN.md. Scheme ("prosodic://") already registered
// in app.json.
import type { LinkingOptions } from '@react-navigation/native';
import type { RootTabParamList } from './types';

// Exported as plain string constants (not just embedded in `linking`
// below) so native-side documentation/tests can reference the exact
// same values instead of restating them — see native/README.md.
// `?focus=1` on the write link: the whole point of "Quick Write" is
// landing the user typing immediately (Action Button / Siri / Camera
// Control), not one extra tap into the text field after the app opens.
export const DEEP_LINK_WRITE = 'prosodic://write?focus=1';
export const DEEP_LINK_CHAT = 'prosodic://chat';

export const linking: LinkingOptions<RootTabParamList> = {
  prefixes: ['prosodic://'],
  config: {
    screens: {
      // A plain string path — any query string on the incoming URL
      // (e.g. DEEP_LINK_WRITE's `?focus=1`) is parsed into
      // route.params automatically by React Navigation, no extra
      // config needed here. AnalyzeScreen reads params.focus.
      Analyze: 'write',
      Chat: 'chat',
      // Profile/Login intentionally not linkable — that tab's own
      // content is conditional on auth state (see ProfileTab in
      // AppNavigator.tsx), not a fixed destination a quick-access
      // shortcut should assume.
    },
  },
};
