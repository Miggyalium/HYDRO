import { useCallback, useEffect, useRef, useState } from 'react';
import Feature from 'ol/Feature.js';
import MultiPoint from 'ol/geom/MultiPoint.js';
import VectorLayer from 'ol/layer/Vector.js';
import VectorSource from 'ol/source/Vector.js';
import Style from 'ol/style/Style.js';
import CircleStyle from 'ol/style/Circle.js';
import Fill from 'ol/style/Fill.js';
import { createRoot } from 'react-dom/client';
import Map from 'ol/Map.js';
import View from 'ol/View.js';
import Overlay from 'ol/Overlay.js';
import Projection from 'ol/proj/Projection.js';
import ImageLayer from 'ol/layer/Image.js';
import ImageStatic from 'ol/source/ImageStatic.js';
import site from './data/site.json';
import ctx from './data/ctx.json';
import { entries, places, project, search, type Entry } from './lib/places';
import 'ol/ol.css';
import './style.css';
import { ScienceCard } from './ScienceCard';
import { Directions } from './Directions';
import { elevationRange, makeTerrainLayers, terrain } from './terrain';

function App() {
  const target = useRef<HTMLDivElement>(null);
  const input = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<Entry>();
  const [directionsOpen, setDirectionsOpen] = useState(false);
  const [trackSource] = useState(() => new VectorSource<Feature<MultiPoint>>());
  const updateTrack = useCallback((points: number[][]) => {
    trackSource.clear();
    if (points.length) trackSource.addFeature(new Feature(new MultiPoint(points)));
  }, [trackSource]);
  const terrainLayers = useRef<ReturnType<typeof makeTerrainLayers>>([]);
  const [visibleTerrain, setVisibleTerrain] = useState(() => terrain.map(layer => layer.defaultVisible));
  const [layersOpen, setLayersOpen] = useState(false);
  const results = search(query);
  function select(entry: Entry) {
    setDirectionsOpen(false);
    setSelected(entry);
    setQuery(entry.name);
    setOpen(false);
  }
  function clear() {
    setSelected(undefined);
    setQuery('');
    setOpen(false);
    input.current?.focus();
  }
  useEffect(() => {
    const projection = new Projection({ code: site.projection.name, units: 'm', extent: site.bboxProjectedM });
    const view = new View({ projection, center: site.centerProjectedM, zoom: 0, maxZoom: 6 });
    const overlays = makeTerrainLayers(projection);
    terrainLayers.current = overlays;
    const map = new Map({
      target: target.current!, view,
      layers: [new ImageLayer({ source: new ImageStatic({
        url: import.meta.env.BASE_URL + ctx.path, imageExtent: ctx.boundsProjectedM, projection,
      }) }), ...overlays, new VectorLayer({
        source: trackSource,
        style: new Style({ image: new CircleStyle({ radius: 2, fill: new Fill({ color: '#ff963f' }) }) }),
      })],
    });
    const markers = places.map(place => {
      const button = document.createElement('button');
      button.className = 'marker';
      button.type = 'button';
      button.textContent = place.name;
      button.onclick = () => select(entries.find(entry => entry.key === place.id)!);
      const overlay = new Overlay({ element: button, position: project(place.anchor), positioning: 'center-left' });
      map.addOverlay(overlay);
      return { button, overlay, id: place.id };
    });
    const fit = () => {
      view.fit(site.bboxProjectedM, { padding: [24, 26, 28, 26] });
    };
    fit();
    const resize = new ResizeObserver(() => {
      map.updateSize();
      if (view.getZoom() === 0) fit();
    });
    resize.observe(target.current!);
    const listener = (event: Event) => {
      const id = (event as CustomEvent<string>).detail;
      markers.forEach(({ button, id: markerId }) => button.setAttribute('aria-pressed', String(markerId === id)));
      const marker = markers.find(item => item.id === id);
      if (marker) view.animate({ center: marker.overlay.getPosition(), duration: 250 });
      else fit();
    };
    const surface = target.current!;
    surface.addEventListener('hydro-selection', listener);
    return () => {
      resize.disconnect();
      surface.removeEventListener('hydro-selection', listener);
      map.dispose();
    };
  }, [trackSource]);
  useEffect(() => {
    terrainLayers.current.forEach((layer, index) => layer.setVisible(visibleTerrain[index]));
  }, [visibleTerrain]);
  useEffect(() => {
    if (selected) target.current?.dispatchEvent(new CustomEvent('hydro-selection', { detail: selected.place.id }));
    else target.current?.dispatchEvent(new CustomEvent('hydro-selection'));
  }, [selected]);

  return <>
    <header className="masthead"><img src={import.meta.env.BASE_URL + 'hydro-wordmark.png'} alt="Hydro" /><span>Uncover Jezero’s water</span></header>
    <main>
      <div className="map" ref={target} tabIndex={0} aria-label="Interactive Jezero Crater map" />
      <section className="panel" aria-label="Jezero search">
        <form onSubmit={event => { event.preventDefault(); if (results[0]) select(results[0]); }}>
          <span className="search-icon" aria-hidden="true" />
          <input ref={input} aria-label="Search Jezero" placeholder="Search Jezero" value={query}
            aria-controls={open ? 'results' : undefined}
            onFocus={() => setOpen(true)} onChange={event => { setQuery(event.target.value); setOpen(true); }}
            onKeyDown={event => { if (event.key === 'Escape') setOpen(false); }} />
          {(selected || query) && <button type="button" onClick={clear} aria-label="Clear selection">×</button>}
        </form>
        {open && <div id="results" className="surface">
          {results.length ? <ul>{results.map(entry => <li key={entry.key}>
            <button onClick={() => select(entry)}>{entry.name}{entry.nested && <small>Hawksbill Gap</small>}</button>
          </li>)}</ul> : <p role="status">No matching places.</p>}
        </div>}
        <button className="layers-toggle directions-toggle" type="button" aria-expanded={directionsOpen}
          onClick={() => { setOpen(false); setLayersOpen(false); setDirectionsOpen(!directionsOpen); }}>
          {directionsOpen ? 'Close Directions' : 'Directions'}
        </button>
        {directionsOpen && !open && <Directions initialStop={selected?.place.id ?? ''} onTrack={updateTrack} />}
        {selected && !open && !directionsOpen && <ScienceCard key={selected.key} entry={selected} onSelect={select} />}
      </section>
      <span className="map-title" aria-hidden="true">Jezero Crater</span>
      <div className="layer-control">
        {layersOpen && <section id="terrain-options" className="surface" aria-label="Terrain layers">
          {terrain.map((layer, index) => <label key={layer.id}>
            <input type="checkbox" checked={visibleTerrain[index]} onChange={event => {
              const enabled = event.target.checked;
              setVisibleTerrain(previous => previous.map((value, i) =>
                i === index ? enabled : enabled && index < 3 && i < 3 ? false : value));
            }} />
            {layer.name}
          </label>)}
          {visibleTerrain[0] && <p className="elevation-key">Derived elevation · {elevationRange[0]} to {elevationRange[1]} m relative to the Mars areoid
            <span aria-hidden="true" />
          </p>}
          {visibleTerrain[3] && <p>Derived contours · 50 m interval, 100 m index lines</p>}
          {visibleTerrain[2] && <p>CTX gaps show the underlying optical imagery.</p>}
          <p className="position-note">Slope and walking access · Unknown</p>
        </section>}
        <button className="layers-toggle" type="button" aria-expanded={layersOpen}
          aria-controls={layersOpen ? 'terrain-options' : undefined}
          onClick={() => setLayersOpen(!layersOpen)}>Layers</button>
      </div>
      <div className="terrain-credits">
        {terrain.filter((_, index) => visibleTerrain[index]).map(layer => <div key={layer.id}>
          <a target="_blank" rel="noopener noreferrer" href={layer.sourcePage}>{layer.name} · {layer.credit}</a>
          {layer.licenseUrl && <> · <a target="_blank" rel="noopener noreferrer" href={layer.licenseUrl}>{layer.license}</a>
            {' · '}<a target="_blank" rel="noopener noreferrer" href={import.meta.env.BASE_URL + 'assets/HRSC-LICENSE.md'}>Adaptation notes</a></>}
        </div>)}
      </div>
      <a target="_blank" rel="noopener noreferrer" className="credit" href={ctx.sourcePage}>MRO CTX · {ctx.credit}</a>
    </main>
  </>;
}
createRoot(document.getElementById('root')!).render(<App />);

