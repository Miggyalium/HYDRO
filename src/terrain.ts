import GeoJSON from 'ol/format/GeoJSON.js';
import ImageLayer from 'ol/layer/Image.js';
import VectorLayer from 'ol/layer/Vector.js';
import WebGLTileLayer from 'ol/layer/WebGLTile.js';
import { addCoordinateTransforms, addProjection } from 'ol/proj.js';
import Projection from 'ol/proj/Projection.js';
import GeoTIFF from 'ol/source/GeoTIFF.js';
import ImageStatic from 'ol/source/ImageStatic.js';
import VectorSource from 'ol/source/Vector.js';
import Stroke from 'ol/style/Stroke.js';
import Style from 'ol/style/Style.js';
import data from './data/terrain.json';
import { project } from './lib/places';

export const terrain = data;
// Observed range of the packaged HRSC crop, in metres relative to the Mars areoid.
export const elevationRange = [-3085, -541] as const;
const ramp = ['#302044', '#895041', '#f8d293'];
const ordinaryContour = new Style({ stroke: new Stroke({ color: '#fff2d9cc', width: 1 }) });
const indexContour = new Style({ stroke: new Stroke({ color: '#ffad62', width: 2 }) });

export function makeTerrainLayers(projection: Projection) {
  const geographic = new Projection({ code: 'Mars planetocentric east/north', units: 'degrees' });
  addProjection(projection);
  addProjection(geographic);
  addCoordinateTransforms(geographic, projection, project, ([x, y]) => {
    const [metresPerDegree] = project([1, 0]);
    return [x / metresPerDegree, y / metresPerDegree];
  });

  return terrain.map(record => {
    const url = import.meta.env.BASE_URL + record.path;
    const options = { visible: record.defaultVisible };
    if (record.type === 'raster') {
      return new WebGLTileLayer({
        ...options, extent: record.boundsProjectedM,
        source: new GeoTIFF({ sources: [{ url }], projection, normalize: false, interpolate: false }),
        style: { color: ['case', ['==', ['band', 2], 0], ['color', 0, 0, 0, 0],
          ['interpolate', ['linear'], ['band', 1], elevationRange[0], ramp[0],
            (elevationRange[0] + elevationRange[1]) / 2, ramp[1], elevationRange[1], ramp[2]]] },
      });
    }
    if (record.type === 'vector') {
      return new VectorLayer({
        ...options,
        source: new VectorSource({ url, format: new GeoJSON({ dataProjection: geographic }) }),
        style: feature => feature.get('index_contour') ? indexContour : ordinaryContour,
      });
    }
    return new ImageLayer({
      ...options,
      source: new ImageStatic({ url, imageExtent: record.boundsProjectedM!, projection }),
    });
  });
}
