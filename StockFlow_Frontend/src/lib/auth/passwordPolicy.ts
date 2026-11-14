// Quy tắc độ mạnh mật khẩu dùng chung (BR-35) — trùng với backend Application/Common/PasswordPolicy.cs.
// Dùng ở: form Đổi mật khẩu (Header) và form Tạo/Cập nhật tài khoản nhân viên (Admin).
// Backend luôn kiểm lại; ở đây chỉ để báo sớm cho người dùng.

export interface PasswordRule {
  label: string;
  test: (value: string) => boolean;
}

export const PASSWORD_RULES: PasswordRule[] = [
  { label: 'Tối thiểu 8 ký tự', test: (v) => v.length >= 8 },
  { label: 'Có chữ in hoa (A–Z)', test: (v) => /[A-Z]/.test(v) },
  { label: 'Có chữ thường (a–z)', test: (v) => /[a-z]/.test(v) },
  { label: 'Có chữ số (0–9)', test: (v) => /[0-9]/.test(v) },
  { label: 'Có ký tự đặc biệt (!@#...)', test: (v) => /[^A-Za-z0-9]/.test(v) },
];

/** Quy tắc đầu tiên mật khẩu chưa đạt; null = đạt hết */
export function firstPasswordViolation(value: string): PasswordRule | null {
  return PASSWORD_RULES.find((r) => !r.test(value)) ?? null;
}
