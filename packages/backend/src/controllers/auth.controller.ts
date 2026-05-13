import { Request, Response } from 'express';
import { prisma } from '../lib/prisma';
import { AuthService } from '../lib/auth.service';
import { Role, UserStatus } from '@prisma/client';

export class AuthController {
  /**
   * Register a new user
   */
  static async register(req: Request, res: Response) {
    try {
      const { name, email, phone, password, role } = req.body;

      if (!name || !email || !password) {
        return res.status(400).json({
          success: false,
          data: null,
          error: 'Missing required fields: name, email, password',
        });
      }

      // Default role to RIDER if not provided or invalid
      let assignedRole: Role = Role.RIDER;
      if (role && Object.values(Role).includes(role)) {
        assignedRole = role as Role;
      }

      // Check if user already exists
      const existingUser = await prisma.user.findFirst({
        where: {
          OR: [
            { email },
            { phone: phone || undefined }
          ],
        },
      });

      if (existingUser) {
        return res.status(409).json({
          success: false,
          data: null,
          error: 'User with this email or phone already exists',
        });
      }

      const passwordHash = await AuthService.hashPassword(password);
      
      // DRIVER requires approval, RIDER is active immediately
      const status = assignedRole === Role.DRIVER ? UserStatus.PENDING : UserStatus.ACTIVE;

      const user = await prisma.user.create({
        data: {
          name,
          email,
          phone,
          passwordHash,
          role: assignedRole,
          status,
        },
      });

      const token = AuthService.generateToken({ id: user.id, role: user.role });

      return res.status(201).json({
        success: true,
        data: {
          token,
          user: {
            id: user.id,
            name: user.name,
            email: user.email,
            role: user.role,
            status: user.status,
          },
        },
        error: null,
      });
    } catch (error: any) {
      console.error('Error during registration:', error);
      return res.status(500).json({
        success: false,
        data: null,
        error: 'Failed to register new user',
      });
    }
  }

  /**
   * Login an existing user
   */
  static async login(req: Request, res: Response) {
    try {
      const { email, password } = req.body;

      if (!email || !password) {
        return res.status(400).json({
          success: false,
          data: null,
          error: 'Missing required fields: email, password',
        });
      }

      const user = await prisma.user.findUnique({
        where: { email },
      });

      if (!user) {
        return res.status(401).json({
          success: false,
          data: null,
          error: 'Invalid credentials',
        });
      }

      const isValidPassword = await AuthService.comparePassword(password, user.passwordHash);

      if (!isValidPassword) {
        return res.status(401).json({
          success: false,
          data: null,
          error: 'Invalid credentials',
        });
      }

      if (!user.isActive) {
        return res.status(403).json({
          success: false,
          data: null,
          error: 'User account is inactive',
        });
      }

      if (user.status === UserStatus.REJECTED) {
        return res.status(403).json({
          success: false,
          data: null,
          error: 'Your application has been rejected.',
        });
      }

      if (user.status === UserStatus.SUSPENDED) {
        return res.status(403).json({
          success: false,
          data: null,
          error: 'Your account has been suspended.',
        });
      }

      const token = AuthService.generateToken({ id: user.id, role: user.role });

      return res.status(200).json({
        success: true,
        data: {
          token,
          user: {
            id: user.id,
            name: user.name,
            email: user.email,
            role: user.role,
            status: user.status,
          },
        },
        error: null,
      });
    } catch (error: any) {
      console.error('Error during login:', error);
      return res.status(500).json({
        success: false,
        data: null,
        error: 'Login failed due to a server error',
      });
    }
  }
}
