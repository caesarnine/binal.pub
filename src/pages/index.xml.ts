import { getPosts } from '../lib/posts';
import { feed } from '../lib/feed';
export async function GET() { return feed(await getPosts()); }
