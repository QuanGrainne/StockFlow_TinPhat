'use client';

import { useState } from 'react';
import { Modal, message } from 'antd';
import { supplierService } from '@/features/suppliers/services/supplierService';
import { Supplier } from '@/features/suppliers/types';

interface QuickAddSupplierModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess: (supplier: Supplier) => void;
}

export function QuickAddSupplierModal({ open, onClose, onSuccess }: QuickAddSupplierModalProps) {
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleOk() {
    if (!name.trim()) {
      message.error('Vui lòng nhập tên nhà cung cấp');
      return;
    }
    try {
      setLoading(true);
      const created = await supplierService.createSupplier({
        name: name.trim(),
        phone: phone.trim() || undefined,
      });
      message.success(`Đã tạo NCC: ${created.name} (${created.code})`);
      onSuccess(created);
      setName('');
      setPhone('');
      onClose();
    } catch (err: any) {
      message.error(err.message || 'Lỗi khi tạo nhà cung cấp');
    } finally {
      setLoading(false);
    }
  }

  return (
    <Modal
      title="Thêm nhanh nhà cung cấp mới"
      open={open}
      onCancel={onClose}
      onOk={handleOk}
      confirmLoading={loading}
      okText="Lưu & Chọn NCC"
      cancelText="Hủy"
      okButtonProps={{ style: { backgroundColor: '#0071BA' } }}
    >
      <div className="space-y-3 py-2 text-xs">
        <div>
          <label className="block text-slate-700 font-medium mb-1">Tên nhà cung cấp *</label>
          <input
            type="text"
            placeholder="Ví dụ: Công ty Nhựa Song Long"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full h-8 px-2.5 border border-slate-300 rounded text-xs outline-none focus:border-blue-500"
          />
        </div>
        <div>
          <label className="block text-slate-700 font-medium mb-1">Số điện thoại</label>
          <input
            type="text"
            placeholder="0912 345 678"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            className="w-full h-8 px-2.5 border border-slate-300 rounded text-xs outline-none focus:border-blue-500"
          />
        </div>
      </div>
    </Modal>
  );
}
