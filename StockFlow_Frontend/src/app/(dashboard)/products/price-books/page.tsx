import { redirect } from 'next/navigation';

// Đường dẫn cũ: Thiết lập giá là chức năng riêng trên navbar → /price-books
export default function LegacyPriceBooksPage() {
  redirect('/price-books');
}
