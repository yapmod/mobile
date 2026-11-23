const { getDefaultConfig } = require('expo/metro-config');

module.exports = async () => {
  const { syncClient } = await import('./scripts/sync-client.mjs');
  const { buildMobilePlugin } = await import('./scripts/bundle-mobile.mjs');
  buildMobilePlugin();
  await syncClient({ allowCached: true, bundledOnly: process.env.YAPMOD_BUNDLED_CLIENT === '1' });
  return getDefaultConfig(__dirname);
};
