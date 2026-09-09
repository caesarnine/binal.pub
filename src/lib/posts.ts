import { getCollection, type CollectionEntry } from 'astro:content';
import { postPath, sortPublished, slugify, PAGE_SIZE } from './paths.mjs';
export { postPath, slugify, PAGE_SIZE };
export type Post = CollectionEntry<'posts'>;
export async function getPosts(): Promise<Post[]> {
  const posts = sortPublished(await getCollection('posts'));
  const paths = posts.map((post: Post) => postPath(post.data));
  if (new Set(paths).size !== paths.length) throw new Error('Two posts have the same URL. Set a unique permalink in their frontmatter.');
  return posts;
}
export function description(post: Post) {
  return post.data.description || post.body?.replace(/```[\s\S]*?```/g, '').replace(/<[^>]*>/g, '').replace(/\[([^\]]+)\]\([^)]*\)/g, '$1').replace(/[#*_`]/g, '').trim().split(/\n\s*\n/)[0].slice(0, 180) || post.data.title;
}
export const displayDate = (date: Date) => date.toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric', timeZone: 'UTC' });
