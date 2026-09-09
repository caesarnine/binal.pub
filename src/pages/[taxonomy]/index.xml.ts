import { getPosts } from '../../lib/posts';
import { feed } from '../../lib/feed';
export function getStaticPaths() { return ['tags', 'categories'].map(taxonomy => ({ params: { taxonomy } })); }
export async function GET({ params }: { params: { taxonomy: string } }) { return feed(await getPosts(), `/${params.taxonomy}/index.xml`); }
