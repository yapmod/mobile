# Mobile verification · November 22, 2026

| Check | Result |
| --- | --- |
| Email and password sign-in | The tester confirmed successful sign-in on an iPhone 13 Pro Max in Expo Go 58.0.5 after the frame navigation fix. |
| Login page | The desktop entry URL opens the official password form in a fresh Chromium profile. A sign-in attempt with a nonexistent account reached the authentication service and received the expected rejection. |
| Bot check | On iPhone, WebKit reported Cloudflare child frames and inline documents during sign-in. The app now allows HTTPS, `about:blank`, and `about:srcdoc` child documents. The bridge continues to validate the native source URL and channel. |
| Plugin startup | On the live site, the bundled plugin sent `ready` and `active` to a browser test transport. On the iPhone, Metro served the iOS bundle and the app received the active status through the WebView bridge. |
| Automated checks | Strict TypeScript, five tests, Expo dependency validation, and all 20 Expo Doctor checks passed. Tests cover origins, message validation, child frames, duplicate startup, settings registration, cleanup, and reactivation. |
| Platform coverage | JavaScript bundles exported for both platforms. Android device execution remains untested. |

## Remaining device checks

1. Open the project in Expo Go. Check keyboard and safe-area behavior, load the page offline, restore connectivity, and retry.
2. In a signed-in account, open **Settings → Yapmod → Mobile**. Open and close the modification settings and verify that Yapin stays on the current page.
3. Turn modifications off. Confirm the Mobile section disappears, restart the app, and use the three-finger gesture to enable it again. Verify the recovery gesture on each platform.
4. Reload twice and check for a single Mobile section. Follow an external link, open a new window, and exercise Android’s Back button. Verify that an authenticated session persists after a full restart. Test Google sign-in and passkeys separately.
5. In a dedicated build, test denying and granting microphone and camera access. With two participants, verify outgoing and incoming audio in the foreground, after switching apps, while the screen is locked, after resuming, and after connecting or disconnecting a headset. Each call scenario is untested.
