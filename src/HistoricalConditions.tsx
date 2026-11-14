import conditions from './data/conditions.json';

export function HistoricalConditions({ id, nested }: { id: string; nested: boolean }) {
  const campaign = id === 'hawksbill-gap' && !nested;
  const readings = nested ? [] : campaign ? conditions.hawksbill.examples
    : conditions.readings.filter(reading => reading.area === id);
  const orbital = nested ? undefined : conditions.orbitalThermal.markerSamples.find(sample => sample.area === id);

  return <section className="historical-conditions">
    {orbital && <>
      <h3>Orbital surface observations</h3>
      <dl>
        <dt>Thermal inertia at the map marker · Derived</dt>
        <dd>≈ {orbital.approximateThermalInertia} J·m⁻²·K⁻¹·s⁻½</dd>
      </dl>
      <p className="position-note">Thermal inertia describes how strongly the surface resists temperature changes. This estimate comes from a nighttime infrared mosaic at {conditions.orbitalThermal.pixelSizeM} m per pixel.</p>
      {id === 'dacono' && <p className="position-note">Nearby pixels vary substantially across the crater.</p>}
      <p><a target="_blank" rel="noopener noreferrer" href={conditions.orbitalThermal.source}>{conditions.orbitalThermal.credit}</a></p>
      <p>For historical relative infrared brightness, open <strong>Layers</strong> and choose <strong>THEMIS Day IR</strong> or <strong>THEMIS Night IR</strong>.</p>
      <h3>Local weather</h3>
      <p>Air temperature, pressure, wind, humidity, and dust · Unknown</p>
      <p>Dated surface temperature · Unknown</p>
    </>}
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
    {!orbital && <p className="position-note">Ground temperature · {conditions.groundTemperature}</p>}
    <a target="_blank" rel="noopener noreferrer" href={conditions.source}>NASA PDS MEDA archive</a>
  </section>;
}
