import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import assert from 'node:assert/strict';
import { normalizedArticle } from './migration-normalize.mjs';
const hash = data => createHash('sha256').update(data).digest('hex');
const manifest = JSON.parse(fs.readFileSync('tests/migration-manifest.json', 'utf8'));
for (const post of manifest) {
  assert.equal(hash(normalizedArticle(fs.readFileSync(post.file, 'utf8'))), post.bodyHash, `Article changed: ${post.file}`);
  for (const [asset, digest] of Object.entries(post.mediaHashes)) assert.equal(hash(fs.readFileSync(path.join('public', asset))), digest, `Media changed: ${asset}`);
}
console.log(`Verified all ${manifest.length} original article bodies and every migrated media file.`);
