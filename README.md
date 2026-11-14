# Hydro · Uncover Jezero’s water

Hydro is an interactive map of Jezero Crater. Stage 1 includes the crater overview, eight area markers, and place search.

## Run locally

Use Node.js 24. From this folder, run:

```powershell
npm.cmd ci
npm.cmd run dev
```

Open the local address printed by Vite. Run `npm.cmd run typecheck`, `npm.cmd test`, and `npm.cmd run build` to check the stage.

## Data and development

The grayscale CTX image is credited to NASA/JPL/MSSS/The Murray Lab. The map uses the approved Jezero bounds and area anchors from the team’s planning kit. The five nested Hawksbill Gap records are searchable. Their independent map positions are Unknown.

The team prepared data and design references before the event. Stage 1 application code was written after the local kickoff. It uses the existing stack and dependency versions, with a fresh application implementation.
