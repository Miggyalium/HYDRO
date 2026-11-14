import { useCallback, useEffect, useRef, useState } from 'react';
import Feature from 'ol/Feature.js';
import MultiPoint from 'ol/geom/MultiPoint.js';
import { fromExtent } from 'ol/geom/Polygon.js';
import VectorLayer from 'ol/layer/Vector.js';
import VectorSource from 'ol/source/Vector.js';
import Style from 'ol/style/Style.js';
import CircleStyle from 'ol/style/Circle.js';
import Fill from 'ol/style/Fill.js';
import Stroke from 'ol/style/Stroke.js';
import { createRoot } from 'react-dom/client';
import Map from 'ol/Map.js';
import View from 'ol/View.js';
import Overlay from 'ol/Overlay.js';
import Projection from 'ol/proj/Projection.js';
import ImageLayer from 'ol/layer/Image.js';
import ImageStatic from 'ol/source/ImageStatic.js';
import site from './data/site.json';
import ctx from './data/ctx.json';
import vikingContext from './data/viking-context.json';
import { entries, places, project, search, type Entry } from './lib/places';
import 'ol/ol.css';
import './style.css';
import { ScienceCard } from './ScienceCard';
import { SurfaceViews } from './SurfaceViews';
import { Findings } from './Findings';
import { Directions } from './Directions';
import { elevationRange, makeTerrainLayers, terrain } from './terrain';
import { MarsIntro, vikingCredit, vikingImage, vikingSource } from './MarsIntro';

const globalExtent = [...project([-180, -90]), ...project([180, 90])];
const [contextLeft, contextTop, contextRight, contextBottom] = vikingContext.pixelCrop;
const vikingContextExtent = [
  ...project([contextLeft / vikingContext.sourceImageWidth * 360 - 180, 90 - contextBottom / vikingContext.sourceImageHeight * 180]),
  ...project([contextRight / vikingContext.sourceImageWidth * 360 - 180, 90 - contextTop / vikingContext.sourceImageHeight * 180]),
];
// Native bounds of the Murray Lab E076_N16 tile; regional preview is downsampled.
const regionalExtent = [4504877.011771274, 948395.1603728997, 4741975.801864498, 1185493.9504661246];

function App() {
  const target = useRef<HTMLDivElement>(null);
  const input = useRef<HTMLInputElement>(null);
  const [intro, setIntro] = useState(true);
  const enterMap = useCallback(() => setIntro(false), []);
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<Entry>();
  const [directionsOpen, setDirectionsOpen] = useState(false);
  const [findings, setFindings] = useState<{ area: string; startNew: boolean }>();
  const [trackSource] = useState(() => new VectorSource<Feature<MultiPoint>>());
  const updateTrack = useCallback((points: number[][]) => {
    trackSource.clear();
    if (points.length) trackSource.addFeature(new Feature(new MultiPoint(points)));
  }, [trackSource]);
  const terrainLayers = useRef<ReturnType<typeof makeTerrainLayers>>([]);
  const [visibleTerrain, setVisibleTerrain] = useState(() => terrain.map(layer => layer.defaultVisible));
  const [layersOpen, setLayersOpen] = useState(false);
  const [warmOptical, setWarmOptical] = useState(true);
  const [surfaceViewsOpen, setSurfaceViewsOpen] = useState(false);
  const results = search(query);
  function select(entry: Entry) {
    setFindings(undefined);
    setDirectionsOpen(false);
    setSelected(entry);
    setQuery(entry.name);
    setOpen(false);
  }
  function clear() {
    setSelected(undefined);
    setQuery('');
    input.current?.focus();
    setOpen(false);
  }
  useEffect(() => {
    if (intro || !target.current) return;
    const surface = target.current;
    const projection = new Projection({ code: site.projection.name, units: 'm', extent: globalExtent });
    const view = new View({ projection, center: site.centerProjectedM, maxResolution: 4096, minResolution: 2, extent: globalExtent });
    const optical = (url: string, imageExtent: number[], maxResolution?: number, className?: string) =>
      new ImageLayer({ className, maxResolution, source: new ImageStatic({ url, imageExtent, projection }) });
    const overlays = makeTerrainLayers(projection);
    terrainLayers.current = overlays;
    const map = new Map({
      target: surface, view, pixelRatio: Math.min(window.devicePixelRatio || 1, 2),
      layers: [
        optical(vikingImage, globalExtent),
        optical(import.meta.env.BASE_URL + vikingContext.path, vikingContextExtent),
        optical(import.meta.env.BASE_URL + 'assets/ctx/jezero-regional-ctx.jpg', regionalExtent, 1000, 'ctx-optical'),
        optical(import.meta.env.BASE_URL + ctx.path, ctx.boundsProjectedM, 160, 'ctx-optical'),
        ...overlays, new VectorLayer({
        source: trackSource,
        style: new Style({ image: new CircleStyle({ radius: 2, fill: new Fill({ color: '#ff963f' }) }) }),
      }), new VectorLayer({
        source: new VectorSource({ features: [new Feature(fromExtent(site.bboxProjectedM))] }),
        style: [
          new Style({ stroke: new Stroke({ color: '#25160d', width: 4, lineDash: [7, 5] }) }),
          new Style({ stroke: new Stroke({ color: '#ffb568', width: 2, lineDash: [7, 5] }) }),
        ],
      })],
    });
    const markers = places.map(place => {
      const button = document.createElement('button');
      button.className = 'marker';
      button.type = 'button';
      button.textContent = place.name;
      button.onclick = () => select(entries.find(entry => entry.key === place.id)!);
      const element = document.createElement('div');
      element.className = 'marker-anchor';
      const leader = document.createElement('span');
      leader.className = 'marker-leader';
      leader.setAttribute('aria-hidden', 'true');
      element.append(leader, button);
      const overlay = new Overlay({ element, position: project(place.anchor), positioning: 'center-center' });
      map.addOverlay(overlay);
      return { button, leader, overlay, id: place.id };
    });
    const layoutLabels = () => {
      const size = map.getSize();
      if (!size || !map.isRendered()) return;
      const placed: DOMRect[] = [];
      const priority = [...markers].sort((a, b) =>
        Number(b.button.getAttribute('aria-pressed') === 'true') - Number(a.button.getAttribute('aria-pressed') === 'true'));
      for (const { button, leader, overlay } of priority) {
        const pixel = map.getPixelFromCoordinate(overlay.getPosition()!);
        if (!pixel) continue;
        const [x, y] = pixel;
        const w = button.offsetWidth, h = button.offsetHeight;
        const offsets = [0, -1, 1, -2, 2, -3, 3, -4, 4];
        let placedLabel = false;
        if (x >= 0 && x <= size[0] && y >= 0 && y <= size[1]) {
          for (const row of offsets) {
            const dy = row * (h + 6);
            for (const side of [1, -1]) {
              const dx = side > 0 ? 10 : -w - 10;
              const rect = new DOMRect(x + dx - 3, y + dy - h / 2 - 3, w + 6, h + 6);
              if (rect.left < 4 || rect.top < 4 || rect.right > size[0] - 4 || rect.bottom > size[1] - 4 ||
                  placed.some(other => rect.left < other.right && rect.right > other.left &&
                    rect.top < other.bottom && rect.bottom > other.top)) continue;
              button.style.transform = `translate(${dx}px, ${dy - h / 2}px)`;
              leader.style.width = `${Math.hypot(10, dy)}px`;
              leader.style.transform = `rotate(${Math.atan2(dy, side * 10)}rad)`;
              placed.push(rect);
              placedLabel = true;
              break;
            }
            if (placedLabel) break;
          }
        }
        button.style.visibility = leader.style.visibility = placedLabel ? 'visible' : 'hidden';
      }
    };
    map.on('postrender', layoutLabels);
    const fit = () => {
      view.fit(site.bboxProjectedM, { padding: [24, 26, 28, 26] });
    };
    fit();
    surface.focus({ preventScroll: true });
    const resize = new ResizeObserver(() => {
      map.updateSize();
    });
    resize.observe(surface);
    const listener = (event: Event) => {
      const id = (event as CustomEvent<string>).detail;
      markers.forEach(({ button, id: markerId }) => button.setAttribute('aria-pressed', String(markerId === id)));
      map.render();
      const marker = markers.find(item => item.id === id);
      if (marker) view.animate({ center: marker.overlay.getPosition(), duration: 250 });
      else fit();
    };
    surface.addEventListener('hydro-selection', listener);
    return () => {
      resize.disconnect();
      surface.removeEventListener('hydro-selection', listener);
      map.dispose();
    };
  }, [intro, trackSource]);
  useEffect(() => {
    terrainLayers.current.forEach((layer, index) => layer.setVisible(visibleTerrain[index]));
  }, [intro, visibleTerrain]);
  useEffect(() => {
    if (selected) target.current?.dispatchEvent(new CustomEvent('hydro-selection', { detail: selected.place.id }));
    else if (!intro) target.current?.dispatchEvent(new CustomEvent('hydro-selection'));
  }, [selected]);

  return <>
    <header className="masthead"><img src={import.meta.env.BASE_URL + 'hydro-wordmark.png'} alt="Hydro" /><span>Uncover Jezero’s water</span></header>
    {!intro && <main>
      <div className={warmOptical ? 'map warm-optical' : 'map'} ref={target} tabIndex={0} aria-label="Interactive Jezero Crater map" />
      <section className="panel" aria-label="Jezero search" onKeyDown={event => {
        if (event.key === 'Escape' && open) { input.current?.focus(); setOpen(false); }
      }}>
        <form onSubmit={event => { event.preventDefault(); if (results[0]) select(results[0]); }}>
          <span className="search-icon" aria-hidden="true" />
          <input ref={input} aria-label="Search Jezero" placeholder="Search Jezero" value={query}
            aria-controls={open ? 'results' : undefined}
            onFocus={() => setOpen(true)} onClick={() => setOpen(true)} onChange={event => { setQuery(event.target.value); setOpen(true); }} />
          {(selected || query) && <button type="button" onClick={clear} aria-label="Clear selection">×</button>}
        </form>
        {open && <div id="results" className="surface">
          <div className="search-results-header"><strong>{query.trim() ? 'Search results' : 'Places in Jezero'}</strong>
            <button type="button" aria-label="Close search results" onClick={() => { input.current?.focus(); setOpen(false); }}>×</button></div>
          {results.length ? <ul>{results.map(entry => <li key={entry.key}>
            <button onClick={() => select(entry)}>{entry.name}{entry.nested && <small>Hawksbill Gap</small>}</button>
          </li>)}</ul> : <p role="status">No matching places.</p>}
        </div>}
        <button className="layers-toggle directions-toggle" type="button" aria-expanded={directionsOpen}
          onClick={() => { setFindings(undefined); setOpen(false); setLayersOpen(false); setDirectionsOpen(!directionsOpen); }}>
          {directionsOpen ? 'Close Directions' : 'Directions'}
        </button>
        <button className="layers-toggle findings-toggle" type="button" aria-expanded={Boolean(findings)}
          onClick={() => {
            setOpen(false);
            setLayersOpen(false);
            setDirectionsOpen(false);
            setFindings(findings ? undefined : { area: selected?.place.id ?? '', startNew: false });
          }}>{findings ? 'Close Findings' : 'Findings'}</button>
        {directionsOpen && !open && <Directions initialStop={selected?.place.id ?? ''} onTrack={updateTrack} />}
        {findings && <div hidden={open}><Findings {...findings} /></div>}
        {selected && !open && !directionsOpen && !findings && <ScienceCard key={selected.key} entry={selected} onSelect={select}
          onNewFinding={() => {
            setLayersOpen(false);
            setFindings({ area: selected.place.id, startNew: true });
          }} />}
      </section>
      <div className="map-title"><span aria-hidden="true" /> Hydro study area <small>Jezero Crater and nearby sites</small></div>
      <div className="layer-control">
        {layersOpen && <section id="terrain-options" className="surface" aria-label="Map layers">
          <label><input type="checkbox" checked={warmOptical} onChange={event => setWarmOptical(event.target.checked)} /> Warm optical colors</label>
          {terrain.map((layer, index) => <label key={layer.id}>
            <input type="checkbox" checked={visibleTerrain[index]} onChange={event => {
              const enabled = event.target.checked;
              setVisibleTerrain(previous => previous.map((value, i) =>
                i === index ? enabled : enabled && layer.type !== 'vector' && terrain[i].type !== 'vector' ? false : value));
            }} />
            {layer.name}
          </label>)}
          {visibleTerrain[0] && <p className="elevation-key">Derived elevation · {elevationRange[0]} to {elevationRange[1]} m relative to the Mars areoid
            <span aria-hidden="true" />
          </p>}
          {terrain.some((layer, i) => layer.id === 'contours' && visibleTerrain[i]) &&
            <p>Derived contours · 50 m interval, 100 m index lines</p>}
          {visibleTerrain[2] && <p>CTX gaps show the underlying optical imagery.</p>}
          <p className="position-note">Slope and walking access · Unknown</p>
        </section>}
        <button className="layers-toggle" type="button" aria-expanded={layersOpen}
          aria-controls={layersOpen ? 'terrain-options' : undefined}
          onClick={() => setLayersOpen(!layersOpen)}>Layers</button>
        {' '}<button className="layers-toggle" type="button" onClick={() => setSurfaceViewsOpen(true)}>Surface views</button>
      </div>
      <div className="terrain-credits">
        {terrain.filter((_, index) => visibleTerrain[index]).map(layer => <div key={layer.id}>
          {layer.units && <div>Historical · {layer.units}</div>}
          <a target="_blank" rel="noopener noreferrer" href={layer.sourcePage}>{layer.name} · {layer.credit}</a>
          {layer.licenseUrl && <> · <a target="_blank" rel="noopener noreferrer" href={layer.licenseUrl}>{layer.license}</a>
            {' · '}<a target="_blank" rel="noopener noreferrer" href={import.meta.env.BASE_URL + 'assets/HRSC-LICENSE.md'}>Adaptation notes</a></>}
          {layer.license === 'CC0-1.0' && <> · CC0 1.0</>}
        </div>)}
      </div>
      <div className="credit map-credits">
        <a target="_blank" rel="noopener noreferrer" href={vikingSource}>{vikingCredit}</a>
        {' · '}<a target="_blank" rel="noopener noreferrer" href={ctx.sourcePage}>MRO CTX{warmOptical ? ' (display tint)' : ''} · {ctx.credit}</a>
      </div>
      {surfaceViewsOpen && <SurfaceViews onClose={() => setSurfaceViewsOpen(false)} />}
    </main>}
    {intro && <MarsIntro onEnter={enterMap} />}
  </>;
}
createRoot(document.getElementById('root')!).render(<App />);

