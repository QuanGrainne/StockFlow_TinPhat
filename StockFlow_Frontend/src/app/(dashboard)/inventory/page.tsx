import { redirect } from 'next/navigation';

// Trang cũ: chuyển sang chức năng tương ứng trên navbar
export default function LegacyPage() {
  redirect('/dashboard');
}
