import crypto from 'crypto';
import QRCode from 'qrcode';
import { AppError } from '../utils/AppError';

export class QRService {
  private static readonly SECRET = process.env.SERVER_SECRET || 'dev-fallback-secret-for-qr';

  /**
   * Generates a cryptographically signed payload for a booking.
   * Format: HMAC-SHA256(bookingId:tripId:userId, SECRET)
   */
  static generateSignedPayload(bookingId: string, tripId: string, userId: string): string {
    const rawData = `${bookingId}:${tripId}:${userId}`;
    const hmac = crypto.createHmac('sha256', this.SECRET);
    hmac.update(rawData);
    const signature = hmac.digest('hex');
    
    // Return a payload that includes both the raw data and the signature
    // This allows the scanner to verify the integrity
    return `${rawData}:${signature}`;
  }

  /**
   * Generates a QR code image as a Buffer (PNG).
   */
  static async generateQRBuffer(payload: string): Promise<Buffer> {
    try {
      return await QRCode.toBuffer(payload, {
        type: 'png',
        margin: 2,
        width: 300,
        color: {
          dark: '#000000',
          light: '#ffffff',
        },
      });
    } catch (error) {
      console.error('[QRService] Error generating QR code:', error);
      throw new AppError('Failed to generate ticket QR code', 500);
    }
  }

  /**
   * Verifies if a payload's signature is valid.
   * Useful for the driver's scanner app later.
   */
  static verifyPayload(payload: string): boolean {
    try {
      const parts = payload.split(':');
      if (parts.length !== 4) return false;

      const [bookingId, tripId, userId, signature] = parts;
      const expectedSignature = this.generateSignedPayload(bookingId, tripId, userId).split(':')[3];

      return signature === expectedSignature;
    } catch {
      return false;
    }
  }
}
