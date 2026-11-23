const { version } = require('./package.json');

const address = process.env.EXPO_PUBLIC_YAPIN_URL ?? 'https://www.yapin.gg/?auth=in';
let yapinUrl = '';
try {
  const url = new URL(address);
  if (url.protocol === 'https:' && !url.username && !url.password) yapinUrl = address;
} catch {
  // The app shows its configuration screen for an invalid URL.
}

module.exports = {
  name: 'Yapmod Mobile',
  icon: './assets/icon.png',
  slug: 'yapmod-mobile',
  version,
  platforms: ['android', 'ios'],
  extra: { yapinUrl },
};
