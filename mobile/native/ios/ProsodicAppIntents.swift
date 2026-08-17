//
//  ProsodicAppIntents.swift
//  Prosodic
//
//  Native quick-access entry points — Phase 7, docs/BUILD_PLAN.md.
//
//  This app is React Native/Expo, not a native SwiftUI app, so these
//  intents don't call into any Prosodic business logic directly. Each
//  one's entire job is: bring the app to the foreground and open a
//  `prosodic://` URL, which mobile/src/navigators/linking.ts (already
//  built and unit-tested — see linking.test.ts) turns into a real
//  in-app navigation. That URL scheme is the ONLY contract between this
//  file and the JS side — verified real by inspecting the actual
//  generated AndroidManifest.xml's `<data android:scheme="prosodic"/>`
//  intent-filter during a real `expo prebuild` run in this repo, not
//  assumed from Expo's docs alone.
//
//  Requires iOS 16+ (the AppIntents framework). This app's Expo SDK 57
//  deployment target is already iOS 16.4+, so no extra deployment-target
//  bump was needed for this file specifically.
//
//  Once an AppShortcutsProvider is registered (below), these become
//  eligible for Siri, Spotlight, Control Center, and — the two surfaces
//  actually named in this phase's brief — the Action Button (iPhone 15
//  Pro and later) and Camera Control (iPhone 16 and later), both of
//  which let the user assign any eligible App Shortcut from Settings.
//  AssistiveTouch doesn't have its own App Intents API to opt into —
//  it's a system accessibility feature that can be configured to open
//  ANY app or run ANY Shortcut (including one built from these intents
//  via the Shortcuts app), so no additional code is needed on this side
//  for that surface; see native/README.md's verification checklist.
//
//  UNVERIFIED IN THIS ENVIRONMENT — no Xcode here (confirmed via `which
//  xcodebuild`/`which swift`, logged in docs/DECISIONS_NEEDED.md item
//  3). This file has not been compiled or run. Written against Apple's
//  current AppIntents documentation, and structured so a real build
//  failure (if any) should be a small, localized fix, not a rewrite —
//  but "written correctly" and "verified correct" are different claims,
//  and this is only the first one.
//

import AppIntents
import UIKit

/// Thrown if a URL literal below is somehow malformed. Should never
/// actually happen — these are hardcoded strings — but AppIntent's
/// `perform()` can throw, and force-unwrapping a URL(string:) instead
/// would be a real (if unlikely) crash risk for no benefit.
enum ProsodicIntentError: Error, CustomLocalizedStringResourceConvertible {
    case invalidDeepLink

    var localizedStringResource: LocalizedStringResource {
        switch self {
        case .invalidDeepLink:
            return "Prosodic couldn't open — try opening the app directly."
        }
    }
}

/// Opens the app straight to the Analyze screen with the verse input
/// focused — see mobile/src/navigators/linking.ts's DEEP_LINK_WRITE.
/// The single most-requested quick-access action: from a cold start or
/// background, one tap should land the user typing, not one tap into
/// the app followed by a second tap into the text field.
struct QuickWriteIntent: AppIntent {
    static var title: LocalizedStringResource = "Quick Write"
    static var description = IntentDescription(
        "Opens Prosodic straight to a new verse, ready to type."
    )

    // Bring the app to the foreground before perform() runs, rather than
    // running headlessly — there's nothing for this intent to do without
    // the app's own UI.
    static var openAppWhenRun: Bool = true

    @MainActor
    func perform() async throws -> some IntentResult {
        guard let url = URL(string: "prosodic://write?focus=1") else {
            throw ProsodicIntentError.invalidDeepLink
        }
        await UIApplication.shared.open(url)
        return .result()
    }
}

/// Opens the app straight to the VEIL chat screen — see
/// mobile/src/navigators/linking.ts's DEEP_LINK_CHAT.
struct QuickChatIntent: AppIntent {
    static var title: LocalizedStringResource = "Ask VEIL"
    static var description = IntentDescription(
        "Opens Prosodic straight to a VEIL chat."
    )

    static var openAppWhenRun: Bool = true

    @MainActor
    func perform() async throws -> some IntentResult {
        guard let url = URL(string: "prosodic://chat") else {
            throw ProsodicIntentError.invalidDeepLink
        }
        await UIApplication.shared.open(url)
        return .result()
    }
}

/// Registers both intents as App Shortcuts — this is what makes them
/// show up in Siri suggestions, Spotlight, and the Settings screens for
/// assigning an action to the Action Button / Camera Control.
/// "<app-name>" is a real AppIntents placeholder token Apple's own
/// framework substitutes with the app's display name at parse time, not
/// a mistake or a TODO.
struct ProsodicShortcuts: AppShortcutsProvider {
    static var appShortcuts: [AppShortcut] {
        AppShortcut(
            intent: QuickWriteIntent(),
            phrases: [
                "Quick write in \(.applicationName)",
                "Start writing in \(.applicationName)",
                "New verse in \(.applicationName)",
            ],
            shortTitle: "Quick Write",
            systemImageName: "pencil.line"
        )
        AppShortcut(
            intent: QuickChatIntent(),
            phrases: [
                "Ask VEIL in \(.applicationName)",
                "Chat with VEIL in \(.applicationName)",
            ],
            shortTitle: "Ask VEIL",
            systemImageName: "bubble.left.and.bubble.right"
        )
    }
}
