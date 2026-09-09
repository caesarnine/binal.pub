import fs from 'node:fs';
import path from 'node:path';
import { test } from 'node:test';
import assert from 'node:assert/strict';
const root = path.resolve('dist');
const manifest = JSON.parse(fs.readFileSync('tests/migration-manifest.json', 'utf8'));
const walk = folder => fs.readdirSync(folder, { withFileTypes: true }).flatMap(entry => entry.isDirectory() ? walk(path.join(folder, entry.name)) : [path.join(folder, entry.name)]);
const htmlFiles = walk(root).filter(file => file.endsWith('.html'));

test('all original articles, media, and core routes survive the migration', () => {
  for (const post of manifest) {
    assert.ok(fs.existsSync(path.join(root, post.route, 'index.html')), post.route);
    for (const asset of post.media) assert.ok(fs.existsSync(path.join(root, asset)), asset);
  }
  for (const route of ['about', 'contact', 'post', 'tags', 'categories/coding', 'page/2', 'page/3', 'post/page/2', 'tags/llm/page/2']) assert.ok(fs.existsSync(path.join(root, route, 'index.html')), route);
  for (const file of ['index.xml', 'post/index.xml', 'tags/llm/index.xml', 'sitemap.xml', '404.html']) assert.ok(fs.existsSync(path.join(root, file)), file);
});
test('rendered HTML has no broken internal links, images, scripts, or stylesheets', () => {
  const errors = [];
  for (const file of htmlFiles) {
    const html = fs.readFileSync(file, 'utf8');
    const route = '/' + path.relative(root, file).replace(/index\.html$/, '');
    for (const [, attribute, raw] of html.matchAll(/\b(href|src)="([^"]+)"/g)) {
      if (/^(?:https?:|mailto:|tel:|data:|javascript:)/.test(raw)) continue;
      const url = new URL(raw.replaceAll('&amp;', '&'), `https://binal.pub${route}`);
      let target = path.join(root, decodeURIComponent(url.pathname));
      if (url.pathname.endsWith('/')) target = path.join(target, 'index.html');
      if (!fs.existsSync(target)) { errors.push(`${route} → ${raw}`); continue; }
      if (attribute === 'href' && url.hash && target.endsWith('.html')) {
        const id = decodeURIComponent(url.hash.slice(1));
        const body = fs.readFileSync(target, 'utf8');
        if (!body.includes(`id="${id}"`)) errors.push(`${route} → missing anchor ${raw}`);
      }
    }
    assert.ok(!html.includes('{{&lt; video'), `Unconverted Hugo shortcode in ${file}`);
  }
  assert.deepEqual(errors, []);
});
test('the public RSS retains every existing post URL and videos keep native controls', () => {
  const feed = fs.readFileSync(path.join(root, 'index.xml'), 'utf8');
  for (const post of manifest) assert.ok(feed.includes(`https://binal.pub${post.route}`), post.route);
  const ocr = fs.readFileSync(path.join(root, '2023/12/structured-ocr-with-gpt-vision/index.html'), 'utf8');
  assert.match(ocr, /<video[^>]*controls/);
  assert.match(ocr, /<pre[^>]*class="[^"]*astro-code/);
});
