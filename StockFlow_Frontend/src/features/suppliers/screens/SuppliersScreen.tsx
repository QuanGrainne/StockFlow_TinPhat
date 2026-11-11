// src/features/suppliers/screens/SuppliersScreen.tsx
// Danh sách Nhà cung cấp — cùng bố cục với màn hình Chuyển hàng (TransfersScreen):
// Header 48px → [Sidebar bộ lọc | Bảng dữ liệu + footer]

'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { readDocumentLink, scrollToWhenReady } from '@/lib/navigation/documentLink';
import SupplierFilterSidebar from '@/features/suppliers/components/SupplierFilterSidebar';
import SupplierFormModal from '@/features/suppliers/components/SupplierFormModal';
import SupplierToolbar from '@/features/suppliers/components/SupplierToolbar';
import SuppliersTable from '@/features/suppliers/components/SuppliersTable';
import SupplierBulkActionBar from '@/features/suppliers/components/SupplierBulkActionBar';
import { useSuppliers } from '@/features/suppliers/hooks/useSuppliers';
import { supplierService } from '@/features/suppliers/services/supplierService';

interface SuppliersScreenProps {
  onNavigate?: (screenId: string) => void;
}

export default function SuppliersScreen({}: SuppliersScreenProps = {}) {
  // Link mở thẳng 1 NCC (?code=NCC...&id=..., VD từ phiếu trong Thẻ kho)
  const searchParams = useSearchParams();
  const [link] = useState(() => readDocumentLink(searchParams));
  const s = useSuppliers(link ? { search: link.code, expandId: link.id } : undefined);

  useEffect(() => {
    if (!link?.id) return;
    return scrollToWhenReady(`[data-doc-row="${link.id}"]`);
  }, [link]);

  const totalPurchased = useMemo(
    () => s.filteredSuppliers.reduce((sum, sup) => sum + (sup.totalPurchased || 0), 0),
    [s.filteredSuppliers]
  );

  return (
    <div className="flex-1 h-full min-h-0 flex flex-col bg-[#f5f5f5] overflow-hidden select-none text-[13px] text-[#15171a] font-sans">
      {/* 1. Header Toolbar */}
      <SupplierToolbar
        search={s.filterState.search}
        onSearchChange={(search) => s.handleFilterChange({ search })}
        onOpenCreate={s.handleOpenCreate}
        onImportExcel={s.handleImportExcel}
        importing={s.importing}
        onExportExcel={s.handleExportExcel}
      />

      {/* 2. Main Workspace: Sidebar & Table */}
      <div className="flex-1 min-h-0 flex overflow-hidden">
        <SupplierFilterSidebar
          state={s.filterState}
          warehousesList={s.warehousesList}
          onChange={s.handleFilterChange}
          isCollapsed={s.sidebarCollapsed}
          onToggleCollapse={() => s.setSidebarCollapsed((v) => !v)}
        />

        <SuppliersTable
          loading={s.loading}
          pagedItems={s.pagedItems}
          filteredCount={s.filteredSuppliers.length}
          selectedWarehouse={s.selectedWarehouse}
          totalPurchased={totalPurchased}
          totalPayableDebt={s.totalPayableDebt}
          selectedRowKeys={s.selectedRowKeys}
          onSelectRow={(id, checked) => {
            s.setSelectedRowKeys((prev) => (checked ? [...prev, id] : prev.filter((k) => k !== id)));
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
          onPaymentCreated={s.handlePaymentCreated}
          onResetFilters={s.handleResetFilters}
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
      </div>

      {/* 3. Thanh thao tác hàng loạt khi chọn nhiều NCC */}
      <SupplierBulkActionBar
        selectedCount={s.selectedRowKeys.length}
        onExportExcel={s.handleBulkExportExcel}
        onDeactivate={() => s.handleBulkChangeStatus('INACTIVE')}
        onActivate={() => s.handleBulkChangeStatus('ACTIVE')}
        onClearSelection={() => s.setSelectedRowKeys([])}
      />

      {/* 4. Form Thêm / Cập nhật NCC */}
      {s.isModalOpen && (
        <SupplierFormModal
          key={s.editingSupplier?.partnerId ?? 'new'}
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
