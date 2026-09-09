import { getPosts, postPath, slugify } from '../lib/posts';
import { xmlEscape } from '../lib/feed';
export async function GET() {
  const posts = await getPosts();
  const paths = ['/', '/about/', '/contact/', '/post/', '/tags/', '/categories/', ...posts.map(post => postPath(post.data)), ...(['tags', 'categories'] as const).flatMap(taxonomy => [...new Set(posts.flatMap(post => post.data[taxonomy]))].map(term => `/${taxonomy}/${slugify(term)}/`))];
  return new Response(`<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${paths.map(path => `<url><loc>${xmlEscape(new URL(path, 'https://binal.pub').href)}</loc></url>`).join('')}</urlset>`, { headers: { 'Content-Type': 'application/xml' } });
}
