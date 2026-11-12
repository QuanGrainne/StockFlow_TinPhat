// src/features/customers/components/CustomerFormModal.tsx
// Modal tạo mới / chỉnh sửa thông tin khách hàng tuân thủ toàn diện bộ quy tắc validation VR-01 -> VR-14

import React, { useEffect, useState } from 'react';
import { Modal, Form, Input, InputNumber, Select, message } from 'antd';
import { Customer } from '../types';
import { ApiClientError } from '@/lib/api/client';

interface CustomerFormModalProps {
  open: boolean;
  customer?: Customer | null;
  onCancel: () => void;
  onSuccess: (customer: Customer) => Promise<void> | void;
}

export const CustomerFormModal: React.FC<CustomerFormModalProps> = ({
  open,
  customer,
  onCancel,
  onSuccess,
}) => {
  const [form] = Form.useForm();
  const [submitting, setSubmitting] = useState(false);
  const isEdit = Boolean(customer);

  // Khởi tạo giá trị khi mở modal
  useEffect(() => {
    if (open) {
      if (customer) {
        form.setFieldsValue({
          code: customer.code,
          name: customer.name,
          phone: customer.phone,
          email: customer.email,
          address: customer.address,
          creditLimit: customer.creditLimit ?? 0,
          status: customer.status || 'ACTIVE',
        });
      } else {
        form.resetFields();
        form.setFieldsValue({
          code: '',
          name: '',
          phone: '',
          email: '',
          address: '',
          creditLimit: 100000000,
          status: 'ACTIVE',
        });
      }
    }
  }, [open, customer, form]);

  // Xử lý submit form
  const handleFinish = async (values: any) => {
    try {
      setSubmitting(true);

      // Chuẩn hóa dữ liệu trước khi gửi đi (VR-01, VR-05, VR-06, VR-07, VR-08)
      const normalizedName = (values.name || '').trim();
      const normalizedPhone = (values.phone || '').trim();
      const normalizedEmail = (values.email || '').trim().toLowerCase();
      const normalizedAddress = (values.address || '').trim();
      const rawCode = (values.code || '').trim();
      const normalizedCode = rawCode ? rawCode.toUpperCase() : undefined;

      await onSuccess({
        id: customer?.id || 0,
        code: normalizedCode || (isEdit ? customer?.code || '' : ''),
        name: normalizedName,
        phone: normalizedPhone,
        email: normalizedEmail,
        address: normalizedAddress,
        creditLimit: values.creditLimit !== undefined && values.creditLimit !== null ? Number(values.creditLimit) : 0,
        currentDebt: customer?.currentDebt || 0,
        isOverCreditLimit: (customer?.currentDebt || 0) > (values.creditLimit || 0),
        status: values.status || 'ACTIVE',
      });

      // VR-14: Thành công -> đóng form được kích hoạt từ onSuccess
    } catch (e: any) {
      const apiErr = e as ApiClientError;

      // II.2.6: Khi Backend trả lỗi validation hoặc trùng mã, ánh xạ lỗi vào đúng trường
      if (apiErr.status === 409 || apiErr.response?.code === 'CUSTOMER_CODE_EXISTS') {
        const errorMsg = apiErr.response?.message || 'Mã khách hàng đã tồn tại.';
        form.setFields([
          {
            name: 'code',
            errors: [errorMsg],
          },
        ]);
        message.error(errorMsg);
      } else if (apiErr.response?.errors && typeof apiErr.response.errors === 'object') {
        const fieldErrors: { name: string; errors: string[] }[] = [];
        const errs = apiErr.response.errors;

        for (const [key, val] of Object.entries(errs)) {
          const lowerKey = key.toLowerCase();
          const msgs = Array.isArray(val) ? val : [String(val)];

          if (lowerKey === 'name') fieldErrors.push({ name: 'name', errors: msgs });
          else if (lowerKey === 'phone') fieldErrors.push({ name: 'phone', errors: msgs });
          else if (lowerKey === 'email') fieldErrors.push({ name: 'email', errors: msgs });
          else if (lowerKey === 'code') fieldErrors.push({ name: 'code', errors: msgs });
          else if (lowerKey === 'address') fieldErrors.push({ name: 'address', errors: msgs });
          else if (lowerKey.includes('creditlimit')) fieldErrors.push({ name: 'creditLimit', errors: msgs });
          else if (lowerKey === 'status') fieldErrors.push({ name: 'status', errors: msgs });
          else if (lowerKey === 'contact' || lowerKey === 'request') {
            fieldErrors.push({ name: 'phone', errors: msgs });
            fieldErrors.push({ name: 'email', errors: msgs });
          }
        }

        if (fieldErrors.length > 0) {
          form.setFields(fieldErrors);
        }
        message.error(apiErr.response.message || 'Dữ liệu không hợp lệ. Vui lòng kiểm tra lại các trường báo lỗi.');
      } else {
        // II.2.7: Khi lỗi mạng hoặc máy chủ, giữ nguyên dữ liệu đã nhập và chỉ thông báo lỗi
        message.error(apiErr.message || 'Không thể kết nối đến máy chủ. Dữ liệu đã nhập được giữ nguyên.');
      }
    } finally {
      // II.2.5: Bật lại nút tạo khi xử lý xong
      setSubmitting(false);
    }
  };

  return (
    <Modal
      title={
        <div className="text-base font-bold text-slate-800">
          {isEdit ? 'Chỉnh sửa thông tin khách hàng' : 'Thêm mới khách hàng'}
        </div>
      }
      open={open}
      onCancel={submitting ? undefined : onCancel}
      onOk={() => form.submit()}
      okText={isEdit ? 'Lưu thay đổi' : 'Tạo khách hàng'}
      cancelText="Hủy bỏ"
      confirmLoading={submitting}
      destroyOnHidden
      centered
      width={580}
      okButtonProps={{
        disabled: submitting,
        className: 'bg-[#0F60B6] hover:bg-blue-700 text-xs font-semibold px-4 py-1.5 h-auto',
      }}
      cancelButtonProps={{
        disabled: submitting,
        className: 'text-xs px-4 py-1.5 h-auto border-slate-200 text-slate-600',
      }}
    >
      <Form
        form={form}
        layout="vertical"
        onFinish={handleFinish}
        className="mt-4 pt-1"
        requiredMark={false}
        validateTrigger={['onBlur']} // II.2.1 & II.2.2: Không hiện lỗi đỏ lúc mở form; hiện khi người dùng rời trường (onBlur)
        scrollToFirstError={{ behavior: 'smooth', block: 'center' }} // II.2.4: Tự động focus vào lỗi đầu tiên
      >
        <div className="grid grid-cols-2 gap-x-4">
          {/* VR-08 / FE-CODE-01 -> FE-CODE-08: Mã khách hàng */}
          <Form.Item
            name="code"
            label={<span className="text-xs font-semibold text-slate-700">Mã khách hàng</span>}
            tooltip="Hệ thống tự động sinh mã dạng KHxxxxx nếu để trống"
            rules={[
              {
                validator: async (_, value) => {
                  if (!value || !value.trim()) return Promise.resolve(); // FE-CODE-01: Để trống thì cho phép (hệ thống tự sinh)
                  const val = value.trim();
                  if (val.toUpperCase() === 'TỰ ĐỘNG' || val.toUpperCase() === 'AUTO') return Promise.resolve();

                  if (/\s/.test(val)) {
                    return Promise.reject(new Error('Mã khách hàng không được chứa khoảng trắng ở giữa.')); // FE-CODE-04
                  }
                  if (val.length > 30) {
                    return Promise.reject(new Error('Mã khách hàng tối đa 30 ký tự.')); // FE-CODE-06
                  }
                  if (!/^[a-zA-Z0-9\-_]+$/.test(val)) {
                    return Promise.reject(new Error('Mã chỉ được chứa chữ cái, chữ số và dấu gạch.')); // FE-CODE-05
                  }
                  return Promise.resolve();
                },
              },
            ]}
          >
            <Input
              placeholder={isEdit ? customer?.code : 'Tự động (KHxxxxx)'}
              disabled={isEdit || submitting}
              className="font-mono text-xs"
            />
          </Form.Item>

          {/* VR-02, VR-04, VR-05 / FE-CONTACT: Số điện thoại */}
          <Form.Item
            name="phone"
            dependencies={['email']}
            label={
              <span className="text-xs font-semibold text-slate-700">
                Số điện thoại <span className="text-slate-400 font-normal">(hoặc Email)</span>
              </span>
            }
            rules={[
              {
                validator: async (_, value) => {
                  const phoneStr = (value || '').trim();
                  const emailStr = (form.getFieldValue('email') || '').trim();

                  // FE-CONTACT-04, FE-CONTACT-13: Cả 2 cùng trống -> từ chối
                  if (!phoneStr && !emailStr) {
                    return Promise.reject(new Error('Cần cung cấp ít nhất Số điện thoại hoặc Email.'));
                  }

                  // FE-CONTACT-05, FE-CONTACT-06: Nếu đã nhập Phone -> phải đúng định dạng
                  if (phoneStr) {
                    const clean = phoneStr.replace(/[\s\-\.]+/g, '');
                    const phoneRegex = /^(?:\+84|0)[1-9]\d{8,9}$/;
                    if (!phoneRegex.test(clean)) {
                      return Promise.reject(
                        new Error('Số điện thoại không đúng định dạng (10-11 số, ví dụ 0912 345 678).')
                      );
                    }
                  }

                  return Promise.resolve();
                },
              },
            ]}
          >
            <Input
              placeholder="Ví dụ: 0912 345 678"
              disabled={submitting}
              className="text-xs"
              onChange={() => {
                // Kích hoạt re-validate liên hệ chéo khi thay đổi
                if (form.getFieldError('email').length > 0) {
                  form.validateFields(['email']);
                }
              }}
            />
          </Form.Item>
        </div>

        {/* VR-01 / FE-NAME-01 -> FE-NAME-10: Tên khách hàng */}
        <Form.Item
          name="name"
          label={
            <span className="text-xs font-semibold text-slate-700">
              Tên khách hàng / Doanh nghiệp <span className="text-rose-500">*</span>
            </span>
          }
          rules={[
            {
              validator: async (_, value) => {
                const trimmed = (value || '').trim();
                if (!trimmed) {
                  return Promise.reject(new Error('Tên khách hàng không được để trống.')); // FE-NAME-01, FE-NAME-02
                }
                if (trimmed.length < 2) {
                  return Promise.reject(new Error('Tên khách hàng phải có từ 2 ký tự trở lên.')); // VR-01
                }
                if (trimmed.length > 200) {
                  return Promise.reject(new Error('Tên khách hàng tối đa 200 ký tự.')); // FE-NAME-07
                }
                return Promise.resolve(); // FE-NAME-03, FE-NAME-04, FE-NAME-08: Hỗ trợ tiếng Việt, số, &, ., -
              },
            },
          ]}
        >
          <Input
            placeholder="Ví dụ: Công ty CP Thiết bị Nam Á hoặc Anh Tuấn"
            disabled={submitting}
            className="text-xs"
          />
        </Form.Item>

        {/* VR-03, VR-04, VR-06 / FE-CONTACT: Email liên hệ */}
        <Form.Item
          name="email"
          dependencies={['phone']}
          label={
            <span className="text-xs font-semibold text-slate-700">
              Email liên hệ <span className="text-slate-400 font-normal">(hoặc Số điện thoại)</span>
            </span>
          }
          rules={[
            {
              validator: async (_, value) => {
                const emailStr = (value || '').trim();
                const phoneStr = (form.getFieldValue('phone') || '').trim();

                // FE-CONTACT-04, FE-CONTACT-13: Cả 2 cùng trống -> từ chối
                if (!emailStr && !phoneStr) {
                  return Promise.reject(new Error('Cần cung cấp ít nhất Số điện thoại hoặc Email.'));
                }

                // FE-CONTACT-07, FE-CONTACT-12: Nếu đã nhập Email -> kiểm tra format & max 254 chars
                if (emailStr) {
                  if (emailStr.length > 254) {
                    return Promise.reject(new Error('Email không được vượt quá 254 ký tự.'));
                  }
                  const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
                  if (!emailRegex.test(emailStr)) {
                    return Promise.reject(new Error('Email không đúng định dạng (ví dụ: contact@nama.vn).'));
                  }
                }

                return Promise.resolve();
              },
            },
          ]}
        >
          <Input
            placeholder="Ví dụ: contact@nama.vn"
            disabled={submitting}
            className="text-xs"
            onChange={() => {
              // Kích hoạt re-validate liên hệ chéo khi thay đổi
              if (form.getFieldError('phone').length > 0) {
                form.validateFields(['phone']);
              }
            }}
          />
        </Form.Item>

        {/* VR-07 / FE-ADDR-01 -> FE-ADDR-08: Địa chỉ */}
        <Form.Item
          name="address"
          label={<span className="text-xs font-semibold text-slate-700">Địa chỉ giao dịch / kho hàng</span>}
          rules={[
            {
              validator: async (_, value) => {
                if (!value || !value.trim()) return Promise.resolve(); // FE-ADDR-01: Để trống hợp lệ
                const val = value.trim();
                if (val.length > 500) {
                  return Promise.reject(new Error('Địa chỉ tối đa 500 ký tự.')); // FE-ADDR-06
                }
                return Promise.resolve();
              },
            },
          ]}
        >
          <Input
            placeholder="Ví dụ: 45 Nguyễn Trãi, Thanh Xuân, Hà Nội"
            disabled={submitting}
            className="text-xs"
          />
        </Form.Item>

        <div className="grid grid-cols-2 gap-x-4">
          {/* VR-09 / FE-CREDIT-01 -> FE-CREDIT-12: Hạn mức tín dụng */}
          <Form.Item
            name="creditLimit"
            label={<span className="text-xs font-semibold text-slate-700">Hạn mức tín dụng nợ (VNĐ)</span>}
            rules={[
              {
                validator: async (_, value) => {
                  if (value === undefined || value === null || value === '') return Promise.resolve();
                  const num = Number(value);
                  if (isNaN(num)) {
                    return Promise.reject(new Error('Hạn mức phải là số hợp lệ.')); // FE-CREDIT-05
                  }
                  if (num < 0) {
                    return Promise.reject(new Error('Hạn mức tín dụng không được âm.')); // FE-CREDIT-04
                  }
                  if (!Number.isInteger(num)) {
                    return Promise.reject(new Error('Hạn mức phải là số tiền nguyên (không có số thập phân).')); // FE-CREDIT-07
                  }
                  return Promise.resolve();
                },
              },
            ]}
          >
            <InputNumber
              className="w-full text-xs"
              disabled={submitting}
              min={0}
              step={1000000}
              formatter={(value) => `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
              parser={(value) => value?.replace(/\$\s?|(,*)/g, '') as any}
              placeholder="100,000,000"
            />
          </Form.Item>

          {/* VR-10 / FE-STATUS-01 -> FE-STATUS-05: Trạng thái */}
          <Form.Item
            name="status"
            label={<span className="text-xs font-semibold text-slate-700">Trạng thái</span>}
            rules={[{ required: true, message: 'Vui lòng chọn trạng thái.' }]}
          >
            <Select disabled={submitting} className="text-xs">
              <Select.Option value="ACTIVE">Đang hoạt động</Select.Option>
              <Select.Option value="INACTIVE">Tạm khóa / Ngừng GD</Select.Option>
            </Select>
          </Form.Item>
        </div>
      </Form>
    </Modal>
  );
};
