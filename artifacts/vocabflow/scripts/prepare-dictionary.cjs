// Downloads a pinned, checksummed upstream asset; large bytes stay OUT of Git.
// Only this developer setup script uploads the public data to App Storage.
const fs = require('node:fs/promises');
const { readFileSync } = require('node:fs');
const { createHash } = require('node:crypto');
const { join, resolve } = require('node:path');
const { createRequire } = require('node:module');
const ts = require('typescript');

function configFromTs(path, dependencies = {}) {
  const code = ts.transpileModule(readFileSync(path, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText;
  const mod = { exports: {} };
  new Function('exports', 'module', 'require', 'process', code)(mod.exports, mod, name => {
    if (!(name in dependencies)) throw new Error(`Unexpected dependency: ${name}`);
    return dependencies[name];
  }, process);
  return mod.exports;
}

(async () => {
  const localDictionaryAdditions = configFromTs(
    join(__dirname, '../domain/dictionary-local-additions.ts'),
  );
  const { DICTIONARY } = configFromTs(
    join(__dirname, '../domain/dictionary.ts'),
    { './dictionary-local-additions': localDictionaryAdditions },
  );
  const root = resolve(__dirname, '../../..');
  const directory = join(root, 'generated-artifacts/dictionary');
  const filename = join(directory, 'dictionary_en_vi.db');
  const base = `https://raw.githubusercontent.com/skypediacode/english-vietnamese-dictionary/${DICTIONARY.commit}`;
  await fs.mkdir(directory, { recursive: true });
  let bytes;
  try { bytes = await fs.readFile(filename); } catch {}
  const valid = data => data?.length === DICTIONARY.bytes && createHash('sha256').update(data).digest('hex') === DICTIONARY.sha256;
  if (!valid(bytes)) {
    const response = await fetch(`${base}/dictionary_en_vi.db`);
    if (!response.ok) throw new Error(`Upstream download failed (${response.status})`);
    bytes = Buffer.from(await response.arrayBuffer());
    if (!valid(bytes)) throw new Error('Upstream dictionary failed pinned size/SHA-256 verification');
    await fs.writeFile(filename, bytes);
  }
  const notices = {};
  for (const [key, name] of [['license', 'LICENSE'], ['attribution', 'ATTRIBUTION.md']]) {
    const response = await fetch(`${base}/${name}`);
    if (!response.ok) throw new Error(`Missing upstream notice: ${name}`);
    notices[key] = await response.text();
  }
  // Snapshot of the upstream LICENSE as inspected, separate from dataset terms.
  const upstreamCommit = 'f11b18fcc12dc291eff91dbebbd1f7ffac17aa5b';
  const upstreamLicense = await fetch(`https://raw.githubusercontent.com/minhqnd/dictionary/${upstreamCommit}/LICENSE`);
  if (!upstreamLicense.ok) throw new Error('Missing upstream license');
  notices.upstreamLicense = await upstreamLicense.text();
  notices.upstreamCommit = upstreamCommit;
  await fs.writeFile(join(__dirname, '../assets/dictionary-notices.json'), JSON.stringify(notices, null, 2) + '\n');
  console.log(`Verified public reference file: ${DICTIONARY.wordCount} headwords, ${bytes.length} bytes.`);

  if (process.argv.includes('--upload')) {
    const serverRequire = createRequire(resolve(__dirname, '../../api-server/package.json'));
    const cloud = serverRequire('@google-cloud/storage');
    const { objectStorageClient, DICTIONARY_OBJECT_KEY } = configFromTs(
      resolve(__dirname, '../../api-server/src/lib/dictionary-storage.ts'), { '@google-cloud/storage': cloud },
    );
    const path = (process.env.PUBLIC_OBJECT_SEARCH_PATHS ?? '').split(',').map(value => value.trim()).find(Boolean);
    if (!path) throw new Error('App Storage must be provisioned before --upload');
    const [bucket, ...prefix] = path.replace(/^\/+/, '').split('/');
    const file = objectStorageClient.bucket(bucket).file([...prefix, DICTIONARY_OBJECT_KEY].join('/'));
    await file.save(bytes, {
      resumable: false,
      metadata: {
        contentType: 'application/octet-stream',
        cacheControl: 'public, max-age=86400',
        metadata: { sourceCommit: DICTIONARY.commit, sha256: DICTIONARY.sha256, license: 'CC-BY-SA-4.0' },
      },
    });
    console.log('Pinned dictionary uploaded to public App Storage asset area.');
  }
})().catch(error => {
  console.error(error.message);
  process.exitCode = 1;
});
