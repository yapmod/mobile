# Install Yapmod Mobile on your phone

Open the release on your phone, expand **Assets**, and download the file for your platform. Android uses the **.apk**. iPhone uses the **.ipa** plus a signing tool. Both contain the app and the Yapmod client. You can close your computer after installation and use the app with an internet connection to Yapin. [Yapmod Mobile releases](https://github.com/yapmod/mobile/releases)

## Android

Use a phone running Android 7 or later.

1. Download **Yapmod-Mobile-vX.Y.Z.apk** and open it from your browser’s downloads or the Files app.
2. If Android asks for permission, tap **Settings**, enable **Allow from this source** for the app that opened the APK, then go back. On older Android versions the setting is called **Unknown sources**. A managed device or regional Android verification policy may restrict installation. Follow the instructions shown by your device.
3. Tap **Install**, then **Open** and sign in to Yapin. You can turn off **Allow from this source** afterward.

To update, open the APK from a newer release and accept **Update**. Android preserves app data when the package ID and signing certificate match. If Android reports a conflicting package, check where the existing copy came from before uninstalling it. Uninstalling clears local settings and sign-in data. [Android installation help](https://support.google.com/android/answer/9457058)

## iPhone with AltStore Classic

Use an iPhone running iOS 16.4 or later, a Mac or Windows computer, and your Apple Account. The IPA contains a device build. AltStore Classic signs it for your phone.

1. Install **AltServer** on the computer. Connect and unlock your iPhone, tap **Trust** when prompted, then use AltServer’s **Install AltStore** menu to select the phone. Follow the instructions for your computer, including Apple’s Windows dependencies where applicable. [macOS setup](https://faq.altstore.io/altstore-classic/how-to-install-altstore-macos) · [Windows setup](https://faq.altstore.io/altstore-classic/how-to-install-altstore-windows)
2. On the phone, trust your Apple Account under **Settings → General → VPN & Device Management** if prompted. Enable **Settings → Privacy & Security → Developer Mode**, restart, and confirm when iOS asks. [Apple’s Developer Mode guide](https://developer.apple.com/documentation/xcode/enabling-developer-mode-on-a-device)
3. Save **Yapmod-Mobile-vX.Y.Z.ipa** in **Files**. With AltServer running and reachable, open **AltStore Classic → My Apps → +**, select the IPA, and sign in with the same Apple Account if prompted.
4. When Yapmod Mobile appears in **My Apps**, launch it from the Home Screen and sign in to Yapin.

With a free Apple Account, provisioning normally lasts seven days. Open **My Apps → Refresh All** while AltServer is reachable before the apps expire. Use USB or enable Wi-Fi sync and keep both devices on the same network. If AltStore expires, reinstall it through AltServer and refresh Yapmod Mobile. For an update, import the newer IPA using the same account and keep the existing app installed to preserve its data. [AltStore Classic app management](https://faq.altstore.io/altstore-classic/your-altstore)

## Verify a download

Each release includes **SHA256SUMS.txt**. Compare the entry for your filename with the output of `shasum -a 256 <file>` on macOS, `sha256sum <file>` on Linux, or `Get-FileHash <file> -Algorithm SHA256` in PowerShell.
