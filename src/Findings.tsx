import { useState, type FormEvent } from 'react';
import { places } from './lib/places';

const storageKey = 'hydro.findings.v1';
const categories = [
  'Terrain & slope', 'Surface & footing', 'Obstacles & access',
  'Environment & visibility', 'Geology & water-history science',
];
const ratings = ['Unassessed', '1 Low concern', '2 Moderate concern', '3 High concern', '4 Immediate danger'];
type Finding = {
  id: string; area: string; category: string; title: string; observation: string;
  rating: number; reason: string; date: string; evidence: string;
};

function loadFindings(): Finding[] {
  const data: unknown = JSON.parse(localStorage.getItem(storageKey) ?? '[]');
  if (!Array.isArray(data) || !data.every(item => item && Number.isInteger(item.rating)
    && item.rating >= 0 && item.rating < ratings.length
    && ['id', 'area', 'category', 'title', 'observation', 'reason', 'date', 'evidence']
      .every(key => typeof item[key] === 'string'))) throw new Error('Invalid saved records');
  return data;
}

export function Findings({ area, startNew }: { area: string; startNew: boolean }) {
  const [saved, setSaved] = useState(() => {
    try { return loadFindings(); } catch { return null; }
  });
  const [writing, setWriting] = useState(startNew);
  const [selected, setSelected] = useState<Finding>();
  const [rating, setRating] = useState(0);
  const [message, setMessage] = useState('');
  const areaName = (id: string) => places.find(place => place.id === id)?.name ?? id;

  function newFinding() {
    setSelected(undefined);
    setRating(0);
    setMessage('');
    setWriting(true);
  }

  function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const fields = new FormData(event.currentTarget);
    const field = (key: string) => String(fields.get(key) ?? '').trim();
    const title = field('title');
    const observation = field('observation');
    const reason = field('reason');
    const evidence = field('evidence');
    if (!title || !observation || (rating > 0 && !reason)) {
      setMessage('Enter a title, an observation, and a reason if you selected a rating.');
      return;
    }
    if (evidence && !/^https?:\/\//i.test(evidence)) {
      setMessage('Use an http or https evidence link.');
      return;
    }
    try {
      const next = [{ id: crypto.randomUUID(), area: field('area'), category: field('category'),
        title, observation, rating, reason, date: field('date'), evidence }, ...loadFindings()];
      localStorage.setItem(storageKey, JSON.stringify(next));
      setSaved(next);
      setWriting(false);
      setMessage('Finding saved in this browser.');
    } catch {
      setMessage('Could not save to this browser. Your draft is still open.');
    }
  }

  return <section className="surface findings" aria-label="Astronaut Findings">
    <h1>{writing ? 'New finding' : selected ? selected.title : 'Saved findings'}</h1>
    <small>User-reported · Unverified</small>
    {message && <p role="status">{message}</p>}
    {writing ? <form className="findings-form" onSubmit={save}>
      <label>Area<select name="area" required defaultValue={area}>
        <option value="">Choose an area</option>
        {places.map(place => <option key={place.id} value={place.id}>{place.name}</option>)}
      </select></label>
      <label>Category<select name="category" required defaultValue="">
        <option value="">Choose a category</option>
        {categories.map(category => <option key={category}>{category}</option>)}
      </select></label>
      <label>Title<input name="title" required maxLength={100} /></label>
      <label>Observation<textarea name="observation" required rows={4} /></label>
      <label>Subjective danger rating<select value={rating} onChange={event => setRating(Number(event.target.value))}>
        {ratings.map((label, index) => <option key={label} value={index}>{label}</option>)}
      </select></label>
      {rating > 0 && <label>Reason for rating<input name="reason" required /></label>}
      <label>Observation date (optional)<input name="date" type="date" /></label>
      <label>Evidence link (optional)<input name="evidence" type="url" /></label>
      <button type="submit" className="layers-toggle">Save finding</button>
      <button type="button" onClick={() => { setMessage(''); setWriting(false); }}>Back to saved findings</button>
    </form> : <>
      {selected ? <>
        <p>{areaName(selected.area)} · {selected.category}</p>
        <p className="finding-observation">{selected.observation}</p>
        <p>Subjective danger rating · {ratings[selected.rating]}</p>
        {selected.reason && <p>{selected.reason}</p>}
        {selected.date && <p>Observation date · {selected.date}</p>}
        {/^https?:\/\//i.test(selected.evidence) &&
          <a href={selected.evidence} target="_blank" rel="noopener noreferrer">Evidence link</a>}
        <p><button type="button" onClick={() => setSelected(undefined)}>Back to saved findings</button></p>
      </> : saved === null ? <p>Saved findings could not be read in this browser.</p>
        : saved.length ? <ul>{saved.map(item => <li key={item.id}>
          <button type="button" onClick={() => { setSelected(item); setMessage(''); }}>
            {item.title}<small>{areaName(item.area)}</small>
          </button>
        </li>)}</ul> : <p>No findings saved in this browser.</p>}
      <button type="button" className="layers-toggle" onClick={newFinding}>New finding</button>
    </>}
  </section>;
}
