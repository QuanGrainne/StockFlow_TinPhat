'use client';

// Trang / số dòng của bảng báo cáo phân trang phía server: đổi bộ lọc (filterKey) thì tự về trang 1.

import { useCallback, useState } from 'react';

export const DEFAULT_REPORT_PAGE_SIZE = 50;

export function useReportPaging(filterKey: string) {
  const [state, setState] = useState({ key: filterKey, page: 1, pageSize: DEFAULT_REPORT_PAGE_SIZE });
  const page = state.key === filterKey ? state.page : 1;

  const onChange = useCallback(
    (nextPage: number, nextSize: number) =>
      setState((s) => ({ key: filterKey, page: nextSize !== s.pageSize ? 1 : nextPage, pageSize: nextSize })),
    [filterKey]
  );

  return { page, pageSize: state.pageSize, onChange };
}
