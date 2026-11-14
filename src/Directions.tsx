import { useEffect, useMemo, useState } from 'react';
import { marsDistanceKm, marsRadiusSource } from './lib/marsDistance';
import { places, project } from './lib/places';
import registry from './data/directions-pairs.json';
import cautions from './data/cautions.json';

export const trackUrl = import.meta.env.BASE_URL + 'assets/directions/western-network-positions.csv';
const placesSource = 'https://pds-geosciences.wustl.edu/missions/mars2020/places.htm';
const nameOf = (id: string) => places.find(place => place.id === id)?.name ?? id;
const anchorOf = (id: string) => places.find(place => place.id === id)!.anchor;
const getPair = (a: string, b: string) => a !== b
  ? registry.pairs.find(pair => pair.areas.includes(a) && pair.areas.includes(b))
  : undefined;

export function AreaCaution({ id }: { id: string }) {
  const record = cautions[id as keyof typeof cautions];
  if (!record) return null;
  return <p>{record[0]} <a target="_blank" rel="noopener noreferrer" href={record[1]}>Source</a></p>;
}

export function Directions({ initialStop, onTrack }: {
  initialStop: string;
  onTrack: (points: number[][]) => void;
}) {
  const [stops, setStops] = useState(['', initialStop]);
  const [showTrack, setShowTrack] = useState(true);
  const [rows, setRows] = useState<number[][]>();
  const [failed, setFailed] = useState(false);
  const legs = useMemo(() => stops.slice(1).map((to, index) => {
    const from = stops[index];
    const pair = getPair(from, to);
    const track = pair?.historicalTrack;
    const slice = rows && track
      ? rows.filter(row => row[3] >= track.firstSclk && row[3] <= track.lastSclk)
      : [];
    const samples = track && slice.length === track.recordCount ? slice : [];
    const roverKm = samples.reduce((sum, row, i) =>
      i === 0 ? sum : sum + marsDistanceKm(samples[i - 1].slice(4, 6), row.slice(4, 6)), 0);
    return { from, to, pair, track, samples, roverKm,
      mapKm: pair ? marsDistanceKm(anchorOf(from), anchorOf(to)) : undefined };
  }), [stops, rows]);
  const hasTrack = legs.some(leg => leg.track);

  useEffect(() => {
    const controller = new AbortController();
    fetch(trackUrl, { signal: controller.signal }).then(response => {
      if (!response.ok) throw new Error('Track data unavailable');
      return response.text();
    }).then(csv => setRows(csv.trim().split(/\r?\n/).slice(1).map(row => row.split(',').map(Number))))
      .catch(() => { if (!controller.signal.aborted) setFailed(true); });
    return () => controller.abort();
  }, []);

  useEffect(() => {
    const points = new Map<number, number[]>();
    if (showTrack) {
      for (const leg of legs) {
        for (const [, , , clock, lon, lat] of leg.samples) points.set(clock, project([lon, lat]));
      }
    }
    onTrack([...points.values()]);
    return () => onTrack([]);
  }, [legs, showTrack, onTrack]);

  return <section className="surface directions" aria-label="Directions">
    <h1>Directions</h1>
    {stops.map((stop, index) => <div className="direction-stop" key={index}>
      <label>{index === 0 ? 'Start' : index === stops.length - 1 ? 'Destination' : 'Stop'}
        <select value={stop} onChange={event => {
          const value = event.target.value;
          setStops(previous => previous.map((item, i) => i === index ? value : item));
        }}>
          <option value="">Choose an area</option>
          {places.map(place => <option key={place.id} value={place.id}>{place.name}</option>)}
        </select>
      </label>
      {index >= 2 && <button type="button" aria-label={`Remove stop ${index + 1}`}
        onClick={() => setStops(previous => previous.filter((_, i) => i !== index))}>×</button>}
    </div>)}
    <button type="button" className="layers-toggle" onClick={() => setStops(previous => [...previous, ''])}>Add stop</button>
    {hasTrack && <label className="track-toggle"><input type="checkbox" checked={showTrack}
      onChange={event => setShowTrack(event.target.checked)} /> Show historical Perseverance positions</label>}
    {hasTrack && showTrack && <p role="status">{failed ? 'Historical positions could not load.' :
      rows ? 'Orange dots show archived rover positions.' : 'Loading historical rover positions…'}</p>}
    {legs.map(({ from, to, track, mapKm, roverKm, samples }, index) => {
      if (!from || !to) return null;
      return <section className="direction-leg" key={index}>
        <h2>{nameOf(from)} → {nameOf(to)}</h2>
        {mapKm !== undefined && <p><strong>{mapKm.toFixed(2)} km</strong> straight-line distance between area markers · Derived</p>}
        {track ? <p>Recorded rover direction · {nameOf(track.recordedFrom)} → {nameOf(track.recordedTo)}. <a target="_blank" rel="noopener noreferrer" href={placesSource}>NASA PDS source</a></p>
          : <p>{from === to ? 'Choose two different areas.' : 'Terrain and destination context. No historical connector available.'}</p>}
        {track && samples.length > 0 && <p><strong>≈ {roverKm.toFixed(2)} km</strong> historical rover distance · Derived from consecutive recorded positions, including detours and sampling gaps.</p>}
      </section>;
    })}
    {legs.some(leg => leg.pair) && <div className="direction-leg">
      <p><strong>Walking route unavailable.</strong> Walking distance, access, retreat and time are Unknown.</p>
      <a target="_blank" rel="noopener noreferrer" href={marsRadiusSource}>NASA JPL Mars distance reference</a>
    </div>}
    {[...new Set(stops.filter(Boolean))].map(id => <section className="direction-leg" key={id}>
      <h2>{nameOf(id)} caution</h2><AreaCaution id={id} />
    </section>)}
  </section>;
}
