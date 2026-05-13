import { redis } from '../lib/redis';

/**
 * Live State Store — Task 7.3 / 7.4 / 2.2
 *
 * A distributed Redis-backed store that holds the last known GPS position per tripId.
 *
 * WHY Redis:
 *   For multi-instance deployments, an in-memory Map loses state on restart and 
 *   cannot be shared between backend nodes. Redis HASH provides O(1) performance 
 *   with cross-instance persistence and automatic TTL expiration.
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

const TRIP_PREFIX = 'trip_live:';
const DEFAULT_TTL = 60; // 60 seconds as per requirement

/** Write or update the live position for a trip. Called by the driver handler/monitor. */
export const setLivePosition = async (position: Omit<LivePosition, 'serverReceivedAt'>): Promise<void> => {
  const key = `${TRIP_PREFIX}${position.tripId}`;
  const data = {
    driverId: position.driverId,
    tripId: position.tripId,
    lat: position.lat.toString(),
    lng: position.lng.toString(),
    timestamp: position.timestamp,
    serverReceivedAt: Date.now().toString(),
  };

  await redis.hset(key, data);
  await redis.expire(key, DEFAULT_TTL);
};

/** Read the last known position for a trip. Returns undefined if no ping received yet. */
export const getLivePosition = async (tripId: string): Promise<LivePosition | undefined> => {
  const key = `${TRIP_PREFIX}${tripId}`;
  const data = await redis.hgetall(key);
  
  if (!data || Object.keys(data).length === 0) {
    return undefined;
  }

  return {
    driverId: data.driverId,
    tripId: data.tripId,
    lat: parseFloat(data.lat),
    lng: parseFloat(data.lng),
    timestamp: data.timestamp,
    serverReceivedAt: parseInt(data.serverReceivedAt, 10),
  };
};

/** Remove a trip's position when the driver disconnects. Prevents stale entries. */
export const clearLivePosition = async (tripId: string): Promise<void> => {
  await redis.del(`${TRIP_PREFIX}${tripId}`);
};

/** Snapshot of all currently tracked trips. Used by the Admin Dispatch endpoint. */
export const getAllLivePositions = async (): Promise<LivePosition[]> => {
  const keys = await redis.keys(`${TRIP_PREFIX}*`);
  if (keys.length === 0) return [];

  const positions: LivePosition[] = [];
  // Using a loop for simplicity; in high-traffic, SCAN or PIPELINE would be better.
  for (const key of keys) {
    const data = await redis.hgetall(key);
    if (data && Object.keys(data).length > 0) {
      positions.push({
        driverId: data.driverId,
        tripId: data.tripId,
        lat: parseFloat(data.lat),
        lng: parseFloat(data.lng),
        timestamp: data.timestamp,
        serverReceivedAt: parseInt(data.serverReceivedAt, 10),
      });
    }
  }
  return positions;
};
