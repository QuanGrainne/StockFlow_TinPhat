// Khung ứng dụng (components/layout/Header.tsx + thanh menu): menu người dùng, đăng xuất, chi nhánh kho, nhóm menu.
// Lưu ý (khảo sát 23/11): menu người dùng mở một lớp phủ nằm trong vùng header; mỗi thao tác chỉ mở một menu.
import { expect, type Locator, type Page } from '@playwright/test';
import { allGroupLabels } from './navMap';

const escapeRe = (s: string): string => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

export class AppShell {
  readonly logoutButton: Locator;
  readonly branchButton: Locator;

  constructor(readonly page: Page) {
    this.logoutButton = page.getByRole('button', { name: 'Đăng xuất khỏi hệ thống' });
    // Người dùng nhiều kho: nút "Kho làm việc <tên kho>"; một kho: chỉ là chữ, không phải nút
    this.branchButton = page.getByRole('button', { name: /^Kho làm việc/i });
  }

  /** Nút họ tên ở góc phải header (mở menu Đổi mật khẩu / Đăng xuất).
   *  Tên truy cập = [chữ viết tắt avatar] + họ tên + mã NV + chức danh, nên tìm họ tên ở bất kỳ vị trí nào. */
  userMenu(fullName: string): Locator {
    return this.page.getByRole('button', { name: new RegExp(escapeRe(fullName)) }).first();
  }

  /** Điều hướng bằng menu: bấm nhóm (vd "Bán hàng") rồi bấm mục con (nút có tên bắt đầu bằng tiêu đề mục) */
  async navigate(group: string, item: string): Promise<void> {
    await this.page.getByRole('button', { name: group, exact: true }).click();
    await this.page.getByRole('button', { name: new RegExp(`^${escapeRe(item)}\\s`) }).first().click();
  }

  noAccess(): Locator {
    return this.page.getByRole('heading', { name: 'Bạn không có quyền truy cập chức năng này' });
  }

  /** Mở menu người dùng.
   *  Khảo sát pilot: sau đăng nhập header render lại (tải quyền, kho) nên nút bị thay phần tử giữa mousedown và click;
   *  onClick vẫn chạy (menu mở) nhưng Playwright coi là "bị che" và bấm lại, lần sau bị lớp phủ của menu chặn.
   *  Vì vậy: bấm với thời hạn ngắn, rồi kiểm theo điều kiện "nút Đăng xuất đã hiện"; không bấm lại khi menu đã mở. */
  async openUserMenu(fullName: string): Promise<void> {
    await expect(async () => {
      if (await this.logoutButton.isVisible()) return;
      await this.userMenu(fullName)
        .click({ timeout: 3_000 })
        .catch(() => undefined); // kết quả thật được kiểm ngay dưới đây
      await expect(this.logoutButton).toBeVisible({ timeout: 2_000 });
    }).toPass({ timeout: 20_000 });
  }

  /** Mở form "Đổi mật khẩu" từ menu người dùng; trả về các ô của form */
  async openChangePassword(fullName: string): Promise<{ current: Locator; next: Locator; confirm: Locator; save: Locator; cancel: Locator }> {
    await this.openUserMenu(fullName);
    await this.page.getByRole('button', { name: 'Đổi mật khẩu', exact: true }).click();
    await expect(this.page.getByRole('heading', { name: 'Đổi mật khẩu', level: 3 })).toBeVisible();
    return {
      current: this.page.getByRole('textbox', { name: 'Mật khẩu hiện tại *' }),
      next: this.page.getByRole('textbox', { name: 'Mật khẩu mới *', exact: true }),
      confirm: this.page.getByRole('textbox', { name: 'Nhập lại mật khẩu mới *' }),
      // Menu đã đóng khi form mở nên chỉ còn một nút "Đổi mật khẩu" (nút lưu của form)
      save: this.page.getByRole('button', { name: 'Đổi mật khẩu', exact: true }),
      cancel: this.page.getByRole('button', { name: 'Hủy', exact: true }),
    };
  }

  async logout(fullName: string): Promise<void> {
    await this.openUserMenu(fullName);
    await this.logoutButton.click();
  }

  /** Mở menu chi nhánh và trả về mã kho (K001...) đang được liệt kê */
  async listBranchCodes(): Promise<string[]> {
    await expect(this.branchButton).toBeVisible();
    await this.branchButton.click();
    const items = this.page.getByRole('button', { name: /^K\d{3}\s/ });
    await expect(items.first()).toBeVisible();
    const names = await items.evaluateAll((els) => els.map((e) => (e.textContent ?? '').trim()));
    return names.map((n) => n.slice(0, 4)).sort();
  }

  /** Chọn chi nhánh làm việc theo mã kho (người dùng có nhiều kho) */
  async selectBranch(code: string): Promise<void> {
    await this.branchButton.click();
    await this.page.getByRole('button', { name: new RegExp(`^${code}\\s`) }).click();
  }

  /** Các nhóm menu đang hiện (so với toàn bộ nhãn trong NAV_GROUPS) */
  async visibleGroups(): Promise<string[]> {
    const out: string[] = [];
    for (const label of allGroupLabels()) {
      if (await this.page.getByRole('button', { name: label, exact: true }).isVisible()) out.push(label);
    }
    return out;
  }
}
