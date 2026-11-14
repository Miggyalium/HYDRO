import { useEffect, useRef, useState } from 'react';
import site from './data/site.json';
import { project } from './lib/places';

export const vikingImage = import.meta.env.BASE_URL + 'assets/viking-mars.jpg';
export const vikingSource = 'https://astrogeology.usgs.gov/search/map/mars_viking_colorized_global_mosaic_232m';
export const vikingCredit = 'Viking MDIM 2.1 · NASA/JPL/USGS';

const metresPerRadian = project([180, 0])[0] / Math.PI;
const [jezeroLon, jezeroLat] = site.centerProjectedM.map(value => value / metresPerRadian);

function createGlobeRenderer(canvas: HTMLCanvasElement, image: HTMLImageElement) {
  const texture = document.createElement('canvas');
  texture.width = Math.min(image.width, 2048);
  texture.height = Math.round(image.height * texture.width / image.width);
  const reader = texture.getContext('2d', { willReadFrequently: true });
  const context = canvas.getContext('2d');
  if (!reader || !context) return;
  reader.drawImage(image, 0, 0, texture.width, texture.height);
  const pixels = reader.getImageData(0, 0, texture.width, texture.height).data;
  const size = canvas.width;
  const frame = context.createImageData(size, size);
  return (lon: number, lat: number) => {
    const sinLat = Math.sin(lat), cosLat = Math.cos(lat);
    for (let row = 0; row < size; row++) {
      const y = 1 - (row + .5) * 2 / size;
      for (let col = 0; col < size; col++) {
        const x = (col + .5) * 2 / size - 1;
        const r = x * x + y * y;
        if (r >= 1) continue;
        const z = Math.sqrt(1 - r);
        // Inverse orthographic projection, centered on the same point as the map.
        const phi = Math.asin(y * cosLat + z * sinLat);
        const lambda = lon + Math.atan2(x, z * cosLat - y * sinLat);
        const u = ((lambda / (2 * Math.PI) + 1.5) % 1) * texture.width;
        const v = Math.min(texture.height - 1, (0.5 - phi / Math.PI) * texture.height);
        const src = (Math.floor(v) * texture.width + Math.floor(u)) * 4;
        const dest = (row * size + col) * 4;
        const light = .36 + .68 * Math.max(0, -.45 * x + .29 * y + .84 * z);
        for (let c = 0; c < 3; c++) frame.data[dest + c] = pixels[src + c] * light;
        frame.data[dest + 3] = 255;
      }
    }
    context.putImageData(frame, 0, 0);
  };
}

export function MarsIntro({ onEnter }: { onEnter: () => void }) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const pin = useRef<HTMLButtonElement>(null);
  const draw = useRef<ReturnType<typeof createGlobeRenderer>>(undefined);
  const view = useRef({ lon: jezeroLon, lat: jezeroLat });
  const frame = useRef(0);
  const drag = useRef<{ id: number; x: number; y: number } | null>(null);
  const touchStart = useRef<number | null>(null);
  const [ready, setReady] = useState(false);
  const [imageFailed, setImageFailed] = useState(false);
  const [leaving, setLeaving] = useState(false);
  useEffect(() => {
    const img = new Image();
    img.onload = () => {
      if (!canvas.current) return;
      draw.current = createGlobeRenderer(canvas.current, img);
      if (draw.current) {
        draw.current(jezeroLon, jezeroLat);
        setReady(true);
      }
      else setImageFailed(true);
    };
    img.onerror = () => setImageFailed(true);
    img.src = vikingImage;
    return () => {
      img.onload = img.onerror = null;
      cancelAnimationFrame(frame.current);
      frame.current = 0;
    };
  }, []);
  useEffect(() => {
    if (!leaving) return;
    const timer = window.setTimeout(onEnter, matchMedia('(prefers-reduced-motion: reduce)').matches ? 0 : 180);
    return () => window.clearTimeout(timer);
  }, [leaving, onEnter]);

  function rotate(dx: number, dy: number) {
    const orientation = view.current;
    orientation.lon = (orientation.lon - dx) % (2 * Math.PI);
    orientation.lat = Math.max(-Math.PI / 2, Math.min(Math.PI / 2, orientation.lat + dy));
    if (frame.current) return;
    frame.current = requestAnimationFrame(() => {
      frame.current = 0;
      const { lon, lat } = orientation;
      draw.current?.(lon, lat);
      if (!pin.current) return;
      const delta = jezeroLon - lon;
      const x = Math.cos(jezeroLat) * Math.sin(delta);
      const y = Math.cos(lat) * Math.sin(jezeroLat) - Math.sin(lat) * Math.cos(jezeroLat) * Math.cos(delta);
      const depth = Math.sin(lat) * Math.sin(jezeroLat) + Math.cos(lat) * Math.cos(jezeroLat) * Math.cos(delta);
      pin.current.hidden = depth <= 0;
      pin.current.style.left = `${(x + 1) * 50}%`;
      pin.current.style.top = `${(1 - y) * 50}%`;
    });
  }

  return <section className={'mars-intro' + (leaving ? ' is-leaving' : '')} aria-label="Explore Mars"
    onWheel={event => { if (event.deltaY > 0 || event.ctrlKey && event.deltaY < 0) setLeaving(true); }}
    onTouchStart={event => { touchStart.current = event.touches.length === 1 ? event.touches[0].clientY : null; }}
    onTouchEnd={event => {
      if (touchStart.current !== null && touchStart.current - event.changedTouches[0].clientY > 45) setLeaving(true);
      touchStart.current = null;
    }}>
    <div className="mars-globe">
      <canvas ref={canvas} width={420} height={420} tabIndex={ready ? 0 : undefined}
        aria-label="Mars globe. Drag or use the arrow keys to rotate."
        onKeyDown={event => {
          const offsets: Record<string, [number, number]> = {
            ArrowLeft: [-.16, 0], ArrowRight: [.16, 0], ArrowUp: [0, -.16], ArrowDown: [0, .16],
          };
          const offset = offsets[event.key];
          if (!offset || !ready) return;
          event.preventDefault();
          rotate(...offset);
        }}
        onTouchStart={event => event.stopPropagation()}
        onTouchEnd={event => event.stopPropagation()}
        onPointerDown={event => {
          if (!ready || event.button !== 0 || drag.current) return;
          drag.current = { id: event.pointerId, x: event.clientX, y: event.clientY };
          event.currentTarget.setPointerCapture(event.pointerId);
        }}
        onPointerMove={event => {
          const previous = drag.current;
          if (previous?.id !== event.pointerId) return;
          const scale = Math.PI / event.currentTarget.clientWidth;
          rotate((event.clientX - previous.x) * scale, (event.clientY - previous.y) * scale);
          previous.x = event.clientX;
          previous.y = event.clientY;
        }}
        onLostPointerCapture={event => {
          if (drag.current?.id === event.pointerId) drag.current = null;
        }} />
      {ready && <button ref={pin} className="mars-target" type="button" onClick={() => setLeaving(true)}>Jezero Crater</button>}
    </div>
    <div className="mars-invitation">
      {!ready && !imageFailed && <p role="status"><span className="hydro-spinner" aria-hidden="true" /> Loading Mars imagery…</p>}
      {imageFailed && <p role="status">Mars globe imagery unavailable.</p>}
      <h1>Explore Jezero Crater</h1>
      <button type="button" onClick={() => setLeaving(true)}>Enter Jezero <span aria-hidden="true">↓</span></button>
    </div>
    <a href={vikingSource} target="_blank" rel="noopener noreferrer" className="credit">{vikingCredit}</a>
  </section>;
}
