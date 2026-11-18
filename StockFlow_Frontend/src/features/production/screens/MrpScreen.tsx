'use client';

// Hoạch định nhu cầu nguyên vật liệu (MRP, mã tạm UC-MRP; specs/mrp/review).
// Một lần chạy là ảnh chụp kết quả: tổng quan, nhu cầu theo tháng / tuần, theo ngày, NVL thiếu (kèm kế hoạch / lệnh bị thiếu),
// đề xuất mua. Bấm mã NVL mở tồn dự phóng theo ngày. "Lập đơn đặt hàng" mở trang đặt hàng nhập điền sẵn (không tự tạo đơn, BR-MRP-28).

import React, { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { message } from 'antd';
import { AlertTriangle, CheckCircle2, Info, Layers, Play, RefreshCcw, RotateCw, Search, ShieldAlert, ShoppingCart, TrendingDown, Warehouse } from 'lucide-react';
import { mrpService } from '../services/mrpService';
import { MrpRunDialog } from '../components/MrpRunDialog';
import { MrpProjectionModal } from '../components/MrpProjectionModal';
import { fmtDateTime, fmtQty } from '../utils/productionFormat';
import { fmtDateOnly, planErrorText } from '../utils/productionPlanFormat';
import type {
  MrpDailyRequirement,
  MrpMonthlyDemand,
  MrpPurchaseSuggestion,
  MrpRunListItem,
  MrpRunSummary,
  MrpShortage,
} from '../types';

type MrpTab = 'summary' | 'monthly' | 'daily' | 'shortages' | 'suggestions';

type TabData =
  | { tab: 'monthly'; data: MrpMonthlyDemand }
  | { tab: 'daily'; data: MrpDailyRequirement[] }
  | { tab: 'shortages'; data: MrpShortage[] }
  | { tab: 'suggestions'; data: MrpPurchaseSuggestion[] };

const TABS: { key: MrpTab; label: string }[] = [
  { key: 'summary', label: 'Tổng quan' },
  { key: 'monthly', label: 'Nhu cầu tháng / tuần' },
  { key: 'daily', label: 'Nhu cầu theo ngày' },
  { key: 'shortages', label: 'NVL thiếu' },
  { key: 'suggestions', label: 'Đề xuất mua' },
];

const SUGGESTION_STATUS: Record<string, { label: string; cls: string }> = {
  ON_TIME: { label: 'Kịp đặt', cls: 'bg-emerald-100 text-emerald-800' },
  LATE: { label: 'Trễ', cls: 'bg-red-100 text-red-800' },
  NO_LEAD_TIME: { label: 'Chưa có thời gian giao', cls: 'bg-amber-100 text-amber-800' },
};

/**
 * Đường dẫn trang đặt hàng nhập điền sẵn từ đề xuất: gộp theo NVL (một NVL có thể có nhiều mốc ngày) rồi làm tròn lên số nguyên
 * (BR-MRP-27), vì đơn đặt chỉ cho mỗi mặt hàng một dòng.
 */
function purchaseOrderHref(items: MrpPurchaseSuggestion[], runCode: string): string {
  const byMaterial = new Map<number, number>();
  for (const s of items) byMaterial.set(s.materialId, (byMaterial.get(s.materialId) ?? 0) + s.suggestedQty);
  const products = Array.from(byMaterial.entries())
    .map(([id, qty]) => `${id}:${Math.ceil(Number(qty.toFixed(2)))}`)
    .join(',');
  const notes = `Đặt NVL theo đề xuất MRP ${runCode}`;
  return `/purchase-orders/create?products=${products}&notes=${encodeURIComponent(notes)}`;
}

export function MrpScreen() {
  const router = useRouter();

  const [runsTick, setRunsTick] = useState(0);
  const [runsState, setRunsState] = useState<{ key: number; data: MrpRunListItem[]; error: string | null }>({ key: -1, data: [], error: null });
  const [pickedRunId, setPickedRunId] = useState<number | null>(null);
  const runId = pickedRunId ?? runsState.data[0]?.mrpRunId ?? null;

  const [summaryState, setSummaryState] = useState<{ key: string; data: MrpRunSummary | null; error: string | null }>({ key: '', data: null, error: null });
  const summaryKey = runId ? `${runId}:${runsTick}` : '';
  const summary = summaryState.key === summaryKey ? summaryState.data : null;

  const [activeTab, setActiveTab] = useState<MrpTab>('summary');
  const [bucket, setBucket] = useState<'month' | 'week'>('month');
  const [lateOnly, setLateOnly] = useState(false);
  const [suggestionStatus, setSuggestionStatus] = useState('ALL');
  const [dailyFilter, setDailyFilter] = useState('');
  const tabKey = runId && activeTab !== 'summary' ? `${runId}:${runsTick}:${activeTab}:${bucket}:${lateOnly}:${suggestionStatus}` : '';
  const [tabState, setTabState] = useState<{ key: string; data: TabData | null; error: string | null }>({ key: '', data: null, error: null });
  const tabLoading = !!tabKey && tabState.key !== tabKey;

  const [runDialogOpen, setRunDialogOpen] = useState(false);
  const [projectionMaterialId, setProjectionMaterialId] = useState<number | null>(null);

  // Danh sách lần chạy
  useEffect(() => {
    let stale = false;
    mrpService
      .getRuns()
      .then((data) => {
        if (!stale) setRunsState({ key: runsTick, data, error: null });
      })
      .catch((err: unknown) => {
        if (!stale) setRunsState({ key: runsTick, data: [], error: planErrorText(err, 'Không tải được lịch sử chạy MRP') });
      });
    return () => {
      stale = true;
    };
  }, [runsTick]);

  // Tổng quan lần chạy đang chọn
  useEffect(() => {
    if (!runId) return;
    let stale = false;
    mrpService
      .getRunSummary(runId)
      .then((data) => {
        if (!stale) setSummaryState({ key: summaryKey, data, error: null });
      })
      .catch((err: unknown) => {
        if (!stale) setSummaryState({ key: summaryKey, data: null, error: planErrorText(err, 'Không tải được lần chạy MRP') });
      });
    return () => {
      stale = true;
    };
  }, [runId, summaryKey]);

  // Dữ liệu tab
  useEffect(() => {
    if (!tabKey || !runId) return;
    let stale = false;
    const load = (): Promise<TabData> => {
      switch (activeTab) {
        case 'monthly':
          return mrpService.getMonthlyDemand(runId, bucket).then((data) => ({ tab: 'monthly', data }));
        case 'daily':
          return mrpService.getDailyRequirements(runId).then((data) => ({ tab: 'daily', data }));
        case 'shortages':
          return mrpService.getShortages(runId, lateOnly).then((data) => ({ tab: 'shortages', data }));
        default:
          return mrpService
            .getPurchaseSuggestions(runId, suggestionStatus === 'ALL' ? undefined : suggestionStatus)
            .then((data) => ({ tab: 'suggestions', data }));
      }
    };
    load()
      .then((data) => {
        if (!stale) setTabState({ key: tabKey, data, error: null });
      })
      .catch((err: unknown) => {
        if (!stale) setTabState({ key: tabKey, data: null, error: planErrorText(err, 'Không tải được dữ liệu MRP') });
      });
    return () => {
      stale = true;
    };
  }, [tabKey, runId, activeTab, bucket, lateOnly, suggestionStatus]);

  const tabData = tabState.key === tabKey ? tabState.data : null;
  const monthly = tabData?.tab === 'monthly' ? tabData.data : null;
  const daily = useMemo(() => {
    const rows = tabData?.tab === 'daily' ? tabData.data : [];
    const q = dailyFilter.trim().toLowerCase();
    return q ? rows.filter((d) => d.materialCode.toLowerCase().includes(q) || d.materialName.toLowerCase().includes(q)) : rows;
  }, [tabData, dailyFilter]);
  const shortages = tabData?.tab === 'shortages' ? tabData.data : [];
  const suggestions = tabData?.tab === 'suggestions' ? tabData.data : [];
  const suggestionMaterialCount = new Set(suggestions.map((s) => s.materialId)).size;

  function openPurchaseOrder(items: MrpPurchaseSuggestion[]) {
    if (!summary || items.length === 0) return;
    router.push(purchaseOrderHref(items, summary.runCode));
  }

  const pageError = runsState.error ?? summaryState.error;
  const th = 'px-3 py-2.5 whitespace-nowrap';

  return (
    <div className="flex-1 h-full min-h-0 overflow-auto bg-transparent text-[13px] text-[#15171a]">
      <div className="space-y-4 p-4 sm:p-6">
        {/* Thanh tiêu đề */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-[20px] font-bold leading-7 tracking-tight">Hoạch định nhu cầu NVL (MRP)</h1>
            <p className="text-xs text-[#677484]">
              Nhu cầu từ kế hoạch đã duyệt và lệnh đang mở, đối chiếu tồn kho và đơn đặt có ngày giao, đề xuất số lượng và ngày đặt hàng.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {runsState.data.length > 0 && (
              <label className="flex items-center gap-2 text-xs text-[#677484]">
                Lần chạy
                <select
                  value={runId ?? ''}
                  onChange={(e) => setPickedRunId(Number(e.target.value))}
                  className="h-8 rounded-[8px] border border-slate-300 bg-white px-2 text-[13px] text-[#15171a] focus:border-[#0070f4] focus:outline-none"
                >
                  {runsState.data.map((r) => (
                    <option key={r.mrpRunId} value={r.mrpRunId}>
                      {r.runCode} · {fmtDateTime(r.runAt)} · {r.warehouseNames}
                    </option>
                  ))}
                </select>
              </label>
            )}
            <button
              type="button"
              onClick={() => setRunDialogOpen(true)}
              className="inline-flex h-8 items-center gap-1.5 rounded-[8px] bg-[#0070f4] px-3.5 text-[13px] font-semibold text-white hover:bg-[#005ac3]"
            >
              <Play size={14} className="fill-white" /> Tính MRP
            </button>
          </div>
        </div>

        {pageError && <div className="rounded-[8px] border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">{pageError}</div>}

        {runsState.key === runsTick && runsState.data.length === 0 && !runsState.error && (
          <div className="rounded-[8px] border border-slate-200 bg-white py-16 text-center text-[#677484]">
            Chưa có lần chạy MRP nào. Bấm <b>Tính MRP</b> để bắt đầu.
          </div>
        )}

        {summary?.isStale && (
          <div className="flex flex-wrap items-start justify-between gap-3 rounded-[8px] border border-amber-300 bg-amber-50 p-3 text-amber-900">
            <div className="flex items-start gap-2">
              <AlertTriangle size={16} className="mt-0.5 shrink-0 text-amber-600" />
              <div>
                <div className="text-xs font-bold">Dữ liệu đã thay đổi sau lần tính này — kết quả có thể không còn đúng</div>
                <ul className="mt-1 list-disc space-y-0.5 pl-4 text-xs">
                  {summary.staleReasons.map((r) => (
                    <li key={r}>{r}</li>
                  ))}
                </ul>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setRunDialogOpen(true)}
              className="inline-flex items-center gap-1.5 rounded-[8px] border border-amber-400 bg-white px-3 py-1.5 text-xs font-semibold hover:bg-amber-100"
            >
              <RotateCw size={13} /> Tính lại
            </button>
          </div>
        )}

        {summary && summary.productsWithoutBom.length > 0 && (
          <div className="flex items-start gap-2 rounded-[8px] border border-rose-200 bg-rose-50 p-3 text-xs text-rose-800">
            <Info size={16} className="mt-0.5 shrink-0 text-rose-600" />
            <span>
              <b>{summary.productsWithoutBom.length} thành phẩm chưa có BOM đang áp dụng</b> nên không tính nhu cầu NVL:{' '}
              {summary.productsWithoutBom.map((p) => p.productCode).join(', ')}.
            </span>
          </div>
        )}

        {summary && (
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            {[
              { label: 'NVL có nhu cầu', value: summary.materialCount, icon: <Layers size={15} className="text-[#0070f4]" />, cls: '' },
              { label: 'NVL thiếu', value: summary.shortageCount, icon: <TrendingDown size={15} className="text-rose-500" />, cls: 'text-rose-600' },
              { label: 'NVL trễ hạn đặt', value: summary.lateCount, icon: <ShieldAlert size={15} className="text-amber-500" />, cls: 'text-amber-600' },
            ].map((k) => (
              <div key={k.label} className="rounded-[8px] border border-slate-200 bg-white p-3">
                <div className="flex items-center justify-between text-xs text-[#677484]">
                  {k.label} {k.icon}
                </div>
                <div className={`mt-1 text-2xl font-bold ${k.cls}`}>{k.value}</div>
              </div>
            ))}
            <div className="rounded-[8px] border border-slate-200 bg-white p-3">
              <div className="text-xs text-[#677484]">Kỳ tính</div>
              <div className="mt-1 font-bold">
                {fmtDateOnly(summary.periodStart)} – {fmtDateOnly(summary.periodEnd)}
              </div>
              <div className="truncate text-xs text-[#677484]" title={summary.warehouses.map((w) => w.warehouseName).join(', ')}>
                Kho: {summary.warehouses.map((w) => w.warehouseName).join(', ')}
              </div>
            </div>
          </div>
        )}

        {summary && (
          <>
            <div className="flex flex-wrap items-center gap-1 border-b border-slate-200">
              {TABS.map((t) => (
                <button
                  key={t.key}
                  type="button"
                  onClick={() => setActiveTab(t.key)}
                  className={`-mb-px border-b-2 px-4 py-2 text-sm ${
                    activeTab === t.key ? 'border-[#0070f4] font-semibold text-[#0070f4]' : 'border-transparent text-[#677484] hover:text-[#15171a]'
                  }`}
                >
                  {t.label}
                  {t.key === 'shortages' && summary.shortageCount > 0 && (
                    <span className="ml-1.5 rounded-full bg-rose-100 px-1.5 text-xs font-bold text-rose-700">{summary.shortageCount}</span>
                  )}
                </button>
              ))}
              {tabLoading && <RefreshCcw size={13} className="ml-2 animate-spin text-[#0070f4]" />}
            </div>

            <div className="rounded-[8px] border border-slate-200 bg-white p-4">
              {tabState.key === tabKey && tabState.error && <div className="mb-3 text-xs text-red-600">{tabState.error}</div>}

              {activeTab === 'summary' && (
                <dl className="grid grid-cols-1 gap-x-8 gap-y-2 text-xs md:grid-cols-2">
                  {[
                    ['Mã lần chạy', summary.runCode],
                    ['Thời điểm chạy', fmtDateTime(summary.runAt)],
                    ['Người chạy', summary.runByName],
                    ['Tính cả kế hoạch chờ duyệt', summary.includePendingPlans ? 'Có' : 'Không'],
                  ].map(([k, v]) => (
                    <div key={k} className="flex justify-between border-b border-slate-100 py-1.5">
                      <dt className="text-[#677484]">{k}</dt>
                      <dd className="font-medium">{v}</dd>
                    </div>
                  ))}
                  <div className="md:col-span-2 flex flex-wrap gap-2 pt-1">
                    {summary.warehouses.map((w) => (
                      <span key={w.warehouseId} className="inline-flex items-center gap-1 rounded-[6px] border border-slate-200 px-2 py-1">
                        <Warehouse size={12} className="text-slate-400" /> {w.warehouseName}
                      </span>
                    ))}
                  </div>
                  <p className="md:col-span-2 pt-2 text-[11px] text-[#677484]">
                    Cách tính: nhu cầu = phần chưa lập lệnh của kế hoạch × BOM đang áp dụng + phần NVL còn phải xuất của lệnh đang mở; nguồn = tồn
                    các kho đã chọn (trừ lô hết hạn) + đơn đặt có ngày giao dự kiến. Thời gian giao tính theo ngày lịch, chưa trừ ngày nghỉ; tồn an
                    toàn chưa áp dụng.
                  </p>
                </dl>
              )}

              {activeTab === 'monthly' && (
                <div className="space-y-3">
                  <div className="flex items-center justify-end gap-2 text-xs text-[#677484]">
                    Gom theo
                    {(['month', 'week'] as const).map((b) => (
                      <button
                        key={b}
                        type="button"
                        onClick={() => setBucket(b)}
                        className={`rounded-[6px] border px-2.5 py-1 ${bucket === b ? 'border-[#0070f4] text-[#0070f4]' : 'border-slate-300'}`}
                      >
                        {b === 'month' ? 'Tháng' : 'Tuần (từ thứ Hai)'}
                      </button>
                    ))}
                  </div>
                  {monthly && monthly.materials.length > 0 ? (
                    <div className="overflow-x-auto rounded-[8px] border border-slate-200">
                      <table className="w-full border-collapse text-left text-xs">
                        <thead className="bg-[#f7f8f9] font-semibold text-[#677484]">
                          <tr>
                            <th className={th}>Mã NVL</th>
                            <th className={th}>Tên NVL</th>
                            <th className={`${th} text-center`}>ĐVT</th>
                            {monthly.buckets.map((b) => (
                              <th key={b} className={`${th} text-right`}>
                                {b}
                              </th>
                            ))}
                            <th className={`${th} text-right`}>Tổng</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {monthly.materials.map((m) => (
                            <tr key={m.materialId} onClick={() => setProjectionMaterialId(m.materialId)} className="cursor-pointer hover:bg-[#f7f8f9]">
                              <td className="px-3 py-2 font-mono font-semibold text-[#0070f4]">{m.materialCode}</td>
                              <td className="px-3 py-2">{m.materialName}</td>
                              <td className="px-3 py-2 text-center text-slate-500">{m.unitName}</td>
                              {m.quantities.map((q, i) => (
                                <td key={monthly.buckets[i]} className="px-3 py-2 text-right">
                                  {q > 0 ? fmtQty(q) : '–'}
                                </td>
                              ))}
                              <td className="px-3 py-2 text-right font-bold">{fmtQty(m.total)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    !tabLoading && <div className="py-10 text-center text-[#677484]">Không có nhu cầu NVL trong kỳ.</div>
                  )}
                </div>
              )}

              {activeTab === 'daily' && (
                <div className="space-y-3">
                  <div className="relative max-w-sm">
                    <Search size={14} className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      value={dailyFilter}
                      onChange={(e) => setDailyFilter(e.target.value)}
                      placeholder="Lọc theo mã hoặc tên NVL"
                      className="h-8 w-full rounded-[8px] border border-slate-300 pl-8 pr-3 focus:border-[#0070f4] focus:outline-none"
                    />
                  </div>
                  <div className="overflow-x-auto rounded-[8px] border border-slate-200">
                    <table className="w-full min-w-[760px] border-collapse text-left text-xs">
                      <thead className="bg-[#f7f8f9] font-semibold text-[#677484]">
                        <tr>
                          <th className={th}>Ngày cần</th>
                          <th className={th}>Mã NVL</th>
                          <th className={th}>Tên NVL</th>
                          <th className={`${th} text-center`}>ĐVT</th>
                          <th className={`${th} text-right`}>Nhu cầu</th>
                          <th className={th}>Từ kế hoạch / lệnh</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {daily.length === 0 ? (
                          <tr>
                            <td colSpan={6} className="py-10 text-center text-[#677484]">
                              {tabLoading ? 'Đang tải...' : 'Không có nhu cầu NVL trong kỳ.'}
                            </td>
                          </tr>
                        ) : (
                          daily.map((d) => (
                            <tr key={`${d.date}:${d.materialId}`}>
                              <td className="px-3 py-2 whitespace-nowrap">{fmtDateOnly(d.date)}</td>
                              <td
                                onClick={() => setProjectionMaterialId(d.materialId)}
                                className="cursor-pointer px-3 py-2 font-mono font-semibold text-[#0070f4] hover:underline"
                              >
                                {d.materialCode}
                              </td>
                              <td className="px-3 py-2">{d.materialName}</td>
                              <td className="px-3 py-2 text-center text-slate-500">{d.unitName}</td>
                              <td className="px-3 py-2 text-right font-semibold">{fmtQty(d.grossRequirement)}</td>
                              <td className="px-3 py-2">
                                <div className="flex flex-wrap gap-1">
                                  {d.sources.map((s) => (
                                    <span
                                      key={`${s.type}:${s.code}:${s.productCode}`}
                                      className={`rounded px-1.5 py-0.5 ${s.type === 'PLAN' ? 'bg-violet-100 text-violet-800' : 'bg-blue-100 text-blue-800'}`}
                                    >
                                      {s.type === 'PLAN' ? 'KH' : 'Lệnh'} {s.code} · {s.productCode}: {fmtQty(s.quantity)}
                                    </span>
                                  ))}
                                </div>
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {activeTab === 'shortages' && (
                <div className="space-y-3">
                  <label className="flex w-fit cursor-pointer items-center gap-2 text-xs">
                    <input type="checkbox" checked={lateOnly} onChange={(e) => setLateOnly(e.target.checked)} className="h-4 w-4 accent-[#0070f4]" />
                    Chỉ NVL đã trễ hạn đặt hàng
                  </label>
                  <div className="overflow-x-auto rounded-[8px] border border-slate-200">
                    <table className="w-full min-w-[1100px] border-collapse text-left text-xs">
                      <thead className="bg-[#f7f8f9] font-semibold text-[#677484]">
                        <tr>
                          <th className={th}>Mã NVL</th>
                          <th className={th}>Tên NVL</th>
                          <th className={`${th} text-center`}>ĐVT</th>
                          <th className={th}>Thiếu từ ngày</th>
                          <th className={`${th} text-right`}>Tồn đầu kỳ</th>
                          <th className={`${th} text-right`}>Tổng thiếu</th>
                          <th className={th}>Kế hoạch / lệnh bị thiếu</th>
                          <th className={`${th} text-right`}>Đặt chưa có ngày giao</th>
                          <th className={th}>Tồn kho khác</th>
                          <th className={`${th} text-center`}>Tình trạng</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {shortages.length === 0 ? (
                          <tr>
                            <td colSpan={10} className="py-10 text-center text-[#677484]">
                              {tabLoading ? 'Đang tải...' : 'Không có NVL thiếu trong kỳ.'}
                            </td>
                          </tr>
                        ) : (
                          shortages.map((s) => (
                            <tr key={s.materialId} className={s.isLate ? 'bg-red-50/40' : ''}>
                              <td
                                onClick={() => setProjectionMaterialId(s.materialId)}
                                className="cursor-pointer px-3 py-2 font-mono font-semibold text-[#0070f4] hover:underline"
                              >
                                {s.materialCode}
                              </td>
                              <td className="px-3 py-2">{s.materialName}</td>
                              <td className="px-3 py-2 text-center text-slate-500">{s.unitName}</td>
                              <td className="px-3 py-2 whitespace-nowrap">{fmtDateOnly(s.firstShortageDate)}</td>
                              <td className="px-3 py-2 text-right">{fmtQty(s.onHand)}</td>
                              <td className="px-3 py-2 text-right font-bold text-red-600">{fmtQty(s.totalNetRequirement)}</td>
                              <td className="px-3 py-2">
                                {s.affected.map((a) => (
                                  <div key={`${a.type}:${a.code}:${a.productCode}:${a.neededDate}`} className="whitespace-nowrap">
                                    {a.type === 'PLAN' ? 'KH' : 'Lệnh'} <b>{a.code}</b> · {a.productCode} · {fmtDateOnly(a.neededDate)}: thiếu{' '}
                                    <span className="font-semibold text-red-600">{fmtQty(a.shortageQty)}</span>
                                  </div>
                                ))}
                              </td>
                              <td className="px-3 py-2 text-right">{s.onOrderWithoutDate > 0 ? fmtQty(s.onOrderWithoutDate) : '–'}</td>
                              <td className="px-3 py-2">
                                {s.otherWarehouses.length > 0
                                  ? s.otherWarehouses.map((o) => (
                                      <div key={o.warehouseId} className="whitespace-nowrap">
                                        {o.warehouseName}: {fmtQty(o.onHand)}
                                      </div>
                                    ))
                                  : '–'}
                              </td>
                              <td className="px-3 py-2 text-center">
                                {s.isLate ? (
                                  <span className="rounded bg-red-100 px-2 py-0.5 font-semibold text-red-800">Trễ hạn đặt</span>
                                ) : !s.hasLeadTime ? (
                                  <span className="rounded bg-amber-100 px-2 py-0.5 text-amber-800">Chưa có thời gian giao</span>
                                ) : (
                                  <span className="rounded bg-emerald-100 px-2 py-0.5 text-emerald-800">Còn kịp đặt</span>
                                )}
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {activeTab === 'suggestions' && (
                <div className="space-y-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <label className="flex items-center gap-2 text-xs text-[#677484]">
                      Trạng thái
                      <select
                        value={suggestionStatus}
                        onChange={(e) => setSuggestionStatus(e.target.value)}
                        className="h-8 rounded-[8px] border border-slate-300 bg-white px-2 text-[13px] text-[#15171a]"
                      >
                        <option value="ALL">Tất cả</option>
                        {Object.entries(SUGGESTION_STATUS).map(([value, s]) => (
                          <option key={value} value={value}>
                            {s.label}
                          </option>
                        ))}
                      </select>
                    </label>
                    {suggestions.length > 0 && (
                      <button
                        type="button"
                        onClick={() => openPurchaseOrder(suggestions)}
                        className="inline-flex h-8 items-center gap-1.5 rounded-[8px] bg-[#0070f4] px-3 text-xs font-semibold text-white hover:bg-[#005ac3]"
                        title="Mở trang đặt hàng nhập, mỗi NVL một dòng với tổng số đề xuất (làm tròn lên). Đơn đặt vào kho đang làm việc."
                      >
                        <ShoppingCart size={14} /> Lập đơn đặt hàng ({suggestionMaterialCount} NVL)
                      </button>
                    )}
                  </div>
                  <div className="overflow-x-auto rounded-[8px] border border-slate-200">
                    <table className="w-full min-w-[1000px] border-collapse text-left text-xs">
                      <thead className="bg-[#f7f8f9] font-semibold text-[#677484]">
                        <tr>
                          <th className={th}>Mã NVL</th>
                          <th className={th}>Tên NVL</th>
                          <th className={`${th} text-center`}>ĐVT</th>
                          <th className={`${th} text-right`}>Số đề xuất</th>
                          <th className={`${th} text-right`}>Làm tròn đặt</th>
                          <th className={th}>Cần về kho</th>
                          <th className={th}>Hạn đặt hàng</th>
                          <th className={th}>NCC lần mua gần nhất</th>
                          <th className={`${th} text-center`}>Trạng thái</th>
                          <th className={`${th} text-center`} />
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {suggestions.length === 0 ? (
                          <tr>
                            <td colSpan={10} className="py-10 text-center text-[#677484]">
                              {tabLoading ? 'Đang tải...' : 'Không có đề xuất mua trong kỳ.'}
                            </td>
                          </tr>
                        ) : (
                          suggestions.map((s) => {
                            const st = SUGGESTION_STATUS[s.status] ?? { label: s.status, cls: 'bg-slate-100 text-slate-700' };
                            return (
                              <tr key={`${s.materialId}:${s.requiredReceiptDate}`} className={s.status === 'LATE' ? 'bg-red-50/40' : ''}>
                                <td
                                  onClick={() => setProjectionMaterialId(s.materialId)}
                                  className="cursor-pointer px-3 py-2 font-mono font-semibold text-[#0070f4] hover:underline"
                                >
                                  {s.materialCode}
                                </td>
                                <td className="px-3 py-2">{s.materialName}</td>
                                <td className="px-3 py-2 text-center text-slate-500">{s.unitName}</td>
                                <td className="px-3 py-2 text-right">{fmtQty(s.suggestedQty)}</td>
                                <td className="px-3 py-2 text-right font-bold text-[#0070f4]">{fmtQty(s.suggestedQtyRounded)}</td>
                                <td className="px-3 py-2 whitespace-nowrap">{fmtDateOnly(s.requiredReceiptDate)}</td>
                                <td className="px-3 py-2 whitespace-nowrap font-semibold">{fmtDateOnly(s.releaseDate) || '–'}</td>
                                <td className="px-3 py-2">{s.lastSupplier?.partnerName ?? <span className="text-slate-400">Chưa có</span>}</td>
                                <td className="px-3 py-2 text-center">
                                  <span className={`inline-flex items-center gap-1 rounded px-2 py-0.5 font-semibold ${st.cls}`}>
                                    {s.status === 'ON_TIME' && <CheckCircle2 size={12} />}
                                    {st.label}
                                  </span>
                                </td>
                                <td className="px-3 py-2 text-center">
                                  <button
                                    type="button"
                                    onClick={() => openPurchaseOrder(suggestions.filter((x) => x.materialId === s.materialId))}
                                    className="inline-flex items-center gap-1 rounded-[6px] border border-slate-300 px-2 py-1 hover:bg-[#f7f8f9]"
                                  >
                                    <ShoppingCart size={12} /> Đặt NVL này
                                  </button>
                                </td>
                              </tr>
                            );
                          })
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          </>
        )}
      </div>

      <MrpRunDialog
        isOpen={runDialogOpen}
        onClose={() => setRunDialogOpen(false)}
        onSuccess={(run) => {
          message.success(`Đã tính MRP ${run.runCode}.`);
          setPickedRunId(run.mrpRunId);
          setRunsTick((t) => t + 1);
        }}
      />

      {runId && projectionMaterialId && (
        <MrpProjectionModal runId={runId} materialId={projectionMaterialId} onClose={() => setProjectionMaterialId(null)} />
      )}
    </div>
  );
}
