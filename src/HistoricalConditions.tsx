import conditions from './data/conditions.json';

export function HistoricalConditions({ id, nested }: { id: string; nested: boolean }) {
  const campaign = id === 'hawksbill-gap' && !nested;
  const readings = nested ? [] : campaign ? conditions.hawksbill.examples
    : conditions.readings.filter(reading => reading.area === id);

  return <section className="historical-conditions">
    {readings.length === 0 ? <p>Historical MEDA readings · Unknown</p> : <>
      <p>{campaign ? 'Perseverance campaign context. Individual outcrop readings are Unknown.'
        : 'Perseverance workspace observation.'} Current conditions · Unknown.</p>
      {readings.map(reading => <details key={reading.sclk} open={readings.length === 1 || undefined}>
        <summary>Sol {reading.sol} · {reading.lmst.split('M').at(-1)} local mean solar time</summary>
        <dl>
          <dt>Pressure · derived</dt>
          <dd>{reading.pressure} {conditions.units.pressure} · uncertainty {reading.pressureUncertainty}</dd>
          {reading.ats.map((value, index) => <div key={index}>
            <dt>ATS{index + 1} · measured and calibrated</dt>
            <dd>{value.toFixed(2)} {conditions.units.ats}</dd>
          </div>)}
        </dl>
        <p className="position-note">Rover heating effects on the air temperature readings are unverified.</p>
        <details><summary>Archive record IDs</summary>
          <p>Spacecraft clock · {reading.sclk}</p>
          <p>Pressure transducer · {reading.pressureTransducer}</p>
          <p>{reading.pressureProduct}</p><p>{reading.atsProduct}</p>
        </details>
      </details>)}
    </>}
    <p className="position-note">Ground temperature · {conditions.groundTemperature}</p>
    <a target="_blank" rel="noopener noreferrer" href={conditions.source}>NASA PDS MEDA archive</a>
  </section>;
}
