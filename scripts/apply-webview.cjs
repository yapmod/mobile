// git apply also works in an unpacked source archive without a .git directory.
const { spawnSync } = require('node:child_process');
const patch = 'patches/webview-14.0.1.patch';
function apply(...args) {
  return spawnSync('git', ['apply', ...args, patch], { stdio: 'pipe' }).status === 0;
}
if (!apply('--reverse', '--check') && !apply()) {
  throw new Error('Le correctif de sécurité WebView ne correspond pas à la dépendance installée.');
}
