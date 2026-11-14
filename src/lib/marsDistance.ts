// Volumetric mean radius from NASA JPL's planetary physical parameters.
export const marsRadiusSource = 'https://ssd.jpl.nasa.gov/planets/phys_par.html';
const marsRadiusKm = 3389.5;
const radians = Math.PI / 180;

export function marsDistanceKm(a: readonly number[], b: readonly number[]) {
  const deltaLat = (b[1] - a[1]) * radians;
  const deltaLon = (b[0] - a[0]) * radians;
  const h = Math.sin(deltaLat / 2) ** 2
    + Math.cos(a[1] * radians) * Math.cos(b[1] * radians) * Math.sin(deltaLon / 2) ** 2;
  return 2 * marsRadiusKm * Math.asin(Math.sqrt(Math.max(0, Math.min(1, h))));
}
