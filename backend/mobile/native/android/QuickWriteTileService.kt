package com.prosodic.app

// QuickWriteTileService.kt
//
// Custom Quick Settings Tile — Phase 7, docs/BUILD_PLAN.md. Tapping it
// launches the app straight to the Analyze screen with the verse input
// focused, via the same `prosodic://write?focus=1` deep link the iOS
// App Intents and Android static shortcuts use (see
// mobile/src/navigators/linking.ts — the one place that URL contract is
// actually defined and unit-tested).
//
// This is a launcher tile, not a state tile (unlike WiFi/Bluetooth-style
// tiles that reflect and toggle ongoing device state) — it has nothing
// to monitor, so onStartListening()/onStopListening() are left at their
// no-op defaults and the manifest registration (see native/README.md)
// deliberately omits ACTIVE_TILE/TOGGLEABLE_TILE metadata, which is for
// the other kind of tile.
//
// UNVERIFIED IN THIS ENVIRONMENT — no Android SDK/Gradle here (confirmed
// via `which adb`/`which gradle` and an Android SDK directory search,
// logged in docs/DECISIONS_NEEDED.md item 3). Written against Android's
// current TileService documentation; not compiled or run.

import android.app.PendingIntent
import android.content.Intent
import android.net.Uri
import android.service.quicksettings.TileService

class QuickWriteTileService : TileService() {

    override fun onClick() {
        super.onClick()

        val intent = Intent(Intent.ACTION_VIEW, Uri.parse("prosodic://write?focus=1")).apply {
            // The tile lives in a separate system-UI process — without
            // NEW_TASK, ACTION_VIEW from here either silently fails to
            // launch or (on some OEM skins) throws, since there's no
            // existing task/activity stack this call is already part of.
            flags = Intent.FLAG_ACTIVITY_NEW_TASK
        }

        val pendingIntent = PendingIntent.getActivity(
            this,
            0,
            intent,
            PendingIntent.FLAG_IMMUTABLE,
        )

        // startActivityAndCollapse(PendingIntent) is the current (API 34+)
        // API — the Intent-argument overload of the same method was
        // deprecated in API 34 in favor of this one. This app's Android
        // compileSdkVersion is 36 (SDK 57's default — see
        // docs/BUILD_PLAN.md Phase 7 for where that number came from),
        // so targeting the current API rather than the deprecated one is
        // the correct call, not a guess.
        startActivityAndCollapse(pendingIntent)
    }
}
