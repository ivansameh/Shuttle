import { Router } from 'express';
import { AuthController } from '../controllers/auth.controller';
import { validate } from '../middleware/validate.middleware';
import { RegisterSchema, LoginSchema } from '../schemas';

const router = Router();

// Endpoint for user registration
router.post('/register', validate(RegisterSchema), AuthController.register);

// Endpoint for user login
router.post('/login', validate(LoginSchema), AuthController.login);

export default router;
