// In một tài liệu HTML độc lập: dựng trong iframe ẩn rồi gọi hộp thoại in của trình duyệt
// → chỉ in đúng phiếu, không in giao diện. Dùng chung cho phiếu nhập, phiếu trả hàng nhập...

export const escapeHtml = (s: string | null | undefined) =>
  (s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

export const printMoney = (n: number | null | undefined) =>
  Math.round(n || 0).toLocaleString('vi-VN', { maximumFractionDigits: 0 });

export const printQty = (n: number | null | undefined) =>
  (n || 0).toLocaleString('vi-VN', { maximumFractionDigits: 3 });

export function printDateTime(value?: string | null): string {
  if (!value) return '';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '';
  const p = (n: number) => String(n).padStart(2, '0');
  return `${p(d.getDate())}/${p(d.getMonth() + 1)}/${d.getFullYear()} ${p(d.getHours())}:${p(d.getMinutes())}`;
}

/** Mở hộp thoại in với nội dung HTML (iframe ẩn, tự gỡ sau khi in). */
export function printHtml(html: string): void {
  const iframe = document.createElement('iframe');
  iframe.setAttribute('aria-hidden', 'true');
  iframe.style.position = 'fixed';
  iframe.style.right = '0';
  iframe.style.bottom = '0';
  iframe.style.width = '0';
  iframe.style.height = '0';
  iframe.style.border = '0';
  document.body.appendChild(iframe);

  const win = iframe.contentWindow;
  const doc = win?.document;
  if (!win || !doc) {
    iframe.remove();
    return;
  }

  doc.open();
  doc.write(html);
  doc.close();

  const cleanup = () => setTimeout(() => iframe.remove(), 500);
  win.addEventListener('afterprint', cleanup, { once: true });
  // Chờ trình duyệt dựng xong nội dung rồi mới in
  setTimeout(() => {
    win.focus();
    win.print();
    // Một số trình duyệt không bắn afterprint → dọn dẹp dự phòng
    setTimeout(() => iframe.isConnected && iframe.remove(), 60_000);
  }, 150);
}
