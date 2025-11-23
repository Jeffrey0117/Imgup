"use client";

import React, { createContext, useContext, useState, useEffect } from 'react';

interface CsrfContextType {
  csrfToken: string | null;
  csrfSignature: string | null;
  setCsrfTokens: (token: string, signature: string) => void;
  clearCsrfTokens: () => void;
  isReady: boolean;
}

const CsrfContext = createContext<CsrfContextType | undefined>(undefined);

const CSRF_TOKEN_KEY = 'csrf_token';
const CSRF_SIGNATURE_KEY = 'csrf_signature';

export function CsrfProvider({ children }: { children: React.ReactNode }) {
  const [csrfToken, setCsrfToken] = useState<string | null>(null);
  const [csrfSignature, setCsrfSignature] = useState<string | null>(null);
  const [isReady, setIsReady] = useState(false);

  // 從 localStorage 載入 CSRF tokens
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const token = localStorage.getItem(CSRF_TOKEN_KEY);
      const signature = localStorage.getItem(CSRF_SIGNATURE_KEY);

      if (token && signature) {
        setCsrfToken(token);
        setCsrfSignature(signature);
      }

      setIsReady(true);
    }
  }, []);

  const setCsrfTokens = (token: string, signature: string) => {
    setCsrfToken(token);
    setCsrfSignature(signature);

    if (typeof window !== 'undefined') {
      localStorage.setItem(CSRF_TOKEN_KEY, token);
      localStorage.setItem(CSRF_SIGNATURE_KEY, signature);
    }
  };

  const clearCsrfTokens = () => {
    setCsrfToken(null);
    setCsrfSignature(null);

    if (typeof window !== 'undefined') {
      localStorage.removeItem(CSRF_TOKEN_KEY);
      localStorage.removeItem(CSRF_SIGNATURE_KEY);
    }
  };

  return (
    <CsrfContext.Provider
      value={{
        csrfToken,
        csrfSignature,
        setCsrfTokens,
        clearCsrfTokens,
        isReady,
      }}
    >
      {children}
    </CsrfContext.Provider>
  );
}

export function useCsrf() {
  const context = useContext(CsrfContext);
  if (context === undefined) {
    throw new Error('useCsrf must be used within a CsrfProvider');
  }
  return context;
}
