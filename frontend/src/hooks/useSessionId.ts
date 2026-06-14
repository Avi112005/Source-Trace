import { useState, useEffect } from 'react';

function generateUUID() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

export function useSessionId() {
  const [sessionId, setSessionId] = useState<string | null>(null);

  useEffect(() => {
    let stored = localStorage.getItem('agentic_session_id');
    if (!stored) {
      stored = generateUUID();
      localStorage.setItem('agentic_session_id', stored);
    }
    setSessionId(stored);
  }, []);

  return sessionId;
}
