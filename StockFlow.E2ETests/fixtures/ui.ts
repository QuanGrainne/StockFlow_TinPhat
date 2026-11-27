// Tiện ích kiểm kết quả trên giao diện dùng chung cho các spec.
import { expect, type Locator, type Page, type TestInfo } from '@playwright/test';
import type { DialogRecorder } from './test';
import { ApiError, type ApiSession } from './api';
import { createAccount, listStaff, type CreatedAccount, type WarehouseCode } from './accounts';
import { phoneFrom } from './sales';

/** Chờ thông báo xuất hiện trên trang (toast, chữ lỗi dưới ô) HOẶC trong hộp thoại gốc alert()/confirm().
 *  Gọi dialogs.expect(pattern) trước khi thao tác nếu thông báo có thể là alert(). */
export async function seeMessage(page: Page, dialogs: DialogRecorder, pattern: RegExp, timeout = 10_000): Promise<'page' | 'dialog'> {
  let where: 'page' | 'dialog' | null = null;
  await expect
    .poll(
      async () => {
        if (dialogs.seen.some((d) => pattern.test(d.message))) where = 'dialog';
        else if (await page.getByText(pattern).first().isVisible().catch(() => false)) where = 'page';
        return where;
      },
      {
        timeout,
        message: `Không thấy thông báo ${pattern}${dialogs.seen.length ? ` (hộp thoại thực tế: ${dialogs.seen.map((d) => d.message).join(' | ')})` : ''}`,
      }
    )
    .not.toBeNull();
  return where ?? 'page';
}

/** Ca mà giao diện CHẶN thao tác sai từ trước (ẩn / khoá nút, ô không nhận số âm, select không có lựa chọn rỗng)
 *  nên thông báo của Expected không hiện trên UI.
 *  Quyết định 26/11/2026 (Round 2): giữ giao diện, Expected của Report 5.3 đổi thành "giao diện không cho thao tác sai;
 *  gọi thẳng API thì bị từ chối". Ca đạt khi backend (gọi API) vẫn từ chối; nếu backend nhận thao tác sai thì fail.
 *  backendMessage = kết quả backendError(); bỏ trống khi ca không gọi API được. */
export function uiBlocksAction(testInfo: TestInfo, what: string, expectedMessage: string, backendMessage?: string): void {
  testInfo.annotations.push({
    type: 'UI_BLOCKS_ACTION',
    description: `UI chặn thao tác (${what}); thông báo gốc của Expected: "${expectedMessage}"${backendMessage ? `; backend trả: "${backendMessage}"` : ''}`,
  });
  if (backendMessage === undefined) return;
  expect.soft(backendMessage.startsWith('(không lỗi)'), `UI chặn (${what}) nhưng gọi thẳng API không bị từ chối`).toBe(false);
}

/** Ca chưa kiểm được vì Expected cần nhóm làm rõ (tiền đề không dựng được, actor khác code…): vẫn soft-fail. */
export function needsClarification(testInfo: TestInfo, what: string, expectedMessage: string, evidence?: string): void {
  testInfo.annotations.push({
    type: 'NEEDS_CLARIFICATION',
    description: `${what}; Expected: "${expectedMessage}"${evidence ? `; bằng chứng: "${evidence}"` : ''}`,
  });
  expect.soft(false, `Cần nhóm làm rõ: ${what}`).toBe(true);
}

/** Tài khoản thử riêng cho từng test (tạo qua API bằng Admin) */
export async function makeAccount(
  admin: ApiSession,
  uid: string,
  opts: { prefix: string; role?: CreatedAccount['role']; warehouses?: WarehouseCode[]; salt?: number }
): Promise<CreatedAccount & { email: string }> {
  const username = `e2e.${opts.prefix}.${uid}`.toLowerCase();
  const a: CreatedAccount = {
    username,
    name: `E2E ${opts.prefix} ${uid}`,
    role: opts.role ?? 'SalesStaff',
    warehouses: opts.warehouses ?? ['K001'],
    phone: phoneFrom(uid, opts.salt ?? 7),
  };
  await createAccount(admin, a);
  return { ...a, email: `${username}@e2e.stockflow.test` };
}

export async function staffIdOf(admin: ApiSession, username: string): Promise<string> {
  const row = (await listStaff(admin)).find((r) => (r.username ?? '').toLowerCase() === username);
  if (!row) throw new Error(`Không thấy nhân viên ${username}`);
  return row.id;
}

/** Khoá / mở khoá qua API (chỉ để dựng tiền đề) */
export async function toggleStaffViaApi(admin: ApiSession, username: string): Promise<void> {
  await admin.patch(`/api/staff/${await staffIdOf(admin, username)}/toggle-status`);
}

/** Gọi API và lấy thông báo lỗi (bằng chứng phía backend cho ca UI chặn thao tác) */
export async function backendError(fn: () => Promise<unknown>): Promise<string> {
  try {
    await fn();
    return '(không lỗi)';
  } catch (e) {
    const body = e instanceof ApiError ? e.body : e instanceof Error ? e.message : String(e);
    // Lỗi validation (FluentValidation): message chung "Dữ liệu không hợp lệ." + danh sách lỗi cụ thể → lấy lỗi cụ thể
    try {
      const j = JSON.parse(body) as { message?: string; errors?: Record<string, string[]> | string[] };
      const errs = Array.isArray(j.errors) ? j.errors : j.errors ? Object.values(j.errors).flat() : [];
      if (errs.length && (!j.message || /không hợp lệ/i.test(j.message))) return errs.join(' | ');
      if (j.message) return j.message;
    } catch {
      // không phải JSON: dùng cách tìm theo mẫu bên dưới
    }
    const m = /"message":"([^"]+)"/.exec(body) ?? /"errors":\{[^}]*?\["([^"]+)"/.exec(body);
    return m ? m[1] : body.slice(0, 200);
  }
}

/** Ghi lại mọi đoạn chữ được thêm vào trang (MutationObserver) để bắt thông báo chỉ hiện thoáng qua trước khi
 *  trang tự chuyển đi (vd toast rồi router.replace). Gọi TRƯỚC khi mở trang; trả hàm đọc các đoạn chữ khớp mẫu. */
export async function captureTexts(page: Page): Promise<(pattern: RegExp) => Promise<string[]>> {
  await page.addInitScript(() => {
    const w = window as unknown as { __e2eTexts?: string[] };
    w.__e2eTexts = [];
    const seen = w.__e2eTexts;
    new MutationObserver((ms) => {
      for (const m of ms)
        for (const n of Array.from(m.addedNodes)) {
          // Bỏ qua nội dung script / style (mã nạp chunk của Next.js)
          const el = n.nodeType === 1 ? (n as Element) : n.parentElement;
          if (el && /^(SCRIPT|STYLE|NOSCRIPT)$/.test(el.tagName)) continue;
          if (n.nodeType === 1 && (n as Element).querySelector('script,style')) continue;
          const t = (n.textContent ?? '').trim();
          if (t && t.length < 400) seen.push(t);
        }
    }).observe(document, { subtree: true, childList: true, characterData: true });
  });
  return async (pattern: RegExp) => {
    const all = await page.evaluate(() => (window as unknown as { __e2eTexts?: string[] }).__e2eTexts ?? []);
    return [...new Set(all.filter((t) => pattern.test(t)))];
  };
}

/** Chờ thông báo (toast) hiện rồi đọc ngay nội dung – dùng trong Promise.all cùng thao tác vì toast tự tắt sau vài giây */
export async function readToast(loc: Locator): Promise<string> {
  await expect(loc).toBeVisible();
  return (await loc.innerText()).trim();
}
