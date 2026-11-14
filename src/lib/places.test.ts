import { expect, test } from 'vitest';
import { entries, places, project, search, unproject } from './places';
import site from '../data/site.json';

test('all ten anchors project inside the registered crater image', () => {
  expect(places).toHaveLength(10);
  const [west, south, east, north] = site.bboxProjectedM;
  for (const place of places) {
    const [x, y] = project(place.anchor);
    const [lon, lat] = unproject([x, y]);
    expect(lon).toBeCloseTo(place.anchor[0], 8);
    expect(lat).toBeCloseTo(place.anchor[1], 8);
    expect(x).toBeGreaterThan(west);
    expect(x).toBeLessThan(east);
    expect(y).toBeGreaterThan(south);
    expect(y).toBeLessThan(north);
  }
  expect(project([0, 0])).toEqual([0, 0]);
});
test('matches aliases and accents and keeps nested results tied to Hawksbill Gap', () => {
  expect(search('MÁAZ')[0].place.id).toBe('rochette');
  expect(search('Montagnac')[0].place.id).toBe('rochette');
  expect(search('Dacono')[0].place.id).toBe('dacono');
  expect(search('Ancient lake basin')[0].place.id).toBe('jezero-floor');
  expect(search('Kibler Knob')[0]).toMatchObject({ nested: true, place: { id: 'hawksbill-gap' } });
  expect(entries.filter(entry => entry.nested)).toHaveLength(5);
  expect(search('no such site')).toEqual([]);
});
