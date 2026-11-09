import { build } from 'esbuild';
import { spawnSync } from 'node:child_process';
import { basename } from 'node:path';
const entries = process.argv.slice(2);
let status = 0;
for (const e of entries) {
  const out = `tests/.generated/${basename(e).replace(/\.tsx?$/, '')}.mjs`;
  await build({ entryPoints: [e], outfile: out, bundle: true, platform: 'node', format: 'esm', jsx: 'automatic', external: ['react', 'react-dom/server', 'react/jsx-runtime', 'localforage', 'suncalc', 'lucide-react'] });
  const r = spawnSync(process.execPath, ['--test', out], { stdio: 'inherit' });
  status ||= r.status ?? 1;
}
process.exit(status);
