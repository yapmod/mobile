const { version } = require('./package.json');

const address = process.env.EXPO_PUBLIC_YAPIN_URL ?? 'https://www.yapin.gg/?auth=in';
let yapinUrl = '';
try {
  const url = new URL(address);
  if (url.protocol === 'https:' && !url.username && !url.password) yapinUrl = address;
} catch {
  // The app shows its configuration screen for an invalid URL.
}

// Reserve three digits per component so Android orders stable SemVer releases correctly.
const parts = version.split('.').map(Number);
if (parts.length !== 3 || parts.some(n => !Number.isInteger(n) || n < 0 || n > 999)) {
  throw new Error('Mobile releases require three version components between 0 and 999.');
}
const [major, minor, patch] = parts;
const versionCode = major * 1_000_000 + minor * 1_000 + patch + 1;

module.exports = {
  name: 'Yapmod Mobile',
  icon: './assets/icon.png',
  slug: 'yapmod-mobile',
  version,
  platforms: ['android', 'ios'],
  android: { package: 'app.yapmod.mobile', versionCode },
  ios: { bundleIdentifier: 'app.yapmod.mobile', buildNumber: String(versionCode) },
  extra: { yapinUrl },
};
