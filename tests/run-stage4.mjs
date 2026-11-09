import { build } from 'esbuild';
import { spawnSync } from 'node:child_process';
const out = 'tests/.generated/stage4.test.mjs';
await build({ entryPoints: ['tests/stage4.test.ts'], outfile: out, bundle: true, platform: 'node', format: 'esm', external: ['react', 'react-dom/server', 'react/jsx-runtime', 'localforage', 'suncalc', 'lucide-react'], jsx: 'automatic' });
const result=spawnSync(process.execPath,['--test',out],{stdio:'inherit'});
process.exit(result.status ?? 1);
