import { useEffect, useRef, useState } from 'react';

export const panoramas: Readonly<Record<string, { title: string; path: string; sols: string; source?: string } | undefined>> = {
  'hawksbill-gap': { title: 'Hawksbill Gap · Skinner Ridge', path: 'assets/skinner-ridge-360.jpg', sols: 'Sols 484–492' },
  'hawksbill-gap/Skinner Ridge': { title: 'Skinner Ridge', path: 'assets/skinner-ridge-360.jpg', sols: 'Sols 484–492' },
  'bright-angel': { title: 'Bright Angel outcrop', path: 'assets/bright-angel-360.jpg', sols: 'Sol 1178' },
  'margin-unit': {
    title: 'Margin Unit · Turquoise Bay',
    path: 'assets/turquoise-bay-360.jpg',
    sols: 'Sols 933–944',
    source: 'https://science.nasa.gov/photojournal/perseverances-view-of-turquoise-bay/',
  },
};

export function RoverPanorama({ panorama, onClose }: { panorama: NonNullable<(typeof panoramas)[string]>; onClose: () => void }) {
  const imageUrl = import.meta.env.BASE_URL + panorama.path;
  const canvas = useRef<HTMLCanvasElement>(null);
  const drag = useRef<number | null>(null);
  const [image, setImage] = useState<HTMLImageElement>();
  const [detailImage, setDetailImage] = useState<HTMLImageElement>();
  const [detailRequested, setDetailRequested] = useState(false);
  const [failed, setFailed] = useState(false);
  const [yaw, setYaw] = useState(0.5);
  const [zoom, setZoom] = useState(1);
  const [viewport, setViewport] = useState({ width: 960, height: 380 });

  useEffect(() => {
    const screen = canvas.current;
    if (!screen) return;
    const observer = new ResizeObserver(([entry]) => {
      const { width, height } = entry.contentRect;
      if (!width || !height) return;
      const scale = Math.min(window.devicePixelRatio || 1, 2, 2400 / width, 1500 / height);
      setViewport({ width: Math.round(width * scale), height: Math.round(height * scale) });
    });
    observer.observe(screen);
    return () => observer.disconnect();
  }, [failed]);

  useEffect(() => {
    const source = new Image();
    source.onload = () => setImage(source);
    source.onerror = () => setFailed(true);
    source.src = imageUrl;
    return () => { source.onload = source.onerror = null; };
  }, [imageUrl]);

  useEffect(() => {
    if (zoom > 1) setDetailRequested(true);
  }, [zoom]);

  useEffect(() => {
    if (!detailRequested) return;
    const source = new Image();
    source.onload = () => source.naturalWidth > 0 && setDetailImage(source);
    source.src = imageUrl.replace(/\.jpg$/, '-detail.jpg');
    return () => { source.onload = null; };
  }, [detailRequested, imageUrl]);

  useEffect(() => {
    const screen = canvas.current;
    if (!screen || !image || failed) return;
    const onWheel = (event: WheelEvent) => {
      if (!event.deltaY) return;
      event.preventDefault();
      setZoom(previous => Math.max(1, Math.min(2, previous - Math.sign(event.deltaY) * .25)));
    };
    screen.addEventListener('wheel', onWheel, { passive: false });
    return () => screen.removeEventListener('wheel', onWheel);
  }, [image, failed]);

  useEffect(() => {
    const screen = canvas.current;
    const mosaic = zoom > 1 && detailImage ? detailImage : image;
    if (!screen || !mosaic) return;
    const ctx = screen.getContext('2d');
    if (!ctx) { setFailed(true); return; }
    const { width, height } = screen;
    const baseFocal = width / (2 * Math.tan(Math.PI / 5));
    const radiansPerPixel = 2 * Math.PI / mosaic.naturalWidth;
    const halfVerticalCoverage = mosaic.naturalHeight * radiansPerPixel / 2;
    // Constrain the view to the captured vertical strip while preserving viewport proportions.
    const focal = Math.max(baseFocal, height / (2 * Math.tan(halfVerticalCoverage))) * zoom;
    for (let x = 0; x < width; x++) {
      // Cast one horizontal camera ray per column into the cylindrical mosaic.
      const angle = Math.atan((x + .5 - width / 2) / focal);
      const turn = yaw + angle / (2 * Math.PI);
      const sourceX = Math.floor((turn - Math.floor(turn)) * mosaic.naturalWidth);
      const sourceHeight = 2 * Math.atan(height * Math.cos(angle) / (2 * focal)) / radiansPerPixel;
      const sourceY = (mosaic.naturalHeight - sourceHeight) / 2;
      ctx.drawImage(mosaic, sourceX, sourceY, 1, sourceHeight, x, 0, 1, height);
    }
  }, [image, detailImage, yaw, zoom, viewport]);

  const turn = (amount: number) => setYaw(previous => (previous + amount) % 1);

  return <dialog className="photo-viewer rover-panorama" aria-labelledby="rover-panorama-title"
    ref={dialog => { if (dialog && !dialog.open) dialog.showModal(); }} onClose={onClose}>
    <div className="rover-panorama-heading">
      <h2 id="rover-panorama-title">{panorama.title} · 360° look-around</h2>
      <form method="dialog"><button className="layers-toggle" autoFocus aria-label="Back to Hydro">←</button></form>
    </div>
    {failed ? <p className="panorama-status" role="status">Panorama unavailable. <a href={imageUrl} target="_blank" rel="noopener noreferrer">Open the image</a>.</p> : <>
      {!image && <p className="panorama-status" role="status">Loading panorama…</p>}
      <canvas ref={canvas} width={viewport.width} height={viewport.height} tabIndex={0}
        aria-label={panorama.title + ' panorama. Use left and right arrow keys to turn.'}
        onKeyDown={event => {
          if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return;
          event.preventDefault();
          turn(event.key === 'ArrowLeft' ? -.04 : .04);
        }}
        onPointerDown={event => {
          if (drag.current !== null || event.button !== 0) return;
          event.currentTarget.setPointerCapture(event.pointerId);
          drag.current = event.clientX;
        }}
        onPointerMove={event => {
          if (drag.current === null || !event.currentTarget.hasPointerCapture(event.pointerId)) return;
          turn((drag.current - event.clientX) / (event.currentTarget.clientWidth * 4 * zoom));
          drag.current = event.clientX;
        }}
        onLostPointerCapture={() => { drag.current = null; }} />
      <div className="rover-panorama-zoom">
        <button className="layers-toggle" type="button" aria-label="Zoom in" disabled={zoom === 2} onClick={() => setZoom(zoom + .25)}>+</button>
        <button className="layers-toggle" type="button" aria-label="Zoom out" disabled={zoom === 1} onClick={() => setZoom(zoom - .25)}>−</button>
      </div>
    </>}
    <div className="rover-panorama-credit">
      <span>Mastcam-Z · Natural color · {panorama.sols}</span>
      <a href={panorama.source ?? 'https://mastcamz.asu.edu/mastcam-zs-360-panorama-collection/'} target="_blank" rel="noopener noreferrer">
        Image source · NASA/JPL-Caltech/ASU/MSSS
      </a>
      <a href="https://www.hou.usra.edu/meetings/lpsc2025/pdf/1719.pdf" target="_blank" rel="noopener noreferrer">Mastcam-Z mosaic methods</a>
    </div>
  </dialog>;
}
