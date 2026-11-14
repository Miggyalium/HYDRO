import { useEffect, useRef, useState } from 'react';
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

function App() {
  const target = useRef<HTMLDivElement>(null);
  const input = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<Entry>();
  const results = search(query);
  function select(entry: Entry) {
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
    const map = new Map({
      target: target.current!, view,
      layers: [new ImageLayer({ source: new ImageStatic({
        url: import.meta.env.BASE_URL + ctx.path, imageExtent: ctx.boundsProjectedM, projection,
      }) })],
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
  }, []);
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
        {selected && !open && <article className="surface" aria-live="polite">
          <h1>{selected.name}</h1>
          <p>{selected.nested ? 'Hawksbill Gap · Independent pin Unknown' : selected.place.positionStatus}</p>
        </article>}
      </section>
      <span className="map-title" aria-hidden="true">Jezero Crater</span>
      <a className="credit" href={ctx.sourcePage}>MRO CTX · {ctx.credit}</a>
    </main>
  </>;
}
createRoot(document.getElementById('root')!).render(<App />);

