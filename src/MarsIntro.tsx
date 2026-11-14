import { useEffect, useRef, useState } from 'react';
import site from './data/site.json';
import { project } from './lib/places';

export const vikingImage = import.meta.env.BASE_URL + 'assets/viking-mars.jpg';
export const vikingSource = 'https://astrogeology.usgs.gov/search/map/mars_viking_colorized_global_mosaic_232m';
export const vikingCredit = 'Viking MDIM 2.1 · NASA/JPL/USGS';

function drawGlobe(canvas: HTMLCanvasElement, image: HTMLImageElement) {
  const texture = document.createElement('canvas');
  texture.width = Math.min(image.width, 2048);
  texture.height = Math.round(image.height * texture.width / image.width);
  const reader = texture.getContext('2d', { willReadFrequently: true });
  const context = canvas.getContext('2d');
  if (!reader || !context) return false;
  reader.drawImage(image, 0, 0, texture.width, texture.height);
  const pixels = reader.getImageData(0, 0, texture.width, texture.height).data;
  const size = canvas.width;
  const frame = context.createImageData(size, size);
  const metresPerRadian = project([180, 0])[0] / Math.PI;
  const [lon, lat] = site.centerProjectedM.map(value => value / metresPerRadian);
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
  return true;
}

export function MarsIntro({ onEnter }: { onEnter: () => void }) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const touchStart = useRef<number | null>(null);
  const [ready, setReady] = useState(false);
  const [leaving, setLeaving] = useState(false);
  useEffect(() => {
    const img = new Image();
    img.onload = () => {
      if (!canvas.current) return;
      setReady(drawGlobe(canvas.current, img));
    };
    img.src = vikingImage;
    return () => { img.onload = null; };
  }, []);
  useEffect(() => {
    if (!leaving) return;
    const timer = window.setTimeout(onEnter, matchMedia('(prefers-reduced-motion: reduce)').matches ? 0 : 180);
    return () => window.clearTimeout(timer);
  }, [leaving, onEnter]);

  return <section className={'mars-intro' + (leaving ? ' is-leaving' : '')} aria-label="Explore Mars"
    onWheel={event => { if (event.deltaY > 0 || event.ctrlKey && event.deltaY < 0) setLeaving(true); }}
    onTouchStart={event => { touchStart.current = event.touches.length === 1 ? event.touches[0].clientY : null; }}
    onTouchEnd={event => {
      if (touchStart.current !== null && touchStart.current - event.changedTouches[0].clientY > 45) setLeaving(true);
      touchStart.current = null;
    }}>
    <div className="mars-globe">
      <canvas ref={canvas} width={720} height={720} aria-hidden="true" />
      {ready && <span className="mars-target">Jezero Crater</span>}
    </div>
    <div className="mars-invitation">
      <h1>Explore Jezero Crater</h1>
      <button type="button" onClick={() => setLeaving(true)}>Enter Jezero <span aria-hidden="true">↓</span></button>
      <p>Scroll or swipe up to zoom in</p>
    </div>
    <a href={vikingSource} target="_blank" rel="noopener noreferrer" className="credit">{vikingCredit}</a>
  </section>;
}
