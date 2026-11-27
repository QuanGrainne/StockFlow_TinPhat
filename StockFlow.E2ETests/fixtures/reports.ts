// Tiện ích cho các ca dùng màn Báo cáo (/reports): Tổng quan (UC-90), Doanh thu & lợi nhuận, Nhập – xuất – tồn, Công nợ.
// Màn báo cáo lấy dữ liệu từ /api/reports/*; test đọc cùng API (bằng tài khoản thao tác) để đối chiếu số của hàng / khách
// vừa dựng, vì bảng báo cáo phân trang theo toàn bộ dữ liệu E2E.
import { expect, type Page } from '@playwright/test';
import { LoginPage } from '../pages/LoginPage';
import type { ApiSession } from './api';

export const REPORT_TABS = ['Tổng quan', 'Doanh thu & lợi nhuận', 'Nhập – xuất – tồn', 'Công nợ'] as const;

/** Ngày hôm nay theo giờ Việt Nam, dạng yyyy-MM-dd (tham số from / to của API báo cáo) */
export function todayVn(): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Ho_Chi_Minh' }).format(new Date());
}

/** Đăng nhập và mở /reports, chờ thanh tab báo cáo */
export async function openReports(page: Page, username: string, password: string): Promise<void> {
  await new LoginPage(page).loginOk(username, password);
  await page.goto('/reports');
  await expect(page.getByRole('tab', { name: 'Tổng quan' })).toBeVisible();
}

export async function openReportTab(page: Page, name: (typeof REPORT_TABS)[number]): Promise<void> {
  await page.getByRole('tab', { name }).click();
  await expect(page.getByRole('tab', { name, selected: true })).toBeVisible();
}

interface Paged<T> {
  items: T[];
  totalCount: number;
}

/** Đọc mọi trang của một báo cáo phân trang trong kỳ hôm nay, trả dòng đầu tiên thoả điều kiện */
export async function findReportRow<T>(
  api: ApiSession,
  path: 'revenue-profit' | 'stock-movement' | 'debts',
  params: Record<string, string | number>,
  match: (row: T) => boolean
): Promise<T | undefined> {
  const day = todayVn();
  for (let page = 1; page <= 50; page++) {
    const q = new URLSearchParams({ from: day, to: day, page: String(page), pageSize: '500' });
    for (const [k, v] of Object.entries(params)) q.set(k, String(v));
    const res = await api.get<Paged<T>>(`/api/reports/${path}?${q.toString()}`);
    const hit = res.items.find(match);
    if (hit) return hit;
    if (page * 500 >= res.totalCount) return undefined;
  }
  return undefined;
}
