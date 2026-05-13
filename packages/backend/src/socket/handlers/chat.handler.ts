import { Server, Socket } from 'socket.io';
import { prisma } from '../../lib/prisma';
import { SocketData } from '../auth.middleware';

/**
 * Handles real-time messaging events (Phase 7 extension).
 * 
 * Logic Overview:
 * - Riders and Drivers can join rooms and send/receive messages.
 * - Admins can join rooms (read-only) but are BLOCKED from sending messages.
 */
export const registerChatHandlers = (io: Server, socket: Socket) => {
  const { userId, role } = socket.data as SocketData;

  // Event: join_chat
  // Payload: { bookingId: string }
  // Adds the socket to a private room for that booking.
  socket.on('join_chat', ({ bookingId }: { bookingId: string }) => {
    if (!bookingId) return;
    
    const roomName = `chat_${bookingId}`;
    socket.join(roomName);
    
    console.log(`[Socket] User ${userId} (${role}) joined chat room: ${roomName}`);
  });

  // Event: send_message
  // Payload: { bookingId: string, content: string }
  // Blocks Admins from sending and broadcasts the message to the room.
  socket.on('send_message', async ({ bookingId, content }: { bookingId: string, content: string }) => {
    try {
      // Step 3.3: Crucial Admin Block
      // Requirement: "If socket.handshake.auth.role === 'ADMIN', immediately drop the event and return an error"
      // Note: We use socket.data.role which was validated in the auth middleware.
      if (role === 'ADMIN') {
        socket.emit('error', { message: 'Admins have read-only oversight and cannot send messages.' });
        return;
      }

      if (!bookingId || !content || content.trim() === '') {
        return;
      }

      // Step 3.4: Save the message to the database via Prisma
      const newMessage = await prisma.message.create({
        data: {
          bookingId,
          content,
          senderId: userId,
        },
        include: {
          sender: {
            select: {
              id: true,
              name: true,
              role: true,
            },
          },
        },
      });

      // Step 3.5: Broadcast a new_message event to the chat_${bookingId} room
      const roomName = `chat_${bookingId}`;
      io.to(roomName).emit('new_message', newMessage);

    } catch (error: any) {
      console.error('[Socket] Chat error:', error);
      socket.emit('error', { message: 'Failed to send message.' });
    }
  });

  // Event: leave_chat
  socket.on('leave_chat', ({ bookingId }: { bookingId: string }) => {
    if (!bookingId) return;
    const roomName = `chat_${bookingId}`;
    socket.leave(roomName);
    console.log(`[Socket] User ${userId} left chat room: ${roomName}`);
  });
};
