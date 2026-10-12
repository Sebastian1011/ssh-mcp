#!/usr/bin/env node

import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { gunzipSync, gzipSync } from 'node:zlib';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const vendorDir = resolve(root, 'test/eval/reviewer/vendor');
const archivePath = resolve(vendorDir, 'shell-safety-v2.jsonl.gz');
const manifestPath = resolve(vendorDir, 'shell-safety-v2.manifest.json');
const revision = '3258db497dae218f23d1d648ef2eb7cb6ab5e70c';
const source = 'tomngdev/shell-safety-v2';
const splits = {
  train: {
    records: 30002,
    sha256: '698e5ba9cf4984d4fcd845f997e63a8a971ceea71a3b22dcf257379d6e0972ef',
  },
  validation: {
    records: 3002,
    sha256: 'ebb74c92b5b879d06af75d2cb456feb0f314c2ae270eb9aa79353c67f364e830',
  },
  test: {
    records: 1003,
    sha256: '23b5c0d32e2d558550b14885580194d3dbb9c4f6810acab14e03d9cdfaa341e8',
  },
};

const sha256 = (value) => createHash('sha256').update(value).digest('hex');

function parseRows(text, split) {
  return text.split(/\r?\n/).flatMap((line, rowIndex) => {
    if (!line) return [];
    const row = JSON.parse(line);
    for (const key of ['command', 'label', 'category', 'shell', 'reason']) {
      if (typeof row[key] !== 'string' || !row[key]) throw new Error(`${split}:${rowIndex + 1}: invalid ${key}`);
    }
    if (!['allow', 'ask', 'deny'].includes(row.label)) {
      throw new Error(`${split}:${rowIndex + 1}: invalid label ${JSON.stringify(row.label)}`);
    }
    if (!Object.hasOwn(row, 'session_context')) throw new Error(`${split}:${rowIndex + 1}: missing session_context`);
    return [{ split, rowIndex, ...row }];
  });
}

function summarize(rows) {
  const labels = { allow: 0, ask: 0, deny: 0 };
  const splitCounts = {};
  for (const row of rows) {
    labels[row.label]++;
    splitCounts[row.split] = (splitCounts[row.split] ?? 0) + 1;
  }
  return { records: rows.length, labels, splits: splitCounts };
}

async function build(sourceDir) {
  if (!sourceDir) throw new Error('--source-dir is required unless --check is used');
  const rows = [];
  for (const [split, expected] of Object.entries(splits)) {
    const bytes = await readFile(resolve(sourceDir, `${split}.jsonl`));
    const actualHash = sha256(bytes);
    if (actualHash !== expected.sha256) throw new Error(`${split}.jsonl sha256 mismatch: ${actualHash}`);
    const parsed = parseRows(bytes.toString('utf8'), split);
    if (parsed.length !== expected.records) {
      throw new Error(`${split}.jsonl expected ${expected.records} records, found ${parsed.length}`);
    }
    rows.push(...parsed);
  }

  const plain = Buffer.from(rows.map((row) => JSON.stringify(row)).join('\n') + '\n');
  const archive = gzipSync(plain, { level: 9, mtime: 0 });
  const summary = summarize(rows);
  const manifest = {
    schemaVersion: 1,
    source,
    revision,
    license: 'MIT',
    sourceFiles: Object.fromEntries(Object.entries(splits).map(([split, value]) => [
      `${split}.jsonl`, value,
    ])),
    ...summary,
    archive: {
      file: 'shell-safety-v2.jsonl.gz',
      sha256: sha256(archive),
      uncompressedSha256: sha256(plain),
      bytes: archive.length,
      uncompressedBytes: plain.length,
    },
  };
  await mkdir(vendorDir, { recursive: true });
  await writeFile(archivePath, archive, { mode: 0o644 });
  await writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, { mode: 0o644 });
  console.log(`wrote_records=${rows.length} archive_sha256=${manifest.archive.sha256}`);
}

async function check() {
  const manifest = JSON.parse(await readFile(manifestPath, 'utf8'));
  if (manifest.revision !== revision || manifest.source !== source || manifest.license !== 'MIT') {
    throw new Error('vendor manifest provenance mismatch');
  }
  const archive = await readFile(archivePath);
  if (sha256(archive) !== manifest.archive.sha256) throw new Error('vendor archive sha256 mismatch');
  const plain = gunzipSync(archive);
  if (sha256(plain) !== manifest.archive.uncompressedSha256) {
    throw new Error('vendor archive uncompressed sha256 mismatch');
  }
  const rows = plain.toString('utf8').split(/\r?\n/).filter(Boolean).map(JSON.parse);
  const summary = summarize(rows);
  if (summary.records !== manifest.records || JSON.stringify(summary.labels) !== JSON.stringify(manifest.labels) ||
      JSON.stringify(summary.splits) !== JSON.stringify(manifest.splits)) {
    throw new Error('vendor manifest counts mismatch');
  }
  console.log(`validated_records=${rows.length} archive_sha256=${manifest.archive.sha256}`);
}

const args = process.argv.slice(2);
if (args.includes('--check')) {
  await check();
} else {
  const sourceIndex = args.indexOf('--source-dir');
  if (sourceIndex === -1 || !args[sourceIndex + 1]) throw new Error('Usage: vendor-reviewer-eval-data.mjs --source-dir DIR | --check');
  await build(resolve(args[sourceIndex + 1]));
}
