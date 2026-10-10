'use client';

import { useAuth } from '@/context/AuthContext';
import { useCallback, useEffect, useState } from 'react';

// A simple session ID generator for anonymous tracking across a session
const generateSessionId = () => {
  return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
};

export const useAnalytics = () => {
  const { user } = useAuth();
  const [sessionId, setSessionId] = useState<string>('');

  useEffect(() => {
    // Initialize session ID from sessionStorage or create a new one
    let currentSessionId = sessionStorage.getItem('zila_session_id');
    if (!currentSessionId) {
      currentSessionId = generateSessionId();
      sessionStorage.setItem('zila_session_id', currentSessionId);
    }
    setSessionId(currentSessionId);
  }, []);

  const trackEvent = useCallback(
    async (eventType: string, eventData?: Record<string, any>) => {
      try {
        if (!sessionId) return; // Wait until session ID is ready

        await fetch('/api/analytics/track', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            eventType,
            eventData,
            sessionId,
            userId: user?.uid || null,
          }),
        });
      } catch (error) {
        console.error('Failed to track event:', error);
      }
    },
    [user, sessionId]
  );

  return { trackEvent };
};

