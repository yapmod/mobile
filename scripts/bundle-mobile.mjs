import { execFileSync } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { mkdtempSync, readFileSync, renameSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));

export function buildMobilePlugin() {
  const builder = join(root, 'node_modules/@yapmod/builder');
  const manifest = JSON.parse(readFileSync(join(builder, 'package.json'), 'utf8'));
  const directory = mkdtempSync(join(tmpdir(), 'yapmod-mobile-plugin-'));
  const destination = join(root, 'vendor/yapmod/mobile.json');
  const temporary = destination + '.' + randomUUID() + '.tmp';
  try {
    const output = join(directory, 'plugin.js');
    execFileSync(process.execPath, [
      join(builder, manifest.bin.yapmod), 'build', '--entry', 'plugin/src/index.tsx', '--outfile', output,
    ], { cwd: root, stdio: 'inherit' });
    const contents = JSON.stringify(readFileSync(output, 'utf8')) + '\n';
    try {
      if (readFileSync(destination, 'utf8') === contents) return;
    } catch (error) {
      if (error.code !== 'ENOENT') throw error;
    }
    writeFileSync(temporary, contents);
    renameSync(temporary, destination);
  } finally {
    rmSync(temporary, { force: true });
    rmSync(directory, { recursive: true, force: true });
  }
}

if (process.argv[1] && pathToFileURL(process.argv[1]).href === import.meta.url) buildMobilePlugin();
