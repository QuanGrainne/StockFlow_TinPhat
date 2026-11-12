// Logo Tín Phát dùng chung toàn hệ thống (trang đăng nhập, Header).
// Ảnh gốc: public/brand/logo-tin-phat.png (nền trong suốt, tỉ lệ 574x421).
import Image from 'next/image';

const LOGO_SRC = '/brand/logo-tin-phat.png';
const LOGO_RATIO = 421 / 574;

interface BrandLogoProps {
  /** Chiều rộng hiển thị (px); chiều cao tự tính theo tỉ lệ logo */
  width: number;
  className?: string;
  priority?: boolean;
}

export function BrandLogo({ width, className, priority = false }: BrandLogoProps) {
  return (
    <Image
      src={LOGO_SRC}
      alt="Tín Phát"
      width={width}
      height={Math.round(width * LOGO_RATIO)}
      priority={priority}
      className={className}
    />
  );
}
