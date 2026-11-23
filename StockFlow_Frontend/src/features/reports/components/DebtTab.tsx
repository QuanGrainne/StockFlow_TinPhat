'use client';

// Tab "Công nợ" (UC-86): Phải thu khách hàng / Phải trả nhà cung cấp theo kỳ – nợ đầu kỳ, phát sinh tăng / giảm,
// nợ cuối kỳ, hạn mức, số ngày nợ, nhóm tuổi nợ. Không lọc theo kho. Phân trang phía server, xuất Excel.

import React, { useMemo, useState } from 'react';
import { Alert, Button, Input, Pagination, Segmented, Table, Tag, message } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { FileSpreadsheet, Search } from 'lucide-react';
import type { DebtAgingBucket, DebtReportRow, DebtReportType, ReportFilter } from '../types';
import { fetchAllPages, reportService } from '../services/reportService';
import { useReportQuery } from '../hooks/useReportQuery';
import { useReportPaging } from '../hooks/useReportPaging';
import { formatMoney } from '../utils/reportFormat';
import { excelDate, exportReportSheet, type ExcelColumn } from '../utils/exportExcel';

const TYPE_OPTIONS: { value: DebtReportType; label: string }[] = [
  { value: 'RECEIVABLE', label: 'Phải thu khách hàng' },
  { value: 'PAYABLE', label: 'Phải trả nhà cung cấp' },
];

const AGING: Record<DebtAgingBucket, { label: string; color: string }> = {
  '0-30': { label: '0–30 ngày', color: 'default' },
  '31-60': { label: '31–60 ngày', color: 'gold' },
  '61-90': { label: '61–90 ngày', color: 'orange' },
  '90+': { label: '> 90 ngày', color: 'red' },
};

const money = (v: number, strong = false) => (
  <span className={`${strong ? 'font-semibold' : 'font-medium'} ${v < 0 ? 'text-rose-600' : v === 0 ? 'text-slate-400' : 'text-[#262626]'}`}>
    {formatMoney(v)}
  </span>
);

interface DebtTabProps {
  filter: ReportFilter;
  ready: boolean;
}

export function DebtTab({ filter, ready }: DebtTabProps) {
  const [type, setType] = useState<DebtReportType>('RECEIVABLE');
  const [searchText, setSearchText] = useState('');
  const [search, setSearch] = useState('');
  const [exporting, setExporting] = useState(false);
  const receivable = type === 'RECEIVABLE';

  const { from, to } = filter;
  const filterKey = `${from}|${to}|${type}|${search}`;
  const { page, pageSize, onChange } = useReportPaging(filterKey);
  const baseParams = { from, to, type, search: search || undefined };

  const { data, loading, error, reload } = useReportQuery(
    `${filterKey}|${page}|${pageSize}`,
    ready,
    () => reportService.getDebts({ ...baseParams, page, pageSize }),
    'Không tải được báo cáo công nợ.'
  );

  const partnerLabel = receivable ? 'khách hàng' : 'nhà cung cấp';

  const columns: ColumnsType<DebtReportRow> = useMemo(() => {
    const cols: ColumnsType<DebtReportRow> = [
      {
        title: receivable ? 'Mã khách' : 'Mã NCC',
        dataIndex: 'code',
        width: 130,
        fixed: 'left',
        render: (v: string) => <span className="font-mono text-xs text-[#595959]">{v}</span>,
      },
      {
        title: receivable ? 'Tên khách hàng' : 'Tên nhà cung cấp',
        dataIndex: 'name',
        width: 220,
        render: (v: string, r) => (
          <div>
            <div className="text-sm text-[#262626]">{v}</div>
            {r.phone && <div className="text-xs text-[#8c8c8c]">{r.phone}</div>}
          </div>
        ),
      },
      { title: 'Nợ đầu kỳ', dataIndex: 'opening', align: 'right', width: 140, render: (v: number) => money(v) },
      { title: 'Phát sinh tăng', dataIndex: 'increase', align: 'right', width: 140, render: (v: number) => money(v) },
      { title: 'Phát sinh giảm', dataIndex: 'decrease', align: 'right', width: 140, render: (v: number) => money(v) },
      { title: 'Nợ cuối kỳ', dataIndex: 'closing', align: 'right', width: 150, render: (v: number) => money(v, true) },
    ];
    if (!receivable) return cols;
    return [
      ...cols,
      {
        title: 'Hạn mức',
        dataIndex: 'creditLimit',
        align: 'right',
        width: 140,
        render: (v: number | null, r) =>
          !v ? (
            <span className="text-slate-400">—</span>
          ) : (
            <span className={r.closing > v ? 'font-semibold text-rose-600' : 'text-[#262626]'} title={r.closing > v ? 'Vượt hạn mức' : undefined}>
              {formatMoney(v)}
            </span>
          ),
      },
      {
        title: 'Số ngày nợ',
        dataIndex: 'debtDays',
        align: 'right',
        width: 100,
        render: (v: number | null) => (v === null ? <span className="text-slate-400">—</span> : v),
      },
      {
        title: 'Tuổi nợ',
        dataIndex: 'agingBucket',
        width: 120,
        render: (v: DebtAgingBucket | null) => (v ? <Tag color={AGING[v].color}>{AGING[v].label}</Tag> : <span className="text-slate-400">—</span>),
      },
    ];
  }, [receivable]);

  const handleExport = async () => {
    setExporting(true);
    try {
      const { items, totals } = await fetchAllPages((paging) => reportService.getDebts({ ...baseParams, ...paging }));
      const excelColumns: ExcelColumn<DebtReportRow>[] = [
        { header: receivable ? 'Mã khách' : 'Mã NCC', width: 14, value: (r) => r.code },
        { header: receivable ? 'Tên khách hàng' : 'Tên nhà cung cấp', width: 32, value: (r) => r.name },
        { header: 'Điện thoại', width: 14, value: (r) => r.phone ?? '' },
        { header: 'Nợ đầu kỳ', width: 16, value: (r) => r.opening },
        { header: 'Phát sinh tăng', width: 16, value: (r) => r.increase },
        { header: 'Phát sinh giảm', width: 16, value: (r) => r.decrease },
        { header: 'Nợ cuối kỳ', width: 16, value: (r) => r.closing },
        ...(receivable
          ? [
              { header: 'Hạn mức', width: 16, value: (r: DebtReportRow) => r.creditLimit ?? '' },
              { header: 'Số ngày nợ', width: 12, value: (r: DebtReportRow) => r.debtDays ?? '' },
              { header: 'Tuổi nợ', width: 14, value: (r: DebtReportRow) => (r.agingBucket ? AGING[r.agingBucket].label : '') },
            ]
          : []),
      ];
      exportReportSheet({
        fileBase: receivable ? 'BaoCaoCongNoPhaiThu' : 'BaoCaoCongNoPhaiTra',
        sheetName: receivable ? 'Phải thu' : 'Phải trả',
        title: `Báo cáo công nợ ${receivable ? 'phải thu khách hàng' : 'phải trả nhà cung cấp'}`,
        subtitle: `Từ ${excelDate(from)} đến ${excelDate(to)} – Toàn công ty (không lọc theo kho)${search ? ` – Tìm: ${search}` : ''}`,
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
  const daysNote =
    data?.debtDaysFrom === 'LAST_TRANSACTION'
      ? 'Số ngày nợ đếm từ giao dịch gần nhất đến hôm nay (theo Thiết lập cảnh báo công nợ).'
      : 'Số ngày nợ đếm từ hóa đơn còn nợ sớm nhất đến hôm nay (theo Thiết lập cảnh báo công nợ).';

  return (
    <div className="space-y-3">
      {receivable && data && data.aging.length > 0 && (
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {data.aging.map((a) => (
            <div key={a.bucket} className="rounded-lg border border-[#e5e7eb] bg-white px-4 py-3 shadow-xs">
              <div className="flex items-center justify-between">
                <span className="text-xs text-[#595959]">Tuổi nợ {AGING[a.bucket].label}</span>
                <Tag color={AGING[a.bucket].color} className="!mr-0">
                  {a.count} khách
                </Tag>
              </div>
              <div className="mt-1 text-lg font-semibold text-[#262626]">{formatMoney(a.amount)}</div>
            </div>
          ))}
        </div>
      )}

      <div className="overflow-hidden rounded-lg border border-[#e5e7eb] bg-white shadow-xs">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#e5e7eb] px-4 py-3">
          <div className="flex flex-wrap items-center gap-3">
            <Segmented<DebtReportType> options={TYPE_OPTIONS} value={type} onChange={setType} />
            <Input
              allowClear
              prefix={<Search size={14} className="text-[#8c8c8c]" />}
              placeholder={`Tìm theo mã, tên, điện thoại ${partnerLabel} (Enter)`}
              className="w-full sm:w-[320px]"
              value={searchText}
              onChange={(e) => {
                setSearchText(e.target.value);
                if (!e.target.value) setSearch('');
              }}
              onPressEnter={() => setSearch(searchText.trim())}
            />
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
              title="Không tải được báo cáo công nợ"
              description={error}
              action={<Button size="small" onClick={reload}>Thử lại</Button>}
            />
          </div>
        ) : (
          <>
            <Table<DebtReportRow>
              className="stockflow-reports-table"
              rowKey="partnerId"
              columns={columns}
              dataSource={data?.items ?? []}
              loading={loading}
              pagination={false}
              size="middle"
              scroll={{ x: receivable ? 1300 : 980 }}
              locale={{ emptyText: `Không có ${partnerLabel} còn nợ hay phát sinh công nợ trong kỳ.` }}
              summary={() =>
                totals && data && data.totalCount > 0 ? (
                  <Table.Summary fixed="top">
                    <Table.Summary.Row className="bg-[#f8fafc] font-semibold">
                      <Table.Summary.Cell index={0} colSpan={2}>
                        Tổng cộng ({data.totalCount} {partnerLabel})
                      </Table.Summary.Cell>
                      {[totals.opening, totals.increase, totals.decrease, totals.closing].map((v, i) => (
                        <Table.Summary.Cell key={i} index={i + 2} align="right">
                          {formatMoney(v)}
                        </Table.Summary.Cell>
                      ))}
                      {receivable && <Table.Summary.Cell index={6} colSpan={3} />}
                    </Table.Summary.Row>
                  </Table.Summary>
                ) : null
              }
            />
            <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
              <div className="text-xs text-slate-500">
                Công nợ toàn công ty, không lọc theo kho. Nợ cuối kỳ = dư nợ hiện tại − phát sinh sau kỳ.
                {receivable ? ` ${daysNote}` : ' Chưa có cách tính số ngày nợ nhà cung cấp.'}
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
