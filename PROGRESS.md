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
