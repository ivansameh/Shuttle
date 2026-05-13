import { Router } from 'express';
import { AuthController } from '../controllers/auth.controller';

const router = Router();

// Endpoint for user registration
router.post('/register', AuthController.register);

// Endpoint for user login
router.post('/login', AuthController.login);

export default router;
