import { io } from 'socket.io-client';

// Connect to the backend
export const socket = io('http://localhost:5000');
