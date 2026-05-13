/**
 * Live State Store — Task 7.3 / 7.4
 *
 * A singleton in-memory Map that holds the last known GPS position per tripId.
 *
 * WHY this exists:
 *   WebSocket handlers relay GPS pings in real-time, but they have no persistent
 *   state. When a Rider opens the /tracking screen, or an Admin loads the Dispatch
 *   map, they need an immediate position snapshot — they can't wait for the next
 *   driver ping (which may be 3-5 s away).
 *
 *   This store is the bridge: the driver handler writes here on every valid
 *   `location_ping`, and the REST controllers read from here to hydrate the
 *   initial HTTP response before the WebSocket stream takes over.
 *
 * WHY NOT the database:
 *   Writing every GPS ping to PostgreSQL under high fleet concurrency would cause
 *   catastrophic write amplification. This Map lives in Node.js process memory —
 *   reads and writes are O(1) with zero I/O.
 *
 * Scaling note:
 *   For a multi-instance deployment, replace this Map with a Redis HASH
 *   (HSET trip:<tripId> lat <lat> lng <lng> updatedAt <ts>).
 *   The interface below is designed to make that swap trivial.
 */

export interface LivePosition {
  driverId: string;
  tripId: string;
  lat: number;
  lng: number;
  /** ISO 8601 — the timestamp from the driver's device, not the server. */
  timestamp: string;
  /** Server-side epoch ms when this entry was last written. Used for staleness checks. */
  serverReceivedAt: number;
}

/**
 * The store: Map<tripId, LivePosition>
 *
 * Exported as a plain Map so it can be imported by both WebSocket handlers
 * (writers) and REST controllers (readers) without a circular dependency.
 */
export const livePositionStore = new Map<string, LivePosition>();

/** Write or update the live position for a trip. Called by the driver handler. */
export const setLivePosition = (position: Omit<LivePosition, 'serverReceivedAt'>): void => {
  livePositionStore.set(position.tripId, {
    ...position,
    serverReceivedAt: Date.now(),
  });
};

/** Read the last known position for a trip. Returns undefined if no ping received yet. */
export const getLivePosition = (tripId: string): LivePosition | undefined => {
  return livePositionStore.get(tripId);
};

/** Remove a trip's position when the driver disconnects. Prevents stale entries. */
export const clearLivePosition = (tripId: string): void => {
  livePositionStore.delete(tripId);
};

/** Snapshot of all currently tracked trips. Used by the Admin Dispatch endpoint. */
export const getAllLivePositions = (): LivePosition[] => {
  return Array.from(livePositionStore.values());
};
