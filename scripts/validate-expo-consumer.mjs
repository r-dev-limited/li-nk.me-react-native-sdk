import { cp, mkdtemp, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { tmpdir } from 'node:os';
import { spawn } from 'node:child_process';

const sdkRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const exampleRoot = join(sdkRoot, 'example-expo');
const tempRoot = await mkdtemp(join(tmpdir(), 'linkme-rn-expo-consumer-'));
const consumerRoot = join(tempRoot, 'consumer');

try {
await cp(exampleRoot, consumerRoot, {
  recursive: true,
  filter(source) {
    const relative = source.slice(exampleRoot.length + 1);
    return !relative.startsWith('node_modules/') &&
      !relative.startsWith('.expo/') &&
      !relative.startsWith('android/') &&
      !relative.startsWith('ios/') &&
      !relative.startsWith('artifacts/');
  },
});

function run(command, args, cwd, { env = {}, stdio = 'inherit' } = {}) {
  return new Promise((resolveRun, reject) => {
    const child = spawn(command, args, {
      cwd,
      stdio: stdio === 'pipe' ? ['ignore', 'pipe', 'pipe'] : stdio,
      env: { ...process.env, ...env },
    });
    let stdout = '';
    let stderr = '';
    if (stdio === 'pipe') {
      child.stdout.on('data', (chunk) => { stdout += chunk; });
      child.stderr.on('data', (chunk) => { stderr += chunk; });
    }
    child.on('error', reject);
    child.on('close', (code, signal) => {
      if (code === 0) resolveRun({ stdout, stderr });
      else reject(new Error(`${command} exited with ${code ?? signal}\n${stderr}`));
    });
  });
}

await run('npm', ['pack', '--silent', '--ignore-scripts', '--pack-destination', tempRoot], sdkRoot);
const archive = (await readdir(tempRoot)).find((entry) => entry.endsWith('.tgz'));
if (!archive) throw new Error('npm pack did not create an SDK archive');

const packagePath = join(consumerRoot, 'package.json');
const packageJson = JSON.parse(await readFile(packagePath, 'utf8'));
packageJson.dependencies['@li-nk.me/react-native-sdk'] = `file:../${archive}`;
await writeFile(packagePath, `${JSON.stringify(packageJson, null, 2)}\n`);

await run('npm', ['install', '--package-lock-only', '--legacy-peer-deps', '--ignore-scripts', '--no-audit', '--no-fund'], consumerRoot);
await run('npm', ['ci', '--legacy-peer-deps', '--ignore-scripts', '--no-audit', '--no-fund'], consumerRoot);
await run('npx', ['tsc', '--noEmit', '-p', 'tsconfig.json'], consumerRoot);
// Expo Doctor's npm-explain checks report intentionally absent optional
// packages as failures on npm 10. Use its deterministic underlying checks
// here and keep the full Doctor command as a manual diagnostic.
const config = await run('npx', ['expo', 'config', '--json', '--full'], consumerRoot, {
  env: { CI: '1' },
  stdio: 'pipe',
});
JSON.parse(config.stdout);
const installCheck = await run('npx', ['expo', 'install', '--check'], consumerRoot, {
  env: { CI: '1' },
  stdio: 'pipe',
});
if (!/up to date/i.test(installCheck.stdout)) {
  throw new Error(`Expo dependency check did not report an up-to-date tree:\n${installCheck.stdout}`);
}
const reactTree = await run('npm', ['ls', 'react', '--all', '--json'], consumerRoot, { stdio: 'pipe' });
const reactVersions = new Set();
function collectReactVersions(node, name = '') {
  if (!node || typeof node !== 'object') return;
  if (name === 'react' && node.version) reactVersions.add(node.version);
  for (const [dependencyName, dependency] of Object.entries(node.dependencies ?? {})) {
    collectReactVersions(dependency, dependencyName);
  }
}
collectReactVersions(JSON.parse(reactTree.stdout));
if (reactVersions.size !== 1 || !reactVersions.has(packageJson.dependencies.react)) {
  throw new Error(`Unexpected React versions in standalone consumer: ${[...reactVersions].join(', ')}`);
}
console.log('standalone-expo-consumer-ok');
} finally {
  await rm(tempRoot, { recursive: true, force: true });
}
