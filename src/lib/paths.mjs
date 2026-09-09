export const PAGE_SIZE = 3;
export const slugify = (value) => value.toLowerCase().normalize('NFKD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
export function postPath(data) {
  if (data.permalink) return data.permalink;
  const date = new Date(data.date).toISOString();
  return `/${date.slice(0, 4)}/${date.slice(5, 7)}/${slugify(data.title)}/`;
}
export function sortPublished(posts, now = new Date()) {
  return posts.filter(({ data }) => !data.draft && new Date(data.date) <= now)
    .sort((a, b) => new Date(b.data.date) - new Date(a.data.date) || a.id.localeCompare(b.id));
}
export function paginate(posts, size = PAGE_SIZE) {
  return Array.from({ length: Math.ceil(posts.length / size) }, (_, i) => posts.slice(i * size, (i + 1) * size));
}
