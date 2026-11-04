/**
 * Cờ bật bộ chuyển vai trò / đổi nhanh nhân viên trên Header (chỉ phục vụ demo giao diện).
 * Mặc định TẮT. Bật bằng NEXT_PUBLIC_ENABLE_ROLE_SWITCHER=true trong .env.local.
 *
 * Lưu ý: kể cả khi bật, việc đổi vai trò chỉ đổi giao diện phía client. Backend luôn kiểm tra
 * quyền theo tài khoản thật trong JWT, nên muốn thử quyền của vai trò khác phải đăng nhập bằng tài khoản đó.
 */
export const ROLE_SWITCHER_ENABLED = process.env.NEXT_PUBLIC_ENABLE_ROLE_SWITCHER === 'true';

/**
 * Tự đăng nhập admin khi chưa có token (tiện cho dev). Chỉ hoạt động khi chạy `npm run dev`
 * và có thể tắt bằng NEXT_PUBLIC_DEV_AUTO_LOGIN=false.
 */
export const DEV_AUTO_LOGIN_ENABLED =
  process.env.NODE_ENV === 'development' && process.env.NEXT_PUBLIC_DEV_AUTO_LOGIN !== 'false';
