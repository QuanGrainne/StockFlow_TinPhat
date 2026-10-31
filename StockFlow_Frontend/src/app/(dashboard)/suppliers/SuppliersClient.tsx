'use client';

import React from 'react';
import SupplierFilterSidebar from '@/components/SupplierFilterSidebar';
import SupplierFormModal from '@/features/suppliers/components/SupplierFormModal';
import SupplierToolbar from '@/features/suppliers/components/SupplierToolbar';
import SuppliersTable from '@/features/suppliers/components/SuppliersTable';
import SupplierBulkActionBar from '@/features/suppliers/components/SupplierBulkActionBar';
import { useSuppliers } from '@/features/suppliers/hooks/useSuppliers';
import { supplierService } from '@/features/suppliers/services/supplierService';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface SuppliersClientProps {
  onNavigate?: (screenId: string) => void;
}

export default function SuppliersClient({}: SuppliersClientProps = {}) {
  const s = useSuppliers();

  return (
    <div className="flex-1 w-full flex flex-col text-[#262626] bg-[#f7f9fa]">
      <div className="flex-1 flex min-h-[calc(100vh-104px)]">
        {/* ── 1. Desktop Left Sidebar (260px) ── */}
        <div className="hidden lg:flex relative shrink-0">
          <SupplierFilterSidebar
            state={s.filterState}
            selectedLocation={s.selectedLocation}
            warehousesList={s.warehousesList}
            onChange={s.handleFilterChange}
            onLocationChange={(loc) => {
              s.setSelectedLocation(loc);
              s.setPage(1);
            }}
            onResetFilters={s.handleResetFilters}
            isCollapsed={s.sidebarCollapsed}
          />
          <button
            type="button"
            onClick={() => s.setSidebarCollapsed((v) => !v)}
            className={`absolute z-30 flex items-center justify-center cursor-pointer transition-all duration-200 shadow-md ${
              s.sidebarCollapsed
                ? 'left-0 top-1/2 -translate-y-1/2 h-16 w-5 bg-white border border-l-0 border-slate-300 rounded-r-md text-slate-500 hover:text-[#0071BA] hover:bg-blue-50/80 hover:w-6'
                : 'right-0 top-1/2 translate-x-1/2 -translate-y-1/2 h-6 w-6 rounded-full border border-slate-300 bg-white text-slate-500 hover:border-[#0071BA] hover:text-[#0071BA]'
            }`}
            title={s.sidebarCollapsed ? 'Mở rộng bộ lọc' : 'Thu gọn bộ lọc'}
          >
            {s.sidebarCollapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
          </button>
        </div>

        {/* ── 2. Mobile Filter Drawer ── */}
        {s.mobileFilterOpen && (
          <div className="fixed inset-0 z-50 flex lg:hidden bg-black/40 backdrop-blur-sm">
            <div className="relative w-[280px] max-w-[85vw] bg-white h-full overflow-y-auto">
              <SupplierFilterSidebar
                state={s.filterState}
                selectedLocation={s.selectedLocation}
                warehousesList={s.warehousesList}
                onChange={s.handleFilterChange}
                onLocationChange={(loc) => {
                  s.setSelectedLocation(loc);
                  s.setPage(1);
                }}
                onResetFilters={s.handleResetFilters}
              />
            </div>
            <div className="flex-1 h-full" onClick={() => s.setMobileFilterOpen(false)} />
          </div>
        )}

        {/* ── 3. Main Content Area ── */}
        <main className="min-w-0 flex-1 flex flex-col bg-white">
          <SupplierToolbar
            search={s.filterState.search}
            onSearchChange={(search) => s.handleFilterChange({ search })}
            sidebarCollapsed={s.sidebarCollapsed}
            onToggleSidebar={() => s.setSidebarCollapsed(false)}
            onOpenMobileFilter={() => s.setMobileFilterOpen(true)}
            onOpenCreate={s.handleOpenCreate}
            onExportExcel={s.handleExportExcel}
            onRefresh={s.loadSuppliers}
          />

          <SuppliersTable
            loading={s.loading}
            pagedItems={s.pagedItems}
            filteredCount={s.filteredSuppliers.length}
            selectedWarehouse={s.selectedWarehouse}
            onClearWarehouseFilter={() => s.handleFilterChange({ warehouseId: 'ALL' })}
            totalPayableDebt={s.totalPayableDebt}
            selectedRowKeys={s.selectedRowKeys}
            onSelectRow={(id, checked) => {
              s.setSelectedRowKeys((prev) =>
                checked ? [...prev, id] : prev.filter((k) => k !== id)
              );
            }}
            onSelectAll={(checked) => {
              s.setSelectedRowKeys(checked ? s.pagedItems.map((r) => r.id) : []);
            }}
            expandedRowKey={s.expandedRowKey}
            detailsCache={s.detailsCache}
            loadingDetailId={s.loadingDetailId}
            onRowClick={s.handleRowClick}
            onEdit={s.handleOpenEdit}
            onToggleStatus={s.handleToggleStatus}
            onDelete={s.handleDelete}
            page={s.page}
            pageSize={s.pageSize}
            pageCount={s.pageCount}
            rangeStart={s.rangeStart}
            rangeEnd={s.rangeEnd}
            onPageChange={s.setPage}
            onPageSizeChange={(size) => {
              s.setPageSize(size);
              s.setPage(1);
            }}
          />
        </main>
      </div>

      {/* ── 4. Floating Bulk Action Bar ── */}
      <SupplierBulkActionBar
        selectedCount={s.selectedRowKeys.length}
        onExportExcel={s.handleBulkExportExcel}
        onDeactivate={() => s.handleBulkChangeStatus('INACTIVE')}
        onActivate={() => s.handleBulkChangeStatus('ACTIVE')}
        onClearSelection={() => s.setSelectedRowKeys([])}
      />

      {/* ── 5. Modal Thêm / Cập nhật NCC ── */}
      {s.isModalOpen && (
        <SupplierFormModal
          isOpen={s.isModalOpen}
          onClose={() => s.setIsModalOpen(false)}
          onSuccess={s.loadSuppliers}
          supplier={s.editingSupplier}
          onSaveCreate={supplierService.createSupplier}
          onSaveUpdate={supplierService.updateSupplier}
        />
      )}
    </div>
  );
}
