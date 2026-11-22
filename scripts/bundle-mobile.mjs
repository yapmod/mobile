// Rebuild from the pinned Yapmod client checkout with its build dependencies installed.
import { execFileSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { writeFile } from 'node:fs/promises';

const revision = '43f3a933a675201b914dcbff219524022494e27f';
if (!process.argv[2]) throw new Error('Pass the path to the Yapmod client checkout.');
const checkout = resolve(process.argv[2]);
if (execFileSync('git', ['-C', checkout, 'rev-parse', 'HEAD'], { encoding: 'utf8' }).trim() !== revision) {
  throw new Error('Expected Yapmod client revision ' + revision);
}
const root = resolve(checkout, 'apps/client');
const require = createRequire(resolve(root, 'package.json'));
const { build } = await import(pathToFileURL(require.resolve('vite')).href);
const { default: solid } = await import(pathToFileURL(require.resolve('vite-plugin-solid')).href);
const result = await build({
  root, configFile: false, plugins: [solid()],
  resolve: { dedupe: ['solid-js'], alias: {
    'yapmod-source': resolve(root, 'src'),
    '@yapmod/core': resolve(checkout, 'packages/core/src/index.ts'),
  } },
  build: {
    write: false, sourcemap: false, target: 'es2020',
    lib: { entry: fileURLToPath(new URL('../plugin/mobile.js', import.meta.url)), name: 'YapmodMobilePlugin', formats: ['iife'] },
  },
});
const outputs = [result].flat().flatMap(build => build.output);
const chunks = outputs.filter(output => output.type === 'chunk');
if (chunks.length !== 1) throw new Error('Expected one local client script.');
await writeFile(new URL('../vendor/yapmod/mobile.json', import.meta.url), JSON.stringify(chunks[0].code) + '\n');
