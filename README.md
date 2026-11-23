<div align="center">
  <img src="docs/images/banner.svg" width="870" alt="Yapmod" />
  <h1>Yapmod Mobile</h1>
  <p>Open Yapin on iOS and Android with the Yapmod client and a mobile settings plugin.</p>
  <p>
    <a href="LICENSE"><img src="https://img.shields.io/badge/license-GPL%20v3-blue" alt="GNU GPL v3 license" /></a>
    <img src="https://img.shields.io/badge/Expo-SDK%2058-000020" alt="Expo SDK 58" />
    <img src="https://img.shields.io/badge/React%20Native-0.88-20232a" alt="React Native 0.88" />
    <a href="https://github.com/yapmod/mobile/releases"><img src="https://img.shields.io/github/downloads/yapmod/mobile/total" alt="Total release asset downloads" /></a>
  </p>
</div>

## Install

Download the APK for Android or the IPA for iPhone from GitHub Releases. The iPhone guide walks through signing the IPA with AltStore Classic and refreshing it with a free Apple Account. [Downloads](https://github.com/yapmod/mobile/releases) · [Installation guide](docs/install.md) · [Maintainer release workflow](docs/release.md)

## Signing in

Open Yapmod Mobile and sign in through Yapin. The app opens the same sign-in address as Yapmod Desktop. Email and password sign-in has been confirmed on an iPhone 13 Pro Max running Expo Go 58.0.5, including Yapin’s bot check. Google sign-in, passkeys, and sign-in on Android still need device testing. [Yapin](https://www.yapin.gg/?auth=in)

Yapin manages the session in the WebView’s persistent storage. Reloading Yapin or turning modifications off preserves that storage. Whether a signed-in session survives a full app restart still needs verification.

## Mobile settings

Open **Settings → Yapmod → Mobile** in Yapin to see the app version and open the modification settings. From there you can check the plugin status, toggle modifications, or reload Yapin. Opening and closing settings keeps the current page. Changing the toggle reopens Yapin and saves your choice for the next launch.

If you need to reach the settings before signing in or while the plugin is disabled, touch the view with three fingers. The main screen leaves the available space to Yapin.

### Live notifications

While the Yapin page is running, the Mobile plugin forwards alerts created with the browser Notification API to your phone’s notification center. **This release does not support background push:** new messages won’t generate alerts while the app is suspended or closed. Tapping an existing alert opens the app; Yapin can handle the tap if the original page is still running.

Choose which alerts you want in Yapin. **Settings → Yapmod → Mobile → Mobile notifications** controls delivery on this phone. It’s on by default and stays off if you turn it off. If the phone hasn’t granted permission, tap **Allow notifications** in the Mobile tab. If permission was blocked, tap **Open system settings** instead.

## Microphone and camera permissions

In Expo Go on iOS, the app declines web microphone and camera requests. On Android, Expo Go controls device permissions. Voice and video calls, background audio, lock-screen behavior, and audio device switching still need testing on both platforms.

## Development

Install Git, npm, Node.js 24.15+ on the 24.x line or Node.js 26, and an Expo Go release compatible with SDK 58. Connect the phone and computer to the same network. On iPhone, sign in to the same Expo account in Expo Go and the CLI.

```sh
npm ci
cp .env.example .env
npx expo login
npm start
```

Scan the QR code printed by Metro to open the project on your phone. The default URL is `https://www.yapin.gg/?auth=in`. To use another public HTTPS client address, set `EXPO_PUBLIC_YAPIN_URL` in `.env` and restart Metro. An empty or invalid value displays the configuration screen. Keep credentials and session links out of this public variable.

| Command | Result |
| --- | --- |
| `npm run ios` / `npm run android` | Starts Metro in Expo Go mode and opens the selected local platform. |
| `npm run sync:client` | Refreshes the bundled client from the latest stable GitHub release and verifies its SHA-256 digest. |
| `npm run build:plugin` | Compiles the mobile plugin with `@yapmod/builder`. |
| `npm run check` | Runs strict TypeScript checks, the tests, Expo dependency validation, and Expo Doctor. |
| `npx expo export --platform all` | Produces JavaScript bundles for iOS and Android. |

## Local plugin development

Metro checks the latest stable release of the official Yapmod client when it starts or exports a bundle. It verifies GitHub’s SHA-256 digest for the `yapmod-client.js` asset and keeps a copy in `vendor/yapmod/client.json`. If the release check fails, Metro reports the fallback and uses the previously verified copy. Restart Metro to pick up a new release. An exported app uses the client bundled with that export. [Official client releases](https://github.com/yapmod/client/releases)

On each authorized top-level Yapin document, the bootstrap starts the full client and calls its public `registerClientPlugin` API. The mobile plugin appears under **Settings → Yapmod → Mobile**, alongside the client’s own settings. Its page shows both the mobile app version and the running client version and opens the native modification controls.

Edit `plugin/src/index.tsx` to add a mobile feature. Register settings in `onLoad` with `api.settings.registerSection` and use `@yapmod/ui` components from the shared client runtime. Keep the ID `client:yapmod-mobile` stable so client plugin preferences survive updates. Metro builds the plugin on startup and export. During an existing development session, run the following after editing its source, then reload Yapin to load the updated plugin.

```sh
npm run build:plugin
npm run check
```

The builder emits the plugin expression bundled in `vendor/yapmod/mobile.json`. Both compiled artifacts ship in the repository so development can start from a fresh clone.

## License and artwork

Yapmod Mobile is licensed under the GNU General Public License, version 3. [License](LICENSE)

The project uses the Yapmod Desktop banner and app icon. Expo Go displays the project artwork inside its host app and keeps its own icon on the phone’s home screen. The bundled client and Solid code carry their upstream licenses. [Desktop artwork](https://github.com/yapmod/desktop#license-and-artwork) · [Yapmod client license](vendor/yapmod/LICENSE) · [Solid license](vendor/yapmod/LICENSE.solid-js)

<p align="center">Yapmod Mobile is an independent Yapin community project.</p>
