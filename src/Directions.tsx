import { useEffect, useMemo, useState } from 'react';
import { marsDistanceKm, marsRadiusSource } from './lib/marsDistance';
import { places, project } from './lib/places';
import registry from './data/directions-pairs.json';
import cautions from './data/cautions.json';

export const trackUrl = import.meta.env.BASE_URL + 'assets/directions/western-network-positions.csv';
export type DirectionLine = { coordinates: number[][]; label: string };
const distanceLabel = (km: number) => `${km.toFixed(2)} km`;
// Hydro's planning rubric rates documented local evidence, not the connecting corridor.
const precautionByArea: Partial<Record<string, { score: number; scope: string }>> = {
  'hawksbill-gap': { score: 3, scope: 'Outcrops' },
  'bright-angel': { score: 4, scope: 'Rover approach' },
};
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

export function Directions({ initialStop, onTrack, onLines, onOpenFindings }: {
  initialStop: string;
  onTrack: (points: number[][]) => void;
  onLines: (lines: DirectionLine[]) => void;
  onOpenFindings: (area: string) => void;
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
    const lines = stops.slice(1).flatMap((to, index) => {
      const from = stops[index];
      if (!getPair(from, to)) return [];
      const start = anchorOf(from);
      const end = anchorOf(to);
      return [{ coordinates: [project(start), project(end)], label: distanceLabel(marsDistanceKm(start, end)) }];
    });
    onLines(lines);
    return () => onLines([]);
  }, [stops, onLines]);

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
        {mapKm !== undefined && <div className="direction-overview">
          <strong>{distanceLabel(mapKm)}</strong>
          <small>Straight-line distance · Derived</small>
          <p>Walking route unavailable</p>
        </div>}
        {mapKm !== undefined && <details className="science-section">
          <summary>Travel difficulty &amp; precautions</summary>
          <p>Travel difficulty · Unassessed</p>
          <button type="button" className="layers-toggle directions-toggle" onClick={() => onOpenFindings(to)}>
            Open Findings for {nameOf(to)}
          </button>
          <dl className="direction-precautions">
          {[from, to].map(id => {
            const precaution = precautionByArea[id];
            return <div key={id}>
              <dt>{nameOf(id)}</dt>
              <dd>{precaution ? <><strong>{precaution.score}/5</strong> · {precaution.scope}
                <small>Hydro assessment · <a href={cautions[id as keyof typeof cautions][1]} target="_blank" rel="noopener noreferrer">Evidence</a></small></>
                : <>Unassessed
                  {id !== to && <div><button type="button" className="layers-toggle directions-toggle" onClick={() => onOpenFindings(id)}>
                    Open Findings for {nameOf(id)}
                  </button></div>}
                </>}</dd>
            </div>;
          })}
          </dl>
        </details>}
        {from === to ? <p>Choose two different areas.</p> : <details className="science-section">
          <summary>Historical rover track</summary>
          {track ? <>
            <p>{nameOf(track.recordedFrom)} → {nameOf(track.recordedTo)}</p>
            {samples.length > 0 && <>
              <p><strong>≈ {roverKm.toFixed(2)} km</strong> · Historical rover distance</p>
              <small>Derived from recorded positions, including detours and sampling gaps.</small>
            </>}
            <p><a target="_blank" rel="noopener noreferrer" href={placesSource}>NASA PDS source</a></p>
          </> : <p>No historical connector available.</p>}
        </details>}
      </section>;
    })}
    {legs.some(leg => leg.pair) && <div className="direction-leg">
      <details className="science-section">
        <summary>Map key &amp; rating scale</summary>
        <p>Dashed blue lines show straight-line distance between markers.</p>
        <p>Walking distance, access, retreat and time are Unknown.</p>
        <p>Hydro’s proposed planning scale applies to the named site or approach. The corridor between markers remains unassessed.</p>
        <ol>
          <li>Reviewed area with no specific obstacle identified</li>
          <li>Localized concern observed</li>
          <li>Documented obstacles at the site</li>
          <li>Documented obstacles changed the rover approach</li>
          <li>Verified closure or impassable access for the assessed mode</li>
        </ol>
        <p>Unassessed means the evidence is insufficient to assign a level.</p>
        <a target="_blank" rel="noopener noreferrer" href={marsRadiusSource}>NASA JPL Mars distance reference</a>
      </details>
    </div>}
    {[...new Set(stops.filter(Boolean))].map(id => <details className="direction-leg science-section" key={id}>
      <summary>{nameOf(id)} caution notes</summary><AreaCaution id={id} />
    </details>)}
  </section>;
}
