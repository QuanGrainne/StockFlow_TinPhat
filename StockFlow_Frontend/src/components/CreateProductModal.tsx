'use client';

import {
  ChevronDown,
  ChevronUp,
  ImagePlus,
  Info,
  Plus,
  Trash2,
  X,
} from 'lucide-react';
import { ChangeEvent, useState } from 'react';

type CreateProductModalProps = {
  open: boolean;
  onClose: () => void;
  mode?: 'product' | 'combo' | 'service';
};

type ImagePreview = {
  id: string;
  url: string;
  name: string;
};

function FormLabel({ children, required = false }: { children: React.ReactNode; required?: boolean }) {
  return (
    <label className="mb-1.5 block text-[13px] font-medium text-slate-700">
      {children}
      {required && <span className="ml-1 text-red-500">*</span>}
    </label>
  );
}

function TextInput({
  placeholder,
  type = 'text',
  value,
  onChange,
}: {
  placeholder?: string;
  type?: string;
  value?: string;
  onChange?: (event: ChangeEvent<HTMLInputElement>) => void;
}) {
  return (
    <input
      type={type}
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      className="h-9 w-full rounded border border-slate-300 bg-white px-3 text-sm text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
    />
  );
}

function SelectInput({ placeholder }: { placeholder: string }) {
  return (
    <select className="h-9 w-full rounded border border-slate-300 bg-white px-3 text-sm text-slate-500 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100">
      <option value="">{placeholder}</option>
      <option>Thành phẩm</option>
      <option>Nguyên vật liệu</option>
    </select>
  );
}

function Section({
  title,
  description,
  open,
  onToggle,
  children,
}: {
  title: string;
  description?: string;
  open: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}) {
  return (
    <section className="border-b border-slate-200 px-6 py-4 last:border-b-0">
      <button type="button" onClick={onToggle} className="flex w-full items-start justify-between text-left">
        <span>
          <span className="block text-sm font-semibold text-slate-800">{title}</span>
          {description && <span className="mt-1 block max-w-2xl text-xs leading-5 text-slate-500">{description}</span>}
        </span>
        {open ? <ChevronUp size={18} className="mt-0.5 text-slate-500" /> : <ChevronDown size={18} className="mt-0.5 text-slate-500" />}
      </button>
      {open && <div className="pt-4">{children}</div>}
    </section>
  );
}

export default function CreateProductModal({ open, onClose, mode = 'product' }: CreateProductModalProps) {
  const [activeTab, setActiveTab] = useState<'info' | 'description'>('info');
  const [costOpen, setCostOpen] = useState(true);
  const [stockOpen, setStockOpen] = useState(false);
  const [locationOpen, setLocationOpen] = useState(false);
  const [unitOpen, setUnitOpen] = useState(false);
  const [directSale, setDirectSale] = useState(true);
  const [images, setImages] = useState<ImagePreview[]>([]);
  const [weightUnit, setWeightUnit] = useState('g');
  const [componentSearch, setComponentSearch] = useState('');
  const [comboComponents, setComboComponents] = useState<Array<{ code: string; name: string; quantity: number; cost: number; price: number }>>([]);

  const title = mode === 'combo' ? 'Tạo combo - đóng gói' : mode === 'service' ? 'Tạo dịch vụ' : 'Tạo hàng hóa';

  if (!open) return null;

  function handleImages(event: ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files ?? []).filter((file) => file.size <= 2 * 1024 * 1024);
    const previews = files.map((file) => ({
      id: `${file.name}-${file.lastModified}`,
      url: URL.createObjectURL(file),
      name: file.name,
    }));
    setImages((current) => [...current, ...previews]);
    event.target.value = '';
  }

  function removeImage(id: string) {
    setImages((current) => current.filter((image) => image.id !== id));
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4" role="dialog" aria-modal="true" aria-labelledby="create-product-title">
      <div className="flex max-h-[92vh] w-full max-w-4xl flex-col overflow-hidden rounded-lg bg-white shadow-2xl">
        <header className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
          <div>
            <h2 id="create-product-title" className="text-xl font-semibold text-slate-900">{title}</h2>
            <div className="mt-3 flex gap-6">
              <button type="button" onClick={() => setActiveTab('info')} className={`border-b-2 pb-2 text-sm font-medium ${activeTab === 'info' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500'}`}>
                Thông tin
              </button>
              <button type="button" onClick={() => setActiveTab('description')} className={`border-b-2 pb-2 text-sm font-medium ${activeTab === 'description' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500'}`}>
                Mô tả
              </button>
            </div>
          </div>
          <button type="button" onClick={onClose} className="rounded p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700" aria-label="Đóng">
            <X size={20} />
          </button>
        </header>

        <div className="overflow-y-auto">
          {activeTab === 'description' ? (
            <div className="p-6">
              <FormLabel>Mô tả hàng hóa</FormLabel>
              <textarea className="min-h-40 w-full rounded border border-slate-300 p-3 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100" placeholder="Nhập mô tả hàng hóa..." />
            </div>
          ) : (
            <>
              <div className="grid gap-6 border-b border-slate-200 px-6 py-5 lg:grid-cols-[1fr_270px]">
                <div className="space-y-4">
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div><FormLabel>Mã hàng</FormLabel><TextInput placeholder="Tự động" /></div>
                    <div><FormLabel>Mã vạch</FormLabel><TextInput placeholder="Nhập mã vạch" /></div>
                  </div>
                  <div><FormLabel required>Tên hàng</FormLabel><TextInput placeholder="Bắt buộc" /></div>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                      <div className="mb-1.5 flex items-center justify-between"><FormLabel>Nhóm hàng</FormLabel><button type="button" className="text-xs text-blue-600 hover:underline">Tạo mới</button></div>
                      <SelectInput placeholder="Chọn nhóm hàng" />
                    </div>
                    <div>
                      <div className="mb-1.5 flex items-center justify-between"><FormLabel>Thương hiệu</FormLabel><button type="button" className="text-xs text-blue-600 hover:underline">Tạo mới</button></div>
                      <SelectInput placeholder="Chọn thương hiệu" />
                    </div>
                  </div>
                </div>
                <div>
                  <FormLabel>Ảnh hàng hóa</FormLabel>
                  <label className="flex h-36 cursor-pointer flex-col items-center justify-center rounded border border-dashed border-slate-300 bg-slate-50 text-center transition hover:border-blue-400 hover:bg-blue-50/40">
                    <ImagePlus size={29} className="text-slate-400" />
                    <span className="mt-2 text-sm font-medium text-slate-600">Thêm ảnh</span>
                    <span className="mt-1 text-xs text-slate-400">Mỗi ảnh không quá 2 MB</span>
                    <input type="file" accept="image/*" multiple className="hidden" onChange={handleImages} />
                  </label>
                  {images.length > 0 && (
                    <div className="mt-3 flex flex-wrap gap-2">
                      {images.map((image) => (
                        <div key={image.id} className="group relative h-12 w-12 overflow-hidden rounded border border-slate-200">
                          <div
                            role="img"
                            aria-label={image.name}
                            className="h-full w-full bg-cover bg-center"
                            style={{ backgroundImage: `url("${image.url}")` }}
                          />
                          <button type="button" onClick={() => removeImage(image.id)} className="absolute inset-0 hidden items-center justify-center bg-black/50 text-white group-hover:flex" aria-label={`Xóa ${image.name}`}><Trash2 size={14} /></button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {mode === 'combo' ? (
                <>
                  <Section title="Hàng thành phần" description="Thêm các hàng hóa cấu thành combo - đóng gói" open={costOpen} onToggle={() => setCostOpen((value) => !value)}>
                    <div className="rounded-lg border border-slate-200">
                      <div className="border-b border-slate-200 p-3">
                        <input
                          value={componentSearch}
                          onChange={(event) => setComponentSearch(event.target.value)}
                          onKeyDown={(event) => {
                            if (event.key === 'Enter' && componentSearch.trim()) {
                              event.preventDefault();
                              setComboComponents((current) => [
                                ...current,
                                {
                                  code: `TP-${current.length + 1}` ,
                                  name: componentSearch.trim(),
                                  quantity: 1,
                                  cost: 0,
                                  price: 0,
                                },
                              ]);
                              setComponentSearch('');
                            }
                          }}
                          placeholder="Thêm hàng thành phần"
                          className="h-9 w-full rounded border border-slate-300 px-3 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                        />
                      </div>
                      <div className="overflow-x-auto">
                        <table className="w-full min-w-[760px] text-left text-xs">
                          <thead className="bg-slate-50 text-slate-500">
                            <tr>{['STT', 'Mã hàng', 'Tên hàng thành phần', 'Số lượng', 'Giá vốn', 'Tổng giá vốn', 'Giá bán', 'Tổng giá bán'].map((label) => <th key={label} className="px-3 py-2 font-medium">{label}</th>)}</tr>
                          </thead>
                          <tbody>
                            {comboComponents.length === 0 ? (
                              <tr><td colSpan={8} className="py-10 text-center text-slate-400">Chưa có hàng thành phần</td></tr>
                            ) : comboComponents.map((item, index) => (
                              <tr key={item.code} className="border-t border-slate-100">
                                <td className="px-3 py-2">{index + 1}</td><td className="px-3 py-2">{item.code}</td><td className="px-3 py-2">{item.name}</td><td className="px-3 py-2">{item.quantity}</td><td className="px-3 py-2">{item.cost}</td><td className="px-3 py-2">{item.cost * item.quantity}</td><td className="px-3 py-2">{item.price}</td><td className="px-3 py-2">{item.price * item.quantity}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </Section>
                  <Section title="Giá bán" open={stockOpen} onToggle={() => setStockOpen((value) => !value)}>
                    <div className="max-w-sm"><div className="mb-1.5 flex items-center justify-between"><FormLabel>Giá bán</FormLabel><button type="button" className="text-xs text-blue-600 hover:underline">Thiết lập giá</button></div><TextInput type="number" value="0" /></div>
                  </Section>
                </>
              ) : (
              <Section title="Giá vốn, giá bán" open={costOpen} onToggle={() => setCostOpen((value) => !value)}>
                <div className="grid gap-4 rounded-lg bg-slate-50/80 p-4 sm:grid-cols-2">
                  <div><FormLabel>Giá vốn</FormLabel><TextInput type="number" value="0" /></div>
                  <div>
                    <div className="mb-1.5 flex items-center justify-between"><FormLabel>Giá bán</FormLabel><button type="button" className="text-xs text-blue-600 hover:underline">Thiết lập giá</button></div>
                    <TextInput type="number" value="0" />
                  </div>
                </div>
              </Section>
              )}

              {mode === 'product' && <Section title="Tồn kho" description="Quản lý số lượng tồn kho và định mức tồn. Khi tồn kho chạm đến định mức, bạn sẽ nhận được cảnh báo" open={stockOpen} onToggle={() => setStockOpen((value) => !value)}>
                <div className="grid gap-4 sm:grid-cols-2"><div><FormLabel>Tồn kho ban đầu</FormLabel><TextInput type="number" placeholder="0" /></div><div><FormLabel>Định mức tồn tối thiểu</FormLabel><TextInput type="number" placeholder="0" /></div></div>
              </Section>}

              {mode !== 'service' && <Section title="Vị trí, trọng lượng" description="Quản lý việc sắp xếp kho, vị trí bán hàng hoặc trọng lượng hàng hóa" open={locationOpen} onToggle={() => setLocationOpen((value) => !value)}>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <div className="mb-1.5 flex items-center justify-between">
                      <FormLabel>Vị trí</FormLabel>
                      <button type="button" className="text-xs text-blue-600 hover:underline">Tạo mới</button>
                    </div>
                    <SelectInput placeholder="Chọn vị trí" />
                  </div>
                  <div>
                    <FormLabel>Trọng lượng</FormLabel>
                    <div className="flex">
                      <TextInput type="number" placeholder="0" />
                      <select
                        value={weightUnit}
                        onChange={(event) => setWeightUnit(event.target.value)}
                        className="h-9 w-20 rounded-r border border-l-0 border-slate-300 bg-slate-50 px-2 text-sm text-slate-600 outline-none focus:border-blue-500"
                        aria-label="Đơn vị trọng lượng"
                      >
                        <option value="g">g</option>
                        <option value="kg">kg</option>
                        <option value="mg">mg</option>
                      </select>
                    </div>
                  </div>
                </div>
              </Section>}

              {mode !== 'combo' && <Section title="Quản lý theo đơn vị tính và thuộc tính" open={unitOpen} onToggle={() => setUnitOpen((value) => !value)}>
                <div className="space-y-5">
                  <div>
                    <h3 className="text-sm font-medium text-slate-800">Đơn vị tính</h3>
                    <p className="mt-1 text-xs text-slate-500">Thêm đơn vị bán hoặc nhập như chai, lốc, thùng...</p>
                    <div className="mt-3 grid gap-3 sm:grid-cols-[1fr_150px_auto]">
                      <TextInput placeholder="Tên đơn vị cơ bản" /><TextInput type="number" placeholder="Giá bán" /><label className="flex items-center gap-2 text-sm text-slate-600"><input type="checkbox" className="h-4 w-4 accent-blue-600" defaultChecked /> Bán trực tiếp</label>
                    </div>
                    <button type="button" className="mt-3 inline-flex items-center gap-1 text-sm font-medium text-blue-600 hover:text-blue-700"><Plus size={15} /> Thêm đơn vị</button>
                  </div>
                  <div>
                    <h3 className="text-sm font-medium text-slate-800">Thuộc tính</h3>
                    <p className="mt-1 text-xs text-slate-500">Thêm đặc điểm như hương vị, dung tích, màu sắc</p>
                    <button type="button" className="mt-3 inline-flex items-center gap-1 text-sm font-medium text-blue-600 hover:text-blue-700"><Plus size={15} /> Thêm thuộc tính</button>
                  </div>
                </div>
              </Section>}
            </>
          )}
        </div>

        <footer className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 bg-white px-6 py-4">
          <label className="flex items-center gap-2 text-sm text-slate-600"><input type="checkbox" checked={directSale} onChange={(event) => setDirectSale(event.target.checked)} className="h-4 w-4 accent-blue-600" /> Bán trực tiếp <Info size={15} className="text-slate-400" /></label>
          <div className="flex items-center gap-2">
            <button type="button" onClick={onClose} className="rounded border border-slate-300 px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50">Bỏ qua</button>
            <button type="button" className="rounded border border-blue-600 px-4 py-2 text-sm font-medium text-blue-600 hover:bg-blue-50">Lưu &amp; Tạo thêm hàng <ChevronDown size={15} className="ml-1 inline" /></button>
            <button type="button" onClick={onClose} className="rounded bg-blue-600 px-5 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-700">Lưu</button>
          </div>
        </footer>
      </div>
    </div>
  );
}
