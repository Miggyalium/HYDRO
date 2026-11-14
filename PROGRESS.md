# Hydro build progress

## 2026-11-14 · Stage 1 · CTX map and search

Implemented the grayscale CTX overview with the registered Mars projection, eight area markers, accent-insensitive search, and a minimal selection panel. Five Hawksbill Gap outcrops are searchable without independent pins.

Type check, production build, and both Vitest tests passed. The in-app browser timed out connecting to the local preview. Visual and console review remain pending.

Review by eye: the crater fits at startup, the place panel opens only after selection, all eight markers are reachable, and the attribution remains visible. Try Maaz, Montagnac, Kibler Knob, and a query with no matches. Check pan and zoom, keyboard focus and Enter selection, clearing the selected place, and the browser console.
Stage 1 visual revision: Added the supplied Hydro wordmark and aligned the masthead, search pill, map frame and controls with the desktop reference.

## Stage 2 · Science cards and photo viewer

Added science summaries, map position notes, source links, and credited imagery for eight Jezero areas and five Hawksbill Gap outcrops. The shared Hogwallow Flats photo is labeled as regional context and the exact published figures are linked. Sava and Pliva use annotated orbital imagery.

Type check, existing Vitest tests, production build, and card asset and credit checks passed. Interactive browser and console review is pending.

Open Bright Angel from a marker, view and close its photo with Escape, then search for Kibler Knob and check the regional caption, published figure link and Unknown pin. Open Sava and Pliva and confirm their captions identify CTX imagery.

## Stage 3 · Terrain layers

The Layers control adds HRSC areoid elevation, HRSC hillshade, CTX hillshade, and HRSC contours. The three raster views switch individually. The 50 m contours with 100 m index lines are off by default and can overlay each view. CTX hillshade gaps expose the optical imagery beneath. Slope and walking access remain Unknown. Active layers show source credits and HRSC license and adaptation links.

Type check, existing Vitest tests, and production build passed. All four built assets matched the kit by SHA-256. Browser rendering and console checks remain pending. Vite reports a bundle size warning.

Review the optical default, each terrain view, contour alignment and weight at the rim, the CTX coverage edge, and the credits. Try a science card while a terrain layer is active.

## Stage 4 · Cautions and Directions

Added sourced area cautions and a Directions panel with start, destination and optional stops. Consecutive legs show recorded rover direction where available. Orange dots mark individual archived positions without connecting gaps. Walking access, retreat and walking time remain Unknown.

Type check, existing tests and production build passed. All ten historical slices matched the expected endpoint clocks and record counts. Browser and console review remains pending. Vite still reports the bundle size warning.

Review Margin Unit to Bright Angel and reverse the selection. The recorded direction should stay the same. Then choose Kodiak to Pliva Vallis and check that only terrain context appears and all rover dots clear. Add a stop, toggle the dots, and check the cautions and source links in Directions and a science card.
Stage 4 distance update: Added derived straight-line distance for all 28 area pairs and historical rover distance for the ten archived slices. Walking distance remains Unknown. Verified all pairs, reverse symmetry and a quarter-circle reference. Existing tests and production build passed. Review one historical pair and one terrain-only pair in Directions.
Stage 4 link update: Source, credit, license and adaptation links open in a separate browser tab. Review with a science card and a Directions source link.

## Stage 5 · Historical conditions

Added the approved THEMIS day and night imagery as alternate map views, with the historical relative infrared brightness label and source credit. Science cards show dated MEDA pressure and separate calibrated ATS readings for Brac, Rochette and Hawksbill Gap campaign context. Nested outcrops and other areas have no site-specific readings.

Existing tests, type check and production build passed. Both built THEMIS files match the kit by SHA-256. Browser and console review remain pending. Vite still reports the bundle size warning.

Review both THEMIS views and their credit. Switch from Brac to Kodiak to confirm that the measurements clear, then open Hawksbill Gap and one of its nested outcrops to check the distinction between campaign context and Unknown.

## Stage 6 · Astronaut Findings

Added a browser-saved worksheet and record list. Science cards can open a new finding with the main area selected. The optional danger rating is subjective and starts at Unassessed. A selected rating requires a reason. Saved records display User-reported · Unverified.

Type check, existing tests and production build passed. Browser interaction and console review remain pending. Vite reports the existing bundle size warning.

Open Brac and choose Add astronaut finding. Verify the area and default rating, save an observation, refresh and reopen it from Findings, then create a second record. Check that a selected rating requires a reason.

## Pre-Stage 7 · Search and map entry refinements

Search results can be dismissed with their own close button or Escape without clearing the query. Hydro opens on a shaded globe drawn from the USGS Viking MDIM 2.1 colorized mosaic (NASA/JPL/USGS), then animates into the Jezero map. Reduced motion skips the animation.

The optical map uses the Viking mosaic for broad context, the same Murray Lab MRO CTX E076_N16 source tile for the regional view, and the existing crater crop for detail. The regional preview was sampled at approximately 100 m per pixel from verified native tile bounds; none of its sampled pixels were zero. These visual layers add no walking-access or hazard evidence.

Production build (including type checking) and Vitest passed. The in-app browser could not reach the local preview. Review the globe on a fresh load, enter with scroll or the button, zoom out to confirm the terrain continues, and close and reopen search with the close button and Escape.

## Pre-Stage 7 · Sharper zoomed-out imagery

Added a native-pixel crop from the USGS Viking MDIM 2.1 source JPEG as an intermediate basemap. It uses the original image's pixel bounds in the Mars equirectangular projection and retains roughly 1 km per source pixel, compared with roughly 5 km per pixel in the reduced global image. The regional CTX preview remains visible one step farther out. Review by zooming out twice from the initial Jezero view and comparing the terrain beyond the CTX square.

## Pre-Stage 7 · Jezero map readability

Separated place labels with leader lines tied to existing map anchors. Added a dashed outline for Hydro's existing Jezero study footprint and a wider credited image view inspired by the ESA Jezero viewpoint interface. Review the clustered western sites at overview scale, check the footprint against the legend, then open a place image and use Back to map.

## Local refinement · Place-specific rover panoramas

The Bright Angel card opens Mastcam-Z panorama #39. Hawksbill Gap and its Skinner Ridge subcard open panorama #19, labeled as Skinner Ridge. Other cards retain their own photos and show that verified 360° imagery is unavailable. The viewer supports dragging, mouse-wheel zoom, keyboard arrows, and symbolic zoom buttons.

Source: https://mastcamz.asu.edu/mastcam-zs-360-panorama-collection/
Credit: NASA/JPL-Caltech/ASU/MSSS. Local JPEGs are resized from the team's natural-color cylindrical previews.

## Local refinement · Margin Unit rover panorama

Added Mastcam-Z panorama #31 to the Margin Unit card only. NASA Photojournal identifies Turquoise Bay as part of the Margin Unit, and NASA NTRS report 20240000403 documents the Lefroy Bay sampling workspace in Turquoise Bay during the same campaign. The viewer names the actual viewpoint, and the image does not mark an exact sample coordinate. The local JPEG is resized from the Mastcam-Z team's cylindrical preview. Kodiak, Brac, Rochette, Sava Vallis and Pliva Vallis remain unavailable for 360° viewing pending an exact verified match.

## Local refinement · Higher resolution rover panoramas

Added 14,000-pixel-wide JPEGs derived from the Mastcam-Z archive's natural-color cylindrical sources: #19 for Skinner Ridge, #39 for Bright Angel, and #31 for Turquoise Bay (the team's half-resolution master for #31). Each detail image loads on first zoom and the existing preview remains available while it loads. Sources and credit are shown in the viewer. Review all three in Chrome with the mouse wheel and compare detail after the larger image arrives.
