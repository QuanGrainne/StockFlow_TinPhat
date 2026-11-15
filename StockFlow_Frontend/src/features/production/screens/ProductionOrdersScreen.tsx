'use client';

// Lệnh sản xuất (UC-44 Production Accountant xem lệnh; UC-58/59/60/61 Manager lập, theo dõi NVL và thành phẩm).
// Bố cục giống các màn chứng từ (Kiểm kho, Nhập hàng): thanh tiêu đề + bộ lọc trái + bảng, bấm dòng mở chi tiết.
// Không hiển thị giá / giá vốn (BR-39).

import React, { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { message } from 'antd';
import * as XLSX from 'xlsx';
import { FileDown, Inbox, Plus, RefreshCcw, Search } from 'lucide-react';
import { useActiveWarehouse } from '@/lib/warehouse/useActiveWarehouse';
import { productionService } from '../services/productionService';
import type { ProductionListFilter, ProductionOrderDetail, ProductionOrderSummary } from '../types';
import { useProductionFeatures } from '../hooks/useProductionFeatures';
import { ORDER_STATUS_LABEL, errorText, fmtDate, fmtDateTime, fmtQty } from '../utils/productionFormat';
import { ProductionFilterSidebar, SidebarToggle, defaultProductionFilter } from '../components/ProductionFilterSidebar';
import { ProductionStatusTag, ProgressBar, SmallTag } from '../components/ProductionStatusTag';
import { ProductionOrderDetailPanel, type ProductionOrderAction } from '../components/ProductionOrderDetailPanel';
import { ConfirmDialog } from '../components/ProductionDialog';
import { ReasonDialog } from '../components/ReasonDialog';
import { AdjustNormModal } from '../components/AdjustNormModal';
import { MaterialIssueModal } from '../components/MaterialIssueModal';
import { ApproveCompletionModal } from '../components/ApproveCompletionModal';

const STATUS_OPTIONS = [
  { value: 'NOT_STARTED', label: 'Chưa bắt đầu' },
  { value: 'IN_PROGRESS', label: 'Đang sản xuất' },
  { value: 'COMPLETED', label: 'Hoàn thành' },
  { value: 'CANCELLED', label: 'Đã hủy' },
];

type Dialog =
  | { kind: 'cancel' | 'close' | 'adjust' | 'approve'; detail: ProductionOrderDetail }
  | { kind: 'issue' | 'supplement'; orderId: number }
  | null;

export default function ProductionOrdersScreen() {
  const router = useRouter();
  const features = useProductionFeatures();
  const { activeWarehouse, warehouses } = useActiveWarehouse();

  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<ProductionListFilter>(() => defaultProductionFilter(['NOT_STARTED', 'IN_PROGRESS']));
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [reloadTick, setReloadTick] = useState(0);
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [availabilityWh, setAvailabilityWh] = useState<number>(activeWarehouse.warehouseId);
  const [details, setDetails] = useState<Record<string, ProductionOrderDetail>>({});
  const [dialog, setDialog] = useState<Dialog>(null);
  const [busy, setBusy] = useState(false);

  const requestKey = JSON.stringify({
    statuses: filter.statuses,
    fromDate: filter.dateFrom,
    toDate: filter.dateTo,
    needsReviewOnly: filter.needsReviewOnly,
    reloadTick,
  });
  const [result, setResult] = useState<{ key: string; data: ProductionOrderSummary[] }>({ key: '', data: [] });
  const noStatus = filter.statuses.length === 0;
  const loading = !noStatus && result.key !== requestKey;

  useEffect(() => {
    const p = JSON.parse(requestKey) as { statuses: string[]; fromDate?: string; toDate?: string; needsReviewOnly: boolean };
    if (p.statuses.length === 0) return;
    let stale = false;
    productionService
      .getOrders(p)
      .then((data) => {
        if (!stale) setResult({ key: requestKey, data });
      })
      .catch((err: unknown) => {
        if (stale) return;
        message.error(errorText(err, 'Không thể tải danh sách lệnh sản xuất'));
        setResult({ key: requestKey, data: [] });
      });
    return () => {
      stale = true;
    };
  }, [requestKey]);

  const filtered = useMemo(() => {
    if (noStatus) return [];
    const q = query.trim().toLowerCase();
    if (!q) return result.data;
    return result.data.filter(
      (o) =>
        o.code.toLowerCase().includes(q) ||
        o.productCode.toLowerCase().includes(q) ||
        o.productName.toLowerCase().includes(q) ||
        (o.workshop ?? '').toLowerCase().includes(q)
    );
  }, [result.data, query, noStatus]);

  // Chi tiết lệnh đang mở (theo kho xem tồn)
  const detailKey = expandedId ? `${expandedId}:${availabilityWh}:${reloadTick}` : '';
  const detail = detailKey ? details[detailKey] ?? null : null;
  useEffect(() => {
    if (!expandedId || details[detailKey]) return;
    let stale = false;
    productionService
      .getOrder(expandedId, availabilityWh)
      .then((d) => {
        if (!stale) setDetails((prev) => ({ ...prev, [detailKey]: d }));
      })
      .catch((err: unknown) => {
        if (!stale) message.error(errorText(err, 'Không tải được chi tiết lệnh sản xuất'));
      });
    return () => {
      stale = true;
    };
  }, [expandedId, availabilityWh, detailKey, details]);

  // Giữ chi tiết đã tải gần nhất khi đổi kho (không nháy trống)
  const lastDetail = useMemo(() => {
    if (detail) return detail;
    const prefix = `${expandedId}:`;
    const key = Object.keys(details).reverse().find((k) => k.startsWith(prefix));
    return key ? details[key] : null;
  }, [detail, details, expandedId]);

  const reload = () => {
    setDetails({});
    setReloadTick((t) => t + 1);
  };

  function handleAction(action: ProductionOrderAction) {
    if (!lastDetail) return;
    const id = lastDetail.summary.productionOrderId;
    switch (action) {
      case 'edit':
        router.push(`/production/create?edit=${id}`);
        break;
      case 'cancel':
      case 'close':
      case 'adjust':
      case 'approve':
        setDialog({ kind: action, detail: lastDetail });
        break;
      case 'issue':
      case 'supplement':
        setDialog({ kind: action, orderId: id });
        break;
    }
  }

  async function doCancel(d: ProductionOrderDetail) {
    setBusy(true);
    try {
      await productionService.cancelOrder(d.summary.productionOrderId);
      message.success(`Đã hủy lệnh sản xuất ${d.summary.code}.`);
      setDialog(null);
      reload();
    } catch (err) {
      message.error(errorText(err, 'Không hủy được lệnh sản xuất'));
    } finally {
      setBusy(false);
    }
  }

  async function doClose(d: ProductionOrderDetail, reason: string) {
    setBusy(true);
    try {
      await productionService.closeOrder(d.summary.productionOrderId, reason);
      message.success(`Lệnh sản xuất ${d.summary.code} đã hoàn thành.`);
      setDialog(null);
      reload();
    } catch (err) {
      message.error(errorText(err, 'Không đóng được lệnh sản xuất'));
    } finally {
      setBusy(false);
    }
  }

  function exportList() {
    const rows = filtered.map((o) => ({
      'Mã lệnh': o.code,
      'Ngày lập': fmtDateTime(o.createdDate),
      'Mã thành phẩm': o.productCode,
      'Thành phẩm': o.productName,
      'ĐVT': o.unitName,
      BOM: `${o.bomCode} (v${o.bomVersion})`,
      'SL kế hoạch': o.plannedQuantity,
      'SL đã nhập': o.receivedQuantity,
      'SL lỗi': o.defectQuantity,
      'Tiến độ (%)': o.progressPercent,
      'Hạn hoàn thành': fmtDate(o.deadline),
      'Xưởng': o.workshop ?? '',
      'NVL': o.materialStatus === 'FULL' ? 'Đã xuất đủ' : `Thiếu ${o.shortageLineCount} NVL`,
      'Trạng thái': ORDER_STATUS_LABEL[o.status] ?? o.status,
    }));
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'LenhSanXuat');
    XLSX.writeFile(wb, `DanhSachLenhSanXuat_${new Date().toISOString().slice(0, 10)}.xlsx`);
  }

  const th = 'sticky top-0 z-20 bg-[#f7f8f9] py-2.5 px-3 border-b border-slate-200 whitespace-nowrap';

  return (
    <div className="flex-1 h-full min-h-0 flex flex-col bg-transparent overflow-hidden select-none text-[13px] text-[#15171a] font-sans">
      {/* 1. Thanh tiêu đề */}
      <header className="min-h-12 bg-white/84 backdrop-blur-[2px] border-b border-slate-200 px-3 sm:px-4 py-2 flex flex-wrap items-center justify-between gap-x-3 gap-y-2 shrink-0">
        <div className="flex items-center gap-4 flex-1 basis-[320px] min-w-[260px] max-w-xl">
          <h1 className="text-[20px] font-bold leading-7 tracking-tight whitespace-nowrap">Lệnh sản xuất</h1>
          <div className="relative flex-1">
            <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[#677484] pointer-events-none" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Theo mã lệnh, mã / tên thành phẩm, xưởng"
              className="w-full h-8 pl-8 pr-3 rounded-full bg-[#f7f8f9] border border-slate-200 text-[13px] placeholder-[#677484] focus:outline-none focus:border-[#0070f4] focus:bg-white transition"
            />
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {features.canPlan && (
            <button
              type="button"
              onClick={() => router.push('/production/create')}
              className="inline-flex items-center gap-1.5 px-3.5 h-8 rounded-[8px] bg-[#0070f4] hover:bg-[#005ac3] text-white font-semibold text-[13px] shadow-xs transition cursor-pointer"
            >
              <Plus size={15} className="stroke-[2.5]" />
              <span>Lập lệnh</span>
            </button>
          )}
          <button
            type="button"
            onClick={exportList}
            className="inline-flex items-center gap-1 px-3 h-8 rounded-[8px] border border-slate-300 hover:bg-[#f7f8f9] font-medium text-[13px] bg-white cursor-pointer"
          >
            <FileDown size={14} className="text-[#677484]" />
            <span>Xuất file</span>
          </button>
        </div>
      </header>

      {/* 2. Bộ lọc + bảng */}
      <div className="flex-1 min-h-0 flex overflow-hidden">
        <div className="relative shrink-0 h-full flex">
          <ProductionFilterSidebar
            state={filter}
            onChange={(patch) => setFilter((prev) => ({ ...prev, ...patch }))}
            isCollapsed={sidebarCollapsed}
            statusOptions={STATUS_OPTIONS}
            timeLabel="Ngày lập lệnh"
            reviewLabel="Có phiếu nhập cần xem xét"
          />
          <SidebarToggle collapsed={sidebarCollapsed} onToggle={() => setSidebarCollapsed((v) => !v)} />
        </div>

        <div className="flex-1 min-w-0 min-h-0 flex flex-col overflow-hidden bg-white/62">
          <div className="flex-1 min-h-0 overflow-auto">
            <table className="w-full text-left border-collapse min-w-[1180px]">
              <thead className="text-[12px] font-semibold text-[#677484]">
                <tr>
                  <th className={th}>Mã lệnh</th>
                  <th className={th}>Ngày lập</th>
                  <th className={th}>Thành phẩm</th>
                  <th className={`${th} text-right`}>Kế hoạch</th>
                  <th className={`${th} text-right`}>Đã nhập</th>
                  <th className={th}>Tiến độ</th>
                  <th className={th}>Hạn hoàn thành</th>
                  <th className={th}>Xưởng</th>
                  <th className={`${th} text-center`}>NVL</th>
                  <th className={`${th} text-center`}>Đã lập đủ PX</th>
                  <th className={`${th} text-center`}>Đã lập đủ PN</th>
                  <th className={`${th} text-center`}>Trạng thái</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loading ? (
                  <tr>
                    <td colSpan={12} className="py-20 text-center text-[#677484]">
                      <RefreshCcw size={18} className="animate-spin mx-auto mb-2 text-[#0070f4]" />
                      Đang tải lệnh sản xuất...
                    </td>
                  </tr>
                ) : filtered.length === 0 ? (
                  <tr>
                    <td colSpan={12} className="py-24 text-center text-[#677484]">
                      <Inbox size={28} className="mx-auto mb-2 text-[#0070f4]" />
                      Không tìm thấy lệnh sản xuất nào phù hợp
                    </td>
                  </tr>
                ) : (
                  filtered.map((o) => {
                    const isExpanded = expandedId === o.productionOrderId;
                    const overdue =
                      !!o.deadline &&
                      (o.status === 'NOT_STARTED' || o.status === 'IN_PROGRESS') &&
                      new Date(o.deadline).getTime() < new Date(new Date().toDateString()).getTime();
                    return (
                      <React.Fragment key={o.productionOrderId}>
                        <tr
                          onClick={() => setExpandedId(isExpanded ? null : o.productionOrderId)}
                          className={`cursor-pointer text-[13px] ${isExpanded ? 'bg-[#e6f1fe]/80' : 'hover:bg-[#f7f8f9]'}`}
                        >
                          <td className="py-2.5 px-3 font-mono font-medium text-[#0070f4]">
                            {o.code}
                            {o.reviewFlagCount > 0 && (
                              <span className="ml-1.5 align-middle">
                                <SmallTag tone="red" title="Có phiếu nhập thành phẩm cần xem xét (BR-37)">
                                  !
                                </SmallTag>
                              </span>
                            )}
                          </td>
                          <td className="py-2.5 px-3 whitespace-nowrap">{fmtDateTime(o.createdDate)}</td>
                          <td className="py-2.5 px-3">
                            <div className="font-medium">{o.productName}</div>
                            <div className="text-[11px] text-[#677484]">
                              {o.productCode}
                              {o.items && o.items.length > 1 ? ` (${o.items.length} thành phẩm)` : ` · BOM ${o.bomCode}`}
                            </div>
                          </td>
                          <td className="py-2.5 px-3 text-right">
                            {fmtQty(o.plannedQuantity)} <span className="text-[11px] text-[#677484]">{o.unitName}</span>
                          </td>
                          <td className="py-2.5 px-3 text-right">{fmtQty(o.receivedQuantity)}</td>
                          <td className="py-2.5 px-3">
                            <ProgressBar percent={o.progressPercent} />
                          </td>
                          <td className={`py-2.5 px-3 whitespace-nowrap ${overdue ? 'text-[#fb2c36] font-semibold' : ''}`}>
                            {fmtDate(o.deadline)}
                          </td>
                          <td className="py-2.5 px-3 max-w-[160px] truncate" title={o.workshop ?? ''}>
                            {o.workshop}
                          </td>
                          <td className="py-2.5 px-3 text-center">
                            {o.materialStatus === 'FULL' ? (
                              <SmallTag tone="green">Đủ NVL</SmallTag>
                            ) : (
                              <SmallTag tone="amber">Thiếu {o.shortageLineCount}</SmallTag>
                            )}
                          </td>
                          <td className="py-2.5 px-3 text-center">
                            <input
                              type="checkbox"
                              checked={Boolean(o.isFullyIssued)}
                              readOnly
                              className="w-4 h-4 rounded border-slate-300 accent-[#0070f4] pointer-events-none"
                              title={o.isFullyIssued ? 'Đã lập đủ phiếu xuất NVL' : 'Chưa lập đủ phiếu xuất NVL'}
                            />
                          </td>
                          <td className="py-2.5 px-3 text-center">
                            <input
                              type="checkbox"
                              checked={Boolean(o.isFullyReceived)}
                              readOnly
                              className="w-4 h-4 rounded border-slate-300 accent-[#16a34a] pointer-events-none"
                              title={o.isFullyReceived ? 'Đã lập đủ phiếu nhập thành phẩm' : 'Chưa lập đủ phiếu nhập thành phẩm'}
                            />
                          </td>
                          <td className="py-2.5 px-3 text-center">
                            <ProductionStatusTag status={o.status} />
                          </td>
                        </tr>
                        {isExpanded && (
                          <tr>
                            <td colSpan={12} className="p-0 border-b-2 border-[#0070f4] bg-white">
                              <ProductionOrderDetailPanel
                                detail={lastDetail && lastDetail.summary.productionOrderId === o.productionOrderId ? lastDetail : null}
                                loading={!detail}
                                features={features}
                                warehouses={warehouses}
                                availabilityWarehouseId={availabilityWh}
                                onChangeWarehouse={setAvailabilityWh}
                                onAction={handleAction}
                              />
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
          <footer className="h-10 bg-white/82 backdrop-blur-[2px] border-t border-slate-200 px-4 flex items-center text-[12px] text-[#677484] shrink-0">
            Hiển thị <strong className="mx-1 text-[#15171a]">{filtered.length}</strong> lệnh sản xuất
          </footer>
        </div>
      </div>

      {dialog?.kind === 'cancel' && (
        <ConfirmDialog
          title="Hủy lệnh sản xuất"
          danger
          busy={busy}
          message={`Bạn có chắc chắn muốn hủy lệnh sản xuất ${dialog.detail.summary.code}? Thao tác này không thể hoàn tác.`}
          onCancel={() => setDialog(null)}
          onConfirm={() => void doCancel(dialog.detail)}
        />
      )}
      {dialog?.kind === 'close' && (
        <ReasonDialog
          title="Đóng lệnh sản xuất"
          confirmText="Đóng lệnh"
          busy={busy}
          description={
            <span>
              Lệnh <b>{dialog.detail.summary.code}</b> đã nhập {fmtQty(dialog.detail.summary.receivedQuantity)}/
              {fmtQty(dialog.detail.summary.plannedQuantity)} {dialog.detail.summary.unitName}. Đóng lệnh sẽ chuyển lệnh sang Hoàn
              thành, không xuất NVL / nhập thành phẩm thêm được nữa.
            </span>
          }
          onCancel={() => setDialog(null)}
          onConfirm={(reason) => void doClose(dialog.detail, reason)}
        />
      )}
      {dialog?.kind === 'adjust' && (
        <AdjustNormModal
          detail={dialog.detail}
          onClose={() => setDialog(null)}
          onDone={() => {
            setDialog(null);
            reload();
          }}
        />
      )}
      {(dialog?.kind === 'issue' || dialog?.kind === 'supplement') && (
        <MaterialIssueModal
          productionOrderId={dialog.orderId}
          supplementary={dialog.kind === 'supplement'}
          onClose={() => setDialog(null)}
          onDone={() => {
            setDialog(null);
            reload();
          }}
        />
      )}
      {dialog?.kind === 'approve' && (
        <ApproveCompletionModal
          detail={dialog.detail}
          onClose={() => setDialog(null)}
          onDone={() => {
            setDialog(null);
            reload();
          }}
        />
      )}
    </div>
  );
}
