import { Router } from 'express';
import { getChatHistory } from '../controllers/chat.controller';
import { authenticate } from '../middleware/auth.middleware';

const router = Router();

// Endpoint for chat history
// We use 'authenticate' to populate req.user, then controller logic handles roll-based access.
router.get('/bookings/:bookingId/messages', authenticate, getChatHistory);

export default router;
