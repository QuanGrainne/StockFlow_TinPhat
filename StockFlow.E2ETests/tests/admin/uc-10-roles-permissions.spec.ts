// Report 5.3 – sheet "UC-10 Roles and Permissions" (SYS-ROL-01..08).
// Ca sửa ma trận dùng chung (ROL-05, ROL-06) chụp bảng jnc_role_permissions trước và trả lại ĐÚNG bản chụp trong finally.
// Không khôi phục bằng API lưu ma trận: SaveRoleFeaturesCommand tính lại quyền phân hệ (DeriveModulePermissionCodes),
// sẽ làm đổi quyền của vai trò khác (vd SalesStaff có thêm SALES_DELETE) và kết quả ca sau phụ thuộc thứ tự chạy.
import { test, expect, traceTc, newUserContext } from '../../fixtures/test';
import { LoginPage } from '../../pages/LoginPage';
import { StaffPage } from '../../pages/StaffPage';
import { PermissionMatrixPage, RolesPage } from '../../pages/RolesPages';
import { PosPage } from '../../pages/PosPage';
import { SEEDED } from '../../fixtures/accounts';
import { addStock, createProduct } from '../../fixtures/data';
import { getFeatureMatrix } from '../../fixtures/sales';
import { queryRows, restoreTable, snapshotTable } from '../../fixtures/pg';
import { rolesOfUser } from '../../fixtures/dbq';
import { backendError, makeAccount, staffIdOf, uiBlocksAction } from '../../fixtures/ui';
import type { Page } from '@playwright/test';

const SHEET = 'UC-10 Roles and Permissions';
const ROLE_DB = { 'Quản trị viên': 'Admin', 'Quản lý': 'Manager', 'Nhân viên bán hàng': 'SalesStaff', 'Nhân viên kho': 'WarehouseStaff', 'Nhân viên sản xuất': 'ProductionStaff' } as const;

async function asAdmin(page: Page, env: { defaultPassword: string }): Promise<void> {
  await new LoginPage(page).loginOk(SEEDED.admin.username, env.defaultPassword);
}

test.describe(SHEET, () => {
  test('SYS-ROL-01 – Vai trò: danh sách kèm số người dùng, các thao tác có sẵn', async ({ page, env, db }, testInfo) => {
    traceTc(testInfo, 'SYS-ROL-01', SHEET);
    testInfo.annotations.push({ type: 'note', description: 'Audit log chưa có → không kiểm (Note của TC)' });
    await asAdmin(page, env);
    const roles = new RolesPage(page);
    await roles.goto();
    await expect(page.getByRole('button', { name: '+ Tạo vai trò' })).toBeVisible();
    for (const [label, dbName] of Object.entries(ROLE_DB)) {
      await test.step(`Vai trò "${label}": số nhân sự đúng DB, có Cấu hình quyền / Chỉnh sửa`, async () => {
        const n = (
          await queryRows<{ n: string }>(
            db,
            `SELECT COUNT(*)::text AS n FROM stockflow.jnc_user_roles ur JOIN stockflow.sec_roles r ON r.role_id = ur.role_id WHERE r.role_name = $1`,
            [dbName]
          )
        )[0].n;
        expect(await roles.userCount(label)).toBe(Number(n));
        await expect(roles.card(label).getByRole('button', { name: 'Cấu hình quyền' })).toBeVisible();
        await expect(roles.card(label).getByRole('button', { name: 'Chỉnh sửa vai trò' })).toBeVisible();
      });
    }
    await expect(page.getByRole('button', { name: 'Xóa vai trò' }).first()).toBeVisible();
  });

  test('SYS-ROL-02 – Ma trận: chức năng theo nhóm và dấu tick theo vai trò', async ({ page, env, adminApi }, testInfo) => {
    traceTc(testInfo, 'SYS-ROL-02', SHEET);
    await asAdmin(page, env);
    const m = new PermissionMatrixPage(page);
    await m.goto();
    const matrix = await getFeatureMatrix(adminApi);
    for (const role of ['MANAGER', 'SALES', 'WAREHOUSE', 'PRODUCTION'] as const) {
      const row = matrix.find((r) => r.roleCode === `ROLE_${role}`);
      expect((await m.headerCount(role)).on, `số chức năng của ${role}`).toBe(row?.features.length);
    }
    for (const group of ['Tổng quan', 'Nhân viên', 'Phân quyền', 'Hàng hóa', 'Bán hàng']) {
      await expect(page.getByRole('row', { name: group, exact: true })).toBeVisible();
    }
  });

  test('SYS-ROL-03 – Tạo vai trò mới và đổi tên', async ({ page, env, adminApi, uid }, testInfo) => {
    traceTc(testInfo, 'SYS-ROL-03', SHEET);
    const digits = uid.replace(/\D/g, '');
    const name = `Kiểm kê ${digits}`;
    const renamed = `Kiểm kê kho ${digits}`;
    await asAdmin(page, env);
    const roles = new RolesPage(page);
    await roles.goto();
    await test.step(`1. Tạo vai trò "${name}"`, async () => {
      await roles.create(name, `ROLE_E2E_${digits}`);
      await expect(page.getByText(`Đã tạo vai trò mới "${name}" thành công!`)).toBeVisible();
      await expect(roles.card(name)).toBeVisible();
    });
    await test.step(`2. Đổi tên thành "${renamed}"`, async () => {
      await roles.rename(name, renamed);
      await expect(page.getByText(new RegExp(`Đã cập nhật thông tin vai trò "${renamed}"`))).toBeVisible();
      await expect(roles.card(renamed)).toBeVisible();
      const list = await adminApi.get<{ name?: string; roleName?: string }[]>('/api/roles');
      expect(list.some((r) => (r.name ?? r.roleName) === renamed)).toBe(true);
    });
  });

  test('SYS-ROL-04 – Trùng mã hoặc tên vai trò: báo trùng, không lưu', async ({ page, env, adminApi, dialogs }, testInfo) => {
    traceTc(testInfo, 'SYS-ROL-04', SHEET);
    await asAdmin(page, env);
    const roles = new RolesPage(page);
    await roles.goto();
    const before = (await adminApi.get<unknown[]>('/api/roles')).length;
    dialogs.expect(/đã tồn tại trong hệ thống|Không thể tạo vai trò/);
    await test.step('1. Tạo vai trò trùng tên "Quản lý" / mã ROLE_MANAGER', async () => {
      await roles.create('Quản lý', 'ROLE_MANAGER');
      await page.waitForLoadState('networkidle');
    });
    await test.step('KQ. Báo trùng và không lưu', async () => {
      const after = (await adminApi.get<unknown[]>('/api/roles')).length;
      testInfo.annotations.push({ type: 'observed', description: `Số vai trò trước ${before}, sau ${after}; hộp thoại: ${dialogs.seen.map((d) => d.message).join(' | ') || '(không)'}` });
      await expect.soft(page.getByText(/Vai trò 'Quản lý' hoặc mã 'ROLE_MANAGER' đã tồn tại trong hệ thống\./)).toBeVisible();
      expect(after, 'vai trò trùng không được lưu (CreateRoleCommand chỉ so RoleName "Manager", không so tên hiển thị / mã)').toBe(before);
    });
  });

  test('SYS-ROL-05 – Bỏ / tick quyền trên ma trận có hiệu lực ở yêu cầu kế tiếp của người dùng @p1', async ({ page, browser, env, db, adminApi, uid, dialogs }, testInfo) => {
    traceTc(testInfo, 'SYS-ROL-05', SHEET, {
      mismatch: 'Procedure nói bỏ "Bán hàng – Tạo"; ma trận của code theo chức năng (FEAT_*), nên bỏ chức năng "Bán hàng" (feat-pos) của vai trò Nhân viên bán hàng.',
    });
    const original = await snapshotTable(db, 'stockflow.jnc_role_permissions');
    const u = await makeAccount(adminApi, uid, { prefix: 'rol05', role: 'SalesStaff' });
    const product = await createProduct(adminApi, { suffix: uid, price: 51_000 + (Number(uid.replace(/\D/g, '').slice(-3)) % 900) });
    await addStock(adminApi, product.productId, 'K001', 10);
    const user = await newUserContext(browser, testInfo, dialogs);
    const pos = new PosPage(user.page);
    try {
      await test.step('1. U (Nhân viên bán hàng) đã đăng nhập, mở POS, có hàng trong giỏ', async () => {
        await new LoginPage(user.page).loginOk(u.username, env.defaultPassword);
        await pos.goto();
        await pos.addProduct(product.code);
      });
      const m = new PermissionMatrixPage(page);
      await test.step('2. Admin bỏ tick "Bán hàng" của Nhân viên bán hàng và lưu', async () => {
        await asAdmin(page, env);
        await m.goto();
        await m.cell('Bán hàng', 'SALES').click();
        expect(await m.save()).toBe(200);
        await expect(page.getByText(/Đã lưu ma trận phân quyền thành công/)).toBeVisible();
        const after = await getFeatureMatrix(adminApi);
        expect(after.find((r) => r.roleCode === 'ROLE_SALES')?.features).not.toContain('feat-pos');
      });
      await test.step('3. U bán trên POS (không đăng nhập lại) → KQ1. bị từ chối 403', async () => {
        const res = await pos.pay();
        expect(res.status()).toBe(403);
        expect(await user.page.getByText(/Đã thanh toán hóa đơn/).count()).toBe(0);
      });
      await test.step('KQ2. Tick lại → U bán được', async () => {
        await m.cell('Bán hàng', 'SALES').click();
        expect(await m.save()).toBe(200);
        const res = await pos.pay();
        expect(res.status(), await res.text()).toBeLessThan(300);
      });
    } finally {
      await restoreTable(env, original);
      await user.context.close();
    }
  });

  test('SYS-ROL-06 – Bỏ hết quyền của Admin: Admin vẫn toàn quyền', async ({ page, env, db, adminApi, dialogs }, testInfo) => {
    traceTc(testInfo, 'SYS-ROL-06', SHEET, {
      mismatch: 'Description: từ chối, giữ nguyên cấu hình; Expected: Admin vẫn toàn quyền (FR-ROLE-04). Ghi lại màn có chặn lưu hay không.',
    });
    const original = await snapshotTable(db, 'stockflow.jnc_role_permissions');
    try {
      await asAdmin(page, env);
      const m = new PermissionMatrixPage(page);
      await m.goto();
      await test.step('1. Bỏ chọn toàn bộ cột Quản trị viên; lưu', async () => {
        dialogs.expect(/.*/);
        await page.getByRole('columnheader', { name: /ADMIN/ }).getByRole('button', { name: 'Bỏ chọn' }).click();
        const status = await m.save();
        const after = await getFeatureMatrix(adminApi);
        testInfo.annotations.push({
          type: 'observed',
          description: `Lưu: HTTP ${status}; ADMIN còn ${after.find((r) => r.roleCode === 'ROLE_ADMIN')?.features.length ?? '?'} chức năng (bị khoá không bỏ được); hộp thoại: ${dialogs.seen.map((d) => d.message).join(' | ') || '(không)'}`,
        });
      });
      await test.step('2. Dùng tài khoản Admin → KQ. vẫn toàn quyền', async () => {
        const blocked: string[] = [];
        for (const path of ['/staff', '/roles', '/roles/warehouses', '/purchases', '/transfers']) {
          await page.goto(path);
          const noAccess = page.getByRole('heading', { name: 'Bạn không có quyền truy cập chức năng này' });
          await expect(page.getByRole('heading', { level: 1 }).or(noAccess).first()).toBeVisible();
          if (await noAccess.isVisible()) blocked.push(path);
        }
        // FR-ROLE-04: phía backend Admin phải luôn qua kiểm quyền
        const api = await adminApi.get<unknown[]>('/api/staff').then(
          (r) => `HTTP 200 (${r.length} dòng)`,
          (e: unknown) => (e instanceof Error ? e.message.slice(0, 200) : String(e))
        );
        testInfo.annotations.push({ type: 'observed', description: `UI chặn Admin ở: ${blocked.join(', ') || '(không)'}; GET /api/staff: ${api}` });
        expect.soft(api, 'API của Admin bị từ chối sau khi bỏ hết quyền trên ma trận').toMatch(/^HTTP 200/);
        expect(blocked, 'Admin bị chặn ở giao diện sau khi bỏ hết quyền trên ma trận').toEqual([]);
      });
    } finally {
      await restoreTable(env, original);
    }
  });

  test('SYS-ROL-07 – Đổi vai trò của tài khoản: vai trò mới thay vai trò cũ', async ({ page, env, db, adminApi, uid }, testInfo) => {
    traceTc(testInfo, 'SYS-ROL-07', SHEET, { mismatch: 'Code: mỗi tài khoản một vai trò (UC-14).' });
    const acc = await makeAccount(adminApi, uid, { prefix: 'rol07', role: 'SalesStaff' });
    await asAdmin(page, env);
    const staff = new StaffPage(page);
    await staff.goto();
    await staff.search.fill(acc.name);
    await staff.openEdit(acc.username);
    await staff.fill({ role: 'WarehouseStaff' });
    expect(await staff.submit()).toBeLessThan(300);
    await expect(page.getByText(`Đã cập nhật thông tin nhân viên ${acc.name}`)).toBeVisible();
    expect(await rolesOfUser(db, acc.username)).toEqual(['WarehouseStaff']);
    await expect(staff.roleCell(acc.username)).toHaveText('Nhân viên kho');
  });

  test('SYS-ROL-08 – Không thể để tài khoản không có vai trò', async ({ page, env, db, adminApi, uid }, testInfo) => {
    traceTc(testInfo, 'SYS-ROL-08', SHEET);
    const acc = await makeAccount(adminApi, uid, { prefix: 'rol08', role: 'SalesStaff' });
    await asAdmin(page, env);
    const staff = new StaffPage(page);
    await staff.goto();
    await staff.search.fill(acc.name);
    await staff.openEdit(acc.username);
    const options = await staff.modal().getByRole('combobox').locator('option').allTextContents();
    if (!options.some((o) => o.trim() === '' || /chọn vai trò/i.test(o))) {
      const id = await staffIdOf(adminApi, acc.username);
      const be = await backendError(() => adminApi.put(`/api/staff/${id}`, { name: acc.name, phone: acc.phone, role: '', username: acc.username }));
      uiBlocksAction(testInfo, 'ô Vai trò là select không có lựa chọn rỗng', 'Vai trò không được để trống.', be);
    }
    expect(await rolesOfUser(db, acc.username), 'tài khoản vẫn giữ một vai trò').toEqual(['SalesStaff']);
  });
});
