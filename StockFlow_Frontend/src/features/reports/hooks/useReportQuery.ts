'use client';

// Tải dữ liệu một báo cáo theo "khóa yêu cầu" (kỳ, kho, trang...): đổi khóa thì tải lại.
// Giữ dữ liệu lần trước trong lúc tải để màn hình không nháy trống; bỏ kết quả của yêu cầu cũ.

import { useCallback, useEffect, useRef, useState } from 'react';

interface Settled {
  key: string;
  error: string | null;
}

export function useReportQuery<T>(requestKey: string, ready: boolean, fetcher: () => Promise<T>, errorText: string) {
  const [data, setData] = useState<T | null>(null);
  const [settled, setSettled] = useState<Settled | null>(null);
  const [reloadCount, setReloadCount] = useState(0);
  const fetcherRef = useRef(fetcher);

  useEffect(() => {
    fetcherRef.current = fetcher;
  });

  const fullKey = `${requestKey}#${reloadCount}`;

  useEffect(() => {
    if (!ready) return;
    let stale = false;
    fetcherRef.current()
      .then((res) => {
        if (stale) return;
        setData(res);
        setSettled({ key: fullKey, error: null });
      })
      .catch((err: unknown) => {
        if (!stale) setSettled({ key: fullKey, error: err instanceof Error && err.message ? err.message : errorText });
      });
    return () => {
      stale = true;
    };
  }, [fullKey, ready, errorText]);

  const reload = useCallback(() => setReloadCount((c) => c + 1), []);
  const current = settled?.key === fullKey ? settled : null;

  return {
    data,
    loading: ready && !current,
    error: current?.error ?? null,
    reload,
  };
}
