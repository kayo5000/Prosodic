// withIosAppIntents.js
//
// Phase 7, docs/BUILD_PLAN.md. Copies native/ios/ProsodicAppIntents.swift
// into the generated Xcode project during `expo prebuild` and registers
// it with the project file (.pbxproj) so it's actually compiled into the
// app target — the AppIntents framework needs no other wiring (no
// extension target, no Info.plist entry; unlike the older SiriKit
// intents-extension pattern, App Intents framework code just needs to be
// part of the main app target).
//
// Plain CommonJS, not TypeScript — same reason as
// withAndroidQuickAccess.js: Expo's plugin loader doesn't resolve a
// `.ts` entry file's own local `.ts` imports, confirmed by running it.
//
// *** UNVERIFIED — see docs/DECISIONS_NEEDED.md item 3. ***
// `npx expo prebuild --platform ios` refuses to run on Windows at all
// (confirmed directly: Expo's own CLI exits with "Run npx expo prebuild
// again from macOS or Linux to generate the iOS project"), so unlike
// withAndroidQuickAccess.js, this plugin has never actually been run
// against a real generated Xcode project in this environment — not the
// file copy, not the .pbxproj registration, nothing. Written against
// @expo/config-plugins' documented mod API and the `xcode` npm package's
// well-established addSourceFile() pattern (the standard approach used
// by many published community plugins for this exact task), but that is
// a "should work" claim, not a "verified" one. First thing to check
// when this reaches a Mac.
const fs = require('fs');
const path = require('path');
const { withDangerousMod, withXcodeProject } = require('expo/config-plugins');

const NATIVE_DIR = path.join(__dirname, '..', 'native', 'ios');
const SOURCE_FILE = 'ProsodicAppIntents.swift';

// Copies the Swift file into ios/<ProjectName>/ — modRequest.projectName
// is @expo/config-plugins' own resolved name for that directory (derived
// from app.json), used instead of hardcoding "Prosodic" so this doesn't
// silently break if the app's display name ever changes.
function withIosAppIntentsFile(config) {
  return withDangerousMod(config, [
    'ios',
    (config) => {
      const iosRoot = config.modRequest.platformProjectRoot;
      const projectName = config.modRequest.projectName;
      if (!projectName) {
        throw new Error(
          'withIosAppIntents: could not resolve modRequest.projectName — ' +
          'expo prebuild output shape may have changed; this plugin needs updating.',
        );
      }
      const destDir = path.join(iosRoot, projectName);
      fs.mkdirSync(destDir, { recursive: true });
      fs.copyFileSync(
        path.join(NATIVE_DIR, SOURCE_FILE),
        path.join(destDir, SOURCE_FILE),
      );
      return config;
    },
  ]);
}

// Registers the copied file with the Xcode project so it's actually
// compiled — a plain file on disk inside ios/<ProjectName>/ is invisible
// to the build unless it's also added to the .pbxproj's main group and
// the app target's "Compile Sources" build phase. project.addSourceFile
// (from the `xcode` package, re-exported through config.modResults here)
// does both in one call.
function withIosAppIntentsProject(config) {
  return withXcodeProject(config, (config) => {
    const project = config.modResults;
    const projectName = config.modRequest.projectName;
    if (!projectName) {
      throw new Error(
        'withIosAppIntents: could not resolve modRequest.projectName — ' +
        'expo prebuild output shape may have changed; this plugin needs updating.',
      );
    }

    const buildFiles = project.hash.project.objects['PBXBuildFile'] || {};
    const alreadyAdded = Object.values(buildFiles).some(
      (entry) => entry && typeof entry === 'object' && entry.fileRef_comment === SOURCE_FILE,
    );

    if (!alreadyAdded) {
      project.addSourceFile(
        `${projectName}/${SOURCE_FILE}`,
        {},
        project.findPBXGroupKey({ name: projectName }),
      );
    }

    return config;
  });
}

function withIosAppIntents(config) {
  config = withIosAppIntentsFile(config);
  config = withIosAppIntentsProject(config);
  return config;
}

module.exports = withIosAppIntents;
