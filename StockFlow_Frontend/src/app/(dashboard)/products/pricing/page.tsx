export default function ProductPricingPage() {
  // Dữ liệu mẫu — sẽ gọi API thật ở bước sau
  const prices = [
    { id: 1, code: 'TP-TC-200-15', name: 'Thang cáp 200×100×2500 dày 1.5mm', unit: 'Cây', buyPrice: 320000, sellPrice: 485000, updatedAt: '14/10/2026' },
    { id: 2, code: 'TP-MC-300-ST', name: 'Máng cáp 300×100×2500 sơn tĩnh điện', unit: 'Cây', buyPrice: 280000, sellPrice: 430000, updatedAt: '14/10/2026' },
    { id: 3, code: 'NVL-TON-15', name: 'Tôn cuộn mạ kẽm dày 1.5mm', unit: 'Cuộn', buyPrice: 18500000, sellPrice: null, updatedAt: '13/10/2026' },
    { id: 4, code: 'NVL-TON-12', name: 'Tôn cuộn mạ kẽm dày 1.2mm', unit: 'Cuộn', buyPrice: 15800000, sellPrice: null, updatedAt: '13/10/2026' },
    { id: 5, code: 'NVL-SON-GHI', name: 'Bột sơn tĩnh điện màu ghi sáng', unit: 'Kg', buyPrice: 85000, sellPrice: null, updatedAt: '10/10/2026' },
  ];

  function formatVND(n: number | null) {
    if (n === null) return <span className="text-slate-400 text-xs">—</span>;
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(n);
  }

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-slate-800">Thiết lập giá</h1>
          <p className="text-sm text-slate-500 mt-0.5">Cấu hình giá mua, giá bán cho từng sản phẩm</p>
        </div>
        <button className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-lg transition">
          Lưu thay đổi
        </button>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr>
              <th className="px-5 py-3.5 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">Mã hàng</th>
              <th className="px-5 py-3.5 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">Tên hàng hóa</th>
              <th className="px-5 py-3.5 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">ĐVT</th>
              <th className="px-5 py-3.5 text-right text-xs font-semibold text-slate-500 uppercase tracking-wide">Giá mua vào</th>
              <th className="px-5 py-3.5 text-right text-xs font-semibold text-slate-500 uppercase tracking-wide">Giá bán ra</th>
              <th className="px-5 py-3.5 text-center text-xs font-semibold text-slate-500 uppercase tracking-wide">Cập nhật lần cuối</th>
              <th className="px-5 py-3.5 text-right text-xs font-semibold text-slate-500 uppercase tracking-wide">Thao tác</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {prices.map((p) => (
              <tr key={p.id} className="hover:bg-slate-50 transition">
                <td className="px-5 py-3.5 font-mono text-xs text-slate-600">{p.code}</td>
                <td className="px-5 py-3.5 font-medium text-slate-800">{p.name}</td>
                <td className="px-5 py-3.5 text-slate-500">{p.unit}</td>
                <td className="px-5 py-3.5 text-right text-slate-800">{formatVND(p.buyPrice)}</td>
                <td className="px-5 py-3.5 text-right">
                  {p.sellPrice !== null ? (
                    <span className="font-semibold text-emerald-700">{formatVND(p.sellPrice)}</span>
                  ) : (
                    <span className="text-slate-400 text-xs">Không áp dụng</span>
                  )}
                </td>
                <td className="px-5 py-3.5 text-center text-slate-500 text-xs">{p.updatedAt}</td>
                <td className="px-5 py-3.5 text-right">
                  <button className="text-xs text-blue-600 hover:underline font-medium">Chỉnh sửa</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Note */}
      <p className="text-xs text-slate-400 mt-4">
        * Giá bán ra chỉ áp dụng cho nhóm thành phẩm. Nguyên vật liệu chỉ có giá mua vào.
      </p>
    </div>
  );
}
