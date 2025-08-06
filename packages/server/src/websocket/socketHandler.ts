import { Server as SocketIOServer, Socket } from 'socket.io';
import { logger } from '../utils/logger';

export function setupWebSocket(io: SocketIOServer): void {
  // Handle connection
  io.on('connection', (socket: Socket) => {
    logger.info(`WebSocket client connected: ${socket.id}`);

    // Join project-specific rooms
    socket.on('join-project', (projectId: string) => {
      socket.join(`project:${projectId}`);
      logger.info(`Client ${socket.id} joined room for project ${projectId}`);
    });

    // Leave project-specific rooms
    socket.on('leave-project', (projectId: string) => {
      socket.leave(`project:${projectId}`);
      logger.info(`Client ${socket.id} left room for project ${projectId}`);
    });

    // Handle disconnection
    socket.on('disconnect', () => {
      logger.info(`WebSocket client disconnected: ${socket.id}`);
    });
  });
}

// Helper function to emit scan updates to specific project room
export function emitScanUpdate(
  io: SocketIOServer,
  projectId: string,
  data: any
): void {
  io.to(`project:${projectId}`).emit('scan-update', {
    type: 'scan-update',
    projectId,
    data,
    timestamp: new Date(),
  });
}

// Helper function to emit vulnerability alerts to specific project room
export function emitVulnerabilityAlert(
  io: SocketIOServer,
  projectId: string,
  data: any
): void {
  io.to(`project:${projectId}`).emit('vulnerability-alert', {
    type: 'vulnerability-alert',
    projectId,
    data,
    timestamp: new Date(),
  });
}

// Helper function to emit project updates to all clients
export function emitProjectUpdate(
  io: SocketIOServer,
  projectId: string,
  data: any
): void {
  io.emit('project-update', {
    type: 'project-update',
    projectId,
    data,
    timestamp: new Date(),
  });
}
