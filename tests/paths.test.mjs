import { test } from 'node:test';
import assert from 'node:assert/strict';
import { postPath, sortPublished, paginate } from '../src/lib/paths.mjs';

test('existing permalinks stay fixed even if a title changes', () => {
  assert.equal(postPath({ title: 'Revised title', date: '2026-09-09', permalink: '/2023/12/structured-ocr-with-gpt-vision/' }), '/2023/12/structured-ocr-with-gpt-vision/');
});
test('new posts use UTC dates and a stable readable path', () => {
  assert.equal(postPath({ title: 'A river & a new idea', date: '2026-09-09' }), '/2026/09/a-river-a-new-idea/');
});
test('adding a post updates order and pagination without scenery metadata', () => {
  const old = Array.from({ length: 7 }, (_, i) => ({ id: `old-${i}`, data: { title: `Post ${i}`, date: `2023-01-0${i + 1}` } }));
  const added = { id: 'new', data: { title: 'A very long title that wraps over several lines on a narrow screen', date: '2026-09-09' } };
  const draft = { id: 'draft', data: { title: 'Draft', date: '2026-09-09', draft: true } };
  const future = { id: 'future', data: { title: 'Future', date: '2100-01-01' } };
  const posts = sortPublished([...old, added, draft, future], new Date('2026-09-10'));
  assert.equal(posts[0].id, 'new');
  assert.deepEqual(paginate(posts).map(page => page.length), [3, 3, 2]);
  assert.equal(new Set(posts.flatMap(post => [post.id])).size, 8);
});
