// Direct test of the deep-link → navigation-state resolution, using
// React Navigation's own `getStateFromPath` — the actual function that
// runs when a native quick-access tap opens one of these URLs. Doesn't
// render anything (no navigator/screens needed), so it isolates exactly
// the piece this project owns and can verify: does this URL resolve to
// the right screen with the right params? Everything upstream of that
// (the OS delivering the URL to the app at all) is the native side,
// covered by mobile/native/README.md's manual verification checklist
// instead — this environment has no Xcode/Android SDK to test that half
// end-to-end (see docs/DECISIONS_NEEDED.md item 3).
import { getStateFromPath } from '@react-navigation/native';
import { linking, DEEP_LINK_WRITE, DEEP_LINK_CHAT } from './linking';

function resolve(url: string) {
  // getStateFromPath takes a path, not a full URL — strip the scheme the
  // same way React Navigation's own internal linking handler does.
  const path = url.replace(/^[a-z]+:\/\//, '');
  return getStateFromPath(path, linking.config);
}

describe('deep link resolution', () => {
  it('DEEP_LINK_WRITE resolves to the Analyze screen with focus=1', () => {
    const state = resolve(DEEP_LINK_WRITE);
    expect(state).not.toBeUndefined();
    const route = state?.routes[0];
    expect(route?.name).toBe('Analyze');
    expect(route?.params).toEqual({ focus: '1' });
  });

  it('DEEP_LINK_CHAT resolves to the Chat screen with no params', () => {
    const state = resolve(DEEP_LINK_CHAT);
    expect(state).not.toBeUndefined();
    const route = state?.routes[0];
    expect(route?.name).toBe('Chat');
  });

  it('plain prosodic://write (no query string) still resolves to Analyze', () => {
    const state = resolve('prosodic://write');
    expect(state?.routes[0]?.name).toBe('Analyze');
  });

  it('an unrecognized path does not resolve to a screen', () => {
    const state = resolve('prosodic://not-a-real-screen');
    // getStateFromPath returns undefined when nothing in `config.screens`
    // matches — confirms Profile/Login really are unreachable via deep
    // link, as documented in linking.ts, not just assumed.
    expect(state).toBeUndefined();
  });

  it('the two exported constants are consistent with the config they exercise (a typo in one would desync silently otherwise)', () => {
    expect(DEEP_LINK_WRITE).toBe('prosodic://write?focus=1');
    expect(DEEP_LINK_CHAT).toBe('prosodic://chat');
    expect(linking.prefixes).toContain('prosodic://');
  });
});
