'use client';

import { useState } from 'react';
import { Modal, message } from 'antd';
import { productService, BackendProduct } from '@/features/products/services/productService';

interface QuickAddProductModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess: (product: BackendProduct) => void;
}

export function QuickAddProductModal({ open, onClose, onSuccess }: QuickAddProductModalProps) {
  const [name, setName] = useState('');
  const [unit, setUnit] = useState('Cái');
  const [price, setPrice] = useState<number>(0);
  const [loading, setLoading] = useState(false);

  async function handleOk() {
    if (!name.trim()) {
      message.error('Vui lòng nhập tên hàng hóa');
      return;
    }
    try {
      setLoading(true);
      const created = await productService.createProduct({
        name: name.trim(),
        uom: unit || 'Cái',
        costPrice: price || 0,
        standardPrice: price ? price * 1.2 : 0,
      });
      message.success(`Đã tạo hàng hóa: ${created.name}`);
      onSuccess(created);
      setName('');
      setPrice(0);
      onClose();
    } catch (err: any) {
      message.error(err.message || 'Lỗi khi tạo hàng hóa');
    } finally {
      setLoading(false);
    }
  }

  return (
    <Modal
      title="Thêm nhanh hàng hóa mới"
      open={open}
      onCancel={onClose}
      onOk={handleOk}
      confirmLoading={loading}
      okText="Thêm vào phiếu"
      cancelText="Hủy"
      okButtonProps={{ style: { backgroundColor: '#0070f4' } }}
    >
      <div className="space-y-3 py-2 text-xs">
        <div>
          <label className="block text-slate-700 font-medium mb-1">Tên hàng hóa *</label>
          <input
            type="text"
            placeholder="Ví dụ: Tấm ốp Nano PVC 9mm hoa văn mới"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full h-8 px-2.5 border border-slate-300 rounded text-xs outline-none focus:border-blue-500"
          />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-slate-700 font-medium mb-1">Đơn vị tính</label>
            <input
              type="text"
              placeholder="Tấm, Cây, Cuộn, Cái..."
              value={unit}
              onChange={(e) => setUnit(e.target.value)}
              className="w-full h-8 px-2.5 border border-slate-300 rounded text-xs outline-none focus:border-blue-500"
            />
          </div>
          <div>
            <label className="block text-slate-700 font-medium mb-1">Giá nhập dự kiến</label>
            <input
              type="number"
              min="0"
              step="1000"
              value={price}
              onChange={(e) => setPrice(parseInt(e.target.value) || 0)}
              className="w-full h-8 px-2.5 border border-slate-300 rounded text-xs outline-none focus:border-blue-500"
            />
          </div>
        </div>
      </div>
    </Modal>
  );
}
