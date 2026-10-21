// src/components/sales/screens/PendingOrdersScreen.tsx
// Màn hình quản lý đơn hàng chờ xử lý (Sales): Read-only Table + Popup Tạo/Sửa + Popup Gộp đơn xuất kho

import React, { useState, useEffect } from 'react';
import { PendingOrder, Customer, Product, OrderItem } from '../../../types';
import { salesService } from '../../../services/salesService';
import { DataTable, Column } from '../../common/DataTable';
import { Modal } from '../../common/Modal';
import {
  Plus,
  GitMerge,
  Eye,
  Trash2,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Building,
} from 'lucide-react';

export const PendingOrdersScreen: React.FC = () => {
  const [orders, setOrders] = useState<PendingOrder[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');

  // Modal States
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [viewModalOpen, setViewModalOpen] = useState(false);
  const [consolidateModalOpen, setConsolidateModalOpen] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<PendingOrder | null>(null);

  // Form State: Tạo đơn mới
  const [formCustomerId, setFormCustomerId] = useState('');
  const [formDeliveryDate, setFormDeliveryDate] = useState('');
  const [formNotes, setFormNotes] = useState('');
  const [formPaidAmount, setFormPaidAmount] = useState(0);
  const [formItems, setFormItems] = useState<OrderItem[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [formError, setFormError] = useState('');

  // Form State: Gộp đơn hàng
  const [consolidateCustomerId, setConsolidateCustomerId] = useState('');
  const [selectedOrderIds, setSelectedOrderIds] = useState<string[]>([]);
  const [shippingAddress, setShippingAddress] = useState('');
  const [consolidateError, setConsolidateError] = useState('');
  const [consolidateSuccess, setConsolidateSuccess] = useState('');

  // Load Data
  const loadData = async () => {
    setLoading(true);
    try {
      const [orderList, custList, prodList] = await Promise.all([
        salesService.getPendingOrders(search, statusFilter),
        salesService.getCustomers(),
        salesService.getProducts(),
      ]);
      setOrders(orderList);
      setCustomers(custList);
      setProducts(prodList);
    } catch (err: any) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [search, statusFilter]);

  // Handler: Thêm hàng vào form tạo đơn
  const handleAddItem = (productId: string) => {
    const prod = products.find((p) => p.id === productId);
    if (!prod) return;

    const existingIndex = formItems.findIndex((i) => i.productId === productId);
    if (existingIndex > -1) {
      const next = [...formItems];
      next[existingIndex].quantity += 1;
      next[existingIndex].subtotal =
        next[existingIndex].quantity * next[existingIndex].unitPrice;
      setFormItems(next);
    } else {
      setFormItems([
        ...formItems,
        {
          productId: prod.id,
          productCode: prod.code,
          productName: prod.name,
          uom: prod.uom,
          quantity: 1,
          unitPrice: prod.standardPrice,
          discountPercent: 0,
          subtotal: prod.standardPrice,
        },
      ]);
    }
  };

  const handleUpdateItemQty = (index: number, qty: number) => {
    if (qty <= 0) return;
    const next = [...formItems];
    next[index].quantity = qty;
    next[index].subtotal = qty * next[index].unitPrice * (1 - next[index].discountPercent / 100);
    setFormItems(next);
  };

  const handleRemoveItem = (index: number) => {
    setFormItems(formItems.filter((_, i) => i !== index));
  };

  const formTotalAmount = formItems.reduce((sum, i) => sum + i.subtotal, 0);

  // Submit tạo đơn mới
  const handleCreateOrder = async () => {
    if (!formCustomerId) {
      setFormError('Vui lòng chọn khách hàng');
      return;
    }
    if (formItems.length === 0) {
      setFormError('Vui lòng thêm ít nhất một sản phẩm vào đơn hàng');
      return;
    }

    const customer = customers.find((c) => c.id === formCustomerId);
    if (!customer) return;

    setIsSaving(true);
    setFormError('');

    try {
      await salesService.createPendingOrder({
        customerId: customer.id,
        customerName: customer.name,
        customerPhone: customer.phone,
        orderDate: new Date().toLocaleDateString('vi-VN'),
        deliveryDate: formDeliveryDate || '30/10/2026',
        items: formItems,
        totalAmount: formTotalAmount,
        paidAmount: Number(formPaidAmount) || 0,
        notes: formNotes,
        createdBy: 'Trần Văn Tuấn (Sales)',
      });

      setCreateModalOpen(false);
      resetCreateForm();
      await loadData();
    } catch (err: any) {
      setFormError(err.message || 'Lỗi khi tạo đơn hàng');
    } finally {
      setIsSaving(false);
    }
  };

  const resetCreateForm = () => {
    setFormCustomerId('');
    setFormDeliveryDate('');
    setFormNotes('');
    setFormPaidAmount(0);
    setFormItems([]);
    setFormError('');
  };

  // Submit gộp đơn hàng
  const handleConsolidate = async () => {
    if (!consolidateCustomerId) {
      setConsolidateError('Vui lòng chọn khách hàng cần gộp đơn');
      return;
    }
    if (selectedOrderIds.length < 1) {
      setConsolidateError('Vui lòng tick chọn ít nhất một đơn hàng');
      return;
    }

    setIsSaving(true);
    setConsolidateError('');
    setConsolidateSuccess('');

    try {
      const res = await salesService.consolidateOrders({
        customerId: consolidateCustomerId,
        selectedOrderIds,
        shippingAddress,
      });

      setConsolidateSuccess(res.message);
      setTimeout(() => {
        setConsolidateModalOpen(false);
        setConsolidateSuccess('');
        setSelectedOrderIds([]);
        loadData();
      }, 1500);
    } catch (err: any) {
      setConsolidateError(err.message || 'Lỗi gộp đơn');
    } finally {
      setIsSaving(false);
    }
  };

  // Cột cho DataTable
  const columns: Column<PendingOrder>[] = [
    {
      header: 'Mã đơn hàng',
      accessor: 'orderCode',
      width: '140px',
      render: (row) => (
        <span className="font-mono font-semibold text-[#2B6CB0]">{row.orderCode}</span>
      ),
    },
    {
      header: 'Khách hàng',
      accessor: 'customerName',
      render: (row) => (
        <div>
          <div className="font-medium text-slate-800">{row.customerName}</div>
          <div className="text-[11px] text-slate-400 font-mono">{row.customerPhone}</div>
        </div>
      ),
    },
    {
      header: 'Ngày đặt / Hẹn giao',
      width: '150px',
      render: (row) => (
        <div className="text-slate-600">
          <div>{row.orderDate}</div>
          <div className="text-[11px] text-slate-400">Hẹn: {row.deliveryDate}</div>
        </div>
      ),
    },
    {
      header: 'Tổng tiền hàng',
      accessor: 'totalAmount',
      align: 'right',
      width: '130px',
      render: (row) => (
        <span className="font-medium text-slate-800">
          {row.totalAmount.toLocaleString('vi-VN')} đ
        </span>
      ),
    },
    {
      header: 'Còn nợ đơn',
      accessor: 'remainingAmount',
      align: 'right',
      width: '130px',
      render: (row) => (
        <span
          className={`font-semibold ${
            row.remainingAmount > 0 ? 'text-rose-600' : 'text-slate-500'
          }`}
        >
          {row.remainingAmount.toLocaleString('vi-VN')} đ
        </span>
      ),
    },
    {
      header: 'Trạng thái',
      accessor: 'status',
      align: 'center',
      width: '140px',
      render: (row) => {
        switch (row.status) {
          case 'PENDING':
            return (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-amber-50 text-amber-700 border border-amber-200">
                <Clock size={11} /> Chờ xử lý
              </span>
            );
          case 'CONSOLIDATED':
            return (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-blue-50 text-[#2B6CB0] border border-blue-200">
                <GitMerge size={11} /> Đã gộp xuất
              </span>
            );
          case 'CANCELLED':
            return (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-rose-50 text-rose-700 border border-rose-200">
                Đã hủy
              </span>
            );
          default:
            return <span className="text-slate-400">{row.status}</span>;
        }
      },
    },
    {
      header: 'Thao tác',
      align: 'center',
      width: '100px',
      render: (row) => (
        <div className="flex items-center justify-center gap-1.5">
          <button
            type="button"
            onClick={() => {
              setSelectedOrder(row);
              setViewModalOpen(true);
            }}
            className="p-1 text-slate-500 hover:text-[#2B6CB0] hover:bg-blue-50 rounded-[4px] transition cursor-pointer"
            title="Xem chi tiết"
          >
            <Eye size={15} />
          </button>
          {row.status === 'PENDING' && (
            <button
              type="button"
              onClick={async () => {
                if (window.confirm(`Hủy đơn hàng ${row.orderCode}?`)) {
                  await salesService.cancelPendingOrder(row.id);
                  loadData();
                }
              }}
              className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-[4px] transition cursor-pointer"
              title="Hủy đơn"
            >
              <Trash2 size={15} />
            </button>
          )}
        </div>
      ),
    },
  ];

  // Danh sách đơn hàng pending của khách được chọn (dùng trong modal gộp đơn)
  const candidateOrdersForConsolidate = orders.filter(
    (o) => o.customerId === consolidateCustomerId && o.status === 'PENDING'
  );

  return (
    <div className="space-y-5">
      {/* Page Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight">
            Đơn hàng chờ xử lý (Pending Orders)
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Phân hệ Sales: Nhập đơn hàng B2B, quản lý công nợ và gộp đơn tạo yêu cầu xuất kho
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={() => {
              setConsolidateCustomerId(customers[0]?.id || '');
              setConsolidateModalOpen(true);
            }}
            className="h-9 px-3.5 rounded-[8px] border border-[#2B6CB0] text-[#2B6CB0] bg-white hover:bg-blue-50 text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer"
          >
            <GitMerge size={15} />
            <span>Gộp đơn xuất kho</span>
          </button>

          <button
            type="button"
            onClick={() => {
              resetCreateForm();
              setCreateModalOpen(true);
            }}
            className="h-9 px-4 rounded-[8px] bg-[#2B6CB0] hover:bg-[#23568c] text-white text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer shadow-xs"
          >
            <Plus size={16} />
            <span>Tạo đơn hàng mới</span>
          </button>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-1 border-b border-slate-200">
        {[
          { id: 'ALL', label: 'Tất cả' },
          { id: 'PENDING', label: 'Chờ xử lý' },
          { id: 'CONSOLIDATED', label: 'Đã gộp đơn' },
          { id: 'CANCELLED', label: 'Đã hủy' },
        ].map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setStatusFilter(tab.id)}
            className={`px-4 py-2 text-xs font-semibold transition border-b-2 -mb-px cursor-pointer ${
              statusFilter === tab.id
                ? 'border-[#2B6CB0] text-[#2B6CB0]'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Main DataTable */}
      <DataTable
        columns={columns}
        data={orders}
        keyField="id"
        isLoading={loading}
        searchPlaceholder="Tìm theo mã đơn, tên hoặc số điện thoại KH..."
        searchValue={search}
        onSearchChange={setSearch}
      />

      {/* ── Modal 1: Tạo Đơn Hàng Mới ── */}
      <Modal
        isOpen={createModalOpen}
        onClose={() => setCreateModalOpen(false)}
        title="Tạo đơn hàng mới (Sales Order)"
        subtitle="Nhập thông tin khách hàng B2B và thêm danh mục sản phẩm vào đơn"
        onSave={handleCreateOrder}
        isSaving={isSaving}
        maxWidth="4xl"
      >
        {formError && (
          <div className="p-3 rounded-[6px] bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
            <AlertTriangle size={15} />
            <span>{formError}</span>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Khách hàng <span className="text-rose-500">*</span>
            </label>
            <select
              value={formCustomerId}
              onChange={(e) => setFormCustomerId(e.target.value)}
              className="w-full h-9 px-3 rounded-[6px] border border-slate-300 text-xs bg-white text-slate-800 focus:outline-none focus:border-[#2B6CB0]"
            >
              <option value="">-- Chọn khách hàng --</option>
              {customers.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.code} - {c.name} (Nợ: {c.currentDebt.toLocaleString()} đ / Hạn mức: {c.creditLimit.toLocaleString()} đ)
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Ngày hẹn giao hàng
            </label>
            <input
              type="date"
              value={formDeliveryDate}
              onChange={(e) => setFormDeliveryDate(e.target.value)}
              className="w-full h-9 px-3 rounded-[6px] border border-slate-300 text-xs text-slate-800 focus:outline-none focus:border-[#2B6CB0]"
            />
          </div>
        </div>

        {/* Section thêm sản phẩm */}
        <div className="mt-4 pt-3 border-t border-slate-100">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-slate-800 uppercase tracking-wide">
              Danh sách sản phẩm đặt mua
            </span>
            <div className="flex items-center gap-2">
              <select
                id="product-select"
                className="h-8 px-2 text-xs border border-slate-300 rounded-[6px] bg-white text-slate-800"
                defaultValue=""
                onChange={(e) => {
                  if (e.target.value) {
                    handleAddItem(e.target.value);
                    e.target.value = '';
                  }
                }}
              >
                <option value="" disabled>+ Chọn sản phẩm thêm vào đơn</option>
                {products.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.code} - {p.name} ({p.standardPrice.toLocaleString()} đ/{p.uom})
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="border border-slate-200 rounded-[6px] overflow-hidden">
            <table className="w-full text-xs text-left">
              <thead className="bg-[#F7FAFC] border-b border-slate-200 text-slate-600 font-semibold text-[11px]">
                <tr>
                  <th className="px-3 py-2">Mã & Tên sản phẩm</th>
                  <th className="px-3 py-2 text-center w-24">Số lượng</th>
                  <th className="px-3 py-2 text-right w-28">Đơn giá</th>
                  <th className="px-3 py-2 text-right w-32">Thành tiền</th>
                  <th className="px-2 py-2 w-10 text-center"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {formItems.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-6 text-center text-slate-400">
                      Chưa có sản phẩm nào. Chọn từ dropdown phía trên để thêm.
                    </td>
                  </tr>
                ) : (
                  formItems.map((item, idx) => (
                    <tr key={item.productId}>
                      <td className="px-3 py-2">
                        <div className="font-semibold text-slate-800">{item.productName}</div>
                        <div className="font-mono text-[10px] text-slate-400">{item.productCode}</div>
                      </td>
                      <td className="px-3 py-2 text-center">
                        <input
                          type="number"
                          min="1"
                          value={item.quantity}
                          onChange={(e) => handleUpdateItemQty(idx, Number(e.target.value))}
                          className="w-16 h-7 px-2 border border-slate-300 rounded text-center text-xs font-semibold"
                        />
                      </td>
                      <td className="px-3 py-2 text-right">
                        {item.unitPrice.toLocaleString('vi-VN')} đ
                      </td>
                      <td className="px-3 py-2 text-right font-medium text-slate-800">
                        {item.subtotal.toLocaleString('vi-VN')} đ
                      </td>
                      <td className="px-2 py-2 text-center">
                        <button
                          type="button"
                          onClick={() => handleRemoveItem(idx)}
                          className="text-slate-400 hover:text-rose-600 p-1 cursor-pointer"
                        >
                          <Trash2 size={13} />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Tổng kết tiền và thanh toán */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4 pt-3 border-t border-slate-100">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Ghi chú giao hàng</label>
            <textarea
              rows={2}
              value={formNotes}
              onChange={(e) => setFormNotes(e.target.value)}
              placeholder="Địa chỉ công trình, số xe, người nhận..."
              className="w-full p-2 border border-slate-300 rounded-[6px] text-xs resize-none text-slate-800"
            />
          </div>

          <div className="space-y-1.5 text-xs text-slate-700 bg-[#F7FAFC] p-3 rounded-[6px] border border-slate-200">
            <div className="flex justify-between">
              <span>Tổng giá trị đơn:</span>
              <span className="font-bold text-slate-900 text-sm">
                {formTotalAmount.toLocaleString('vi-VN')} đ
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span>Khách tạm ứng trước:</span>
              <input
                type="number"
                value={formPaidAmount}
                onChange={(e) => setFormPaidAmount(Number(e.target.value))}
                className="w-32 h-7 px-2 border border-slate-300 rounded text-right font-semibold text-slate-800"
              />
            </div>
            <div className="flex justify-between pt-1 border-t border-slate-200 font-semibold">
              <span>Còn nợ ghi nhận vào tài khoản:</span>
              <span className="text-rose-600">
                {Math.max(0, formTotalAmount - formPaidAmount).toLocaleString('vi-VN')} đ
              </span>
            </div>
          </div>
        </div>
      </Modal>

      {/* ── Modal 2: Xem Chi Tiết Đơn Hàng ── */}
      <Modal
        isOpen={viewModalOpen}
        onClose={() => setViewModalOpen(false)}
        title={`Chi tiết đơn hàng: ${selectedOrder?.orderCode}`}
        subtitle={`Người tạo: ${selectedOrder?.createdBy} | Ngày đặt: ${selectedOrder?.orderDate}`}
        hideFooter
        maxWidth="3xl"
      >
        {selectedOrder && (
          <div className="space-y-4 text-xs">
            <div className="p-3 bg-blue-50/50 rounded-[6px] border border-blue-100 flex items-start gap-3">
              <Building size={18} className="text-[#2B6CB0] shrink-0 mt-0.5" />
              <div>
                <div className="font-bold text-slate-800 text-sm">{selectedOrder.customerName}</div>
                <div className="text-slate-500">SĐT: {selectedOrder.customerPhone}</div>
                {selectedOrder.notes && (
                  <div className="text-slate-600 italic mt-1">Ghi chú: {selectedOrder.notes}</div>
                )}
              </div>
            </div>

            <div className="border border-slate-200 rounded-[6px] overflow-hidden">
              <table className="w-full text-xs text-left">
                <thead className="bg-[#F7FAFC] border-b border-slate-200 font-semibold text-slate-600">
                  <tr>
                    <th className="px-3 py-2">Mã SP</th>
                    <th className="px-3 py-2">Tên sản phẩm</th>
                    <th className="px-3 py-2 text-center">SL</th>
                    <th className="px-3 py-2 text-right">Đơn giá</th>
                    <th className="px-3 py-2 text-right">Thành tiền</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {selectedOrder.items.map((item, idx) => (
                    <tr key={idx}>
                      <td className="px-3 py-2 font-mono text-slate-500">{item.productCode}</td>
                      <td className="px-3 py-2 font-medium">{item.productName}</td>
                      <td className="px-3 py-2 text-center">{item.quantity} {item.uom}</td>
                      <td className="px-3 py-2 text-right">{item.unitPrice.toLocaleString('vi-VN')} đ</td>
                      <td className="px-3 py-2 text-right font-semibold">{item.subtotal.toLocaleString('vi-VN')} đ</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="flex justify-end pr-2 text-sm">
              <span className="text-slate-600 mr-4">Tổng cộng:</span>
              <strong className="text-[#2B6CB0]">{selectedOrder.totalAmount.toLocaleString('vi-VN')} đ</strong>
            </div>
          </div>
        )}
      </Modal>

      {/* ── Modal 3: Gộp Đơn Hàng & Kiểm Tra Hạn Mức Tín Dụng (Credit Limit Check) ── */}
      <Modal
        isOpen={consolidateModalOpen}
        onClose={() => setConsolidateModalOpen(false)}
        title="Gộp đơn hàng xuất kho (Order Consolidation)"
        subtitle="Chọn các đơn hàng cùng khách hàng để gộp thành 1 lệnh xuất kho. Hệ thống tự động kiểm tra hạn mức nợ."
        onSave={handleConsolidate}
        saveText="Xác nhận gộp & Tạo lệnh xuất kho"
        isSaving={isSaving}
        maxWidth="3xl"
      >
        {consolidateError && (
          <div className="p-3 rounded-[6px] bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
            <AlertTriangle size={16} className="shrink-0" />
            <span>{consolidateError}</span>
          </div>
        )}

        {consolidateSuccess && (
          <div className="p-3 rounded-[6px] bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs flex items-center gap-2">
            <CheckCircle2 size={16} className="shrink-0" />
            <span>{consolidateSuccess}</span>
          </div>
        )}

        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">
            Chọn khách hàng <span className="text-rose-500">*</span>
          </label>
          <select
            value={consolidateCustomerId}
            onChange={(e) => {
              setConsolidateCustomerId(e.target.value);
              setSelectedOrderIds([]);
            }}
            className="w-full h-9 px-3 rounded-[6px] border border-slate-300 text-xs bg-white text-slate-800 focus:outline-none focus:border-[#2B6CB0]"
          >
            {customers.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name} (Nợ hiện tại: {c.currentDebt.toLocaleString()} đ / Hạn mức: {c.creditLimit.toLocaleString()} đ)
              </option>
            ))}
          </select>
        </div>

        {/* Danh sách đơn pending của khách này */}
        <div className="mt-3">
          <label className="block text-xs font-semibold text-slate-700 mb-1.5">
            Chọn các đơn hàng cần gộp (Chỉ hiển thị đơn Chờ xử lý)
          </label>
          {candidateOrdersForConsolidate.length === 0 ? (
            <div className="p-6 text-center text-xs text-slate-400 border border-dashed border-slate-200 rounded-[6px]">
              Khách hàng này hiện không có đơn hàng nào ở trạng thái Chờ xử lý để gộp.
            </div>
          ) : (
            <div className="border border-slate-200 rounded-[6px] divide-y divide-slate-100 max-h-48 overflow-y-auto">
              {candidateOrdersForConsolidate.map((order) => {
                const checked = selectedOrderIds.includes(order.id);
                return (
                  <label
                    key={order.id}
                    className={`flex items-center justify-between p-3 cursor-pointer text-xs hover:bg-slate-50 transition ${
                      checked ? 'bg-blue-50/50' : ''
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedOrderIds([...selectedOrderIds, order.id]);
                          } else {
                            setSelectedOrderIds(selectedOrderIds.filter((id) => id !== order.id));
                          }
                        }}
                        className="rounded border-slate-300 text-[#2B6CB0] focus:ring-0"
                      />
                      <div>
                        <span className="font-mono font-bold text-[#2B6CB0]">{order.orderCode}</span>
                        <span className="text-slate-400 ml-2">({order.orderDate})</span>
                        <div className="text-slate-500 text-[11px] mt-0.5">
                          {order.items.map((i) => `${i.productName} (${i.quantity})`).join(', ')}
                        </div>
                      </div>
                    </div>
                    <div className="text-right font-semibold text-slate-800">
                      {order.remainingAmount.toLocaleString('vi-VN')} đ
                    </div>
                  </label>
                );
              })}
            </div>
          )}
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">
            Địa chỉ giao hàng thực tế
          </label>
          <input
            type="text"
            value={shippingAddress}
            onChange={(e) => setShippingAddress(e.target.value)}
            placeholder="Kho công trình hoặc địa chỉ giao thực tế..."
            className="w-full h-9 px-3 rounded-[6px] border border-slate-300 text-xs text-slate-800 focus:outline-none focus:border-[#2B6CB0]"
          />
        </div>
      </Modal>
    </div>
  );
};
