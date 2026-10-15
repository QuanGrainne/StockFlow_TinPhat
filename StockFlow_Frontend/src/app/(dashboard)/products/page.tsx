export default function ProductsPage() {
  // Dữ liệu mẫu — sẽ gọi API thật ở bước sau
  const products = [
    { id: 1, code: 'TP-TC-200-15', name: 'Thang cáp 200×100×2500 dày 1.5mm', unit: 'Cây', category: 'Thành phẩm', stock: 120 },
    { id: 2, code: 'TP-MC-300-ST', name: 'Máng cáp 300×100×2500 sơn tĩnh điện', unit: 'Cây', category: 'Thành phẩm', stock: 85 },
    { id: 3, code: 'NVL-TON-15', name: 'Tôn cuộn mạ kẽm dày 1.5mm', unit: 'Cuộn', category: 'Nguyên vật liệu', stock: 34 },
    { id: 4, code: 'NVL-TON-12', name: 'Tôn cuộn mạ kẽm dày 1.2mm', unit: 'Cuộn', category: 'Nguyên vật liệu', stock: 18 },
    { id: 5, code: 'NVL-SON-GHI', name: 'Bột sơn tĩnh điện màu ghi sáng', unit: 'Kg', category: 'Nguyên vật liệu', stock: 200 },
  ];

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-slate-800">Danh sách hàng hóa</h1>
          <p className="text-sm text-slate-500 mt-0.5">Quản lý toàn bộ sản phẩm và nguyên vật liệu</p>
        </div>
        <button className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-lg transition">
          + Thêm hàng hóa
        </button>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr>
              <th className="px-5 py-3.5 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">Mã hàng</th>
              <th className="px-5 py-3.5 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">Tên hàng hóa</th>
              <th className="px-5 py-3.5 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">Phân loại</th>
              <th className="px-5 py-3.5 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">Đơn vị</th>
              <th className="px-5 py-3.5 text-right text-xs font-semibold text-slate-500 uppercase tracking-wide">Tồn kho</th>
              <th className="px-5 py-3.5 text-right text-xs font-semibold text-slate-500 uppercase tracking-wide">Thao tác</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {products.map((p) => (
              <tr key={p.id} className="hover:bg-slate-50 transition">
                <td className="px-5 py-3.5 font-mono text-xs text-slate-600">{p.code}</td>
                <td className="px-5 py-3.5 font-medium text-slate-800">{p.name}</td>
                <td className="px-5 py-3.5">
                  <span
                    className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      p.category === 'Thành phẩm'
                        ? 'bg-blue-100 text-blue-700'
                        : 'bg-amber-100 text-amber-700'
                    }`}
                  >
                    {p.category}
                  </span>
                </td>
                <td className="px-5 py-3.5 text-slate-600">{p.unit}</td>
                <td className="px-5 py-3.5 text-right font-semibold text-slate-800">{p.stock}</td>
                <td className="px-5 py-3.5 text-right">
                  <button className="text-xs text-blue-600 hover:underline font-medium mr-3">Sửa</button>
                  <button className="text-xs text-red-500 hover:underline font-medium">Xóa</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
