// Report 5.3 – sheet "UC-04 Manage Accounts" (SYS-ACC-01..12). Admin thao tác trên màn Nhân viên (/staff).
import { test, expect, traceTc, newUserContext } from '../../fixtures/test';
import { LoginPage } from '../../pages/LoginPage';
import { AppShell } from '../../pages/AppShell';
import { StaffPage } from '../../pages/StaffPage';
import { expectedGroups } from '../../pages/navMap';
import { SEEDED, E2E_ACCOUNTS, WAREHOUSES, listStaff } from '../../fixtures/accounts';
import { apiLogin } from '../../fixtures/api';
import { rolesOfUser, userByUsername, warehouseCodesOfUser } from '../../fixtures/dbq';
import { backendError, makeAccount, seeMessage, toggleStaffViaApi, uiBlocksAction } from '../../fixtures/ui';
import { phoneFrom } from '../../fixtures/sales';
import { queryRows } from '../../fixtures/pg';

const SHEET = 'UC-04 Manage Accounts';
const MSG_NAME_EMPTY = 'Họ và tên nhân viên không được để trống.';
const MSG_EMAIL_FORMAT = 'Email không đúng định dạng.';
const MSG_ROLE_EMPTY = 'Vai trò không được để trống.';

async function adminStaff(page: import('@playwright/test').Page, env: { defaultPassword: string }): Promise<StaffPage> {
  await new LoginPage(page).loginOk(SEEDED.admin.username, env.defaultPassword);
  const staff = new StaffPage(page);
  await staff.goto();
  return staff;
}

test.describe(SHEET, () => {
  test('SYS-ACC-01 – Màn Nhân viên: danh sách và các thao tác Thêm, Sửa, Khóa, Đặt lại mật khẩu có thông báo', async ({ page, env, db, adminApi, uid, dialogs }, testInfo) => {
    traceTc(testInfo, 'SYS-ACC-01', SHEET);
    testInfo.annotations.push({ type: 'note', description: 'Audit log chưa có → không kiểm (Note của TC). Điều kiện kiểm theo đề xuất đã duyệt (ORACLE_PROPOSED)' });
    const username = `e2e.acc01.${uid}`.toLowerCase();
    const name = `E2E ACC01 ${uid}`;
    const staff = await test.step('1–2. Admin mở Nhân viên (/staff): danh sách hiện đủ tài khoản', async () => {
      const s = await adminStaff(page, env);
      await expect(s.dataRows()).toHaveCount((await listStaff(adminApi)).length);
      return s;
    });
    await test.step('3a. Thêm → "Đã thêm nhân viên mới <tên>"', async () => {
      await staff.openCreate();
      await staff.fill({ name, username, phone: phoneFrom(uid, 1), email: `${username}@e2e.stockflow.test`, role: 'SalesStaff', warehouses: ['K001'] });
      expect(await staff.submit()).toBeLessThan(300);
      await expect(page.getByText(`Đã thêm nhân viên mới ${name}`)).toBeVisible();
      expect((await userByUsername(db, username))?.is_active).toBe(true);
    });
    await test.step('3b. Sửa → "Đã cập nhật thông tin nhân viên <tên>"', async () => {
      await staff.openEdit(username);
      await staff.fill({ name: `${name} sửa` });
      expect(await staff.submit()).toBeLessThan(300);
      await expect(page.getByText(`Đã cập nhật thông tin nhân viên ${name} sửa`)).toBeVisible();
      expect((await userByUsername(db, username))?.full_name).toBe(`${name} sửa`);
    });
    await test.step('3c. Đặt lại mật khẩu → thông báo kết quả', async () => {
      dialogs.expect(/^Bạn có chắc chắn muốn đặt lại mật khẩu cho /);
      await staff.row(username).getByRole('button', { name: 'Đặt lại mật khẩu' }).click();
      await expect(page.getByText(`Mật khẩu của ${name} sửa đã được reset thành`)).toBeVisible();
    });
    await test.step('3d. Khóa → "Đã khóa tài khoản <tên>"', async () => {
      dialogs.expect(/^Bạn có chắc chắn muốn khóa tài khoản của /);
      expect(await staff.toggleStatus(username, 'Khóa tài khoản')).toBe(200);
      await expect(page.getByText(`Đã khóa tài khoản ${name} sửa`)).toBeVisible();
      expect((await userByUsername(db, username))?.is_active).toBe(false);
    });
  });

  test('SYS-ACC-02 – Danh sách hiện mã, họ tên, email, vai trò, kho, trạng thái và có phân trang', async ({ page, env, db, adminApi, uid }, testInfo) => {
    traceTc(testInfo, 'SYS-ACC-02', SHEET);
    // Tiền đề: đủ nhiều tài khoản để cần phân trang (chuẩn UI của nhóm: màn Hàng hóa 15 dòng / trang)
    let total = (await listStaff(adminApi)).length;
    for (let i = 0; total <= 15; i++, total++) await makeAccount(adminApi, `${uid}x${i}`, { prefix: 'acc02', salt: i });
    const staff = await adminStaff(page, env);
    await test.step('KQ1. Mỗi dòng hiện mã, họ tên, email, vai trò, kho và trạng thái đúng dữ liệu', async () => {
      for (const u of [SEEDED.warehouse.username, E2E_ACCOUNTS.whK002.username]) {
        const row = (
          await queryRows<{ full_name: string; email: string }>(db, 'SELECT full_name, email FROM stockflow.sec_users WHERE username = $1', [u])
        )[0];
        await expect(staff.cell(u, 0)).toHaveText(/^NV-/);
        await expect(staff.cell(u, 1)).toContainText(row.full_name);
        await expect(staff.cell(u, 2)).toContainText(row.email);
        await expect(staff.roleCell(u)).not.toBeEmpty();
        for (const code of await warehouseCodesOfUser(db, u)) await expect(staff.cell(u, 4)).toContainText(`(${code})`);
        await expect(staff.cell(u, 5)).toHaveText('Hoạt động');
      }
    });
    await test.step('KQ2. Phân trang hoạt động', async () => {
      const shown = await staff.dataRows().count();
      const pager = page.getByText(/^Trang \d+ \/ \d+$/);
      const pagerText = (await pager.textContent()) ?? '';
      testInfo.annotations.push({ type: 'observed', description: `${total} tài khoản, hiện ${shown} dòng, bộ phân trang "${pagerText}"` });
      expect(
        Number(/\/ (\d+)/.exec(pagerText)?.[1] ?? '1') > 1 || shown <= 15,
        `Có ${total} tài khoản nhưng hiện ${shown} dòng trên một trang và bộ phân trang là "${pagerText}" (StaffAccountsScreen.tsx: chữ cố định, nút trang luôn vô hiệu)`
      ).toBe(true);
    });
  });

  test('SYS-ACC-03 – Tìm theo từ khóa, lọc theo vai trò và trạng thái', async ({ page, env, adminApi, uid }, testInfo) => {
    traceTc(testInfo, 'SYS-ACC-03', SHEET);
    const locked = await makeAccount(adminApi, uid, { prefix: 'acc03', role: 'WarehouseStaff' });
    await toggleStaffViaApi(adminApi, locked.username);
    const staff = await adminStaff(page, env);
    await test.step('1. Tìm theo tên → chỉ dòng khớp', async () => {
      await staff.search.fill(locked.name);
      await expect(staff.dataRows()).toHaveCount(1);
      await expect(staff.row(locked.username)).toHaveCount(1);
      await staff.search.fill('');
    });
    await test.step('2a. Lọc vai trò "Nhân viên kho" → mọi dòng là Nhân viên kho', async () => {
      await staff.roleFilter.selectOption({ label: 'Nhân viên kho' });
      await expect
        .poll(async () => {
          const n = await staff.dataRows().count();
          const roles: string[] = [];
          for (let i = 0; i < n; i++) roles.push((await staff.dataRows().nth(i).getByRole('cell').nth(3).innerText()).trim());
          return roles.length > 0 && roles.every((x) => x === 'Nhân viên kho') ? 'ok' : roles.join(' | ');
        })
        .toBe('ok');
      await staff.roleFilter.selectOption({ label: 'Tất cả vai trò' });
    });
    await test.step('2b. Lọc trạng thái "Đã khóa" → chỉ tài khoản bị khoá', async () => {
      await staff.statusFilter.selectOption({ label: 'Đã khóa' });
      await expect(staff.dataRows().filter({ hasText: 'Hoạt động' })).toHaveCount(0);
      await expect(staff.row(locked.username)).toHaveCount(1);
    });
  });

  test('SYS-ACC-04 – Tìm không có kết quả: danh sách rỗng và thông báo không có dữ liệu', async ({ page, env }, testInfo) => {
    traceTc(testInfo, 'SYS-ACC-04', SHEET);
    const staff = await adminStaff(page, env);
    await staff.search.fill('zzzz-no-match');
    await expect(staff.dataRows()).toHaveCount(0);
    await expect(page.getByText('Không tìm thấy nhân viên nào phù hợp.')).toBeVisible();
  });

  test('SYS-ACC-05 – Thêm tài khoản hợp lệ: Active và đăng nhập được, chỉ có kho K001', async ({ page, browser, env, db, uid, dialogs }, testInfo) => {
    traceTc(testInfo, 'SYS-ACC-05', SHEET);
    const username = `e2e.acc05.${uid}`.toLowerCase();
    const name = `E2E ACC05 ${uid}`;
    const staff = await adminStaff(page, env);
    await test.step('1–3. Thêm nhân viên: tên đăng nhập, họ tên, điện thoại, email, SalesStaff, kho K001; lưu', async () => {
      await staff.openCreate();
      await staff.fill({ name, username, phone: phoneFrom(uid, 5), email: `${username}@e2e.stockflow.test`, role: 'SalesStaff', warehouses: ['K001'] });
      expect(await staff.submit()).toBeLessThan(300);
      await expect(page.getByText(`Đã thêm nhân viên mới ${name}`)).toBeVisible();
    });
    await test.step('KQ1. Tài khoản ACTIVE', async () => {
      expect((await userByUsername(db, username))?.is_active).toBe(true);
      expect(await rolesOfUser(db, username)).toEqual(['SalesStaff']);
      await expect(staff.cell(username, 5)).toHaveText('Hoạt động');
    });
    await test.step('KQ2. Đăng nhập bằng mật khẩu mặc định được, chỉ có kho K001', async () => {
      const other = await newUserContext(browser, testInfo, dialogs);
      await new LoginPage(other.page).loginOk(username, env.defaultPassword);
      expect(await warehouseCodesOfUser(db, username)).toEqual(['K001']);
      await expect(other.page.getByTitle(`Kho làm việc cố định: ${WAREHOUSES.K001.name}`).filter({ visible: true })).toHaveCount(1);
      await expect(new AppShell(other.page).branchButton).toHaveCount(0);
      await other.context.close();
    });
  });

  test('SYS-ACC-06 – Thiếu họ tên / email sai định dạng: báo lỗi, không lưu', async ({ page, env, db, uid, dialogs }, testInfo) => {
    traceTc(testInfo, 'SYS-ACC-06', SHEET);
    const username = `e2e.acc06.${uid}`.toLowerCase();
    const staff = await adminStaff(page, env);
    dialogs.expect(/không được để trống|không đúng định dạng|^Vui lòng/);
    await test.step('1–2. Bỏ trống họ tên, email "abc"; lưu', async () => {
      await staff.openCreate();
      await staff.fill({ username, phone: phoneFrom(uid, 6), email: 'abc', role: 'SalesStaff', warehouses: ['K001'] });
      await staff.submit();
    });
    await test.step(`KQ1. "${MSG_NAME_EMPTY}" và "${MSG_EMAIL_FORMAT}"`, async () => {
      // Bằng chứng: ô họ tên có kiểm tra "required" của trình duyệt (bong bóng gốc, không phải thông báo của ứng dụng)
      const native = await staff.modal().getByRole('textbox').nth(1).evaluate((el) => (el as HTMLInputElement).validationMessage);
      testInfo.annotations.push({ type: 'observed', description: `Ô họ tên: validationMessage="${native}"; hộp thoại: ${dialogs.seen.map((d) => d.message).join(' | ') || '(không)'}` });
      await seeMessage(page, dialogs, new RegExp(MSG_NAME_EMPTY.replace('.', '\\.')));
      await seeMessage(page, dialogs, new RegExp(MSG_EMAIL_FORMAT.replace('.', '\\.')));
    });
    await test.step('KQ2. Không lưu', async () => {
      expect(await userByUsername(db, username)).toBeUndefined();
    });
  });

  test('SYS-ACC-07 – Không vai trò thì không lưu; không kho thì vẫn lưu (quyết định nhóm)', async ({ page, env, db, adminApi, uid, dialogs }, testInfo) => {
    traceTc(testInfo, 'SYS-ACC-07', SHEET, { mismatch: 'Description: không lưu khi thiếu kho; Expected: vẫn lưu (quyết định nhóm 10/11/2026).' });
    const staff = await adminStaff(page, env);
    await test.step(`1. Thêm tài khoản không có vai trò → "${MSG_ROLE_EMPTY}"`, async () => {
      await staff.openCreate();
      const options = await staff.modal().getByRole('combobox').locator('option').allTextContents();
      const hasEmpty = options.some((o) => o.trim() === '' || /chọn vai trò/i.test(o));
      if (!hasEmpty) {
        const be = await backendError(() =>
          adminApi.post('/api/staff', { username: `e2e.acc07a.${uid}`.toLowerCase(), name: 'E2E ACC07', phone: phoneFrom(uid, 71), role: '' })
        );
        uiBlocksAction(testInfo, 'ô Vai trò là select không có lựa chọn rỗng', MSG_ROLE_EMPTY, be);
      }
      await staff.modal().getByRole('button', { name: 'Hủy' }).click();
    });
    await test.step('2. Thêm tài khoản có vai trò, không chọn kho → được lưu', async () => {
      dialogs.expect(/^Vui lòng chọn ít nhất 1 chi nhánh/);
      const username = `e2e.acc07b.${uid}`.toLowerCase();
      await staff.openCreate();
      await staff.fill({ name: `E2E ACC07 ${uid}`, username, phone: phoneFrom(uid, 72), role: 'SalesStaff', warehouses: [] });
      const status = await staff.submit();
      expect(status, `Không gửi được yêu cầu lưu${dialogs.seen.length ? ': ' + dialogs.seen.map((d) => d.message).join(' | ') : ''}`).not.toBeNull();
      await expect.poll(async () => (await userByUsername(db, username))?.is_active ?? null).toBe(true);
      expect(await warehouseCodesOfUser(db, username)).toEqual([]);
    });
  });

  test('SYS-ACC-08 – Trùng tên đăng nhập / email: báo trùng, không lưu', async ({ page, env, db, uid, dialogs }, testInfo) => {
    traceTc(testInfo, 'SYS-ACC-08', SHEET);
    const existing = E2E_ACCOUNTS.whK001;
    const email = (await queryRows<{ email: string }>(db, 'SELECT email FROM stockflow.sec_users WHERE username = $1', [existing.username]))[0].email;
    const staff = await adminStaff(page, env);
    dialogs.expect(/đã tồn tại|đã được sử dụng/);
    await test.step(`1a. Tên đăng nhập đã có → "Tên đăng nhập '${existing.username}' đã tồn tại..."`, async () => {
      await staff.openCreate();
      await staff.fill({ name: `E2E ACC08 ${uid}`, username: existing.username, phone: phoneFrom(uid, 81), role: 'SalesStaff', warehouses: ['K001'] });
      await staff.submit();
      await seeMessage(page, dialogs, new RegExp(`Tên đăng nhập '${existing.username.replace(/\./g, '\\.')}' đã tồn tại trong hệ thống\\. Vui lòng chọn tên đăng nhập khác\\.`));
    });
    await test.step(`1b. Email đã có → "Email '${email}' đã được sử dụng cho một tài khoản khác."`, async () => {
      const username = `e2e.acc08.${uid}`.toLowerCase();
      await staff.fill({ username, email });
      await staff.submit();
      await seeMessage(page, dialogs, new RegExp(`Email '${email.replace(/\./g, '\\.')}' đã được sử dụng cho một tài khoản khác\\.`));
      expect(await userByUsername(db, username)).toBeUndefined();
    });
  });

  test('SYS-ACC-09 – Sửa thông tin, vai trò, kho: áp dụng cho tài khoản', async ({ page, browser, env, db, adminApi, uid, dialogs }, testInfo) => {
    traceTc(testInfo, 'SYS-ACC-09', SHEET);
    const acc = await makeAccount(adminApi, uid, { prefix: 'acc09', role: 'SalesStaff', warehouses: ['K001'] });
    const staff = await adminStaff(page, env);
    await test.step('1. Sửa: đổi họ tên, vai trò (→ Nhân viên kho), kho (→ K002)', async () => {
      await staff.search.fill(acc.name);
      await staff.openEdit(acc.username);
      await staff.fill({ name: `${acc.name} moi`, role: 'WarehouseStaff', warehouses: ['K002'] });
      expect(await staff.submit()).toBeLessThan(300);
      await expect(page.getByText(`Đã cập nhật thông tin nhân viên ${acc.name} moi`)).toBeVisible();
    });
    await test.step('KQ. Thay đổi được lưu và áp dụng khi tài khoản đăng nhập', async () => {
      expect((await userByUsername(db, acc.username))?.full_name).toBe(`${acc.name} moi`);
      expect(await rolesOfUser(db, acc.username)).toEqual(['WarehouseStaff']);
      expect(await warehouseCodesOfUser(db, acc.username)).toEqual(['K002']);
      const other = await newUserContext(browser, testInfo, dialogs);
      const featuresResp = other.page.waitForResponse((r) => /\/api\/roles\/my-features$/i.test(new URL(r.url()).pathname) && r.status() === 200);
      await new LoginPage(other.page).loginOk(acc.username, env.defaultPassword);
      const features = (await (await featuresResp).json()) as string[];
      await expect.poll(() => new AppShell(other.page).visibleGroups()).toEqual(expectedGroups(features));
      await expect(other.page.getByText(WAREHOUSES.K002.name).first()).toBeVisible();
      await other.context.close();
    });
  });

  test('SYS-ACC-10 – Sửa trùng email tài khoản khác: báo trùng, tài khoản giữ nguyên', async ({ page, env, db, adminApi, uid, dialogs }, testInfo) => {
    traceTc(testInfo, 'SYS-ACC-10', SHEET);
    const a = await makeAccount(adminApi, uid, { prefix: 'acc10a', salt: 1 });
    const b = await makeAccount(adminApi, uid, { prefix: 'acc10b', salt: 2 });
    const before = await queryRows<{ email: string; full_name: string }>(db, 'SELECT email, full_name FROM stockflow.sec_users WHERE username = $1', [a.username]);
    const staff = await adminStaff(page, env);
    dialogs.expect(/đã được sử dụng/);
    await test.step('1–2. Sửa A, đặt email của B; lưu', async () => {
      await staff.search.fill(a.name);
      await staff.openEdit(a.username);
      await staff.fill({ email: b.email });
      await staff.submit();
    });
    await test.step('KQ1. Thông báo trùng email; KQ2. A không đổi', async () => {
      await seeMessage(page, dialogs, new RegExp(`Email '${b.email.replace(/\./g, '\\.')}' đã được sử dụng cho một tài khoản khác\\.`));
      const after = await queryRows<{ email: string; full_name: string }>(db, 'SELECT email, full_name FROM stockflow.sec_users WHERE username = $1', [a.username]);
      expect(after).toEqual(before);
    });
  });

  test('SYS-ACC-11 – Khóa tài khoản đang đăng nhập: bị từ chối ở thao tác kế tiếp, không đăng nhập lại được @p1', async ({ page, browser, env, db, adminApi, uid, dialogs }, testInfo) => {
    traceTc(testInfo, 'SYS-ACC-11', SHEET);
    const x = await makeAccount(adminApi, uid, { prefix: 'acc11' });
    const other = await newUserContext(browser, testInfo, dialogs);
    await test.step('1. Tài khoản X đăng nhập ở trình duyệt khác', async () => {
      await new LoginPage(other.page).loginOk(x.username, env.defaultPassword);
    });
    await test.step('2. Admin khóa X và xác nhận', async () => {
      const staff = await adminStaff(page, env);
      dialogs.expect(/^Bạn có chắc chắn muốn khóa tài khoản của /);
      await staff.search.fill(x.name);
      expect(await staff.toggleStatus(x.username, 'Khóa tài khoản')).toBe(200);
      expect((await userByUsername(db, x.username))?.is_active).toBe(false);
    });
    await test.step('3. X bấm một menu → bị từ chối, không đăng nhập lại được', async () => {
      const rejected: number[] = [];
      other.page.on('response', (r) => {
        if (new URL(r.url()).pathname.startsWith('/api/') && [401, 403].includes(r.status())) rejected.push(r.status());
      });
      await new AppShell(other.page).navigate('Khách hàng', 'Khách hàng');
      await expect.poll(() => rejected.length, { message: 'yêu cầu kế tiếp bị từ chối' }).toBeGreaterThan(0);
      testInfo.annotations.push({ type: 'observed', description: `Mã từ chối: ${[...new Set(rejected)].join(', ')}; URL sau khi bị từ chối: ${other.page.url()}` });
      const login = new LoginPage(other.page);
      await login.goto();
      expect(await login.login(x.username, env.defaultPassword)).toBeGreaterThanOrEqual(400);
      await expect(other.page.getByText('Tài khoản của bạn đã bị vô hiệu hóa.')).toBeVisible();
      await other.context.close();
    });
  });

  test('SYS-ACC-12 – Mở khóa tài khoản: đăng nhập lại được', async ({ page, env, db, adminApi, uid, dialogs }, testInfo) => {
    traceTc(testInfo, 'SYS-ACC-12', SHEET);
    const x = await makeAccount(adminApi, uid, { prefix: 'acc12' });
    await toggleStaffViaApi(adminApi, x.username);
    expect((await userByUsername(db, x.username))?.is_active).toBe(false);
    const staff = await adminStaff(page, env);
    await test.step('1. Mở khóa tài khoản đang bị khóa', async () => {
      dialogs.expect(/^Bạn có chắc chắn muốn mở khóa tài khoản của /);
      await staff.search.fill(x.name);
      expect(await staff.toggleStatus(x.username, 'Mở khóa tài khoản')).toBe(200);
      await expect(page.getByText(`Đã kích hoạt tài khoản ${x.name}`)).toBeVisible();
      expect((await userByUsername(db, x.username))?.is_active).toBe(true);
    });
    await test.step('2. Đăng nhập bằng tài khoản đó → thành công', async () => {
      expect((await apiLogin(env, x.username, env.defaultPassword)).username).toBe(x.username);
    });
  });
});
