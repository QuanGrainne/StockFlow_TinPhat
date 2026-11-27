// Quy tắc độ mạnh mật khẩu dùng chung (BR-35) — trùng với backend Application/Common/PasswordPolicy.cs.
// Dùng ở: form Đổi mật khẩu (Header) và form Tạo/Cập nhật tài khoản nhân viên (Admin).
// Backend luôn kiểm lại; ở đây chỉ để báo sớm cho người dùng.

export interface PasswordRule {
  label: string;
  /** Phần sau tên ô trong câu báo lỗi, trùng câu backend PasswordPolicy.cs (VD "phải có ít nhất 1 chữ in hoa (BR-35)") */
  requirement: string;
  test: (value: string) => boolean;
}

export const PASSWORD_RULES: PasswordRule[] = [
  { label: 'Tối thiểu 8 ký tự', requirement: 'phải có tối thiểu 8 ký tự (BR-35)', test: (v) => v.length >= 8 },
  { label: 'Có chữ in hoa (A–Z)', requirement: 'phải có ít nhất 1 chữ in hoa (BR-35)', test: (v) => /[A-Z]/.test(v) },
  { label: 'Có chữ thường (a–z)', requirement: 'phải có ít nhất 1 chữ thường (BR-35)', test: (v) => /[a-z]/.test(v) },
  { label: 'Có chữ số (0–9)', requirement: 'phải có ít nhất 1 chữ số (BR-35)', test: (v) => /[0-9]/.test(v) },
  { label: 'Có ký tự đặc biệt (!@#...)', requirement: 'phải có ít nhất 1 ký tự đặc biệt (BR-35)', test: (v) => /[^A-Za-z0-9]/.test(v) },
];

/** Câu báo lỗi như backend, VD "Mật khẩu mới phải có ít nhất 1 chữ in hoa (BR-35)." */
export function passwordRuleMessage(fieldLabel: string, rule: PasswordRule): string {
  return `${fieldLabel} ${rule.requirement}.`;
}

/** Quy tắc đầu tiên mật khẩu chưa đạt; null = đạt hết */
export function firstPasswordViolation(value: string): PasswordRule | null {
  return PASSWORD_RULES.find((r) => !r.test(value)) ?? null;
}
