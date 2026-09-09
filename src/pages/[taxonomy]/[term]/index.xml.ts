import { getPosts, slugify, type Post } from '../../../lib/posts';
import { feed } from '../../../lib/feed';
export async function getStaticPaths() {
  const posts = await getPosts();
  return (['tags', 'categories'] as const).flatMap(taxonomy => [...new Set(posts.flatMap(post => post.data[taxonomy]))].map(term => ({ params: { taxonomy, term: slugify(term) }, props: { posts: posts.filter(post => post.data[taxonomy].includes(term)), title: term } })));
}
export function GET({ props, params }: { props: { posts: Post[]; title: string }; params: { taxonomy: string; term: string } }) {
  return feed(props.posts, `/${params.taxonomy}/${params.term}/index.xml`, `${props.title} · Binal Patel`);
}
