"use client";

// Chi tiết Đơn đặt hàng dạng dòng mở rộng — bố cục theo KiotViet:
//   [Thông tin] (+ [Lịch sử hóa đơn] khi đã tạo hóa đơn, [Lịch sử thanh toán] khi có phiếu thu của đơn / hóa đơn của đơn)
//   Thông tin: khách hàng + mã đơn, lưới thông tin (người tạo, ngày đặt, bảng giá, chi nhánh, dự kiến giao, trạng thái),
//   bảng hàng "SL đặt/đã giao", ghi chú + tổng tiền.
//   Thao tác: Hủy, Sao chép, Xuất file | Xử lý đơn hàng, Sửa đơn, Lưu, Kết thúc, In.

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { message } from "antd";
import {
  CheckCheck,
  ClipboardCheck,
  Copy,
  ExternalLink,
  FileDown,
  Loader2,
  Pencil,
  Printer,
  Save,
  Trash2,
} from "lucide-react";
import { ProductCodeLink } from "@/components/links/EntityLinks";
import { formatDateTimeVN } from "@/lib/utils/date";
import { documentLinkHref } from "@/lib/navigation/documentLink";
import { invoiceLinkHref } from "@/features/orders";
import { salesBookingService } from "../services/salesBookingService";
import type { SalesBookingDetail, SalesBookingStatus } from "../types";
import {
  BOOKING_STATUS,
  exportBookingDetailToXLSX,
  isBookingOpen,
  PAY_METHOD_LABEL,
} from "../utils/salesBookingUtils";
import { printSalesBooking } from "../utils/printSalesBooking";

const fmt = (v: number) => Math.round(v || 0).toLocaleString("vi-VN");
const qty = (v: number) =>
  (v || 0).toLocaleString("vi-VN", { maximumFractionDigits: 2 });

/** Ghi chú lưu kèm thẻ "[Bảng giá: ...]" từ màn Bán hàng → tách ra để hiển thị riêng */
const PRICE_BOOK_TAG = /\[Bảng giá:\s*([^\]]+)\]\s*/;
const splitNotes = (raw?: string | null) => {
  const m = (raw ?? "").match(PRICE_BOOK_TAG);
  return {
    priceBook: m?.[1]?.trim() ?? null,
    text: (raw ?? "").replace(PRICE_BOOK_TAG, "").trim(),
  };
};
/** Ngày giờ API (giờ VN) → giá trị ô datetime-local */
const toLocalInput = (v?: string | null) => {
  const m = v?.match(/^(\d{4}-\d{2}-\d{2})[T ](\d{2}:\d{2})/);
  return m ? `${m[1]}T${m[2]}` : "";
};

const PAYMENT_STATUS: Record<string, { label: string; cls: string }> = {
  COMPLETED: {
    label: "Đã thanh toán",
    cls: "bg-[#e6f8ec] text-[#16a34a] border-[#bbf7d0]",
  },
  CANCELLED: {
    label: "Đã hủy",
    cls: "bg-[#fef2f2] text-[#fb2c36] border-[#fecaca]",
  },
};

const INVOICE_STATUS: Record<string, { label: string; cls: string }> = {
  COMPLETED: {
    label: "Hoàn thành",
    cls: "bg-[#e6f8ec] text-[#16a34a] border-[#bbf7d0]",
  },
  CANCELLED: {
    label: "Đã hủy",
    cls: "bg-[#fef2f2] text-[#fb2c36] border-[#fecaca]",
  },
};

const theadCls =
  "bg-[#f7f8f9] border-b border-slate-200 text-[12px] font-semibold text-[#677484]";
const labelCls = "w-28 shrink-0 text-[#677484]";
const fieldCls =
  "w-full h-8 px-2.5 rounded-[8px] border border-slate-300 bg-white text-[13px] focus:outline-none focus:border-[#0070f4] disabled:bg-[#f7f8f9] disabled:text-[#677484]";
const textBtnCls =
  "inline-flex items-center gap-1.5 px-2.5 h-8 rounded-[8px] text-[13px] font-semibold text-[#15171a] hover:bg-[#f7f8f9] transition cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed";
const outlineBtnCls =
  "inline-flex items-center gap-1.5 px-3 h-8 rounded-[8px] border border-slate-300 bg-white hover:bg-[#f7f8f9] text-[#15171a] text-[13px] font-semibold transition cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed";
const primaryBtnCls =
  "inline-flex items-center gap-1.5 px-3.5 h-8 rounded-[8px] bg-[#0070f4] hover:bg-[#005ac3] text-white text-[13px] font-semibold shadow-xs transition cursor-pointer disabled:opacity-60";

type ConfirmKind = "cancel" | "finish";
type TabKey = "info" | "invoices" | "payments";

interface Props {
  orderId: number;
  colSpan: number;
  onClose: () => void;
  onChanged: () => void;
}

export default function SalesBookingExpandedRow({
  orderId,
  colSpan,
  onClose,
  onChanged,
}: Props) {
  const router = useRouter();
  const [tab, setTab] = useState<TabKey>("info");
  const [reloadTick, setReloadTick] = useState(0);
  const key = `${orderId}#${reloadTick}`;
  const [result, setResult] = useState<{
    key: string;
    data: SalesBookingDetail | null;
  }>({ key: "", data: null });
  const [confirm, setConfirm] = useState<ConfirmKind | null>(null);
  const [busy, setBusy] = useState(false);
  /** Hủy đơn có tiền trả trước: giữ tiền làm khoản khách trả trước (true) hay hoàn tiền (false) */
  const [keepDeposit, setKeepDeposit] = useState(false);
  // Các trường sửa nhanh (Lưu)
  const [notes, setNotes] = useState("");
  const [deliveryDate, setDeliveryDate] = useState("");
  const [status, setStatus] = useState<SalesBookingStatus>("DRAFT");
  const [saving, setSaving] = useState(false);
  const loading = result.key !== key;

  useEffect(() => {
    let alive = true;
    salesBookingService
      .getBooking(orderId)
      .then((data) => {
        if (!alive) return;
        setResult({ key: `${orderId}#${reloadTick}`, data });
        setNotes(splitNotes(data.notes).text);
        setDeliveryDate(toLocalInput(data.deliveryDate));
        setStatus(data.status);
      })
      .catch((err: unknown) => {
        if (!alive) return;
        message.error(
          err instanceof Error ? err.message : "Không tải được đơn đặt hàng.",
        );
        setResult({ key: `${orderId}#${reloadTick}`, data: null });
      });
    return () => {
      alive = false;
    };
  }, [orderId, reloadTick]);

  // Xử lý đơn ở tab Bán hàng khác → quay lại tab này thì tải lại chi tiết đơn
  useEffect(() => {
    const onFocus = () => setReloadTick((t) => t + 1);
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, []);

  const b = result.data;

  const reload = () => {
    setReloadTick((t) => t + 1);
    onChanged();
  };

  const runConfirm = async () => {
    if (!b || !confirm) return;
    setBusy(true);
    try {
      if (confirm === "cancel")
        await salesBookingService.cancelBooking(
          b.orderId,
          b.paidAmount > 0 && keepDeposit,
        );
      else await salesBookingService.finishBooking(b.orderId);
      message.success(
        confirm === "cancel"
          ? `Đã hủy đơn ${b.orderCode}`
          : `Đã kết thúc đơn ${b.orderCode}`,
      );
      setConfirm(null);
      reload();
    } catch (err) {
      message.error(err instanceof Error ? err.message : "Thao tác thất bại.");
    } finally {
      setBusy(false);
    }
  };

  /** Lưu: ghi chú, dự kiến giao, và Phiếu tạm → Đã xác nhận */
  const handleSave = async () => {
    if (!b) return;
    setSaving(true);
    try {
      const tag = splitNotes(b.notes).priceBook;
      const fullNotes = [tag ? `[Bảng giá: ${tag}]` : "", notes.trim()]
        .filter(Boolean)
        .join(" ");
      await salesBookingService.updateInfo(b.orderId, {
        notes: fullNotes || null,
        deliveryDate: deliveryDate
          ? new Date(deliveryDate).toISOString()
          : null,
      });
      if (b.status === "DRAFT" && status === "CONFIRMED")
        await salesBookingService.confirmBooking(b.orderId);
      message.success(`Đã lưu đơn ${b.orderCode}`);
      reload();
    } catch (err) {
      message.error(
        err instanceof Error ? err.message : "Không lưu được đơn đặt hàng.",
      );
    } finally {
      setSaving(false);
    }
  };

  const wrap = (body: React.ReactNode) => (
    <tr>
      <td colSpan={colSpan} className="p-0 bg-white">
        <div className="cursor-default border-x border-b-2 border-[#0070f4] bg-white text-[13px] text-[#15171a] animate-in fade-in duration-150">
          {body}
        </div>
      </td>
    </tr>
  );

  if (loading && !b) {
    return wrap(
      <div className="p-8 flex items-center justify-center text-slate-400 gap-2">
        <Loader2 size={16} className="animate-spin text-[#0070f4]" />
        <span className="text-xs">Đang tải đơn đặt hàng...</span>
      </div>,
    );
  }
  if (!b)
    return wrap(
      <div className="p-6 text-center text-xs text-[#677484]">
        Không tìm thấy đơn đặt hàng.
      </div>,
    );

  const hasDelivery = b.invoices.some((i) => i.status === "COMPLETED");
  const isOpen = isBookingOpen(b.status);
  const canEdit =
    (b.status === "DRAFT" || b.status === "CONFIRMED") && !hasDelivery;
  const canCancel = isOpen && !hasDelivery;
  const canSaveInfo = b.status !== "CANCELLED";
  const priceBook = splitNotes(b.notes).priceBook ?? "Bảng giá chung";
  const totalQty = b.items.reduce((s, i) => s + i.quantity, 0);
  const tabs: { key: TabKey; label: string }[] = [
    { key: "info", label: "Thông tin" },
    ...(b.invoices.length > 0
      ? [{ key: "invoices" as const, label: "Lịch sử hóa đơn" }]
      : []),
    ...(b.payments.length > 0
      ? [{ key: "payments" as const, label: "Lịch sử thanh toán" }]
      : []),
  ];
  /** Hóa đơn giao hàng còn hiệu lực của đơn (Mã hóa đơn) */
  const invoiceCodes = b.invoices.filter((i) => i.status !== "CANCELLED");

  return wrap(
    <>
      <div className="border-b border-slate-200 px-5 flex items-center gap-7">
        {tabs.map((t) => (
          <button
            key={t.key}
            type="button"
            onClick={() => setTab(t.key)}
            className={`py-2.5 text-[13px] transition cursor-pointer border-b-2 -mb-px ${
              tab === t.key
                ? "border-[#0070f4] text-[#0070f4] font-semibold"
                : "border-transparent text-[#15171a] hover:text-[#0070f4]"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === "info" && (
        <>
          <div className="px-5 py-4 space-y-5">
            {/* Khách hàng + mã đơn + trạng thái | chi nhánh */}
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-center gap-3 min-w-0">
                <h3 className="text-[16px] font-bold truncate">
                  {b.partnerCode} - {b.partnerName}
                </h3>
                <Link
                  href={documentLinkHref("/customers", {
                    code: b.partnerCode,
                    id: b.partnerId,
                  })}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[#0070f4] hover:text-[#005ac3] shrink-0"
                  title={`Xem khách hàng ${b.partnerName}`}
                >
                  <ExternalLink size={16} />
                </Link>
                <span className="text-[#677484] shrink-0">{b.orderCode}</span>
                <span
                  className={`shrink-0 px-2.5 py-0.5 rounded-full text-[11px] font-semibold border ${BOOKING_STATUS[b.status]?.cls ?? ""}`}
                >
                  {BOOKING_STATUS[b.status]?.label ?? b.status}
                </span>
              </div>
              <span className="shrink-0 text-[#15171a]">{b.warehouseName}</span>
            </div>

            {b.mergedIntoCode && (
              <div className="px-3 py-2 rounded-[8px] bg-[#fffbeb] border border-[#fde68a]">
                Đơn này đã được gộp vào <strong>{b.mergedIntoCode}</strong>
              </div>
            )}
            {b.mergedFromCodes.length > 0 && (
              <div className="px-3 py-2 rounded-[8px] bg-[#e6f1fe] border border-[#0070f4]/25">
                Gộp từ các đơn: <strong>{b.mergedFromCodes.join(", ")}</strong>
              </div>
            )}

            {/* Lưới thông tin */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-x-8 gap-y-3">
              <div className="flex items-center gap-3 min-h-8">
                <span className={labelCls}>Người tạo:</span>
                <span className="truncate">{b.createdByName || "—"}</span>
              </div>
              <div className="flex items-center gap-3 min-h-8">
                <span className={labelCls}>Bảng giá:</span>
                <span className="truncate">{priceBook}</span>
              </div>
              <div className="flex items-center gap-3 min-h-8">
                <span className={labelCls}>Ngày đặt:</span>
                <span>{formatDateTimeVN(b.orderDate)}</span>
              </div>
              <div className="flex items-center gap-3 min-h-8">
                <span className={labelCls}>Mã hóa đơn:</span>
                {invoiceCodes.length > 0 ? (
                  <span className="flex flex-wrap gap-x-2 min-w-0">
                    {invoiceCodes.map((inv, i) => (
                      <React.Fragment key={inv.orderId}>
                        {i > 0 && <span className="text-[#677484]">,</span>}
                        <Link
                          href={invoiceLinkHref(inv)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-[#0070f4] hover:underline"
                        >
                          {inv.orderCode}
                        </Link>
                      </React.Fragment>
                    ))}
                  </span>
                ) : (
                  <span className="text-[#677484]">Chưa có</span>
                )}
              </div>
              <div className="flex items-center gap-3 min-h-8">
                <span className={labelCls}>Chi nhánh xử lý:</span>
                <span className="truncate">{b.warehouseName}</span>
              </div>
              <div className="flex items-center gap-3 min-h-8">
                <span className={labelCls}>Dự kiến giao:</span>
                {isOpen ? (
                  <input
                    type="datetime-local"
                    value={deliveryDate}
                    onChange={(e) => setDeliveryDate(e.target.value)}
                    className={`${fieldCls} cursor-pointer`}
                  />
                ) : (
                  <span>
                    {b.deliveryDate ? formatDateTimeVN(b.deliveryDate) : "—"}
                  </span>
                )}
              </div>
              {/* Phiếu tạm → Đã xác nhận; các trạng thái khác do giao hàng / Kết thúc / Hủy quyết định */}
              {b.status === "DRAFT" && (
                <div className="flex items-center gap-3">
                  <span className={labelCls}>Trạng thái:</span>
                  <select
                    value={status}
                    onChange={(e) =>
                      setStatus(e.target.value as SalesBookingStatus)
                    }
                    className={`${fieldCls} cursor-pointer`}
                  >
                    {(["DRAFT", "CONFIRMED"] as SalesBookingStatus[]).map(
                      (s) => (
                        <option key={s} value={s}>
                          {BOOKING_STATUS[s].label}
                        </option>
                      ),
                    )}
                  </select>
                </div>
              )}
            </div>

            {/* Hàng đặt: SL đặt / đã giao */}
            <div className="rounded-[8px] border border-slate-200 overflow-hidden">
              <table className="w-full text-left border-collapse">
                <thead className={theadCls}>
                  <tr>
                    <th className="py-2 px-3 w-32">Mã hàng</th>
                    <th className="py-2 px-3">Tên hàng</th>
                    <th
                      className="py-2 px-3 w-28 text-right"
                      title="Số lượng đặt / đã giao"
                    >
                      Số lượng
                    </th>
                    <th className="py-2 px-3 w-28 text-right">Đơn giá</th>
                    <th className="py-2 px-3 w-24 text-right">Giảm giá</th>
                    <th className="py-2 px-3 w-28 text-right">Giá bán</th>
                    <th className="py-2 px-3 w-32 text-right">Thành tiền</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-[13px]">
                  {b.items.map((it) => (
                    <tr key={it.orderItemId} className="hover:bg-[#f7f8f9]">
                      <td className="py-2.5 px-3 font-medium">
                        <ProductCodeLink
                          code={it.productCode}
                          productId={it.productId}
                        />
                      </td>
                      <td className="py-2.5 px-3">
                        {it.productName}
                        <span className="text-[#677484]"> ({it.unit})</span>
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono whitespace-nowrap">
                        {qty(it.quantity)}/
                        <span
                          className={
                            it.deliveredQuantity >= it.quantity
                              ? "text-[#0070f4]"
                              : it.deliveredQuantity > 0
                                ? "text-[#d97706]"
                                : "text-[#fb2c36]"
                          }
                        >
                          {qty(it.deliveredQuantity)}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono">
                        {fmt(it.originalPrice)}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono">
                        {fmt(Math.max(0, it.originalPrice - it.unitPrice))}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono">
                        {fmt(it.unitPrice)}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono font-semibold">
                        {fmt(it.lineTotal)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Ghi chú + tổng tiền */}
            <div className="grid grid-cols-1 gap-6 md:grid-cols-12">
              <textarea
                rows={4}
                maxLength={500}
                value={notes}
                disabled={!canSaveInfo}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Ghi chú..."
                className="w-full resize-none rounded-[8px] border border-slate-300 p-2.5 text-[13px] focus:outline-none focus:border-[#0070f4] placeholder:text-[#677484] disabled:bg-[#f7f8f9] md:col-span-8"
              />
              <dl className="space-y-2 md:col-span-4">
                <div className="flex justify-between">
                  <dt className="text-[#677484]">
                    Tổng tiền hàng ({qty(totalQty)})
                  </dt>
                  <dd className="font-mono">{fmt(b.subTotal)}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-[#677484]">Giảm giá phiếu đặt</dt>
                  <dd className="font-mono">{fmt(b.discountAmount)}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="font-semibold">Tổng cộng</dt>
                  <dd className="font-mono font-semibold">
                    {fmt(b.totalAmount)}
                  </dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-[#677484]">Khách đã trả</dt>
                  <dd className="font-mono text-[#16a34a]">
                    {fmt(b.customerPaidAmount ?? b.paidAmount)}
                  </dd>
                </div>
              </dl>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 px-5 py-2.5">
            <div className="flex items-center gap-1">
              <button
                type="button"
                disabled={!canCancel}
                onClick={() => {
                  setKeepDeposit(false);
                  setConfirm("cancel");
                }}
                className={`${textBtnCls} !text-[#fb2c36]`}
              >
                <Trash2 size={14} /> Hủy
              </button>
              <button
                type="button"
                onClick={() => router.push(`/pos?copyBooking=${b.orderId}`)}
                className={textBtnCls}
              >
                <Copy size={14} /> Sao chép
              </button>
              <button
                type="button"
                onClick={() => exportBookingDetailToXLSX(b)}
                className={textBtnCls}
              >
                <FileDown size={14} /> Xuất file
              </button>
            </div>
            <div className="flex items-center gap-2">
              {isOpen && (
                <button
                  type="button"
                  onClick={() =>
                    window.open(`/pos?bookingInvoice=${b.orderId}`, "_blank", "noopener,noreferrer")
                  }
                  title="Mở màn Bán hàng với hàng còn lại của đơn để giao và thanh toán"
                  className={primaryBtnCls}
                >
                  <ClipboardCheck size={14} /> Xử lý đơn hàng
                </button>
              )}
              {canEdit && (
                <button
                  type="button"
                  onClick={() => router.push(`/pos?booking=${b.orderId}`)}
                  className={outlineBtnCls}
                >
                  <Pencil size={14} /> Sửa đơn
                </button>
              )}
              <button
                type="button"
                disabled={!canSaveInfo || saving}
                onClick={() => void handleSave()}
                className={outlineBtnCls}
              >
                {saving ? (
                  <Loader2 size={14} className="animate-spin" />
                ) : (
                  <Save size={14} />
                )}{" "}
                Lưu
              </button>
              {b.status === "DELIVERING" && (
                <button
                  type="button"
                  onClick={() => setConfirm("finish")}
                  className={outlineBtnCls}
                >
                  <CheckCheck size={14} /> Kết thúc
                </button>
              )}
              <button
                type="button"
                onClick={() => printSalesBooking(b, notes.trim())}
                className={outlineBtnCls}
              >
                <Printer size={14} /> In
              </button>
              <button type="button" onClick={onClose} className={outlineBtnCls}>
                Đóng
              </button>
            </div>
          </div>
        </>
      )}

      {tab === "invoices" && (
        <div className="px-5 py-4">
          <div className="rounded-[8px] border border-slate-200 overflow-hidden">
            <table className="w-full text-left border-collapse">
              <thead className={theadCls}>
                <tr>
                  <th className="py-2 px-3 w-40">Mã hóa đơn</th>
                  <th className="py-2 px-3 w-40">Thời gian</th>
                  <th className="py-2 px-3 w-48">Người tạo</th>
                  <th className="py-2 px-3 w-36">Giá trị</th>
                  <th className="py-2 px-3" />
                  <th className="py-2 px-3 w-32">Trạng thái</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-[13px]">
                {b.invoices.map((inv) => {
                  const st = INVOICE_STATUS[inv.status] ?? {
                    label: inv.status,
                    cls: "bg-slate-50 text-slate-600 border-slate-200",
                  };
                  return (
                    <tr key={inv.orderId} className="hover:bg-[#f7f8f9]">
                      <td className="py-2.5 px-3 font-medium">
                        <Link
                          href={invoiceLinkHref(inv)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-[#0070f4] hover:underline"
                        >
                          {inv.orderCode}
                        </Link>
                      </td>
                      <td className="py-2.5 px-3 whitespace-nowrap">
                        {formatDateTimeVN(inv.orderDate)}
                      </td>
                      <td className="py-2.5 px-3">
                        {inv.createdByName || "—"}
                      </td>
                      <td className="py-2.5 px-3 font-mono">
                        {fmt(inv.totalAmount)}
                      </td>
                      <td className="py-2.5 px-3" />
                      <td className="py-2.5 px-3">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[11px] font-semibold border ${st.cls}`}
                        >
                          {st.label}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {tab === "payments" && (
        <div className="px-5 py-4">
          <div className="rounded-[8px] border border-slate-200 overflow-hidden">
            <table className="w-full text-left border-collapse">
              <thead className={theadCls}>
                <tr>
                  <th className="py-2 px-3 w-44">Mã phiếu thu</th>
                  <th className="py-2 px-3 w-40">Thời gian</th>
                  <th className="py-2 px-3">Người tạo</th>
                  <th className="py-2 px-3 w-36">Phương thức</th>
                  <th className="py-2 px-3 w-32">Trạng thái</th>
                  <th className="py-2 px-3 w-36 text-right">Tiền thu/chi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-[13px]">
                {b.payments.map((p) => {
                  const st = PAYMENT_STATUS[p.status] ?? {
                    label: p.status,
                    cls: "bg-slate-50 text-slate-600 border-slate-200",
                  };
                  return (
                    <tr key={p.code} className="hover:bg-[#f7f8f9]">
                      <td className="py-2.5 px-3 font-medium text-[#0070f4]">
                        {p.code}
                      </td>
                      <td className="py-2.5 px-3 whitespace-nowrap">
                        {formatDateTimeVN(p.date)}
                      </td>
                      <td className="py-2.5 px-3">{p.createdByName || "—"}</td>
                      <td className="py-2.5 px-3">
                        {PAY_METHOD_LABEL[p.paymentMethod ?? ""] ??
                          p.paymentMethod ??
                          "—"}
                      </td>
                      <td className="py-2.5 px-3">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[11px] font-semibold border ${st.cls}`}
                        >
                          {st.label}
                        </span>
                      </td>
                      <td
                        className={`py-2.5 px-3 text-right font-mono ${p.status === "CANCELLED" ? "line-through text-[#677484]" : ""}`}
                      >
                        {fmt(p.amount)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {confirm && (
        <div className="fixed inset-0 z-[100] bg-black/50 flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-white rounded-xl shadow-2xl">
            <div className="px-5 pt-4 pb-2 text-[16px] font-bold">
              {confirm === "cancel"
                ? "Hủy đơn đặt hàng"
                : "Kết thúc đơn đặt hàng"}
            </div>
            <div className="px-5 pb-4">
              {confirm === "cancel" ? (
                <>
                  Bạn có chắc muốn hủy đơn <strong>{b.orderCode}</strong>? Hàng
                  đang giữ cho đơn sẽ được nhả ra để bán.
                  {b.paidAmount > 0 && (
                    <div className="mt-3 space-y-2">
                      <div>
                        Khách đã trả trước <strong>{fmt(b.paidAmount)}</strong>{" "}
                        cho đơn này. Xử lý khoản tiền này:
                      </div>
                      <label className="flex items-start gap-2 cursor-pointer">
                        <input
                          type="radio"
                          name="booking-deposit"
                          checked={!keepDeposit}
                          onChange={() => setKeepDeposit(false)}
                          className="mt-0.5 h-4 w-4 accent-[#0070f4] cursor-pointer"
                        />
                        <span>
                          <strong>Hoàn tiền cho khách</strong>
                          <span className="block text-[12px] text-[#677484]">
                            Hủy phiếu thu tiền trả trước, công nợ khách tăng
                            lại.
                          </span>
                        </span>
                      </label>
                      <label className="flex items-start gap-2 cursor-pointer">
                        <input
                          type="radio"
                          name="booking-deposit"
                          checked={keepDeposit}
                          onChange={() => setKeepDeposit(true)}
                          className="mt-0.5 h-4 w-4 accent-[#0070f4] cursor-pointer"
                        />
                        <span>
                          <strong>Giữ làm tiền khách trả trước</strong>
                          <span className="block text-[12px] text-[#677484]">
                            Giữ phiếu thu trong công nợ của khách (khách đang
                            trả trước), trừ vào các hóa đơn sau.
                          </span>
                        </span>
                      </label>
                    </div>
                  )}
                </>
              ) : (
                <>
                  Đơn <strong>{b.orderCode}</strong> chuyển sang Hoàn thành và
                  không giao phần hàng còn lại (nhả hàng đang giữ).
                  {b.remainingDeposit > 0 && (
                    <div className="mt-2 text-[#677484]">
                      Tiền trả trước còn dư {fmt(b.remainingDeposit)} được giữ
                      trong công nợ của khách.
                    </div>
                  )}
                </>
              )}
            </div>
            <div className="flex justify-end gap-2 px-5 py-3 border-t border-slate-200">
              <button
                type="button"
                disabled={busy}
                onClick={() => setConfirm(null)}
                className={outlineBtnCls}
              >
                Bỏ qua
              </button>
              <button
                type="button"
                disabled={busy}
                onClick={() => void runConfirm()}
                className={primaryBtnCls}
              >
                {busy && <Loader2 size={14} className="animate-spin" />} Đồng ý
              </button>
            </div>
          </div>
        </div>
      )}
    </>,
  );
}
