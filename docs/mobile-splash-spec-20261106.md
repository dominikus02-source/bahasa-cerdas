# Splash screen BahasaCerdas — implementation contract

## Brand assets
Use the approved BC 2026 asset registry at `lib/brand.ts`. App icon: `/brand/bc2026-appicon.png`; light background icon: `/brand/bc2026-icon-dark.png`; dark background icon: `/brand/bc2026-icon.png`. Do not use the concept mockup as a logo.

## Android
Inspect the existing Android TWA project and manifest before edits. Configure Android 12+ SplashScreen API or the TWA launcher theme with the official app icon, neutral background, and no unnecessary artificial delay. Ensure adaptive launcher icon, monochrome icon (where supported), density assets, and edge-to-edge system-bar contrast. Validate startup on cold/warm launch, offline, and OAuth return.

## iOS
After identifying the iOS implementation technology, configure launch storyboard/splash asset with the same BC logo, light/dark appearance, safe areas, and app display name. No claim of iOS support until build tooling is verified.

## Startup state machine
1. OS splash is visible while application initializes.
2. Existing auth/session check runs; never put credentials or role data in splash.
3. Valid session -> authorized dashboard using existing role/founder resolver.
4. No session -> shared login page.
5. Network/auth error -> recoverable state, never silently impersonate a role.
6. Deep links (JUMPA invites) and OAuth callbacks retain validated `next` destinations.

## Visual QA
Test 320px, 360px, 390px, 430px widths, keyboard open, 200% font scaling, dark mode, landscape, Android back navigation, Google OAuth, and reset password. No splash-loop or forced login on every launch.

## Release constraint
Do not replace existing TWA launch route until the exact APK package and start URL have been verified. This document is a requirement, not evidence of a native splash implementation.
