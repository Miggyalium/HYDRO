import site from '../data/site.json';
import records from '../data/places.json';

export const places = site.areas.map(id => {
  const place = records.find(record => record.id === id);
  if (!place) throw new Error('Missing area: ' + id);
  return place;
});

export const entries = places.flatMap(place => [
  { key: place.id, place, name: place.name, aliases: place.aliases, nested: false },
  ...place.details.map(detail => ({
    key: place.id + '/' + detail.name, place, name: detail.name, aliases: [], nested: true,
  })),
]);
export type Entry = typeof entries[number];

function normalize(value: string) {
  return value.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase().trim();
}
export function search(query: string) {
  const term = normalize(query);
  return entries.filter(entry => [entry.name, ...entry.aliases].some(name => normalize(name).includes(term)));
}

const radius = Number(site.projection.proj4.match(/(?:^| )\+R=(\d+)(?: |$)/)?.[1]);
export function project([lon, lat]: readonly number[]): [number, number] {
  return [lon * Math.PI / 180 * radius, lat * Math.PI / 180 * radius];
}
