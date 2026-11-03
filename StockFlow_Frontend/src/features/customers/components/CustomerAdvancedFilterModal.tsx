// src/features/customers/components/CustomerAdvancedFilterModal.tsx
// Modal bộ lọc nâng cao cho màn hình Quản lý khách hàng

import React from 'react';
import { Modal, Form, InputNumber, Select, DatePicker } from 'antd';

interface CustomerAdvancedFilterModalProps {
  open: boolean;
  onCancel: () => void;
  onApply: (values: any) => void;
  onReset: () => void;
}

export const CustomerAdvancedFilterModal: React.FC<CustomerAdvancedFilterModalProps> = ({
  open,
  onCancel,
  onApply,
  onReset,
}) => {
  const [form] = Form.useForm();

  return (
    <Modal
      title={<span className="text-base font-bold text-slate-800">Bộ lọc nâng cao</span>}
      open={open}
      onCancel={onCancel}
      onOk={() => {
        const values = form.getFieldsValue();
        onApply(values);
        onCancel();
      }}
      okText="Áp dụng bộ lọc"
      cancelText="Đóng"
      width={520}
      okButtonProps={{ className: '!bg-[#1E56A0] hover:!bg-blue-700' }}
    >
      <Form form={form} layout="vertical" className="pt-3">
        <Form.Item
          name="branch"
          label={<span className="text-xs font-semibold text-slate-600">Chi nhánh / Kho phụ trách</span>}
        >
          <Select placeholder="Tất cả chi nhánh" allowClear>
            <Select.Option value="K001">Kho Tổng Gia Lâm (K001)</Select.Option>
            <Select.Option value="K002">Kho Đông Anh (K002)</Select.Option>
            <Select.Option value="K003">Kho Hà Đông (K003)</Select.Option>
            <Select.Option value="K004">Kho Hoàn Kiếm (K004)</Select.Option>
          </Select>
        </Form.Item>

        <div className="grid grid-cols-2 gap-4">
          <Form.Item
            name="minDebt"
            label={<span className="text-xs font-semibold text-slate-600">Dư nợ từ (VNĐ)</span>}
          >
            <InputNumber
              className="w-full"
              formatter={(v) => `${v}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
              placeholder="0"
            />
          </Form.Item>

          <Form.Item
            name="maxDebt"
            label={<span className="text-xs font-semibold text-slate-600">Dư nợ đến (VNĐ)</span>}
          >
            <InputNumber
              className="w-full"
              formatter={(v) => `${v}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
              placeholder="500,000,000"
            />
          </Form.Item>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <Form.Item
            name="minCreditLimit"
            label={<span className="text-xs font-semibold text-slate-600">Hạn mức cấp từ (VNĐ)</span>}
          >
            <InputNumber
              className="w-full"
              formatter={(v) => `${v}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
              placeholder="50,000,000"
            />
          </Form.Item>

          <Form.Item
            name="maxCreditLimit"
            label={<span className="text-xs font-semibold text-slate-600">Hạn mức cấp đến (VNĐ)</span>}
          >
            <InputNumber
              className="w-full"
              formatter={(v) => `${v}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
              placeholder="1,000,000,000"
            />
          </Form.Item>
        </div>

        <div className="flex justify-end pt-2">
          <button
            type="button"
            className="text-xs text-rose-600 hover:underline cursor-pointer"
            onClick={() => {
              form.resetFields();
              onReset();
              onCancel();
            }}
          >
            Đặt lại mặc định
          </button>
        </div>
      </Form>
    </Modal>
  );
};

