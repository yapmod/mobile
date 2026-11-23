#!/usr/bin/env bash
set -euo pipefail
: "${ANDROID_KEYSTORE_BASE64:?Missing Android release keystore}"
: "${ANDROID_STORE_PASSWORD:?Missing store password}"
: "${ANDROID_KEY_ALIAS:?Missing key alias}"
: "${ANDROID_KEY_PASSWORD:?Missing key password}"
work=$(mktemp -d)
trap 'rm -rf "$work"' EXIT
printf '%s' "$ANDROID_KEYSTORE_BASE64" | base64 --decode > "$work/release.keystore"
tools="$ANDROID_HOME/build-tools/37.0.0"
mkdir -p deliverables
apk="deliverables/Yapmod-Mobile-$RELEASE_TAG.apk"
# Replace the Expo template signature on the aligned universal release APK.
"$tools/apksigner" sign --ks "$work/release.keystore" --ks-key-alias "$ANDROID_KEY_ALIAS" \
  --ks-pass env:ANDROID_STORE_PASSWORD --key-pass env:ANDROID_KEY_PASSWORD \
  --v4-signing-enabled false --out "$apk" android/app/build/outputs/apk/release/app-release.apk
"$tools/apksigner" verify --verbose --print-certs "$apk" > "$work/signature"
cert=$(keytool -exportcert -keystore "$work/release.keystore" -alias "$ANDROID_KEY_ALIAS" \
  -storepass:env ANDROID_STORE_PASSWORD | openssl dgst -sha256 -r | cut -d' ' -f1)
# Build Tools can report a separate signer line for each signature scheme.
signers=$(sed -n 's/^.*certificate SHA-256 digest: //p' "$work/signature" | sort -u)
[[ "$signers" == "$cert" ]]
"$tools/aapt" dump badging "$apk" > "$work/metadata"
grep "^package: name='app.yapmod.mobile' .*versionName='${RELEASE_TAG#v}' " "$work/metadata"
unzip -tq "$apk" assets/index.android.bundle
