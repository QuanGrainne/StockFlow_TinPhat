// src/lib/auth/tabSession.ts
// Phiên làm việc THEO TỪNG TAB trình duyệt.
//
// Vì sao: localStorage dùng chung cho mọi tab cùng trình duyệt. Trước đây đăng nhập Manager ở tab 2
// sẽ ghi đè token Admin của tab 1 → tab Admin gửi token Manager và bị backend từ chối.
//
// Cách làm:
// - Giá trị phiên (token, người dùng, vai trò, kho/chi nhánh đang chọn, màn đang mở) đọc/ghi ở
//   sessionStorage — mỗi tab một bản riêng, tab khác không ghi đè được.
// - Mỗi lần ghi cũng lưu bản sao vào localStorage làm "phiên gần nhất". Tab MỚI mở lần đầu sẽ chép
//   phiên gần nhất này sang (không phải đăng nhập lại). Sau đó tab chỉ dùng bản của riêng nó.

export type TabSessionKey =
  | 'stockflow_token'
  | 'stockflow_user'
  | 'stockflow_current_role'
  | 'stockflow_active_screen'
  | 'stockflow_selected_branch'
  | 'stockflow_active_warehouse';

const TAB_SESSION_KEYS: TabSessionKey[] = [
  'stockflow_token',
  'stockflow_user',
  'stockflow_current_role',
  'stockflow_active_screen',
  'stockflow_selected_branch',
  'stockflow_active_warehouse',
];

/** Đánh dấu tab đã khởi tạo phiên (đã chép phiên gần nhất hoặc đã tự đăng nhập/đăng xuất) */
const TAB_INIT_FLAG = 'stockflow_tab_session_init';

function hasWindow(): boolean {
  return typeof window !== 'undefined';
}

/** Lần đầu tab truy cập phiên: chép phiên gần nhất từ localStorage sang sessionStorage của tab */
function ensureTabInitialized(): void {
  if (!hasWindow()) return;
  try {
    if (sessionStorage.getItem(TAB_INIT_FLAG)) return;
    for (const key of TAB_SESSION_KEYS) {
      const value = localStorage.getItem(key);
      if (value !== null && sessionStorage.getItem(key) === null) {
        sessionStorage.setItem(key, value);
      }
    }
    sessionStorage.setItem(TAB_INIT_FLAG, '1');
  } catch {
    // Trình duyệt chặn storage: bỏ qua, các hàm dưới trả null
  }
}

export const tabSession = {
  get(key: TabSessionKey): string | null {
    if (!hasWindow()) return null;
    ensureTabInitialized();
    try {
      return sessionStorage.getItem(key);
    } catch {
      return null;
    }
  },

  set(key: TabSessionKey, value: string): void {
    if (!hasWindow()) return;
    ensureTabInitialized();
    try {
      sessionStorage.setItem(key, value);
      localStorage.setItem(key, value);
    } catch {
      // ignore
    }
  },

  remove(key: TabSessionKey): void {
    if (!hasWindow()) return;
    ensureTabInitialized();
    try {
      const own = sessionStorage.getItem(key);
      sessionStorage.removeItem(key);
      // Chỉ xoá "phiên gần nhất" nếu nó đúng là của tab này (không làm mất phiên tab khác vừa đăng nhập)
      if (own !== null && localStorage.getItem(key) === own) {
        localStorage.removeItem(key);
      }
    } catch {
      // ignore
    }
  },
};
