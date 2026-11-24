import { useEffect, useRef } from 'react';
import L from 'leaflet';
import type { CityNode } from '../../../types';
import type { DistrictInfo, ParchmentMode } from '../../../types/map';
import { percentToLatLng } from '../../../utils/mapGeo';

const TILE_N = 512;
const PX_PER_PCT_X = 32; // 512 / 32 = 16% per tile
const PX_PER_PCT_Y = 64; // 512 / 64 = 8% per tile (matches 1:2 MAP_COORD_W:MAP_COORD_H)
const TILE_W_PCT = TILE_N / PX_PER_PCT_X; // 16
const TILE_H_PCT = TILE_N / PX_PER_PCT_Y; // 8

const OUTER_MIN = -48; // exact multiple of 16 and 8
const OUTER_MAX = 144;
const OUTER_SPAN = OUTER_MAX - OUTER_MIN; // 192

interface UseCloudFogLayerProps {
  mapInstance: L.Map | null;
  cloudFogPaneRef: React.MutableRefObject<HTMLElement | null>;
  districtsList: DistrictInfo[];
  cities: CityNode[];
  scoutedRegionIds: Record<string, number>;
  isEditMode: boolean;
  parchmentMode: ParchmentMode;
}

let cachedCloudTileData: Uint8ClampedArray | null = null;
let cachedCloudTilePromise: Promise<Uint8ClampedArray> | null = null;

function loadCloudTilePixels(): Promise<Uint8ClampedArray> {
  if (cachedCloudTileData) return Promise.resolve(cachedCloudTileData);
  if (cachedCloudTilePromise) return cachedCloudTilePromise;

  cachedCloudTilePromise = new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      const c = document.createElement('canvas');
      c.width = TILE_N;
      c.height = TILE_N;
      const ctx = c.getContext('2d');
      if (!ctx) {
        reject(new Error('No 2d context'));
        return;
      }
      ctx.drawImage(img, 0, 0, TILE_N, TILE_N);
      const data = ctx.getImageData(0, 0, TILE_N, TILE_N).data;
      cachedCloudTileData = data;
      resolve(data);
    };
    img.onerror = reject;
    img.src = '/cloud_fog_texture.png';
  });

  return cachedCloudTilePromise;
}

export function useCloudFogLayer({
  mapInstance,
  cloudFogPaneRef,
  districtsList,
  cities,
  scoutedRegionIds,
  isEditMode,
  parchmentMode,
}: UseCloudFogLayerProps) {
  const outerSvgRef = useRef<L.SVGOverlay | null>(null);
  const patchOverlayRef = useRef<L.ImageOverlay | null>(null);
  const blobUrlRef = useRef<string | null>(null);

  useEffect(() => {
    const map = mapInstance;
    const fogPane = cloudFogPaneRef.current;
    if (!map || !fogPane) return;

    let cancelled = false;

    const cleanup = () => {
      if (outerSvgRef.current) {
        outerSvgRef.current.remove();
        outerSvgRef.current = null;
      }
      if (patchOverlayRef.current) {
        patchOverlayRef.current.remove();
        patchOverlayRef.current = null;
      }
      if (blobUrlRef.current) {
        URL.revokeObjectURL(blobUrlRef.current);
        blobUrlRef.current = null;
      }
    };

    if (isEditMode || parchmentMode === 'off') {
      cleanup();
      fogPane.style.display = 'none';
      return;
    }
    fogPane.style.display = 'block';

    const revealedDistricts = districtsList.filter(d => {
      if (d.polygon.length < 3) return false;
      const city = cities.find(c => c.id === d.id);
      return (
        d.id === 'lam_son' ||
        city?.faction === 'lam_son' ||
        Boolean(city?.hasBase) ||
        Boolean(scoutedRegionIds[d.id])
      );
    });

    const buildOuterSvg = (holeBox?: { px0: number; py0: number; px1: number; py1: number }) => {
      const svgNS = 'http://www.w3.org/2000/svg';
      const svgEl = document.createElementNS(svgNS, 'svg');
      svgEl.setAttribute('viewBox', `${OUTER_MIN} ${OUTER_MIN} ${OUTER_SPAN} ${OUTER_SPAN}`);
      svgEl.setAttribute('preserveAspectRatio', 'none');
      svgEl.style.pointerEvents = 'none';

      const defs = document.createElementNS(svgNS, 'defs');
      const pat = document.createElementNS(svgNS, 'pattern');
      pat.setAttribute('id', 'lam-son-seamless-cloud-pat');
      pat.setAttribute('patternUnits', 'userSpaceOnUse');
      pat.setAttribute('x', String(OUTER_MIN));
      pat.setAttribute('y', String(OUTER_MIN));
      pat.setAttribute('width', String(TILE_W_PCT));
      pat.setAttribute('height', String(TILE_H_PCT));

      const img = document.createElementNS(svgNS, 'image');
      img.setAttribute('href', '/cloud_fog_texture.png');
      img.setAttribute('width', String(TILE_W_PCT));
      img.setAttribute('height', String(TILE_H_PCT));
      img.setAttribute('preserveAspectRatio', 'none');
      pat.appendChild(img);
      defs.appendChild(pat);
      svgEl.appendChild(defs);

      const path = document.createElementNS(svgNS, 'path');
      let dStr = `M ${OUTER_MIN} ${OUTER_MIN} H ${OUTER_MAX} V ${OUTER_MAX} H ${OUTER_MIN} Z`;
      if (holeBox) {
        // Overlap by 0.25% inward where patch alpha === 1.0 so zero subpixel seam can ever appear
        const hx0 = holeBox.px0 + 0.25;
        const hy0 = holeBox.py0 + 0.25;
        const hx1 = holeBox.px1 - 0.25;
        const hy1 = holeBox.py1 - 0.25;
        if (hx1 > hx0 && hy1 > hy0) {
          dStr += ` M ${hx0} ${hy0} H ${hx1} V ${hy1} H ${hx0} Z`;
        }
      }
      path.setAttribute('d', dStr);
      path.setAttribute('fill-rule', 'evenodd');
      path.setAttribute('fill', 'url(#lam-son-seamless-cloud-pat)');
      svgEl.appendChild(path);

      const outerBounds = L.latLngBounds(
        percentToLatLng(OUTER_MIN, OUTER_MAX),
        percentToLatLng(OUTER_MAX, OUTER_MIN)
      );
      return L.svgOverlay(svgEl, outerBounds, {
        pane: 'cloudFogPane',
        interactive: false,
      });
    };

    if (revealedDistricts.length === 0) {
      cleanup();
      outerSvgRef.current = buildOuterSvg().addTo(map);
      return cleanup;
    }

    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
    for (const d of revealedDistricts) {
      for (const [px, py] of d.polygon) {
        if (px < minX) minX = px;
        if (px > maxX) maxX = px;
        if (py < minY) minY = py;
        if (py > maxY) maxY = py;
      }
    }

    // Pad generously (7% X = 224px, 4.5% Y = 288px) so Gaussian blur decays completely to 1.0 before patch edge
    const gx0 = Math.floor((minX - 7.0) * PX_PER_PCT_X);
    const gx1 = Math.ceil((maxX + 7.0) * PX_PER_PCT_X);
    const gy0 = Math.floor((minY - 4.5) * PX_PER_PCT_Y);
    const gy1 = Math.ceil((maxY + 4.5) * PX_PER_PCT_Y);

    const px0 = gx0 / PX_PER_PCT_X;
    const px1 = gx1 / PX_PER_PCT_X;
    const py0 = gy0 / PX_PER_PCT_Y;
    const py1 = gy1 / PX_PER_PCT_Y;

    const cw = gx1 - gx0;
    const ch = gy1 - gy0;

    loadCloudTilePixels().then(tileData => {
      if (cancelled) return;

      // 1. Base binary mask (white = 255 unexplored, black = 0 revealed + slight outward margin so district interior stays crystal clear)
      const maskCanvas = document.createElement('canvas');
      maskCanvas.width = cw;
      maskCanvas.height = ch;
      const mCtx = maskCanvas.getContext('2d');
      if (!mCtx) return;

      mCtx.fillStyle = '#ffffff';
      mCtx.fillRect(0, 0, cw, ch);
      mCtx.fillStyle = '#000000';
      mCtx.strokeStyle = '#000000';
      mCtx.lineJoin = 'round';
      mCtx.lineCap = 'round';
      mCtx.lineWidth = 18;

      for (const d of revealedDistricts) {
        mCtx.beginPath();
        d.polygon.forEach(([vx, vy], idx) => {
          const cx = vx * PX_PER_PCT_X - gx0;
          const cy = vy * PX_PER_PCT_Y - gy0;
          if (idx === 0) mCtx.moveTo(cx, cy);
          else mCtx.lineTo(cx, cy);
        });
        mCtx.closePath();
        mCtx.fill();
        mCtx.stroke();
      }

      // 2. Multi-scale separable Gaussian blurs via native Skia/Canvas2D filter
      const blurPass = (radius: number): Uint8ClampedArray => {
        const bc = document.createElement('canvas');
        bc.width = cw;
        bc.height = ch;
        const bCtx = bc.getContext('2d')!;
        // Fill white first so border edges clamp to white (100% cloud), never transparent!
        bCtx.fillStyle = '#ffffff';
        bCtx.fillRect(0, 0, cw, ch);
        bCtx.filter = `blur(${radius}px)`;
        // Draw slightly padded border + mask so blur at canvas perimeter stays 255 white
        bCtx.drawImage(maskCanvas, 0, 0);
        return bCtx.getImageData(0, 0, cw, ch).data;
      };

      const b1 = blurPass(15);
      const b2 = blurPass(42);
      const b3 = blurPass(78);

      const outCanvas = document.createElement('canvas');
      outCanvas.width = cw;
      outCanvas.height = ch;
      const oCtx = outCanvas.getContext('2d');
      if (!oCtx) return;

      const outImg = oCtx.createImageData(cw, ch);
      const out = outImg.data;

      // Precompute alpha buffer first so we can cast a soft shifted ground shadow beneath floating clouds
      const finalAlphaBuf = new Float32Array(cw * ch);
      const mistFloorBuf = new Float32Array(cw * ch);
      const puffAlphaBuf = new Float32Array(cw * ch);

      for (let y = 0; y < ch; y++) {
        const ty1 = (((gy0 + y) % TILE_N) + TILE_N) % TILE_N;
        const ty2 = (((Math.floor((gy0 + y) * 0.5) + 137) % TILE_N) + TILE_N) % TILE_N;
        const rowOff = y * cw;

        for (let x = 0; x < cw; x++) {
          const i = rowOff + x;
          const p4 = i * 4;

          const d = (0.20 * b1[p4] + 0.45 * b2[p4] + 0.35 * b3[p4]) / 255.0;
          if (d <= 0.02) {
            finalAlphaBuf[i] = 0;
            continue;
          }
          if (d >= 0.992) {
            finalAlphaBuf[i] = 1;
            mistFloorBuf[i] = 1;
            continue;
          }

          const tx1 = (((gx0 + x) % TILE_N) + TILE_N) % TILE_N;
          const tx2 = (((Math.floor((gx0 + x) * 0.5) + 251) % TILE_N) + TILE_N) % TILE_N;

          const tIdx1 = (ty1 * TILE_N + tx1) * 4;
          const tIdx2 = (ty2 * TILE_N + tx2) * 4;

          // Extract normalized cloud puff height (0..1) from RGB luminance
          const lum1 = tileData[tIdx1] + tileData[tIdx1 + 1] + tileData[tIdx1 + 2];
          const lum2 = tileData[tIdx2] + tileData[tIdx2 + 1] + tileData[tIdx2 + 2];
          const cn1 = Math.max(0, Math.min(1, (lum1 - 512) / 224));
          const cn2 = Math.max(0, Math.min(1, (lum2 - 512) / 224));
          const cn = 0.62 * cn2 + 0.38 * cn1;

          // Zone 1-3 Parting Clouds
          let mf = (d - 0.44) / 0.53;
          mf = mf < 0 ? 0 : mf > 1 ? 1 : mf;
          mf = mf * mf * (3 - 2 * mf);

          let pt = (d * 1.45 + (cn - 0.50) * 1.28 - 0.24) / 0.48;
          pt = pt < 0 ? 0 : pt > 1 ? 1 : pt;
          const dClamp = d * 1.6 > 1 ? 1 : d * 1.6;
          const pa = pt * pt * (3 - 2 * pt) * dClamp;

          let hz = (d - 0.08) / 0.70;
          hz = (hz < 0 ? 0 : hz > 1 ? 1 : hz) * 0.48 * cn;

          const fa = Math.max(mf, pa, hz);
          finalAlphaBuf[i] = fa > 1 ? 1 : fa;
          mistFloorBuf[i] = mf;
          puffAlphaBuf[i] = pa;
        }
      }

      // Second pass: composite sunlit cloud RGB + shifted ground shadow (-6, -8 source) into RGBA
      const shDx = 6;
      const shDy = 8;
      for (let y = 0; y < ch; y++) {
        const ty1 = (((gy0 + y) % TILE_N) + TILE_N) % TILE_N;
        const rowOff = y * cw;
        const sy = y - shDy;

        for (let x = 0; x < cw; x++) {
          const i = rowOff + x;
          const p4 = i * 4;
          const ca = finalAlphaBuf[i];

          let sa = 0;
          if (ca < 0.995 && sy >= 0 && x >= shDx) {
            const shCloud = finalAlphaBuf[sy * cw + (x - shDx)];
            if (shCloud > ca) {
              sa = Math.min(0.28, (shCloud - ca) * 0.44);
            }
          }

          if (ca <= 0.002 && sa <= 0.002) {
            out[p4 + 3] = 0;
            continue;
          }

          const tx1 = (((gx0 + x) % TILE_N) + TILE_N) % TILE_N;
          const tIdx1 = (ty1 * TILE_N + tx1) * 4;
          let cr = tileData[tIdx1];
          let cg = tileData[tIdx1 + 1];
          let cb = tileData[tIdx1 + 2];

          if (ca < 0.995) {
            const lum1 = cr + cg + cb;
            const cn1 = Math.max(0, Math.min(1, (lum1 - 512) / 224));
            const rim = Math.min(0.22, puffAlphaBuf[i] * (1 - mistFloorBuf[i]) * 0.5) * cn1 * 26;
            cr = Math.min(255, cr + rim);
            cg = Math.min(255, cg + rim);
            cb = Math.min(255, cb + rim);
          }

          if (sa <= 0.002) {
            out[p4] = cr;
            out[p4 + 1] = cg;
            out[p4 + 2] = cb;
            out[p4 + 3] = Math.round(ca * 255);
          } else {
            // Porter-Duff: cloud (cr,cg,cb,ca) OVER ground shadow (28,18,8,sa)
            const invCa = 1 - ca;
            const outA = ca + sa * invCa;
            out[p4] = Math.round((cr * ca + 28 * sa * invCa) / outA);
            out[p4 + 1] = Math.round((cg * ca + 18 * sa * invCa) / outA);
            out[p4 + 2] = Math.round((cb * ca + 8 * sa * invCa) / outA);
            out[p4 + 3] = Math.round(outA * 255);
          }
        }
      }

      oCtx.putImageData(outImg, 0, 0);

      outCanvas.toBlob(blob => {
        if (cancelled || !blob) return;
        cleanup();
        const url = URL.createObjectURL(blob);
        blobUrlRef.current = url;

        const patchBounds = L.latLngBounds(
          percentToLatLng(px0, py1),
          percentToLatLng(px1, py0)
        );
        patchOverlayRef.current = L.imageOverlay(url, patchBounds, {
          pane: 'cloudFogPane',
          interactive: false,
        }).addTo(map);

        outerSvgRef.current = buildOuterSvg({ px0, py0, px1, py1 }).addTo(map);
      });
    }).catch(() => {
      // ignore load failure
    });

    return () => {
      cancelled = true;
      cleanup();
    };
  }, [mapInstance, cloudFogPaneRef, districtsList, cities, scoutedRegionIds, isEditMode, parchmentMode]);
}
