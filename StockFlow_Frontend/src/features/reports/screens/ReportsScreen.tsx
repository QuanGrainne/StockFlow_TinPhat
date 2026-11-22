'use client';

// Màn Báo cáo cho Manager (route /reports, mã màn hình "reports"):
// tab Tổng quan (UC-90); các tab báo cáo chi tiết thêm ở các bước sau. Chỉ đọc dữ liệu.

import React, { useState } from 'react';
import { Tabs } from 'antd';
import { Filter, X } from 'lucide-react';
import { useAuthorizedWarehouses } from '@/lib/warehouse/useActiveWarehouse';
import type { ReportFilter } from '../types';
import { rangeOfPreset } from '../utils/reportFormat';
import { ReportFilterSidebar, isFilterReady } from '../components/ReportFilterSidebar';
import { OverviewTab } from '../components/OverviewTab';

type ReportTab = 'overview';

function initialFilter(): ReportFilter {
  return { preset: 'this_month', ...rangeOfPreset('this_month'), warehouseId: null };
}

export default function ReportsScreen() {
  const { warehouses } = useAuthorizedWarehouses();
  const [filter, setFilter] = useState<ReportFilter>(initialFilter);
  const [activeTab, setActiveTab] = useState<ReportTab>('overview');
  const [mobileFilterOpen, setMobileFilterOpen] = useState(false);

  const ready = isFilterReady(filter);
  const sidebar = <ReportFilterSidebar filter={filter} warehouses={warehouses} onChange={setFilter} />;

  return (
    <div className="flex min-h-0 flex-1">
      <div className="hidden lg:flex">{sidebar}</div>

      {mobileFilterOpen && (
        <div className="fixed inset-0 z-50 flex lg:hidden" role="dialog" aria-modal="true" aria-label="Bộ lọc báo cáo">
          <div className="relative flex">
            {sidebar}
            <button
              type="button"
              onClick={() => setMobileFilterOpen(false)}
              className="absolute right-2 top-4 rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
              aria-label="Đóng bộ lọc"
            >
              <X size={18} />
            </button>
          </div>
          <div className="flex-1 bg-black/40" onClick={() => setMobileFilterOpen(false)} />
        </div>
      )}

      <div className="flex min-w-0 flex-1 flex-col overflow-y-auto bg-white">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#e5e7eb] bg-white px-6 py-3.5">
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold text-slate-800">Báo cáo</span>
            <span className="text-xs text-slate-400">
              ({filter.from.split('-').reverse().join('/')} – {filter.to.split('-').reverse().join('/')})
            </span>
          </div>
          <button
            type="button"
            onClick={() => setMobileFilterOpen(true)}
            className="inline-flex items-center gap-1.5 rounded border border-slate-300 px-3 py-1.5 text-[13px] text-slate-700 hover:bg-slate-50 lg:hidden"
          >
            <Filter size={14} /> Bộ lọc
          </button>
        </div>

        <div className="bg-[#f8fafc] px-5 pb-5">
          <Tabs
            activeKey={activeTab}
            onChange={(key) => setActiveTab(key as ReportTab)}
            items={[
              {
                key: 'overview',
                label: 'Tổng quan',
                children: <OverviewTab filter={filter} ready={ready} />,
              },
            ]}
          />
        </div>
      </div>
    </div>
  );
}
