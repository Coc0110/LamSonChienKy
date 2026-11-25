export interface DistrictPolygonEntry {
  id: string;
  name: string;
  polygon: [number, number][];
}

export interface EligibleScoutDistrict {
  id: string;
  name: string;
  scoutDays: number;
}

function pointToSegmentDistSq(
  px: number,
  py: number,
  ax: number,
  ay: number,
  bx: number,
  by: number,
): number {
  const dx = bx - ax;
  const dy = by - ay;
  const lenSq = dx * dx + dy * dy;
  if (lenSq <= 1e-9) {
    const vx = px - ax;
    const vy = py - ay;
    return vx * vx + vy * vy;
  }
  const t = Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / lenSq));
  const cx = ax + t * dx;
  const cy = ay + t * dy;
  const rx = px - cx;
  const ry = py - cy;
  return rx * rx + ry * ry;
}

/** Checks if two district polygons share a border (within 1.2% map distance). */
export function areDistrictsAdjacent(
  polyA: [number, number][],
  polyB: [number, number][],
  threshold = 1.2,
): boolean {
  if (polyA.length === 0 || polyB.length === 0) return false;
  const threshSq = threshold * threshold;

  for (let i = 0; i < polyA.length; i++) {
    const [px, py] = polyA[i];
    for (let j = 0; j < polyB.length; j++) {
      const [ax, ay] = polyB[j];
      const [bx, by] = polyB[(j + 1) % polyB.length];
      if (pointToSegmentDistSq(px, py, ax, ay, bx, by) <= threshSq) {
        return true;
      }
    }
  }

  for (let i = 0; i < polyB.length; i++) {
    const [px, py] = polyB[i];
    for (let j = 0; j < polyA.length; j++) {
      const [ax, ay] = polyA[j];
      const [bx, by] = polyA[(j + 1) % polyA.length];
      if (pointToSegmentDistSq(px, py, ax, ay, bx, by) <= threshSq) {
        return true;
      }
    }
  }

  return false;
}

/** Computes scouting duration in days (1-5) from polygon area via Shoelace formula. */
export function getDistrictScoutDays(poly: [number, number][]): number {
  if (poly.length < 3) return 1;
  let sum = 0;
  for (let i = 0; i < poly.length; i++) {
    const [x1, y1] = poly[i];
    const [x2, y2] = poly[(i + 1) % poly.length];
    sum += x1 * y2 - x2 * y1;
  }
  const area = Math.abs(sum) * 0.5;
  return Math.max(1, Math.min(5, Math.round(area * 0.45)));
}

/**
 * Returns districts eligible to be scouted by a watchtower of `watchtowerLevel`.
 * Lv.1 = adjacent (1 hop) to Lam Sơn; Lv.2 = <= 2 hops; Lv.3 = <= 3 hops; Lv.4+ = all (incl. Tây Đô).
 * Ineligible or already-scouted districts are omitted.
 */
export function getEligibleScoutDistricts(
  districts: DistrictPolygonEntry[],
  scoutedIds: string[],
  watchtowerLevel: number,
): EligibleScoutDistrict[] {
  const scoutedSet = new Set(scoutedIds);

  if (watchtowerLevel >= 4) {
    return districts
      .filter((d) => d.id !== 'lam_son' && !scoutedSet.has(d.id))
      .map((d) => ({
        id: d.id,
        name: d.name,
        scoutDays: getDistrictScoutDays(d.polygon),
      }));
  }

  const adj = new Map<string, string[]>();
  for (const d of districts) {
    adj.set(d.id, []);
  }
  for (let i = 0; i < districts.length; i++) {
    for (let j = i + 1; j < districts.length; j++) {
      if (areDistrictsAdjacent(districts[i].polygon, districts[j].polygon)) {
        adj.get(districts[i].id)!.push(districts[j].id);
        adj.get(districts[j].id)!.push(districts[i].id);
      }
    }
  }

  const hopDist = new Map<string, number>();
  const queue: string[] = ['lam_son'];
  hopDist.set('lam_son', 0);

  let head = 0;
  while (head < queue.length) {
    const curr = queue[head++];
    const dist = hopDist.get(curr)!;
    if (dist >= watchtowerLevel) continue;
    for (const nextId of adj.get(curr) ?? []) {
      if (!hopDist.has(nextId)) {
        hopDist.set(nextId, dist + 1);
        queue.push(nextId);
      }
    }
  }

  return districts
    .filter((d) => {
      if (d.id === 'lam_son' || d.id === 'tay_do' || scoutedSet.has(d.id)) return false;
      const dist = hopDist.get(d.id);
      return dist !== undefined && dist <= watchtowerLevel;
    })
    .map((d) => ({
      id: d.id,
      name: d.name,
      scoutDays: getDistrictScoutDays(d.polygon),
    }));
}
