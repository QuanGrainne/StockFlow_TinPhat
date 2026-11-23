'use client';

// Tab "Nhập – xuất – tồn" (UC-87): tồn đầu, nhập / xuất tách theo nhóm giao dịch, tồn cuối (số lượng + giá trị),
// đối chiếu thẻ kho / tồn hiện tại (chỉ đánh dấu dòng lệch), phân trang phía server, xuất Excel.

import React, { useMemo, useState } from 'react';
import { Alert, Button, Checkbox, Pagination, Table, Tooltip, message } from 'antd';
import type { ColumnsType, ColumnType } from 'antd/es/table';
import { AlertTriangle, FileSpreadsheet } from 'lucide-react';
import type { MovementByGroup, ReportFilter, StockMovementRow } from '../types';
import { fetchAllPages, reportService } from '../services/reportService';
import { useReportQuery } from '../hooks/useReportQuery';
import { useReportPaging } from '../hooks/useReportPaging';
import { useProductCategories } from '../hooks/useProductCategories';
import { formatMoney, formatQuantity } from '../utils/reportFormat';
import { exportReportSheet, type ExcelColumn } from '../utils/exportExcel';

const GROUPS: { key: keyof MovementByGroup; label: string }[] = [
  { key: 'purchase', label: 'Mua / trả NCC' },
  { key: 'sale', label: 'Bán / trả hàng' },
  { key: 'transfer', label: 'Chuyển kho' },
  { key: 'stocktake', label: 'Kiểm kho' },
  { key: 'production', label: 'Sản xuất' },
  { key: 'disposal', label: 'Xuất hủy' },
  { key: 'other', label: 'Khác' },
];

/** Một cột số (dùng chung cho bảng, dòng tổng và file Excel) */
interface ValueSpec {
  key: string;
  title: string;
  kind: 'qty' | 'money';
  get: (r: StockMovementRow) => number;
}

interface SectionSpec {
  title: string;
  values: ValueSpec[];
}

function buildSections(showGroups: boolean): SectionSpec[] {
  const groupSpecs = (dir: 'in' | 'out'): ValueSpec[] =>
    showGroups
      ? GROUPS.map((g) => ({
          key: `${dir}-${g.key}`,
          title: g.label,
          kind: 'qty' as const,
          get: (r: StockMovementRow) => (dir === 'in' ? r.inByGroup : r.outByGroup)[g.key],
        }))
      : [];
  return [
    {
      title: 'Tồn đầu kỳ',
      values: [
        { key: 'openingQuantity', title: 'SL', kind: 'qty', get: (r) => r.openingQuantity },
        { key: 'openingValue', title: 'Giá trị', kind: 'money', get: (r) => r.openingValue },
      ],
    },
    {
      title: 'Nhập trong kỳ',
      values: [
        ...groupSpecs('in'),
        { key: 'inQuantity', title: 'Tổng SL', kind: 'qty', get: (r) => r.inQuantity },
        { key: 'inValue', title: 'Giá trị', kind: 'money', get: (r) => r.inValue },
      ],
    },
    {
      title: 'Xuất trong kỳ',
      values: [
        ...groupSpecs('out'),
        { key: 'outQuantity', title: 'Tổng SL', kind: 'qty', get: (r) => r.outQuantity },
        { key: 'outValue', title: 'Giá trị', kind: 'money', get: (r) => r.outValue },
      ],
    },
    {
      title: 'Tồn cuối kỳ',
      values: [
        { key: 'closingQuantity', title: 'SL', kind: 'qty', get: (r) => r.closingQuantity },
        { key: 'closingValue', title: 'Giá trị', kind: 'money', get: (r) => r.closingValue },
      ],
    },
  ];
}

const fmt = (spec: ValueSpec, v: number) => (spec.kind === 'money' ? formatMoney(v) : formatQuantity(v));

interface StockMovementTabProps {
  filter: ReportFilter;
  ready: boolean;
  scopeLabel: string;
}

export function StockMovementTab({ filter, ready, scopeLabel }: StockMovementTabProps) {
  const categories = useProductCategories();
  const [categoryId, setCategoryId] = useState<number | null>(null);
  const [onlyMismatch, setOnlyMismatch] = useState(false);
  const [showGroups, setShowGroups] = useState(true);
  const [exporting, setExporting] = useState(false);

  const { from, to, warehouseId } = filter;
  const filterKey = `${from}|${to}|${warehouseId ?? ''}|${categoryId ?? ''}|${onlyMismatch}`;
  const { page, pageSize, onChange } = useReportPaging(filterKey);
  const baseParams = { from, to, warehouseId, categoryId, onlyMismatch };

  const { data, loading, error, reload } = useReportQuery(
    `${filterKey}|${page}|${pageSize}`,
    ready,
    () => reportService.getStockMovement({ ...baseParams, page, pageSize }),
    'Không tải được báo cáo nhập – xuất – tồn.'
  );

  const sections = useMemo(() => buildSections(showGroups), [showGroups]);
  const hasCurrent = (data?.items ?? []).some((r) => r.currentQuantity !== null);

  const columns: ColumnsType<StockMovementRow> = useMemo(() => {
    const valueColumn = (spec: ValueSpec, bold = false): ColumnType<StockMovementRow> => ({
      title: spec.title,
      key: spec.key,
      align: 'right',
      width: spec.kind === 'money' ? 130 : 90,
      render: (_v, r) => {
        const v = spec.get(r);
        return (
          <span className={`${bold ? 'font-semibold' : ''} ${v < 0 ? 'text-rose-600' : v === 0 ? 'text-slate-400' : 'text-[#262626]'}`}>
            {fmt(spec, v)}
          </span>
        );
      },
    });

    const cols: ColumnsType<StockMovementRow> = [
      {
        title: 'Kho',
        dataIndex: 'warehouseCode',
        width: 80,
        fixed: 'left',
        render: (v: string, r) => (
          <Tooltip title={r.warehouseName}>
            <span className="text-xs text-[#595959]">{v}</span>
          </Tooltip>
        ),
      },
      {
        title: 'Mã hàng',
        dataIndex: 'productCode',
        width: 120,
        fixed: 'left',
        render: (v: string, r) => (
          <span className="inline-flex items-center gap-1 font-mono text-xs text-[#595959]">
            {(r.isLedgerMismatch || r.isCurrentMismatch) && (
              <AlertTriangle size={13} className="text-rose-600" aria-label="Dòng lệch" />
            )}
            {v}
          </span>
        ),
      },
      { title: 'Tên hàng', dataIndex: 'productName', width: 200 },
      { title: 'ĐVT', dataIndex: 'unitName', width: 70 },
      ...sections.map((s) => ({
        title: s.title,
        children: s.values.map((v) => valueColumn(v, v.key === 'closingQuantity')),
      })),
      {
        title: 'Đối chiếu',
        children: [
          {
            title: 'Thẻ kho cuối kỳ',
            key: 'ledger',
            align: 'right' as const,
            width: 110,
            render: (_v: unknown, r: StockMovementRow) =>
              r.ledgerBalanceAfter === null ? (
                <span className="text-slate-400">—</span>
              ) : (
                <span className={r.isLedgerMismatch ? 'font-semibold text-rose-600' : 'text-[#262626]'}>
                  {formatQuantity(r.ledgerBalanceAfter)}
                </span>
              ),
          },
          ...(hasCurrent
            ? [
                {
                  title: 'Tồn hiện tại',
                  key: 'current',
                  align: 'right' as const,
                  width: 100,
                  render: (_v: unknown, r: StockMovementRow) =>
                    r.currentQuantity === null ? (
                      <span className="text-slate-400">—</span>
                    ) : (
                      <span className={r.isCurrentMismatch ? 'font-semibold text-rose-600' : 'text-[#262626]'}>
                        {formatQuantity(r.currentQuantity)}
                      </span>
                    ),
                },
              ]
            : []),
        ],
      },
    ];
    return cols;
  }, [sections, hasCurrent]);

  const handleExport = async () => {
    setExporting(true);
    try {
      const { items, totals } = await fetchAllPages((paging) => reportService.getStockMovement({ ...baseParams, ...paging }));
      const allSections = buildSections(true);
      const excelColumns: ExcelColumn<StockMovementRow>[] = [
        { header: 'Kho', width: 10, value: (r) => r.warehouseCode },
        { header: 'Mã hàng', width: 14, value: (r) => r.productCode },
        { header: 'Tên hàng', width: 30, value: (r) => r.productName },
        { header: 'ĐVT', width: 8, value: (r) => r.unitName },
        ...allSections.flatMap((s) =>
          s.values.map((v) => ({ header: `${s.title} – ${v.title}`, width: v.kind === 'money' ? 16 : 12, value: v.get }))
        ),
        { header: 'Thẻ kho cuối kỳ', width: 14, value: (r) => r.ledgerBalanceAfter ?? '' },
        { header: 'Tồn hiện tại', width: 12, value: (r) => r.currentQuantity ?? '' },
        {
          header: 'Ghi chú',
          width: 26,
          value: (r) =>
            [r.isLedgerMismatch ? 'Lệch thẻ kho' : '', r.isCurrentMismatch ? 'Lệch tồn hiện tại' : ''].filter(Boolean).join('; '),
        },
      ];
      const categoryName = categories.find((c) => c.categoryId === categoryId)?.categoryName;
      exportReportSheet({
        fileBase: 'BaoCaoNhapXuatTon',
        sheetName: 'Nhập xuất tồn',
        title: 'Báo cáo nhập – xuất – tồn',
        subtitle: `${scopeLabel}${categoryName ? ` – Nhóm hàng: ${categoryName}` : ''}${onlyMismatch ? ' – Chỉ dòng lệch' : ''}`,
        columns: excelColumns,
        rows: items,
        totals,
      });
    } catch (err) {
      message.error(err instanceof Error ? err.message : 'Không xuất được file Excel.');
    } finally {
      setExporting(false);
    }
  };

  const totals = data?.totals;
  const summaryValues = sections.flatMap((s) => s.values);

  return (
    <div className="space-y-3">
      {data && (data.ledgerMismatchCount > 0 || data.currentMismatchCount > 0) && (
        <Alert
          type="warning"
          showIcon
          title={
            <span>
              {data.ledgerMismatchCount > 0 && <>Có {data.ledgerMismatchCount} dòng tồn cuối lệch thẻ kho. </>}
              {data.currentMismatchCount > 0 && <>Có {data.currentMismatchCount} dòng tồn cuối lệch tồn hiện tại. </>}
              Báo cáo chỉ đánh dấu, không sửa dữ liệu.
            </span>
          }
        />
      )}

      <div className="overflow-hidden rounded-lg border border-[#e5e7eb] bg-white shadow-xs">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#e5e7eb] px-4 py-3">
          <div className="flex flex-wrap items-center gap-4">
            <select
              className="h-[32px] rounded-[6px] border border-slate-300 bg-white px-2 text-[13px] text-slate-700 outline-none hover:border-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              value={categoryId ?? ''}
              onChange={(e) => setCategoryId(e.target.value ? Number(e.target.value) : null)}
              aria-label="Nhóm hàng"
            >
              <option value="">Tất cả nhóm hàng</option>
              {categories.map((c) => (
                <option key={c.categoryId} value={c.categoryId}>
                  {c.categoryName}
                </option>
              ))}
            </select>
            <Checkbox checked={showGroups} onChange={(e) => setShowGroups(e.target.checked)}>
              Tách theo loại giao dịch
            </Checkbox>
            <Checkbox checked={onlyMismatch} onChange={(e) => setOnlyMismatch(e.target.checked)}>
              Chỉ dòng lệch
            </Checkbox>
          </div>
          <Button
            icon={<FileSpreadsheet size={15} />}
            onClick={handleExport}
            loading={exporting}
            disabled={!ready || !data || data.totalCount === 0}
          >
            Xuất Excel
          </Button>
        </div>

        {error ? (
          <div className="p-4">
            <Alert
              type="error"
              showIcon
              title="Không tải được báo cáo nhập – xuất – tồn"
              description={error}
              action={<Button size="small" onClick={reload}>Thử lại</Button>}
            />
          </div>
        ) : (
          <>
            <Table<StockMovementRow>
              className="stockflow-reports-table"
              rowKey="key"
              columns={columns}
              dataSource={data?.items ?? []}
              loading={loading}
              pagination={false}
              size="small"
              bordered
              scroll={{ x: 'max-content' }}
              rowClassName={(r) => (r.isLedgerMismatch || r.isCurrentMismatch ? 'bg-rose-50/40 hover:bg-rose-50/70' : '')}
              locale={{ emptyText: onlyMismatch ? 'Không có dòng lệch.' : 'Không có tồn kho hay phát sinh trong kỳ.' }}
              summary={() =>
                totals && data && data.totalCount > 0 ? (
                  <Table.Summary fixed="top">
                    <Table.Summary.Row className="bg-[#f8fafc] font-semibold">
                      <Table.Summary.Cell index={0} colSpan={4}>
                        Tổng cộng ({data.totalCount} dòng)
                      </Table.Summary.Cell>
                      {summaryValues.map((spec, i) => (
                        <Table.Summary.Cell key={spec.key} index={i + 1} align="right">
                          {fmt(spec, spec.get(totals))}
                        </Table.Summary.Cell>
                      ))}
                      <Table.Summary.Cell index={summaryValues.length + 1} colSpan={hasCurrent ? 2 : 1} />
                    </Table.Summary.Row>
                  </Table.Summary>
                ) : null
              }
            />
            <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
              <div className="text-xs text-slate-500">
                Số liệu từ thẻ kho. Giá trị nhập / xuất tính theo giá vốn sau từng giao dịch.
              </div>
              <Pagination
                current={page}
                pageSize={pageSize}
                total={data?.totalCount ?? 0}
                showSizeChanger
                pageSizeOptions={[20, 50, 100, 200]}
                onChange={onChange}
                showTotal={(total, range) => `${range[0]}-${range[1]} trên ${total}`}
              />
            </div>
          </>
        )}
      </div>
    </div>
  );
}
