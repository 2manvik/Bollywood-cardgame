import React, { createContext, useContext, useEffect, useState } from 'react';
import { useAuth } from './AuthContext';
import { connectSocket, disconnectSocket, getSocket } from '../socket/socket';

const SocketContext = createContext(null);

export function SocketProvider({ children }) {
  const { user, token, isAuthenticated } = useAuth();
  const [socket, setSocket] = useState(null);
  const [connected, setConnected] = useState(false);
  const [incomingChallenge, setIncomingChallenge] = useState(null);

  useEffect(() => {
    if (isAuthenticated && token) {
      const s = connectSocket(token);
      setSocket(s);

      const onConnect = () => setConnected(true);
      const onDisconnect = () => setConnected(false);

      s.on('connect', onConnect);
      s.on('disconnect', onDisconnect);

      // Listen for incoming friend challenge
      s.on('challenge:received', (data) => {
        console.log('[Socket] Incoming challenge received:', data);
        setIncomingChallenge(data);
      });

      s.on('challenge:cancelled', () => {
        setIncomingChallenge(null);
      });

      setConnected(s.connected);

      return () => {
        s.off('connect', onConnect);
        s.off('disconnect', onDisconnect);
        s.off('challenge:received');
        s.off('challenge:cancelled');
        disconnectSocket();
        setSocket(null);
        setConnected(false);
      };
    } else {
      disconnectSocket();
      setSocket(null);
      setConnected(false);
    }
  }, [isAuthenticated, token]);

  const clearChallenge = () => setIncomingChallenge(null);

  return (
    <SocketContext.Provider value={{ socket, connected, incomingChallenge, clearChallenge }}>
      {children}
    </SocketContext.Provider>
  );
}

export function useSocket() {
  const context = useContext(SocketContext);
  if (!context) {
    throw new Error('useSocket must be used within a SocketProvider');
  }
  return context;
}
