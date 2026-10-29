'use client';

import { message } from 'antd';
import { usePurchaseForm } from '@/features/purchases/hooks/usePurchaseForm';
import { PurchaseHeader } from '@/features/purchases/components/PurchaseHeader';
import { PurchaseItemsTable } from '@/features/purchases/components/PurchaseItemsTable';
import { PurchasePaymentSidebar } from '@/features/purchases/components/PurchasePaymentSidebar';
import { QuickAddProductModal } from '@/features/purchases/components/QuickAddProductModal';
import { QuickAddSupplierModal } from '@/features/purchases/components/QuickAddSupplierModal';

export default function CreatePurchaseClient() {
  const form = usePurchaseForm();

  return (
    <div className="flex-1 flex flex-col bg-[#f4f6f8] min-h-[calc(100vh-56px)] select-none">
      {/* 1. Header Bar: Tiêu đề, badge kho, ô tìm kiếm sản phẩm F3 & tiện ích */}
      <PurchaseHeader
        activeWarehouse={form.activeWarehouse}
        warehouses={form.warehouses}
        onSelectWarehouse={form.setActiveWarehouse}
        products={form.productsList}
        loadingProducts={form.loadingProducts}
        onSelectProduct={form.handleSelectProduct}
        onOpenQuickAddProduct={() => form.setShowAddProductModal(true)}
        searchInputRef={form.searchInputRef}
      />

      {/* 2. Main Workspace: Bảng sản phẩm & Cột thanh toán */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* Bảng danh sách hàng hóa nhập kho */}
        <PurchaseItemsTable
          items={form.items}
          onUpdateItem={form.handleUpdateItem}
          onRemoveItem={form.handleRemoveItem}
          onFocusSearch={() => form.searchInputRef.current?.focus()}
          onFileImport={form.handleFileImport}
          onDownloadSample={() => message.info('Đang tải file mẫu: mau_nhap_hang_tinphat.xlsx')}
        />

        {/* Cột phải: Thông tin nhà cung cấp, thanh toán & 2 nút F8/F9 */}
        <PurchasePaymentSidebar
          sidebarOpen={form.sidebarOpen}
          onToggleSidebar={() => form.setSidebarOpen((v) => !v)}
          username={form.username}
          dateTimeStr={form.dateTimeStr}
          activeWarehouse={form.activeWarehouse}
          suppliers={form.suppliersList}
          loadingSuppliers={form.loadingSuppliers}
          selectedSupplier={form.selectedSupplier}
          onSelectSupplier={form.setSelectedSupplier}
          onOpenQuickAddSupplier={() => form.setShowAddSupplierModal(true)}
          externalPoNumber={form.externalPoNumber}
          onChangeExternalPoNumber={form.setExternalPoNumber}
          totalGoods={form.totalGoods}
          orderDiscount={form.orderDiscount}
          onChangeOrderDiscount={form.setOrderDiscount}
          finalPayable={form.finalPayable}
          paidAmount={form.paidAmount}
          onChangePaidAmount={form.setPaidAmount}
          paymentMethod={form.paymentMethod}
          onChangePaymentMethod={form.setPaymentMethod}
          debtAmount={form.debtAmount}
          notes={form.notes}
          onChangeNotes={form.setNotes}
          isSubmitting={form.isSubmitting}
          onSubmit={form.handleSubmit}
        />
      </div>

      {/* 3. Modals thêm nhanh */}
      <QuickAddProductModal
        open={form.showAddProductModal}
        onClose={() => form.setShowAddProductModal(false)}
        onSuccess={(p) => {
          form.handleSelectProduct(p);
        }}
      />

      <QuickAddSupplierModal
        open={form.showAddSupplierModal}
        onClose={() => form.setShowAddSupplierModal(false)}
        onSuccess={(s) => {
          form.setSelectedSupplier(s);
        }}
      />
    </div>
  );
}
