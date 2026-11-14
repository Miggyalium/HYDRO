import { useRef, useState } from 'react';
import { panoramas, RoverPanorama } from './RoverPanorama';
import { HistoricalConditions } from './HistoricalConditions';
import { AreaCaution } from './Directions';
import cards from './data/cards.json';
import { entries, type Entry } from './lib/places';

export function ScienceCard({ entry, onSelect, onNewFinding }: {
  entry: Entry;
  onSelect: (entry: Entry) => void;
  onNewFinding: () => void;
}) {
  const viewer = useRef<HTMLDialogElement>(null);
  const [panoramaOpen, setPanoramaOpen] = useState(false);
  const panorama = panoramas[entry.key];
  const group = cards.find(card => card.id === entry.place.id);
  const card = entry.nested ? group?.details.find(detail => detail.name === entry.name) : group;

  if (!card) return <article className="surface"><h1>{entry.name}</h1><p>Science card unavailable.</p></article>;

  const { photo } = card;
  const imageUrl = import.meta.env.BASE_URL + photo.path;
  const figure = 'figure' in card ? card.figure : null;

  return <article className="surface science-card" aria-label="Science card">
    <h1>{entry.name}</h1>
    <details className="science-section" name="science-info"><summary>Overview</summary>
    {entry.nested && <small>Hawksbill Gap · Independent pin Unknown</small>}
    <p>{card.summary}</p>
    <p className="position-note">{card.position}</p>
    {'positionSource' in card && <div className="science-links"><a target="_blank" rel="noopener noreferrer" href={card.positionSource}>IAU/USGS position source</a></div>}
    {card.source && <div className="science-links"><a target="_blank" rel="noopener noreferrer" href={card.source}>Science source</a></div>}
    </details>
    <details className="science-section" name="science-info"><summary>Images & 360° views</summary>
    <figure>
      <img className="card-photo" src={imageUrl} alt={photo.caption} loading="lazy" />
      <figcaption>{photo.caption}</figcaption>
    </figure>
    <button type="button" className="photo-action" onClick={() => viewer.current?.showModal()}>Open image view</button>
    {panorama
      ? <button type="button" className="layers-toggle directions-toggle" onClick={() => setPanoramaOpen(true)}>360° look-around</button>
      : <p className="position-note">No 360° images available</p>}
    <div className="science-links">
      {figure && <a target="_blank" rel="noopener noreferrer" href={figure.url}>Published {figure.label}</a>}
      <a target="_blank" rel="noopener noreferrer" href={photo.source}>Image source</a>
    </div>
    <small>Image credit · {photo.credit}</small>
    </details>
    <details className="science-section" name="science-info"><summary>Historical conditions</summary>
    <HistoricalConditions id={entry.place.id} nested={entry.nested} />
    </details>
    <details className="science-section" name="science-info"><summary>Terrain cautions</summary>
      <AreaCaution id={entry.place.id} />
      {entry.key === 'dacono' && <p>Published study result · <strong>16.7° derived inclination</strong> for selected talus transects. <a href="https://doi.org/10.2478/mgrsd-2025-0032" target="_blank" rel="noopener noreferrer">Talus study</a></p>}
      <small>Local slope, footing and walking access · Unknown</small>
      <button className="layers-toggle directions-toggle" type="button" onClick={onNewFinding}>Add astronaut finding</button>
    </details>
    {!entry.nested && group && group.details.length > 0 && <details className="science-section" name="science-info">
      <summary>Hawksbill Gap outcrops</summary>
      <ul>{entries.filter(item => item.nested && item.place.id === entry.place.id).map(item =>
        <li key={item.key}><button type="button" onClick={() => onSelect(item)}>{item.name}</button></li>
      )}</ul>
    </details>}
    {panoramaOpen && panorama && <RoverPanorama panorama={panorama} onClose={() => setPanoramaOpen(false)} />}
    <dialog className="photo-viewer" ref={viewer} aria-labelledby="photo-title">
      <div className="photo-header">
        <div><small>Jezero image view</small><h2 id="photo-title">{entry.name}</h2></div>
        <form method="dialog"><button aria-label="Back to map" autoFocus>← Back to map</button></form>
      </div>
      <figure>
        <img src={imageUrl} alt={photo.caption} loading="lazy" />
      </figure>
      <p className="position-note">{photo.caption}</p>
      <p>Image credit · {photo.credit}</p>
      <div className="science-links">
        <a target="_blank" rel="noopener noreferrer" href={photo.source}>Image source</a>
        {photo.reuse && <a target="_blank" rel="noopener noreferrer" href={photo.reuse}>Image use terms</a>}
      </div>
    </dialog>
  </article>;
}
