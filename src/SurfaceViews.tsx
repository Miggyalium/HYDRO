import { useRef, useState } from 'react';
import cards from './data/cards.json';
import { places } from './lib/places';

const views = cards.flatMap(card => {
  const place = places.find(item => item.id === card.id);
  if (!place || ['sava-vallis', 'pliva-vallis', 'dacono', 'jezero-floor'].includes(card.id)) return [];
  return [{ id: card.id, name: place.name, photo: card.photo }];
});

export function SurfaceViews({ onClose }: { onClose: () => void }) {
  const [index, setIndex] = useState(Math.max(0, views.findIndex(card => card.id === 'margin-unit')));
  const [zoom, setZoom] = useState(1);
  const viewport = useRef<HTMLDivElement>(null);
  const { name, photo } = views[index];

  return <dialog className="photo-viewer surface-viewer" aria-labelledby="surface-title"
    ref={dialog => { if (dialog && !dialog.open) dialog.showModal(); }} onClose={onClose}>
    <div className="photo-header">
      <h2 id="surface-title">Jezero surface views</h2>
      <form method="dialog"><button autoFocus>← Back to Hydro</button></form>
    </div>
    <div className="surface-view-controls">
      <label>Viewpoint <select value={index} onChange={event => {
        setIndex(Number(event.target.value));
        setZoom(1);
        viewport.current?.scrollTo(0, 0);
      }}>
        {views.map((card, i) => <option key={card.id} value={i}>{card.name}</option>)}
      </select></label>
      <button className="layers-toggle" type="button" aria-label="Zoom out image" disabled={zoom <= 1}
        onClick={() => setZoom(zoom - .5)}>−</button>
      <button className="layers-toggle" type="button" aria-label="Zoom in image" disabled={zoom >= 3}
        onClick={() => setZoom(zoom + .5)}>+</button>
    </div>
    <div className="surface-image-viewport" ref={viewport} tabIndex={0} role="region"
      aria-label={name + ' image. Scroll to pan when zoomed in.'}>
      <img src={import.meta.env.BASE_URL + photo.path} alt={photo.caption} style={{ width: `${zoom * 100}%` }} />
    </div>
    <p className="position-note">{photo.caption} Zoom in and scroll to inspect the image.</p>
    <div className="science-links">
      <a href={photo.source} target="_blank" rel="noopener noreferrer">Image source · {photo.credit}</a>
      {photo.reuse && <a href={photo.reuse} target="_blank" rel="noopener noreferrer">Image use terms</a>}
    </div>
  </dialog>;
}
