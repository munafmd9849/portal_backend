/**
 * Socket.IO Client Service
 * Replaces Firestore real-time listeners (onSnapshot)
 * Provides real-time updates via WebSocket
 */

import { io } from 'socket.io-client';
import api from './api.js';
import { SOCKET_URL } from '../config/api.js';

let socket = null;

/**
 * Resolves when the shared socket is connected (or after timeout).
 */
export function whenSocketReady(timeoutMs = 12000) {
  const s = initSocket();
  if (!s) return Promise.resolve(null);
  if (s.connected) return Promise.resolve(s);
  return new Promise((resolve) => {
    const timer = setTimeout(() => {
      s.off('connect', onConnect);
      resolve(s.connected ? s : s);
    }, timeoutMs);
    const onConnect = () => {
      clearTimeout(timer);
      s.off('connect', onConnect);
      resolve(s);
    };
    s.on('connect', onConnect);
  });
}

/**
 * Initialize Socket.IO connection
 */
export function initSocket() {
  const token = api.getAuthToken();

  if (!token) {
    console.warn('No auth token, Socket.IO not connected');
    return null;
  }

  // Reuse a connecting socket. Recreating it drops subscribe:proctoring and
  // causes ECONNRESET through the Vite HTTPS proxy.
  if (socket) {
    socket.auth = { token };
    if (socket.connected || socket.active) {
      return socket;
    }
    socket.disconnect();
    socket = null;
  }

  const isDev = import.meta.env.DEV;
  const options = {
    path: '/socket.io',
    auth: { token },
    query: { token },
    extraHeaders: { Authorization: `Bearer ${token}` },
    // Polling first is reliable through the Vite proxy; websocket upgrades after.
    transports: ['polling', 'websocket'],
    withCredentials: true,
    reconnection: true,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 8000,
    reconnectionAttempts: Infinity,
    timeout: 20000,
    upgrade: true,
  };

  console.log(`🔌 Initializing Socket.IO connection to: ${isDev ? window.location.origin : SOCKET_URL}`);

  socket = isDev ? io(options) : io(SOCKET_URL, options);

  socket.on('connect', () => {
    console.log('✅ Socket.IO connected');
    socket.emit('subscribe:jobs');
    socket.emit('subscribe:applications');
    socket.emit('subscribe:notifications');
  });

  socket.on('disconnect', () => {
    console.log('❌ Socket.IO disconnected');
  });

  socket.on('connect_error', (error) => {
    console.error('Socket.IO connect_error:', error?.message || error);
  });

  socket.on('error', (error) => {
    console.error('Socket.IO error:', error);
  });

  return socket;
}

/**
 * Disconnect Socket.IO
 */
export function disconnectSocket() {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
}

/**
 * Subscribe to real-time updates
 */
export function subscribeToUpdates(callbacks) {
  if (!socket) {
    socket = initSocket();
  }

  // Application updates
  if (callbacks.onApplicationCreated) {
    socket.on('application:created', callbacks.onApplicationCreated);
  }

  if (callbacks.onApplicationUpdated) {
    socket.on('application:updated', callbacks.onApplicationUpdated);
  }

  // Notification updates
  if (callbacks.onNotificationNew) {
    socket.on('notification:new', callbacks.onNotificationNew);
  }

  // Job updates
  if (callbacks.onJobPosted) {
    socket.on('job:posted', callbacks.onJobPosted);
  }

  if (callbacks.onJobUpdated) {
    socket.on('job:updated', callbacks.onJobUpdated);
  }

  // Return unsubscribe function
  return () => {
    if (socket) {
      if (callbacks.onApplicationCreated) socket.off('application:created');
      if (callbacks.onApplicationUpdated) socket.off('application:updated');
      if (callbacks.onNotificationNew) socket.off('notification:new');
      if (callbacks.onJobPosted) socket.off('job:posted');
      if (callbacks.onJobUpdated) socket.off('job:updated');
    }
  };
}

/**
 * Use Socket.IO in React hook
 */
export function useSocket() {
  return socket;
}

/**
 * Real-time proctoring updates for admin live monitor (screenshots + violations).
 */
export function subscribeProctoringMonitor(assessmentId, callbacks = {}) {
  const s = initSocket();
  if (!s || !assessmentId) return () => {};

  const join = () => s.emit('subscribe:proctoring', assessmentId);
  join();
  s.on('connect', join);

  const handler = (payload) => {
    if (!payload || payload.assessmentId === assessmentId || !payload.assessmentId) {
      callbacks.onUpdate?.(payload);
    }
    if (payload?.kind === 'screenshot') callbacks.onScreenshot?.(payload);
    if (payload?.kind === 'violation') callbacks.onViolation?.(payload);
    if (payload?.kind === 'paused') callbacks.onPaused?.(payload);
    if (payload?.kind === 'unlocked') callbacks.onUnlocked?.(payload);
    if (payload?.kind === 'extended') callbacks.onExtended?.(payload);
  };

  s.on('proctoring:update', handler);

  const liveHandler = (payload) => {
    callbacks.onLiveFrame?.(payload);
  };
  s.on('proctoring:live-frame', liveHandler);

  return () => {
    s.off('connect', join);
    s.off('proctoring:update', handler);
    s.off('proctoring:live-frame', liveHandler);
    s.emit('unsubscribe:proctoring', assessmentId);
  };
}

export function subscribeAssessmentSessionControl(sessionId, onControl) {
  const s = initSocket();
  if (!s || !sessionId || typeof onControl !== 'function') return () => {};

  const handler = (payload) => {
    if (!payload) return;
    if (payload.sessionId && payload.sessionId !== sessionId) return;
    onControl(payload);
  };
  s.on('assessment:session-control', handler);
  return () => s.off('assessment:session-control', handler);
}

export function emitProctoringLiveFrame(assessmentId, sessionId, frame) {
  const s = initSocket();
  if (!s?.connected || !assessmentId || !sessionId || !frame) return;
  s.emit('proctoring:frame', { assessmentId, sessionId, frame });
}

export default {
  initSocket,
  disconnectSocket,
  subscribeToUpdates,
  subscribeProctoringMonitor,
  subscribeAssessmentSessionControl,
  emitProctoringLiveFrame,
  useSocket,
};
