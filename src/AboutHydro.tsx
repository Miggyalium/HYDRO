import site from './data/site.json';
import { marsRadiusSource } from './lib/marsDistance';

export function AboutHydro({ onClose }: { onClose: () => void }) {
  return <dialog className="photo-viewer hydro-about" aria-labelledby="hydro-about-title"
    ref={dialog => { if (dialog && !dialog.open) dialog.showModal(); }} onClose={onClose}>
    <div className="photo-header">
      <h1 id="hydro-about-title">About Hydro</h1>
      <form method="dialog"><button autoFocus>Close</button></form>
    </div>
    <p>Hydro is an interactive map of Jezero Crater, Mars. It brings orbital imagery, terrain maps, historical
      observations, and Perseverance science into one place so students, educators, and people exploring
      future mission concepts can see how water shaped Jezero and compare the terrain around key sites.</p>
    <details className="science-section">
      <summary>Why Jezero?</summary>
      <p>Jezero preserves the traces of an ancient lake, river channels, and a delta. Orbital imagery shows how
        these features fit together, while NASA’s Perseverance rover has examined rocks and sediments up close.
        Together, those observations help scientists investigate how water moved through Jezero and whether
        its ancient environments could have supported microbial life.</p>
    </details>
    <details className="science-section">
      <summary>What Hydro covers</summary>
      <p>Hydro features {site.areas.length} areas in and around Jezero. Choose a place on the map or search by
        name to open its science card. Explore credited photos, rover look-around views where available, and
        sourced terrain cautions. Open <strong>Layers</strong> to compare optical imagery, elevation, hillshade,
        contours, and historical infrared imagery. Science cards include dated rover weather readings where available.</p>
      <p>Use <strong>Directions</strong> to compare straight-line distances and view recorded Perseverance tracks
        where available. Drop a <strong>Landmark</strong> to measure how far a rest stop or base camp would be
        from another location. In <strong>Astronaut Findings</strong>, create an observation, save it, and reopen
        it later in the same browser.</p>
      <p>Built by the Hydro team for NASA Space Apps. <a href="https://github.com/Miggyalium/HYDRO" target="_blank" rel="noopener noreferrer">View the HYDRO project repository</a>.</p>
    </details>
    <details className="science-section">
      <summary>The Team</summary>
      <img className="hydro-team-photo"
        src={import.meta.env.BASE_URL + 'assets/hydro-team.png'}
        alt="Hydro team, left to right: Ian Rafael S. Tordesillas, Kirby Kian R. Reyes, Brix Andrew H. Lane, and Miguelle H. Dela Cruz."
        width={2646} height={1890} loading="lazy" decoding="async" />
    </details>
    <details className="science-section">
      <summary>Sources &amp; Credits</summary>
      <ul>
        <li><strong>Optical map.</strong> Imagery from the Mars Reconnaissance Orbiter Context Camera (CTX)
          provides surface detail. Hydro combines CTX brightness with color from the Mars Express High Resolution
          Stereo Camera (HRSC). Credits: NASA/JPL/MSSS/The Murray Lab for CTX and ESA/DLR/FU Berlin for HRSC.
          {' '}<a href="https://murray-lab.caltech.edu/CTX/V01/TilePages/" target="_blank" rel="noopener noreferrer">CTX mosaic</a></li>
        <li><strong>Elevation and relief.</strong> HRSC provides the regional elevation layer and the basis for
          the HRSC hillshade and 50 m contours. The CTX hillshade is available as a separate layer.
          {' '}<a href={import.meta.env.BASE_URL + 'assets/HRSC-LICENSE.md'} target="_blank" rel="noopener noreferrer">HRSC attribution and license</a></li>
        <li><strong>Globe and surrounding terrain.</strong> The Viking MDIM 2.1 mosaic provides broader Mars
          context. Credit: NASA/JPL/USGS.
          {' '}<a href="https://astrogeology.usgs.gov/search/map/mars_viking_colorized_global_mosaic_232m" target="_blank" rel="noopener noreferrer">Viking mosaic</a></li>
        <li><strong>Historical conditions.</strong> Mars Odyssey’s THEMIS instrument provides day and night
          infrared imagery. Perseverance’s MEDA instrument provides dated rover weather observations where available.
          {' '}<a href="https://stac.astrogeology.usgs.gov/docs/data/mars/themis_controlled_mosaics/" target="_blank" rel="noopener noreferrer">THEMIS mosaics</a>
          {' · '}<a href="https://pdsatmospheres.nmsu.edu/data_and_services/atmospheres_data/PERSEVERANCE/meda.html" target="_blank" rel="noopener noreferrer">MEDA archive</a></li>
        <li><strong>Science cards and surface views.</strong> Individual captions and source links credit the
          photographs, panoramas, and research used for each place. Regional photos are labeled where they
          show the surrounding area.</li>
        <li><strong>Distances and rover tracks.</strong> Hydro calculates straight-line map distances along
          the shorter arc between markers on a spherical Mars, using NASA JPL’s Mars radius reference.
          Historical rover tracks come from archived Perseverance position records. Where shown, rover-track
          lengths are estimates based on those recorded positions.
          {' '}<a href={marsRadiusSource} target="_blank" rel="noopener noreferrer">NASA JPL Mars reference</a></li>
      </ul>
      <p>Image credits and dataset links are available in the relevant cards, photo viewers, and layer descriptions.</p>
    </details>
    <details className="science-section">
      <summary>Privacy</summary>
      <p>Hydro’s app code uses no accounts or analytics. Astronaut Findings are saved in your browser on the
        current device. You can reopen them in the same browser on the same site. Clearing the site’s browser
        data removes saved findings. The active Landmark pin is temporary and clears when you reload the page.</p>
      <p>The website’s hosting provider may process routine web requests. External resources and linked websites
        have their own privacy practices.</p>
    </details>
    <details className="science-section">
      <summary>Terms &amp; Limitations</summary>
      <p>Hydro is an educational and exploration-planning prototype. Its map layers and historical observations
        are intended for learning and comparing terrain. MEDA readings describe conditions when and where the
        rover recorded them. THEMIS layers show historical infrared brightness at orbital scale.</p>
      <p>A straight-line distance measures the separation between map markers. A historical rover track shows
        where Perseverance traveled. Neither establishes a safe walking route or an estimated walking time.
        <strong> Unknown</strong> means the available evidence is insufficient to assess the condition, including
        walking access, footing, or return clearance. A precaution rating summarizes the documented concerns
        for a particular area.</p>
      <p>Astronaut Findings are user-reported observations. Any danger rating reflects the observer’s judgment.
        Saved findings do not change Hydro’s verified map data or access status.</p>
    </details>
  </dialog>;
}
