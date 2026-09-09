import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { slugify, postPath } from '../src/lib/paths.mjs';

const title = process.argv.slice(2).join(' ').trim();
if (!title) { console.error('Usage: npm run new-post -- "Your post title"'); process.exit(1); }
const slug = slugify(title);
if (!slug) { console.error('Please include letters or numbers in the title.'); process.exit(1); }
const date = new Date().toISOString().slice(0, 10);
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const folder = path.join(root, 'content/post', `${date}-${slug}`);
const file = path.join(folder, 'index.md');
if (fs.existsSync(folder)) { console.error('A post with this date and title already exists.'); process.exit(1); }
fs.mkdirSync(folder, { recursive: true });
fs.writeFileSync(file, `---\ntitle: ${JSON.stringify(title)}\ndate: ${date}\ndescription: ""\npermalink: ${postPath({ title, date })}\ntags: []\ncategories: [coding]\ndraft: true\n---\n\nStart writing here.\n`, { flag: 'wx' });
console.log(`Created ${path.relative(root, file)}\nSet draft: false when ready to publish. The index, river docks, and RSS update automatically on the next build.`);
