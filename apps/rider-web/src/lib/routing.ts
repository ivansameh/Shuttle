/**
 * Greedy Nearest-Neighbor Sorting for Route Stops.
 * 
 * Takes a list of stops and sorts them such that each stop is geographically
 * closest to its predecessor, starting from the original first stop in the array.
 * This ensures the UI list order matches the visual continuity of the map.
 */
export function sortStopsGreedy<T extends { lat: number; lng: number }>(stops: T[]): T[] {
  if (stops.length <= 2) return stops;

  const seen = new Set<string>();
  const distinct = stops.filter(s => {
    const key = `${s.lat.toFixed(5)}-${s.lng.toFixed(5)}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  if (distinct.length <= 2) return distinct;

  const sorted = [distinct[0]];
  const remaining = distinct.slice(1);

  while (remaining.length > 0) {
    const last = sorted[sorted.length - 1];
    let nearestIdx = 0;
    let minDistance = Infinity;

    for (let i = 0; i < remaining.length; i++) {
      const candidate = remaining[i];
      const dist = Math.pow(last.lat - candidate.lat, 2) + Math.pow(last.lng - candidate.lng, 2);
      if (dist < minDistance) {
        minDistance = dist;
        nearestIdx = i;
      }
    }

    sorted.push(remaining[nearestIdx]);
    remaining.splice(nearestIdx, 1);
  }

  return sorted;
}

/**
 * Fetch Route Information (Geometry + Durations) from OSRM.
 * Returns durations in seconds from the first stop to each subsequent stop.
 */
export async function fetchRouteInfo(stops: { lat: number; lng: number }[]) {
  if (stops.length < 2) return { durations: [0], path: [] };

  try {
    const coords = stops.map(s => `${s.lng},${s.lat}`).join(';');
    const url = `https://router.project-osrm.org/route/v1/driving/${coords}?geometries=geojson&overview=full&annotations=duration`;
    
    const res = await fetch(url);
    const data = await res.json();

    if (!data.routes || !data.routes[0]) throw new Error("No route");

    const route = data.routes[0];
    const path = route.geometry.coordinates.map((c: any) => [c[1], c[0]]);
    
    // OSRM returns durations between waypoints. 
    // We want cumulative duration from the start to each stop.
    let cumulative = 0;
    const durations = [0]; // First stop is at 0 offset
    
    route.legs.forEach((leg: any) => {
      cumulative += leg.duration; // in seconds
      durations.push(cumulative);
    });

    return { durations, path };
  } catch (err) {
    console.error("Route fetch failed", err);
    return { durations: new Array(stops.length).fill(0), path: [] };
  }
}

