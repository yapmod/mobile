const { getDefaultConfig } = require('expo/metro-config');

module.exports = async () => {
  const { syncClient } = await import('./scripts/sync-client.mjs');
  const { buildMobilePlugin } = await import('./scripts/bundle-mobile.mjs');
  buildMobilePlugin();
  await syncClient({ allowCached: true });
  return getDefaultConfig(__dirname);
};
