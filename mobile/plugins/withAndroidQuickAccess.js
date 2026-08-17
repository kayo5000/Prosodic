// withAndroidQuickAccess.js
//
// Phase 7, docs/BUILD_PLAN.md. Wires the Android native quick-access
// pieces into the generated `android/` project during `expo prebuild`:
//   - static App Shortcuts (long-press the app icon) — no external
//     registration needed, works the moment the app is installed.
//   - a custom Quick Settings Tile — same, no external registration.
// Android App Actions (Google Assistant integration) deliberately NOT
// included here — see docs/DECISIONS_NEEDED.md item 3 for why (real
// schema ambiguity in Google's own docs plus a Play-Console-gated
// registration/review step that isn't a code problem to solve here).
//
// Plain CommonJS, not TypeScript: Expo's plugin loader transpiles the
// single `.ts` file named in app.json's `plugins` array on the fly, but
// does NOT resolve that file's own local `.ts` imports (confirmed by
// running `expo prebuild` against a first draft written as multi-file
// TypeScript — it failed with "Cannot find module './withAndroid...'"
// even though the entry file itself compiled). Plain `.js` sidesteps
// that entirely — the standard, dependency-free convention for local
// Expo config plugins for exactly this reason.
//
// Verified by actually running this: `npx expo prebuild --platform
// android --no-install` succeeds on this dev machine with no Android
// SDK installed (confirmed directly, not assumed), and the generated
// android/ output was inspected for the exact package path
// (com/prosodic/app, matching app.json's android.package) that the
// file-copy destinations below depend on.
const fs = require('fs');
const path = require('path');
const { withAndroidManifest, withDangerousMod } = require('expo/config-plugins');

const NATIVE_DIR = path.join(__dirname, '..', 'native', 'android');
const TILE_SERVICE_CLASS = 'QuickWriteTileService';
const TILE_SERVICE_PACKAGE = 'com.prosodic.app';

function copyFile(from, to) {
  fs.mkdirSync(path.dirname(to), { recursive: true });
  fs.copyFileSync(from, to);
}

// Copies the Kotlin TileService, the shortcuts.xml capability file, and
// its string resources into the generated project. A "dangerous" mod
// (Expo's own term for "runs arbitrary Node code against the generated
// project directory") is the documented, correct tool for adding new
// source/resource files — the higher-level mods (withAndroidManifest,
// etc.) only edit XML that already exists, they don't place new files.
function withAndroidQuickAccessFiles(config) {
  return withDangerousMod(config, [
    'android',
    (config) => {
      const androidRoot = config.modRequest.platformProjectRoot;
      const javaDir = path.join(
        androidRoot, 'app', 'src', 'main', 'java',
        ...TILE_SERVICE_PACKAGE.split('.'),
      );

      copyFile(
        path.join(NATIVE_DIR, `${TILE_SERVICE_CLASS}.kt`),
        path.join(javaDir, `${TILE_SERVICE_CLASS}.kt`),
      );
      copyFile(
        path.join(NATIVE_DIR, 'res', 'xml', 'shortcuts.xml'),
        path.join(androidRoot, 'app', 'src', 'main', 'res', 'xml', 'shortcuts.xml'),
      );
      copyFile(
        path.join(NATIVE_DIR, 'res', 'values', 'shortcut_strings.xml'),
        path.join(androidRoot, 'app', 'src', 'main', 'res', 'values', 'shortcut_strings.xml'),
      );

      return config;
    },
  ]);
}

// Registers shortcuts.xml on the main activity and declares the
// QuickWriteTileService as a manifest <service>. AndroidManifest.xml
// mod results are a real, typed object (parsed by the `xmlbuilder2`-
// backed AndroidConfig.Manifest utilities) — this is genuinely
// inspectable output, unlike the iOS Xcode-project mod, which is why
// this plugin's changes were verified against a real generated
// AndroidManifest.xml, not written blind.
function withAndroidQuickAccessManifest(config) {
  return withAndroidManifest(config, (config) => {
    const manifest = config.modResults;
    const app = manifest.manifest.application && manifest.manifest.application[0];
    if (!app) {
      throw new Error(
        'withAndroidQuickAccess: no <application> element found in AndroidManifest.xml ' +
        '— expo prebuild output shape may have changed; this plugin needs updating.',
      );
    }

    // 1. Point the main activity at shortcuts.xml.
    const mainActivity = (app.activity || []).find(
      (a) => a.$ && a.$['android:name'] === '.MainActivity',
    );
    if (!mainActivity) {
      throw new Error(
        'withAndroidQuickAccess: .MainActivity not found in AndroidManifest.xml ' +
        '— expo prebuild output shape may have changed; this plugin needs updating.',
      );
    }
    mainActivity['meta-data'] = mainActivity['meta-data'] || [];
    const hasShortcutsMeta = mainActivity['meta-data'].some(
      (m) => m.$ && m.$['android:name'] === 'android.app.shortcuts',
    );
    if (!hasShortcutsMeta) {
      mainActivity['meta-data'].push({
        $: {
          'android:name': 'android.app.shortcuts',
          'android:resource': '@xml/shortcuts',
        },
      });
    }

    // 2. Declare the Quick Settings Tile service.
    app.service = app.service || [];
    const serviceName = `.${TILE_SERVICE_CLASS}`;
    const hasService = app.service.some((s) => s.$ && s.$['android:name'] === serviceName);
    if (!hasService) {
      app.service.push({
        $: {
          'android:name': serviceName,
          'android:exported': 'true',
          'android:icon': '@mipmap/ic_launcher',
          'android:label': '@string/shortcut_write_short_label',
          'android:permission': 'android.permission.BIND_QUICK_SETTINGS_TILE',
        },
        'intent-filter': [
          {
            action: [
              { $: { 'android:name': 'android.service.quicksettings.action.QS_TILE' } },
            ],
          },
        ],
      });
    }

    return config;
  });
}

function withAndroidQuickAccess(config) {
  config = withAndroidQuickAccessFiles(config);
  config = withAndroidQuickAccessManifest(config);
  return config;
}

module.exports = withAndroidQuickAccess;
