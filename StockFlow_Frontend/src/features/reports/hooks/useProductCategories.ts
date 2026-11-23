'use client';

// Danh sách nhóm hàng cho bộ lọc báo cáo (dùng service của feature products – được phép import chéo service)

import { useEffect, useState } from 'react';
import { productService, type BackendProductCategory } from '@/features/products/services/productService';

export function useProductCategories(): BackendProductCategory[] {
  const [categories, setCategories] = useState<BackendProductCategory[]>([]);

  useEffect(() => {
    let stale = false;
    productService
      .getCategories()
      .then((list) => {
        if (!stale) setCategories(list);
      })
      .catch(() => {
        // Không tải được nhóm hàng: vẫn xem báo cáo, chỉ không lọc được theo nhóm
      });
    return () => {
      stale = true;
    };
  }, []);

  return categories;
}
