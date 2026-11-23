# Releasing Yapmod Mobile

A push to main refreshes one release PR. Its changelog and version are the approval point. Merging it creates a stable tag and a GitHub draft, builds the APK and IPA from that tag, uploads both files with SHA-256 checksums, publishes the release, and announces it on Yapin. The workflow uses GitHub-hosted Ubuntu and macOS runners. Expo SDK 58 requires Android SDK 37 and Xcode 26.4 or later. A private repository consumes the account’s Actions allowance and restricts release downloads to readers of the repository. [Expo SDK platform requirements](https://docs.expo.dev/versions/v58.0.0/#support-for-android-and-ios-versions)

## Configure once

Enable **Settings → Actions → General → Allow GitHub Actions to create and approve pull requests**. The release workflow uses the repository’s automatic token and explicitly dispatches checks on the rolling PR and packaging on main.

Generate the permanent Android signing key on a trusted computer with a JDK. Keep the keystore outside the checkout and back it up together with its password. Android uses this identity to authorize every in-place update.

```sh
keytool -genkeypair -keystore yapmod-mobile.p12 -storetype PKCS12 \
  -alias yapmod-mobile -keyalg RSA -keysize 3072 -validity 10000
base64 < yapmod-mobile.p12 | tr -d '\n' | gh secret set ANDROID_KEYSTORE_BASE64 --repo yapmod/mobile
gh secret set ANDROID_STORE_PASSWORD --repo yapmod/mobile
gh secret set ANDROID_KEY_ALIAS --repo yapmod/mobile --body yapmod-mobile
gh secret set ANDROID_KEY_PASSWORD --repo yapmod/mobile
```

Enter the PKCS12 password at both password prompts for GitHub. The iPhone build uses the device SDK and packages the Release app under `Payload/` for the recipient to sign. CI requires no Apple account, certificate, or provisioning profile.

Set the Actions secret `YAPIN_RELEASE_WEBHOOK_URL` and the variable `YAPIN_RELEASE_ROLE_ID` to the webhook and role used for release announcements. The embed links to the tagged installation guide and the GitHub release. For public repositories the workflow generates the desktop-style mobile PNG in `.github/announcement`, commits it to the dedicated `release-banners` branch, and embeds its commit-pinned URL. For private repositories it omits the image because Yapin cannot fetch authenticated raw GitHub files.

## Prepare a release

1. Put user-facing bullets under **Unreleased** in [the changelog](../CHANGELOG.md). Use Conventional Commit titles on main or on squash merges. After the first release, `fix:` requests a patch, `feat:` a minor, and a breaking change a major.
2. Review the rolling release PR. It moves the approved notes under a dated heading, updates the release manifest and npm versions, and clears Unreleased. The first proposal uses **0.1.0**. Empty notes produce no proposal. Edit pending notes on main so future refreshes keep them.
3. Merge the release PR to ship. Follow **Actions → Release mobile**. The builds verify the client bundled at the tag. Both share the app identifier `app.yapmod.mobile` and derive their native version from the npm version. The Android job verifies the final APK’s certificate. The iOS job checks the device platform, app identity, version, and embedded JavaScript before packaging.
4. Check **Assets** for the APK, IPA, and **SHA256SUMS.txt**. On each platform, install the first release on a phone, sign in, close and reopen the app, and check foreground notifications. For later releases, install over the previous release and verify the session and settings survive. [Installation guide](install.md)

## Recover a release

If proposal creation fails, fix the reported permissions or changelog issue and rerun **Release Please** on main. If the tag and draft already exist, fix the runner or signing configuration and retry the failed jobs, or dispatch the same tag again.

```sh
gh workflow run mobile.yml --ref main -f tag=v0.1.0
```

Use the actual approved tag. A failed build leaves the release in draft. A retry replaces partial draft uploads and skips an already-published release. Correct shipped code with a new version. If only the announcement fails, rerun its failed job. The webhook uses the run ID as a retry nonce. Check the channel after a timeout before manually dispatching **Announce release on Yapin**, which sends a new message.
