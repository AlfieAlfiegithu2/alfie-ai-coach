import { useEffect, useRef, useState } from 'react';

type UseGeminiRealtimeOptions = {
  promptId?: string;
};

export function useGeminiRealtime(_opts?: UseGeminiRealtimeOptions) {
  const pcRef = useRef<RTCPeerConnection | null>(null);
  const [connected, setConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    return () => {
      pcRef.current?.close();
      pcRef.current = null;
    };
  }, []);

  return {
    connected,
    error,
  };
}


