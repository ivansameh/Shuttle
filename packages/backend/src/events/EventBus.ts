import { redis, createRedisClient } from '../lib/redis';
import { logger } from '../lib/logger';

export interface IEventBus {
  publish(topic: string, payload: any): Promise<void>;
  subscribe(topic: string, handler: (payload: any) => void): Promise<void>;
}

export enum EventType {
  DRIVER_LOCATION_UPDATED = 'DRIVER_LOCATION_UPDATED',
  TRIP_STATUS_UPDATED = 'TRIP_STATUS_UPDATED',
  STOP_REACHED = 'STOP_REACHED',
  DRIVER_ASSIGNED = 'DRIVER_ASSIGNED',
}

export interface DriverLocationUpdatedEventPayload {
  tripId: string;
  driverId: string;
  lat: number;
  lng: number;
  timestamp: string;
}

export class RedisStreamEventBus implements IEventBus {
  async publish(topic: string, payload: any): Promise<void> {
    try {
      const data = JSON.stringify(payload);
      // XADD key ID field value [field value ...]
      // Using MAXLEN to prevent the stream from growing indefinitely
      await redis.xadd(topic, 'MAXLEN', '~', '1000', '*', 'payload', data);
    } catch (err) {
      logger.error({ err, topic }, '[EventBus] Failed to publish');
    }
  }

  async subscribe(topic: string, handler: (payload: any) => void): Promise<void> {
    const subscriberClient = createRedisClient();
    logger.info({ topic }, '[EventBus] Subscribing to topic');
    
    const readStream = async () => {
      let lastId = '$'; // Start from new entries
      
      while (true) {
        try {
          const result = await subscriberClient.xread('BLOCK', 0, 'STREAMS', topic, lastId);
          if (result) {
            const streamData = result[0];
            const messages = streamData[1];
            
            for (const [id, [_, payloadStr]] of messages) {
              try {
                const payload = JSON.parse(payloadStr);
                handler(payload);
              } catch (parseErr) {
                logger.error({ err: parseErr, messageId: id }, '[EventBus] Failed to parse message');
              }
              lastId = id;
            }
          }
        } catch (err) {
          logger.error({ err, topic }, '[EventBus] Error reading from stream');
          await new Promise(resolve => setTimeout(resolve, 5000));
        }
      }
    };
    
    readStream();
  }
}

export const EventBus = new RedisStreamEventBus();
