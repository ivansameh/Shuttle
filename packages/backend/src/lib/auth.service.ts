import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import fs from 'fs';
import path from 'path';

// RS256 Asymmetric Key Pair
// --------------------------------------------------------------------------
let privateKey: string | undefined;
let publicKey: string | undefined;

try {
  const certsDir = path.join(__dirname, '../../certs');
  const privateKeyPath = path.join(certsDir, 'private.pem');
  const publicKeyPath = path.join(certsDir, 'public.pem');

  if (fs.existsSync(privateKeyPath) && fs.existsSync(publicKeyPath)) {
    privateKey = fs.readFileSync(privateKeyPath, 'utf8');
    publicKey = fs.readFileSync(publicKeyPath, 'utf8');
  }
} catch (error) {
  console.warn('⚠️ Failed to load RSA keys for JWT from certs directory.');
}

// Fallback to environment variables if files are missing
privateKey = process.env.JWT_PRIVATE_KEY || privateKey;
publicKey = process.env.JWT_PUBLIC_KEY || publicKey;

const JWT_SECRET = process.env.JWT_SECRET || 'fallback-secret-for-dev-only-change-me';
const JWT_EXPIRES_IN = '7d';

export interface JwtPayload {
  id: string;
  role: string;
}

export class AuthService {
  /**
   * Hashes a plaintext password
   */
  static async hashPassword(password: string): Promise<string> {
    const saltRounds = 10;
    return bcrypt.hash(password, saltRounds);
  }

  /**
   * Compares a plaintext password with a hashed password
   */
  static async comparePassword(password: string, hash: string): Promise<boolean> {
    return bcrypt.compare(password, hash);
  }

  /**
   * Generates a signed JWT token
   * Uses RS256 if RSA keys are present, otherwise falls back to HS256.
   */
  static generateToken(payload: JwtPayload): string {
    if (privateKey) {
      return jwt.sign(payload, privateKey, { algorithm: 'RS256', expiresIn: JWT_EXPIRES_IN });
    }
    return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
  }

  /**
   * Verifies and decodes a JWT token
   * Automatically handles both RS256 and HS256 based on key availability.
   */
  static verifyToken(token: string): JwtPayload {
    if (publicKey) {
      return jwt.verify(token, publicKey, { algorithms: ['RS256'] }) as JwtPayload;
    }
    return jwt.verify(token, JWT_SECRET) as JwtPayload;
  }
}
