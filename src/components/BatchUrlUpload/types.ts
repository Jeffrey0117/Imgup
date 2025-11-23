export type UrlStatus = 'validating' | 'ready' | 'processing' | 'success' | 'failed';

export interface UrlItem {
  id: string;
  url: string;
  status: UrlStatus;
  error?: string;
  result?: {
    hash?: string;
    shortUrl?: string;
    extension?: string;
  };
}

export interface BatchUploadStats {
  total: number;
  validating: number;
  ready: number;
  processing: number;
  success: number;
  failed: number;
}
