#!/usr/bin/env bash
set -euo pipefail

work=$(mktemp -d)
trap 'rm -rf "$work"' EXIT
xcodebuild -workspace ios/YapmodMobile.xcworkspace -scheme YapmodMobile \
  -configuration Release -destination 'generic/platform=iOS' \
  -archivePath "$work/mobile.xcarchive" CODE_SIGNING_ALLOWED=NO archive

mkdir -p "$work/Payload" deliverables
app="$work/Payload/YapmodMobile.app"
ditto "$work/mobile.xcarchive/Products/Applications/YapmodMobile.app" "$app"
test -s "$app/main.jsbundle"
plist="$app/Info.plist"
[[ "$(plutil -extract CFBundleIdentifier raw "$plist")" == app.yapmod.mobile ]]
[[ "$(plutil -extract CFBundleShortVersionString raw "$plist")" == "${RELEASE_TAG#v}" ]]
[[ "$(plutil -extract CFBundleSupportedPlatforms.0 raw "$plist")" == iPhoneOS ]]
(cd "$work" && /usr/bin/zip -qry mobile.ipa Payload)
unzip -tq "$work/mobile.ipa"
mv "$work/mobile.ipa" "deliverables/Yapmod-Mobile-$RELEASE_TAG.ipa"
