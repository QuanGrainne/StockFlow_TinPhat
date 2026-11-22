'use client';

// Tab "Doanh thu & lợi nhuận" (UC-88): nhóm theo Ngày / Hàng hóa / Khách hàng, lọc nhóm hàng,
// phân trang phía server, dòng tổng toàn kỳ, xuất Excel (mọi trang).

import React, { useMemo, useState } from 'react';
import { Alert, Button, Pagination, Segmented, Table, message } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { FileSpreadsheet } from 'lucide-react';
import { useProductCategories } from '../hooks/useProductCategories';
import type { ReportFilter, RevenueProfitGroupBy, RevenueProfitRow } from '../types';
import { fetchAllPages, reportService } from '../services/reportService';
import { useReportQuery } from '../hooks/useReportQuery';
import { useReportPaging } from '../hooks/useReportPaging';
import { formatMoney, formatPercent, formatQuantity } from '../utils/reportFormat';
import { excelDate, exportReportSheet, type ExcelColumn } from '../utils/exportExcel';

const GROUP_OPTIONS: { value: RevenueProfitGroupBy; label: string }[] = [
  { value: 'DAY', label: 'Theo ngày' },
  { value: 'PRODUCT', label: 'Theo hàng hóa' },
  { value: 'CUSTOMER', label: 'Theo khách hàng' },
];

const money = (v: number, strong = false) => (
  <span className={`${strong ? 'font-semibold' : 'font-medium'} ${v < 0 ? 'text-rose-600' : 'text-[#262626]'}`}>
    {formatMoney(v)}
  </span>
);

interface RevenueProfitTabProps {
  filter: ReportFilter;
  ready: boolean;
  /** Mô tả kỳ + kho, in ở đầu file Excel */
  scopeLabel: string;
}

export function RevenueProfitTab({ filter, ready, scopeLabel }: RevenueProfitTabProps) {
  const [groupBy, setGroupBy] = useState<RevenueProfitGroupBy>('DAY');
  const [categoryId, setCategoryId] = useState<number | null>(null);
  const categories = useProductCategories();
  const [exporting, setExporting] = useState(false);

  const { from, to, warehouseId } = filter;
  const filterKey = `${from}|${to}|${warehouseId ?? ''}|${categoryId ?? ''}|${groupBy}`;
  const { page, pageSize, onChange } = useReportPaging(filterKey);
  const baseParams = { from, to, warehouseId, groupBy, categoryId };

  const { data, loading, error, reload } = useReportQuery(
    `${filterKey}|${page}|${pageSize}`,
    ready,
    () => reportService.getRevenueProfit({ ...baseParams, page, pageSize }),
    'Không tải được báo cáo doanh thu và lợi nhuận.'
  );

  const firstColumnTitle = groupBy === 'DAY' ? 'Ngày' : groupBy === 'PRODUCT' ? 'Mã hàng' : 'Mã khách';

  const columns: ColumnsType<RevenueProfitRow> = useMemo(() => {
    const first: ColumnsType<RevenueProfitRow> =
      groupBy === 'DAY'
        ? [{ title: 'Ngày', dataIndex: 'code', width: 120, fixed: 'left', render: (v: string) => excelDate(v) }]
        : [
            {
              title: firstColumnTitle,
              dataIndex: 'code',
              width: 140,
              fixed: 'left',
              render: (v: string) => <span className="font-mono text-xs text-[#595959]">{v}</span>,
            },
            {
              title: groupBy === 'PRODUCT' ? 'Tên hàng' : 'Tên khách hàng',
              dataIndex: 'name',
              width: 220,
              render: (v: string) => <span className="text-sm text-[#262626]">{v}</span>,
            },
          ];
    return [
      ...first,
      { title: 'SL bán', dataIndex: 'quantitySold', align: 'right', width: 90, render: (v: number) => formatQuantity(v) },
      { title: 'Doanh thu', dataIndex: 'revenue', align: 'right', width: 140, render: (v: number) => money(v) },
      { title: 'Giảm giá', dataIndex: 'discount', align: 'right', width: 120, render: (v: number) => money(v) },
      { title: 'Hàng trả', dataIndex: 'returnValue', align: 'right', width: 120, render: (v: number) => money(v) },
      { title: 'Doanh thu thuần', dataIndex: 'netRevenue', align: 'right', width: 150, render: (v: number) => money(v, true) },
      { title: 'Giá vốn', dataIndex: 'costOfGoodsSold', align: 'right', width: 140, render: (v: number) => money(v) },
      { title: 'Lợi nhuận gộp', dataIndex: 'grossProfit', align: 'right', width: 150, render: (v: number) => money(v, true) },
      { title: 'Tỷ suất', dataIndex: 'marginPercent', align: 'right', width: 90, render: (v: number) => formatPercent(v) },
    ];
  }, [groupBy, firstColumnTitle]);

  const handleExport = async () => {
    setExporting(true);
    try {
      const { items, totals } = await fetchAllPages((paging) => reportService.getRevenueProfit({ ...baseParams, ...paging }));
      const excelColumns: ExcelColumn<RevenueProfitRow>[] = [
        { header: firstColumnTitle, width: 14, value: (r) => (r.key === 'TOTAL' ? r.code : groupBy === 'DAY' ? excelDate(r.code) : r.code) },
        ...(groupBy === 'DAY' ? [] : [{ header: groupBy === 'PRODUCT' ? 'Tên hàng' : 'Tên khách hàng', width: 32, value: (r: RevenueProfitRow) => r.name }]),
        { header: 'SL bán', width: 10, value: (r) => r.quantitySold },
        { header: 'Doanh thu', width: 16, value: (r) => r.revenue },
        { header: 'Giảm giá', width: 14, value: (r) => r.discount },
        { header: 'Hàng trả', width: 14, value: (r) => r.returnValue },
        { header: 'Doanh thu thuần', width: 16, value: (r) => r.netRevenue },
        { header: 'Giá vốn', width: 16, value: (r) => r.costOfGoodsSold },
        { header: 'Lợi nhuận gộp', width: 16, value: (r) => r.grossProfit },
        { header: 'Tỷ suất (%)', width: 12, value: (r) => r.marginPercent },
      ];
      const groupLabel = GROUP_OPTIONS.find((g) => g.value === groupBy)?.label.toLowerCase() ?? '';
      const categoryName = categories.find((c) => c.categoryId === categoryId)?.categoryName;
      exportReportSheet({
        fileBase: 'BaoCaoDoanhThuLoiNhuan',
        sheetName: 'Doanh thu lợi nhuận',
        title: `Báo cáo doanh thu và lợi nhuận ${groupLabel}`,
        subtitle: `${scopeLabel}${categoryName ? ` – Nhóm hàng: ${categoryName}` : ''} – Tiền chưa VAT`,
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

  return (
    <div className="overflow-hidden rounded-lg border border-[#e5e7eb] bg-white shadow-xs">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#e5e7eb] px-4 py-3">
        <div className="flex flex-wrap items-center gap-3">
          <Segmented<RevenueProfitGroupBy> options={GROUP_OPTIONS} value={groupBy} onChange={setGroupBy} />
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
            title="Không tải được báo cáo doanh thu và lợi nhuận"
            description={error}
            action={<Button size="small" onClick={reload}>Thử lại</Button>}
          />
        </div>
      ) : (
        <>
          <Table<RevenueProfitRow>
            className="stockflow-reports-table"
            rowKey="key"
            columns={columns}
            dataSource={data?.items ?? []}
            loading={loading}
            pagination={false}
            size="middle"
            scroll={{ x: 1200 }}
            locale={{ emptyText: 'Không có phát sinh bán hàng trong kỳ.' }}
            summary={() =>
              totals && data && data.totalCount > 0 ? (
                <Table.Summary fixed="top">
                  <Table.Summary.Row className="bg-[#f8fafc] font-semibold">
                    <Table.Summary.Cell index={0} colSpan={groupBy === 'DAY' ? 1 : 2}>
                      Tổng cộng ({data.totalCount} dòng)
                    </Table.Summary.Cell>
                    {[
                      formatQuantity(totals.quantitySold),
                      formatMoney(totals.revenue),
                      formatMoney(totals.discount),
                      formatMoney(totals.returnValue),
                      formatMoney(totals.netRevenue),
                      formatMoney(totals.costOfGoodsSold),
                      formatMoney(totals.grossProfit),
                      formatPercent(totals.marginPercent),
                    ].map((text, i) => (
                      <Table.Summary.Cell key={i} index={i + 1} align="right">
                        {text}
                      </Table.Summary.Cell>
                    ))}
                  </Table.Summary.Row>
                </Table.Summary>
              ) : null
            }
          />
          <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
            <div className="text-xs text-slate-500">Tiền chưa VAT. Giá vốn theo thẻ kho tại thời điểm bán / trả.</div>
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
  );
}
