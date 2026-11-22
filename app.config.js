const { withStringsXml } = require('expo/config-plugins');
const { version } = require('./package.json');

const address = process.env.EXPO_PUBLIC_YAPIN_URL ?? 'https://www.yapin.gg/?auth=in';
let origin = '';
try {
  const url = new URL(address);
  if (url.protocol === 'https:' && !url.username && !url.password) origin = url.origin;
} catch {
  // Invalid configuration deliberately leaves the native allowlist empty.
}

function withYapmodOrigin(config) {
  return withStringsXml(config, mod => {
    const strings = mod.modResults.resources.string ?? [];
    mod.modResults.resources.string = [
      ...strings.filter(entry => entry.$.name !== 'yapmod_origin'),
      { $: { name: 'yapmod_origin', translatable: 'false' }, _: origin },
    ];
    return mod;
  });
}

module.exports = {
  name: 'Yapmod Mobile',
  icon: './assets/icon.png',
  slug: 'yapmod-mobile',
  version,
  scheme: 'yapmod-dev',
  platforms: ['android', 'ios'],
  extra: { yapinUrl: origin ? address : '' },
  ios: {
    bundleIdentifier: 'dev.yapmod.mobile',
    infoPlist: {
      YapmodOrigin: origin,
      NSMicrophoneUsageDescription: 'Utiliser votre microphone pour participer au vocal sur Yapin.',
      NSCameraUsageDescription: 'Utiliser votre caméra pour la vidéo sur Yapin.',
    },
  },
  android: {
    package: 'dev.yapmod.mobile',
    softwareKeyboardLayoutMode: 'resize',
    permissions: ['android.permission.RECORD_AUDIO', 'android.permission.CAMERA'],
  },
  plugins: ['expo-dev-client', withYapmodOrigin],
};
