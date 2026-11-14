import { useRef } from 'react';
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
  const group = cards.find(card => card.id === entry.place.id);
  const card = entry.nested ? group?.details.find(detail => detail.name === entry.name) : group;

  if (!card) return <article className="surface"><h1>{entry.name}</h1><p>Science card unavailable.</p></article>;

  const { photo } = card;
  const imageUrl = import.meta.env.BASE_URL + photo.path;
  const figure = 'figure' in card ? card.figure : null;

  return <article className="surface science-card" aria-label="Science card">
    <h1>{entry.name}</h1>
    {entry.nested && <small>Hawksbill Gap · Independent pin Unknown</small>}
    <p>{card.summary}</p>
    <p className="position-note">{card.position}</p>
    <figure>
      <img className="card-photo" src={imageUrl} alt={photo.caption} />
      <figcaption>{photo.caption}</figcaption>
    </figure>
    <button type="button" className="photo-action" onClick={() => viewer.current?.showModal()}>View photo</button>
    <div className="science-links">
      {card.source && <a target="_blank" rel="noopener noreferrer" href={card.source}>Science source</a>}
      {figure && <a target="_blank" rel="noopener noreferrer" href={figure.url}>Published {figure.label}</a>}
      <a target="_blank" rel="noopener noreferrer" href={photo.source}>Image source</a>
    </div>
    <small>Image credit · {photo.credit}</small>
    <HistoricalConditions id={entry.place.id} nested={entry.nested} />
    <section>
      <h2>{entry.nested ? 'Hawksbill Gap caution' : 'Terrain caution'}</h2>
      <AreaCaution id={entry.place.id} />
      <small>Local slope, footing and walking access · Unknown</small>
      <button className="layers-toggle directions-toggle" type="button" onClick={onNewFinding}>Add astronaut finding</button>
    </section>
    {!entry.nested && group && group.details.length > 0 && <section>
      <h2>Hawksbill Gap outcrops</h2>
      <ul>{entries.filter(item => item.nested && item.place.id === entry.place.id).map(item =>
        <li key={item.key}><button type="button" onClick={() => onSelect(item)}>{item.name}</button></li>
      )}</ul>
    </section>}
    <dialog className="photo-viewer" ref={viewer} aria-labelledby="photo-title">
      <div className="photo-header">
        <h2 id="photo-title">{entry.name}</h2>
        <form method="dialog"><button aria-label="Close photo" autoFocus>×</button></form>
      </div>
      <figure>
        <img src={imageUrl} alt={photo.caption} loading="lazy" />
        <figcaption>{photo.caption}</figcaption>
      </figure>
      <p>Image credit · {photo.credit}</p>
      <div className="science-links">
        <a target="_blank" rel="noopener noreferrer" href={photo.source}>Image source</a>
        {photo.reuse && <a target="_blank" rel="noopener noreferrer" href={photo.reuse}>Image use terms</a>}
      </div>
    </dialog>
  </article>;
}
