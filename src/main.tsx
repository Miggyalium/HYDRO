import { useCallback, useEffect, useRef, useState } from 'react';
import Feature from 'ol/Feature.js';
import MultiPoint from 'ol/geom/MultiPoint.js';
import Point from 'ol/geom/Point.js';
import LineString from 'ol/geom/LineString.js';
import { fromExtent } from 'ol/geom/Polygon.js';
import VectorLayer from 'ol/layer/Vector.js';
import VectorSource from 'ol/source/Vector.js';
import Style from 'ol/style/Style.js';
import CircleStyle from 'ol/style/Circle.js';
import Fill from 'ol/style/Fill.js';
import Stroke from 'ol/style/Stroke.js';
import Text from 'ol/style/Text.js';
import { createRoot } from 'react-dom/client';
import Map from 'ol/Map.js';
import View from 'ol/View.js';
import Overlay from 'ol/Overlay.js';
import Projection from 'ol/proj/Projection.js';
import ImageLayer from 'ol/layer/Image.js';
import ImageStatic from 'ol/source/ImageStatic.js';
import site from './data/site.json';
import ctx from './data/ctx.json';
import cards from './data/cards.json';
import vikingContext from './data/viking-context.json';
import { entries, landmarkId, places, project, search, unproject, type Entry } from './lib/places';
import { marsDistanceKm, marsRadiusSource } from './lib/marsDistance';
import 'ol/ol.css';
import './style.css';
import { ScienceCard } from './ScienceCard';
import { SurfaceViews } from './SurfaceViews';
import { Findings } from './Findings';
import { Directions, type DirectionLine } from './Directions';
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
const hrscColorPath = 'assets/ctx/jezero-ctx-hrsc-color.jpg';
const hrscColorSource = 'https://hrscteam.dlr.de/public/data/HMC30/quads.php?quad=mc13e';
const layerDescriptions: Record<string, string> = {
  optical: 'Combines color observed by Mars Express HRSC with sharper surface detail from NASA’s CTX camera.',
  'hrsc-elevation': 'Colors show elevation relative to the Mars areoid, the reference surface used for these heights.',
  'hrsc-hillshade': 'Simulated lighting on HRSC elevation highlights broad landforms such as the crater rim and valleys.',
  'ctx-hillshade': 'Simulated lighting on a terrain model derived from CTX imagery brings out local surface relief. Gaps show the underlying optical imagery.',
  'themis-day': 'Historical daytime infrared brightness recorded from orbit. The shades show relative brightness rather than temperature readings.',
  'themis-night': 'Historical nighttime infrared brightness recorded from orbit. The shades help compare how surfaces emit heat at night.',
  contours: 'Derived lines connect points at the same elevation. Closely spaced lines indicate steeper terrain at this map’s scale.',
};

function RailButton({ label, preview, expanded, pressed, onClick }: {
  label: string; preview?: string; expanded?: boolean; pressed?: boolean; onClick: () => void;
}) {
  return <button type="button" aria-label={label} aria-expanded={expanded} aria-pressed={pressed} onClick={onClick}>
    {preview && <img src={import.meta.env.BASE_URL + preview} alt="" loading="lazy" />}
    <span aria-hidden="true">{label}</span>
  </button>;
}

function App() {
  const target = useRef<HTMLDivElement>(null);
  const input = useRef<HTMLInputElement>(null);
  const [intro, setIntro] = useState(true);
  const enterMap = useCallback(() => setIntro(false), []);
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<Entry>();
  const [directionsOpen, setDirectionsOpen] = useState(false);
  const [stops, setStops] = useState(['', '']);
  const [landmarksOpen, setLandmarksOpen] = useState(false);
  const [placingLandmark, setPlacingLandmark] = useState(false);
  const [placementOutside, setPlacementOutside] = useState(false);
  const placingRef = useRef(false);
  const [landmark, setLandmark] = useState<[number, number]>();
  const [landmarkSource] = useState(() => new VectorSource<Feature<Point>>());
  function setPlacement(enabled: boolean) {
    placingRef.current = enabled;
    setPlacingLandmark(enabled);
    setPlacementOutside(false);
  }
  const [findings, setFindings] = useState<{ area: string; startNew: boolean }>();
  const [trackSource] = useState(() => new VectorSource<Feature<MultiPoint>>());
  const [lineSource] = useState(() => new VectorSource<Feature<LineString>>());
  const updateLines = useCallback((lines: DirectionLine[]) => {
    lineSource.clear();
    lineSource.addFeatures(lines.map(({ coordinates, label }) => {
      const feature = new Feature(new LineString(coordinates));
      feature.setStyle([
        new Style({ stroke: new Stroke({ color: '#152738', width: 6, lineDash: [10, 7] }) }),
        new Style({
          stroke: new Stroke({ color: '#93dcff', width: 3, lineDash: [10, 7] }),
          text: new Text({
            text: label + ' straight-line', font: '600 12px system-ui', offsetY: -13,
            fill: new Fill({ color: '#fff' }), backgroundFill: new Fill({ color: '#152738' }),
            padding: [3, 5, 3, 5],
          }),
        }),
      ]);
      return feature;
    }));
  }, [lineSource]);
  const updateTrack = useCallback((points: number[][]) => {
    trackSource.clear();
    if (points.length) trackSource.addFeature(new Feature(new MultiPoint(points)));
  }, [trackSource]);
  const terrainLayers = useRef<ReturnType<typeof makeTerrainLayers>>([]);
  const [visibleTerrain, setVisibleTerrain] = useState(() => terrain.map(layer => layer.defaultVisible));
  const [layersOpen, setLayersOpen] = useState(false);
  const [colorOptical, setColorOptical] = useState(true);
  const [inspectedLayer, setInspectedLayer] = useState<string>();
  const colorLayer = useRef<ImageLayer<ImageStatic> | null>(null);
  const [surfaceViewsOpen, setSurfaceViewsOpen] = useState(false);
  const results = search(query);
  const journeyDestination = places.find(place => place.id === stops.at(-1));
  function continueFromLandmark(destination: string) {
    setPlacement(false);
    setStops([landmarkId, destination]);
    setLandmarksOpen(false);
    setDirectionsOpen(true);
  }
  function select(entry: Entry) {
    setPlacement(false);
    setLandmarksOpen(false);
    setLayersOpen(false);
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
    const measuredColor = optical(import.meta.env.BASE_URL + hrscColorPath, ctx.boundsProjectedM, 160);
    colorLayer.current = measuredColor;
    terrainLayers.current = overlays;
    const map = new Map({
      target: surface, view, pixelRatio: Math.min(window.devicePixelRatio || 1, 2),
      layers: [
        optical(vikingImage, globalExtent),
        optical(import.meta.env.BASE_URL + vikingContext.path, vikingContextExtent),
        optical(import.meta.env.BASE_URL + 'assets/ctx/jezero-regional-ctx.jpg', regionalExtent, 1000, 'ctx-optical'),
        optical(import.meta.env.BASE_URL + ctx.path, ctx.boundsProjectedM, 160, 'ctx-optical'),
        measuredColor,
        ...overlays, new VectorLayer({ source: lineSource }), new VectorLayer({
        source: trackSource,
        style: new Style({ image: new CircleStyle({ radius: 2, fill: new Fill({ color: '#ff963f' }) }) }),
      }), new VectorLayer({
        source: new VectorSource({ features: [new Feature(fromExtent(site.bboxProjectedM))] }),
        style: [
          new Style({ stroke: new Stroke({ color: '#25160d', width: 4, lineDash: [7, 5] }) }),
          new Style({ stroke: new Stroke({ color: '#ffb568', width: 2, lineDash: [7, 5] }) }),
        ],
      }), new VectorLayer({
        source: landmarkSource,
        style: new Style({
          image: new CircleStyle({ radius: 8, fill: new Fill({ color: '#86e4d4' }), stroke: new Stroke({ color: '#182629', width: 3 }) }),
          text: new Text({
            text: 'My landmark', offsetY: -17, font: '600 12px system-ui',
            fill: new Fill({ color: '#fff' }), backgroundFill: new Fill({ color: '#182629' }), padding: [3, 5, 3, 5],
          }),
        }),
      })],
    });
    const placeLandmark = (coordinate: number[]) => {
      const [x, y] = coordinate;
      const [west, south, east, north] = site.bboxProjectedM;
      if (x < west || x > east || y < south || y > north) {
        setPlacementOutside(true);
        return;
      }
      setLandmark(unproject(coordinate));
      setPlacement(false);
    };
    map.on('singleclick', event => {
      if (placingRef.current) placeLandmark(event.coordinate);
    });
    surface.addEventListener('keydown', handlePlacementKey);
    function handlePlacementKey(event: KeyboardEvent) {
      if (!placingRef.current || event.target !== surface) return;
      if (event.key === 'Enter') {
        event.preventDefault();
        const center = view.getCenter();
        if (center) placeLandmark(center);
      } else if (event.key === 'Escape') setPlacement(false);
    }
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
      surface.removeEventListener('keydown', handlePlacementKey);
      surface.removeEventListener('hydro-selection', listener);
      map.dispose();
    };
  }, [intro, trackSource, lineSource, landmarkSource]);
  useEffect(() => {
    landmarkSource.clear();
    if (landmark) landmarkSource.addFeature(new Feature(new Point(project(landmark))));
  }, [landmark, landmarkSource]);
  useEffect(() => {
    colorLayer.current?.setVisible(colorOptical);
  }, [intro, colorOptical]);
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
      <div className={placingLandmark ? 'map placing-landmark' : 'map'} ref={target} tabIndex={0} aria-label="Interactive Jezero Crater map" />
      <nav className="map-tool-rail" aria-label="Map tools">
        <div className="rail-features" role="group" aria-label="Features">
        <RailButton label="Directions" preview="photos/pliva-ctx-review.png" expanded={directionsOpen && !open}
          onClick={() => {
            setPlacement(false); setLandmarksOpen(false); setFindings(undefined); setOpen(false); setLayersOpen(false);
            if (stops.every(stop => !stop) && selected) setStops(['', selected.place.id]);
            setDirectionsOpen(open || !directionsOpen);
          }} />
        <RailButton label="Findings" preview="assets/findings-icon.svg" expanded={Boolean(findings) && !open}
          onClick={() => {
            setPlacement(false);
            setLandmarksOpen(false);
            setOpen(false);
            setLayersOpen(false);
            setDirectionsOpen(false);
            setFindings(findings && !open ? undefined : { area: selected?.place.id ?? '', startNew: false });
          }} />
        <RailButton label="Surface views" preview="assets/surface-views-icon.svg" onClick={() => setSurfaceViewsOpen(true)} />
        <RailButton label="Landmark" preview="assets/landmark-icon.svg" expanded={landmarksOpen && !open}
          onClick={() => {
            setPlacement(false); setOpen(false); setFindings(undefined); setDirectionsOpen(false); setLayersOpen(false);
            setLandmarksOpen(open || !landmarksOpen);
          }} />
        </div>
        <div className="rail-places" role="group" aria-label="Jezero locations">
          <span className="rail-section-label" aria-hidden="true">Locations</span>
          {entries.filter(entry => !entry.nested).map(entry => <RailButton key={entry.key}
            label={entry.name} preview={cards.find(card => card.id === entry.key)?.photo.path}
            pressed={selected?.place.id === entry.key && !open && !directionsOpen && !findings}
            onClick={() => select(entry)} />)}
        </div>
      </nav>
      <section className="panel" aria-label="Jezero search" onKeyDown={event => {
        if (event.key === 'Escape' && open) { input.current?.focus(); setOpen(false); }
      }}>
        <form className="search-form" onSubmit={event => { event.preventDefault(); if (results[0]) select(results[0]); }}>
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
        {landmarksOpen && !open && <section className="surface landmark-panel" aria-label="Landmark">
          <h1>My landmark</h1>
          <p>Mark a rest stop or base camp inside the Hydro study area.</p>
          <button className="layers-toggle" type="button" onClick={() => {
            setPlacement(!placingLandmark);
            if (!placingLandmark) target.current?.focus({ preventScroll: true });
          }}>{placingLandmark ? 'Cancel placement' : landmark ? 'Move pin' : 'Place pin'}</button>
          {placingLandmark && <p role="status">{placementOutside ? 'That point is outside the study area. ' : ''}
            Click inside the dashed boundary, or pan with the arrow keys and press Enter to pin the map center.</p>}
          {landmark && <>
            {journeyDestination && <p>
              <strong>{marsDistanceKm(landmark, journeyDestination.anchor).toFixed(2)} km</strong> to {journeyDestination.name}
              <small>Straight-line distance · Derived</small>
              <button className="layers-toggle directions-toggle" type="button" onClick={() => continueFromLandmark(journeyDestination.id)}>
                Continue to {journeyDestination.name}
              </button>
            </p>}
            <p><strong>Straight-line distances</strong> · Derived</p>
            <ul>{places.map(place => <li key={place.id}><button type="button" onClick={() => continueFromLandmark(place.id)}>
              {place.name}<small>{marsDistanceKm(landmark, place.anchor).toFixed(2)} km · Open Directions</small>
            </button></li>)}</ul>
            <a href={marsRadiusSource} target="_blank" rel="noopener noreferrer">Mars distance reference</a>
            <p><button className="layers-toggle" type="button" onClick={() => {
              setPlacement(false);
              setLandmark(undefined);
              setStops(previous => previous.map(stop => stop === landmarkId ? '' : stop));
            }}>Remove pin</button></p>
          </>}
        </section>}
        {directionsOpen && !open && <Directions stops={stops} setStops={setStops} landmark={landmark} onTrack={updateTrack} onLines={updateLines}
          onOpenFindings={area => {
            setDirectionsOpen(false);
            setLayersOpen(false);
            setFindings({ area, startNew: true });
          }} />}
        {findings && <div hidden={open}><Findings {...findings} /></div>}
        {selected && !open && !directionsOpen && !findings && !landmarksOpen && <ScienceCard key={selected.key} entry={selected} onSelect={select}
          onNewFinding={() => {
            setLayersOpen(false);
            setFindings({ area: selected.place.id, startNew: true });
          }} />}
      </section>
      <div className="map-title"><span aria-hidden="true" /> Hydro study area <small>Jezero Crater and nearby sites</small></div>
      <div className="layer-control">
        {layersOpen && <section id="terrain-options" className="surface" aria-label="Map layers">
          <label><input type="checkbox" checked={colorOptical} onChange={event => {
            setInspectedLayer('optical');
            setColorOptical(event.target.checked);
          }} />
            <img src={import.meta.env.BASE_URL + hrscColorPath} alt="" />
            <span>HRSC color + CTX detail <small>Jezero overview</small></span>
          </label>
          {terrain.map((layer, index) => <label key={layer.id}>
            <input type="checkbox" checked={visibleTerrain[index]} onChange={event => {
              setInspectedLayer(layer.id);
              const enabled = event.target.checked;
              setVisibleTerrain(previous => previous.map((value, i) =>
                i === index ? enabled : enabled && layer.type !== 'vector' && terrain[i].type !== 'vector' ? false : value));
            }} />
            <img src={import.meta.env.BASE_URL + (layer.type === 'raster' ? 'assets/previews/elevation.png'
              : layer.type === 'vector' ? 'assets/previews/contours.png' : layer.path)} alt="" />
            <span>{layer.name}</span>
          </label>)}
          {visibleTerrain[0] && <p className="elevation-key">Derived elevation · {elevationRange[0]} to {elevationRange[1]} m relative to the Mars areoid
            <span aria-hidden="true" />
          </p>}
          {terrain.some((layer, i) => layer.id === 'contours' && visibleTerrain[i]) &&
            <p>Derived contours · 50 m interval, 100 m index lines</p>}
          <div aria-live="polite">
            {inspectedLayer && <div className="layer-description">
              <strong>{inspectedLayer === 'optical' ? 'HRSC color + CTX detail' : terrain.find(layer => layer.id === inspectedLayer)?.name}</strong>
              <p>{layerDescriptions[inspectedLayer]}</p>
            </div>}
          </div>
        </section>}
        <button className="layers-toggle map-layers-button" type="button" aria-expanded={layersOpen}
          aria-controls={layersOpen ? 'terrain-options' : undefined}
          onClick={() => { setOpen(false); setLayersOpen(!layersOpen); }}>
          <img src={import.meta.env.BASE_URL + 'assets/themis/dir-review.png'} alt="" />
          <span>Layers</span>
        </button>
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
        {' · '}<a target="_blank" rel="noopener noreferrer" href={ctx.sourcePage}>MRO CTX · {ctx.credit}</a>
        {colorOptical && <> · <a target="_blank" rel="noopener noreferrer" href={hrscColorSource}>HRSC color · ESA/DLR/FU Berlin</a>
          {' · '}<a target="_blank" rel="noopener noreferrer" href={import.meta.env.BASE_URL + 'assets/HRSC-LICENSE.md'}>CC BY-SA 3.0 IGO · Adaptation notes</a></>}
      </div>
      {surfaceViewsOpen && <SurfaceViews onClose={() => setSurfaceViewsOpen(false)} />}
    </main>}
    {intro && <MarsIntro onEnter={enterMap} />}
  </>;
}
createRoot(document.getElementById('root')!).render(<App />);

