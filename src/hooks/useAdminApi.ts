/**
 * Admin API 資料獲取 Hook
 * 統一管理 loading, error, data 狀態
 */

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";

interface UseAdminApiOptions<T> {
  url: string;
  autoFetch?: boolean; // 是否自動執行 fetch
  onSuccess?: (data: T) => void;
  onError?: (error: string) => void;
  dependencies?: any[]; // 依賴項，當變化時重新 fetch
}

interface UseAdminApiResult<T> {
  data: T | null;
  loading: boolean;
  error: string;
  refetch: () => Promise<void>;
  setData: (data: T | null) => void;
}

/**
 * Admin API 資料獲取 Hook
 *
 * @example
 * const { data, loading, error, refetch } = useAdminApi<StatsData>({
 *   url: "/api/admin/stats",
 *   autoFetch: true,
 * });
 */
export function useAdminApi<T = any>(
  options: UseAdminApiOptions<T>
): UseAdminApiResult<T> {
  const {
    url,
    autoFetch = true,
    onSuccess,
    onError,
    dependencies = [],
  } = options;

  const router = useRouter();
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(autoFetch);
  const [error, setError] = useState("");

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const response = await fetch(url, {
        credentials: "include",
      });

      // 處理 401 未授權
      if (response.status === 401) {
        router.push("/admin-new/login");
        return;
      }

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "請求失敗");
      }

      const result = await response.json();

      if (result.success) {
        setData(result.data);
        onSuccess?.(result.data);
      } else {
        throw new Error(result.error || "請求失敗");
      }
    } catch (err: any) {
      const errorMessage = err.message || "載入失敗";
      setError(errorMessage);
      onError?.(errorMessage);
    } finally {
      setLoading(false);
    }
  }, [url, router, onSuccess, onError]);

  useEffect(() => {
    if (autoFetch) {
      fetchData();
    }
  }, [autoFetch, ...dependencies]);

  return {
    data,
    loading,
    error,
    refetch: fetchData,
    setData,
  };
}

/**
 * Admin API Mutation Hook（用於 POST, PUT, DELETE）
 *
 * @example
 * const { mutate, loading, error } = useAdminMutation<CreateAlbumData>({
 *   url: "/api/admin/albums",
 *   method: "POST",
 *   onSuccess: () => refetchAlbums(),
 * });
 */
export function useAdminMutation<TData = any, TResult = any>(options: {
  url: string;
  method: "POST" | "PUT" | "DELETE" | "PATCH";
  onSuccess?: (data: TResult) => void;
  onError?: (error: string) => void;
}) {
  const { url, method, onSuccess, onError } = options;
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const mutate = useCallback(
    async (data?: TData) => {
      setLoading(true);
      setError("");

      try {
        const response = await fetch(url, {
          method,
          headers: {
            "Content-Type": "application/json",
          },
          credentials: "include",
          body: data ? JSON.stringify(data) : undefined,
        });

        // 處理 401 未授權
        if (response.status === 401) {
          router.push("/admin-new/login");
          return null;
        }

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || "請求失敗");
        }

        const result = await response.json();

        if (result.success) {
          onSuccess?.(result.data);
          return result.data;
        } else {
          throw new Error(result.error || "請求失敗");
        }
      } catch (err: any) {
        const errorMessage = err.message || "操作失敗";
        setError(errorMessage);
        onError?.(errorMessage);
        return null;
      } finally {
        setLoading(false);
      }
    },
    [url, method, router, onSuccess, onError]
  );

  return {
    mutate,
    loading,
    error,
  };
}
