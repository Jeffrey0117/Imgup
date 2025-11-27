// src/hooks/useDeviceFingerprint.ts
// React Hook for device fingerprint collection and caching

'use client';

import { useState, useEffect } from 'react';
import {
  generateDeviceFingerprint,
  getCachedFingerprint,
  setCachedFingerprint,
  type FingerprintData,
} from '@/utils/fingerprint';

export interface DeviceFingerprintState {
  fingerprint: string | null;
  isLoading: boolean;
  error: Error | null;
  fingerprintData: FingerprintData | null;
}

/**
 * React Hook for device fingerprinting
 * Automatically generates and caches device fingerprint
 */
export function useDeviceFingerprint() {
  const [state, setState] = useState<DeviceFingerprintState>({
    fingerprint: null,
    isLoading: true,
    error: null,
    fingerprintData: null,
  });

  useEffect(() => {
    let isMounted = true;

    async function initFingerprint() {
      try {
        // 检查缓存
        const cached = getCachedFingerprint();
        if (cached && isMounted) {
          setState({
            fingerprint: cached,
            isLoading: false,
            error: null,
            fingerprintData: null, // 不重新生成完整数据
          });
          return;
        }

        // 生成新指纹
        const data = await generateDeviceFingerprint();

        if (isMounted) {
          setCachedFingerprint(data.fingerprint);
          setState({
            fingerprint: data.fingerprint,
            isLoading: false,
            error: null,
            fingerprintData: data,
          });
        }
      } catch (err) {
        if (isMounted) {
          setState({
            fingerprint: null,
            isLoading: false,
            error: err instanceof Error ? err : new Error('Fingerprint generation failed'),
            fingerprintData: null,
          });
        }
      }
    }

    initFingerprint();

    return () => {
      isMounted = false;
    };
  }, []);

  /**
   * 强制重新生成指纹
   */
  const regenerate = async () => {
    setState((prev) => ({ ...prev, isLoading: true, error: null }));

    try {
      const data = await generateDeviceFingerprint();
      setCachedFingerprint(data.fingerprint);
      setState({
        fingerprint: data.fingerprint,
        isLoading: false,
        error: null,
        fingerprintData: data,
      });
    } catch (err) {
      setState({
        fingerprint: null,
        isLoading: false,
        error: err instanceof Error ? err : new Error('Fingerprint regeneration failed'),
        fingerprintData: null,
      });
    }
  };

  return {
    ...state,
    regenerate,
  };
}

/**
 * Hook for sending fingerprint to server on mount
 * Useful for tracking new visitors
 */
export function useTrackDeviceFingerprint(options?: {
  endpoint?: string;
  enabled?: boolean;
}) {
  const { fingerprint, fingerprintData, isLoading } = useDeviceFingerprint();
  const [isSent, setIsSent] = useState(false);
  const [sendError, setSendError] = useState<Error | null>(null);

  useEffect(() => {
    if (
      !fingerprint ||
      !fingerprintData ||
      isLoading ||
      isSent ||
      options?.enabled === false
    ) {
      return;
    }

    const endpoint = options?.endpoint || '/api/track/fingerprint';

    fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(fingerprintData),
    })
      .then((res) => {
        if (!res.ok) throw new Error(`Failed to send fingerprint: ${res.statusText}`);
        setIsSent(true);
        setSendError(null);
      })
      .catch((err) => {
        setSendError(err instanceof Error ? err : new Error('Unknown error'));
      });
  }, [fingerprint, fingerprintData, isLoading, isSent, options?.endpoint, options?.enabled]);

  return {
    fingerprint,
    fingerprintData,
    isLoading,
    isSent,
    sendError,
  };
}
