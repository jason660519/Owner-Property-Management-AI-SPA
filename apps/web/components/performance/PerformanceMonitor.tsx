'use client';

import { useEffect } from 'react';
import { onCLS, onLCP, onFCP, onTTFB, onINP, Metric } from 'web-vitals';

type NavigatorWithConnection = Navigator & {
  connection?: {
    effectiveType?: string;
  };
};

export function PerformanceMonitor() {
  useEffect(() => {
    // Only run in production or if needed in dev
    if (process.env.NODE_ENV !== 'production' && !process.env.NEXT_PUBLIC_DEBUG_PERFORMANCE) {
      // return;
    }

    const sendToAnalytics = (metric: Metric) => {
      // Get session ID from local storage or cookie if exists
      const sessionId = typeof window !== 'undefined' ? 
        localStorage.getItem('vitals_session_id') || 
        (Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15)) : 
        '';
      
      if (typeof window !== 'undefined' && !localStorage.getItem('vitals_session_id')) {
        localStorage.setItem('vitals_session_id', sessionId);
      }

      const body = JSON.stringify({
        name: metric.name,
        value: metric.value,
        id: sessionId, // use a persistent session ID instead of metric ID
        page_path: window.location.pathname,
      });

      const conn = (navigator as NavigatorWithConnection).connection?.effectiveType || 'unknown';
      const url = `/api/web-vitals?conn=${conn}`;

      // Use sendBeacon if available for better performance during page exit
      if (navigator.sendBeacon) {
        navigator.sendBeacon(url, body);
      } else {
        fetch(url, {
          body,
          method: 'POST',
          keepalive: true,
          headers: {
            'Content-Type': 'application/json',
          },
        });
      }
    };

    // Register web-vitals reporting
    onCLS(sendToAnalytics);
    onLCP(sendToAnalytics);
    onFCP(sendToAnalytics);
    onTTFB(sendToAnalytics);
    onINP(sendToAnalytics);

  }, []);

  return null;
}
