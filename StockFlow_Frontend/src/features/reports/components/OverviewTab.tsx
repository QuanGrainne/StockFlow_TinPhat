'use client';

// Tab "Tổng quan" (UC-90): thẻ KPI, biểu đồ theo ngày, top hàng bán, việc chờ xử lý, hàng dưới định mức

import React from 'react';
import Link from 'next/link';
import { Alert, Button, Card, Skeleton, Statistic, Table, Tag } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { ArrowRight, ClipboardCheck, Factory, Repeat, ShieldCheck } from 'lucide-react';
import type { DashboardSummary, LowStockItem, ReportFilter, TopProduct } from '../types';
import { reportService } from '../services/reportService';
import { formatMoney, formatPercent, formatQuantity } from '../utils/reportFormat';
import { useReportQuery } from '../hooks/useReportQuery';
import { RevenueChart } from './RevenueChart';

const topColumns: ColumnsType<TopProduct> = [
  { title: '#', key: 'rank', width: 48, render: (_v, _r, i) => <span className="text-xs text-[#8c8c8c]">{i + 1}</span> },
  {
    title: 'Mã hàng',
    dataIndex: 'productCode',
    width: 140,
    render: (v: string) => <span className="font-mono text-xs text-[#595959]">{v}</span>,
  },
  { title: 'Tên hàng', dataIndex: 'productName', render: (v: string) => <span className="text-sm text-[#262626]">{v}</span> },
  { title: 'SL bán', dataIndex: 'quantity', align: 'right', width: 100, render: (v: number) => formatQuantity(v) },
  {
    title: 'Doanh thu',
    dataIndex: 'revenue',
    align: 'right',
    width: 150,
    render: (v: number) => <span className="font-medium text-[#262626]">{formatMoney(v)}</span>,
  },
];

const lowStockColumns: ColumnsType<LowStockItem> = [
  { title: 'Kho', dataIndex: 'warehouseName', width: 160 },
  {
    title: 'Mã hàng',
    dataIndex: 'productCode',
    width: 140,
    render: (v: string) => <span className="font-mono text-xs text-[#595959]">{v}</span>,
  },
  { title: 'Tên hàng', dataIndex: 'productName' },
  {
    title: 'Tồn',
    dataIndex: 'quantity',
    align: 'right',
    width: 90,
    render: (v: number) => <span className="font-medium text-amber-600">{formatQuantity(v)}</span>,
  },
  {
    title: 'Điểm đặt lại',
    dataIndex: 'reorderPoint',
    align: 'right',
    width: 110,
    render: (v: number | null) => (v ? formatQuantity(v) : '—'),
  },
  {
    title: 'Tồn tối thiểu',
    dataIndex: 'minSafeStock',
    align: 'right',
    width: 110,
    render: (v: number | null) => (v ? formatQuantity(v) : '—'),
  },
];

function KpiCard({ title, value, note, negative }: { title: string; value: string; note?: string; negative?: boolean }) {
  return (
    <Card size="small" className="h-full">
      <Statistic
        title={<span className="text-xs text-[#595959]">{title}</span>}
        value={value}
        styles={{ content: { fontSize: 20, fontWeight: 600, color: negative ? "#e11d48" : "#262626" } }}
      />
      {note && <div className="mt-1 text-xs text-[#8c8c8c]">{note}</div>}
    </Card>
  );
}

function SectionCard({ title, extra, children }: { title: string; extra?: React.ReactNode; children: React.ReactNode }) {
  return (
    <section className="overflow-hidden rounded-lg border border-[#e5e7eb] bg-white shadow-xs">
      <header className="flex items-center justify-between border-b border-[#e5e7eb] px-4 py-3">
        <h3 className="text-sm font-semibold text-slate-800">{title}</h3>
        {extra}
      </header>
      <div className="p-4">{children}</div>
    </section>
  );
}

interface OverviewTabProps {
  filter: ReportFilter;
  ready: boolean;
}

export function OverviewTab({ filter, ready }: OverviewTabProps) {
  const { from, to, warehouseId } = filter;
  const { data, loading, error, reload } = useReportQuery<DashboardSummary>(
    `dashboard|${from}|${to}|${warehouseId ?? ''}`,
    ready,
    () => reportService.getDashboard({ from, to, warehouseId }),
    'Không tải được báo cáo tổng quan.'
  );

  if (error) {
    return (
      <Alert
        type="error"
        showIcon
        title="Không tải được báo cáo tổng quan"
        description={error}
        action={<Button size="small" onClick={reload}>Thử lại</Button>}
      />
    );
  }

  if (!data) {
    return <Skeleton active paragraph={{ rows: 8 }} />;
  }

  const { kpi, pending } = data;
  const hasSales = data.daily.some((d) => d.netRevenue !== 0 || d.grossProfit !== 0);
  const pendingItems = [
    { label: 'Yêu cầu hạn mức chờ duyệt', count: pending.creditRequests, href: '/approvals', icon: ShieldCheck },
    {
      label: 'Kế hoạch sản xuất chờ duyệt',
      count: pending.productionPlansPendingApproval,
      href: '/production/plan-approvals',
      icon: ClipboardCheck,
    },
    { label: 'Lệnh sản xuất đang thực hiện', count: pending.productionOrdersInProgress, href: '/production', icon: Factory },
    { label: 'Phiếu chuyển đang về kho', count: pending.transfersInTransit, href: '/transfers', icon: Repeat },
  ];

  return (
    <div className={`space-y-5 transition-opacity ${loading ? 'opacity-60' : ''}`} aria-busy={loading}>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          title="Doanh thu thuần"
          value={formatMoney(kpi.netRevenue)}
          note={`Hóa đơn ${formatMoney(kpi.invoiceRevenue)} − hàng trả ${formatMoney(kpi.returnValue)}`}
          negative={kpi.netRevenue < 0}
        />
        <KpiCard title="Giá vốn hàng bán" value={formatMoney(kpi.costOfGoodsSold)} />
        <KpiCard
          title="Lợi nhuận gộp"
          value={formatMoney(kpi.grossProfit)}
          note={`Tỷ suất ${formatPercent(kpi.grossMarginPercent)}`}
          negative={kpi.grossProfit < 0}
        />
        <KpiCard
          title="Số hóa đơn"
          value={formatQuantity(kpi.invoiceCount)}
          note={`Giá trị đơn trung bình ${formatMoney(kpi.averageOrderValue)}`}
        />
        <KpiCard title="Giá trị tồn kho" value={formatMoney(kpi.inventoryValue)} note="Tại thời điểm hiện tại" />
        <KpiCard title="Phải thu khách hàng" value={formatMoney(kpi.receivable)} note="Toàn công ty, không lọc theo kho" />
        <KpiCard title="Phải trả nhà cung cấp" value={formatMoney(kpi.payable)} note="Toàn công ty, không lọc theo kho" />
      </div>

      <SectionCard title="Doanh thu thuần và lợi nhuận gộp theo ngày">
        {hasSales ? (
          <RevenueChart points={data.daily} />
        ) : (
          <div className="py-10 text-center text-sm text-[#8c8c8c]">Không có phát sinh bán hàng trong kỳ.</div>
        )}
      </SectionCard>

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-3">
        <div className="xl:col-span-2">
          <SectionCard title="Top 10 hàng bán theo doanh thu">
            <Table<TopProduct>
              className="stockflow-reports-table"
              rowKey="productId"
              columns={topColumns}
              dataSource={data.topProducts}
              pagination={false}
              size="small"
              scroll={{ x: 640 }}
              locale={{ emptyText: 'Không có hàng bán trong kỳ.' }}
            />
          </SectionCard>
        </div>
        <SectionCard title="Việc chờ xử lý">
          <ul className="divide-y divide-[#f0f0f0]">
            {pendingItems.map((item) => {
              const Icon = item.icon;
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    className="flex items-center justify-between gap-3 py-2.5 text-sm text-[#262626] hover:text-[#0071BA]"
                  >
                    <span className="inline-flex items-center gap-2">
                      <Icon size={16} className="text-[#0071BA]" />
                      {item.label}
                    </span>
                    <span className="inline-flex items-center gap-1.5">
                      {item.count > 0 ? <Tag color="warning">{item.count}</Tag> : <Tag>0</Tag>}
                      <ArrowRight size={14} className="text-slate-400" />
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </SectionCard>
      </div>

      <SectionCard
        title="Hàng dưới định mức"
        extra={
          data.lowStockTotal > data.lowStock.length ? (
            <span className="text-xs text-slate-500">
              Hiển thị {data.lowStock.length} / {data.lowStockTotal} dòng thiếu nhiều nhất
            </span>
          ) : undefined
        }
      >
        <Table<LowStockItem>
          className="stockflow-reports-table"
          rowKey={(r) => `${r.warehouseId}-${r.productId}`}
          columns={lowStockColumns}
          dataSource={data.lowStock}
          pagination={false}
          size="small"
          scroll={{ x: 720 }}
          rowClassName={() => 'bg-[#fffbe6] hover:bg-amber-50/70'}
          locale={{ emptyText: 'Không có hàng dưới định mức.' }}
        />
      </SectionCard>
    </div>
  );
}
