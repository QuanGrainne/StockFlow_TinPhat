// src/lib/warehouse/useActiveWarehouse.ts
// Quản lý Chi nhánh / Kho hàng đang kích hoạt trên toàn hệ thống (chọn chi nhánh dùng chung)
// và danh sách kho mà tài khoản đang đăng nhập được phân quyền (jnc_user_warehouse_access).
// Danh sách kho lấy từ GET /api/warehouses/my-warehouses: Admin thấy mọi kho đang hoạt động,
// vai trò khác chỉ thấy kho được gán. Mọi ô chọn / bộ lọc kho làm việc dùng danh sách này.

'use client';

import { useSyncExternalStore, useCallback } from 'react';
import { apiClient } from '@/lib/api/client';
import { tabSession } from '@/lib/auth/tabSession';

export interface WarehouseItem {
  warehouseId: number;
  code: string;
  name: string;
}

interface MyWarehouseDto {
  warehouseId: number;
  code?: string | null;
  name?: string | null;
  status?: string | null;
}

/**
 * "Chưa có kho" (id 0) dùng trước khi tải xong danh sách kho được phân quyền; tải xong sẽ tự chuyển sang kho
 * được phép đầu tiên (reconcileActiveWarehouse). Không gán cứng kho cụ thể vì id / tên kho mỗi hệ thống khác nhau.
 */
const FALLBACK_WAREHOUSE: WarehouseItem = { warehouseId: 0, code: '', name: '' };

const EVENT_NAME = 'stockflow:warehouse-changed';

// ─── Kho làm việc đang chọn ───────────────────────────────────────────────

export function getActiveWarehouse(): WarehouseItem {
  if (typeof window === 'undefined') return FALLBACK_WAREHOUSE;
  try {
    const raw = tabSession.get('stockflow_active_warehouse');
    if (raw) {
      const parsed = JSON.parse(raw) as WarehouseItem | null;
      if (parsed && parsed.warehouseId) {
        return parsed;
      }
    }
  } catch {
    // ignore
  }
  return FALLBACK_WAREHOUSE;
}

let cachedActiveWarehouse: WarehouseItem | null = null;

function getCachedActiveWarehouse(): WarehouseItem {
  if (!cachedActiveWarehouse) {
    cachedActiveWarehouse = getActiveWarehouse();
  }
  return cachedActiveWarehouse;
}

export function setActiveWarehouseGlobal(warehouse: WarehouseItem): void {
  cachedActiveWarehouse = warehouse;
  if (typeof window === 'undefined') return;
  try {
    tabSession.set('stockflow_active_warehouse', JSON.stringify(warehouse));
    window.dispatchEvent(new CustomEvent(EVENT_NAME, { detail: warehouse }));
  } catch (err) {
    console.error('Không thể lưu kho active vào localStorage:', err);
  }
}

// ─── Danh sách kho được phân quyền ────────────────────────────────────────

const EMPTY_WAREHOUSES: WarehouseItem[] = [];
let authorizedWarehouses: WarehouseItem[] = EMPTY_WAREHOUSES;
let authorizedLoaded = false;
/** Token của lần tải gần nhất: đổi tài khoản (đăng nhập lại không tải lại trang) thì tải lại */
let loadedForToken: string | null = null;
let loadingPromise: Promise<void> | null = null;
const listListeners = new Set<() => void>();

function emitList() {
  listListeners.forEach((listener) => listener());
}

function readToken(): string | null {
  return tabSession.get('stockflow_token');
}

/** Kho làm việc phải nằm trong danh sách được phân quyền; nếu không thì chuyển về kho được phép đầu tiên */
function reconcileActiveWarehouse() {
  if (authorizedWarehouses.length === 0) return;
  const current = getCachedActiveWarehouse();
  const match = authorizedWarehouses.find((w) => w.warehouseId === current.warehouseId);
  if (!match) {
    setActiveWarehouseGlobal(authorizedWarehouses[0]);
  } else if (match.name !== current.name || match.code !== current.code) {
    setActiveWarehouseGlobal(match);
  }
}

/** Tải lại danh sách kho được phân quyền (gọi sau khi Admin thêm/sửa/xoá kho hoặc đổi phân quyền) */
export function refreshAuthorizedWarehouses(): Promise<void> {
  if (typeof window === 'undefined') return Promise.resolve();
  loadedForToken = readToken();
  const promise = apiClient
    .get<MyWarehouseDto[]>('/api/warehouses/my-warehouses')
    .then((data) => {
      const next = (Array.isArray(data) ? data : [])
        .filter((w) => w.status !== 'INACTIVE')
        .map((w) => ({
          warehouseId: w.warehouseId,
          code: w.code || `WH-${w.warehouseId}`,
          name: w.name || `Kho #${w.warehouseId}`,
        }));
      // Giữ nguyên tham chiếu nếu không đổi để các màn không vẽ lại thừa
      const changed = !authorizedLoaded || JSON.stringify(next) !== JSON.stringify(authorizedWarehouses);
      if (changed) authorizedWarehouses = next;
      const wasLoaded = authorizedLoaded;
      authorizedLoaded = true;
      if (!changed && wasLoaded) return;
      reconcileActiveWarehouse();
      emitList();
    })
    .catch((err: unknown) => {
      // Lỗi mạng / chưa đăng nhập: giữ danh sách hiện có, lần mở màn sau sẽ thử lại
      loadedForToken = null;
      console.warn('Không tải được danh sách kho được phân quyền:', err);
    })
    .finally(() => {
      if (loadingPromise === promise) loadingPromise = null;
    });
  loadingPromise = promise;
  return promise;
}

function ensureAuthorizedWarehousesLoaded() {
  const token = readToken();
  if (loadingPromise && token === loadedForToken) return;
  if (authorizedLoaded && token === loadedForToken) return;
  if (token !== loadedForToken && authorizedLoaded) {
    // Đổi tài khoản: bỏ danh sách của tài khoản trước
    authorizedWarehouses = EMPTY_WAREHOUSES;
    authorizedLoaded = false;
  }
  void refreshAuthorizedWarehouses();
}

/** Danh sách kho được phân quyền đã tải (dùng trong callback, ngoài React) */
export function getAuthorizedWarehouses(): WarehouseItem[] {
  return authorizedWarehouses;
}

// Quay lại tab (focus / hiện tab) → tải lại quyền kho, để Admin đổi phân quyền ở tab khác
// thì tab này nhận ngay mà không cần đăng xuất. Giới hạn tối đa 1 lần / 3 giây.
const REFRESH_ON_FOCUS_MS = 3000;
let lastFocusRefresh = 0;
let focusListenerAttached = false;

function handleTabFocus() {
  if (document.visibilityState === 'hidden') return;
  if (!authorizedLoaded || listListeners.size === 0) return;
  const now = Date.now();
  if (now - lastFocusRefresh < REFRESH_ON_FOCUS_MS) return;
  lastFocusRefresh = now;
  void refreshAuthorizedWarehouses();
}

function attachFocusRefresh() {
  if (focusListenerAttached || typeof window === 'undefined') return;
  focusListenerAttached = true;
  window.addEventListener('focus', handleTabFocus);
  document.addEventListener('visibilitychange', handleTabFocus);
}

function subscribeList(callback: () => void) {
  listListeners.add(callback);
  attachFocusRefresh();
  ensureAuthorizedWarehousesLoaded();
  return () => {
    listListeners.delete(callback);
  };
}

/** Danh sách kho tài khoản hiện tại được phân quyền; `loaded` = đã tải xong từ server */
export function useAuthorizedWarehouses() {
  const warehouses = useSyncExternalStore(
    subscribeList,
    () => authorizedWarehouses,
    () => EMPTY_WAREHOUSES
  );
  const loaded = useSyncExternalStore(
    subscribeList,
    () => authorizedLoaded,
    () => false
  );
  return { warehouses, loaded };
}

// ─── Hook kho làm việc ────────────────────────────────────────────────────

function subscribe(callback: () => void) {
  function handleWarehouseChange(e: Event) {
    const customEvent = e as CustomEvent<WarehouseItem>;
    if (customEvent.detail) {
      cachedActiveWarehouse = customEvent.detail;
    } else {
      cachedActiveWarehouse = getActiveWarehouse();
    }
    callback();
  }

  // Không nghe sự kiện 'storage': kho làm việc là của riêng từng tab, tab khác đổi kho không ảnh hưởng
  window.addEventListener(EVENT_NAME, handleWarehouseChange);

  return () => {
    window.removeEventListener(EVENT_NAME, handleWarehouseChange);
  };
}

function getSnapshot(): WarehouseItem {
  return getCachedActiveWarehouse();
}

function getServerSnapshot(): WarehouseItem {
  return FALLBACK_WAREHOUSE;
}

export function useActiveWarehouse() {
  const activeWarehouse = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  const { warehouses } = useAuthorizedWarehouses();

  const setActiveWarehouse = useCallback((warehouse: WarehouseItem) => {
    setActiveWarehouseGlobal(warehouse);
  }, []);

  return {
    activeWarehouse,
    setActiveWarehouse,
    /** Chỉ các kho tài khoản được phân quyền (Admin: tất cả kho đang hoạt động) */
    warehouses,
  };
}
