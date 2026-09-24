import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'KysoQR',
  description: 'Ký số PDF qua mã QR — xác minh chữ ký số không cần đăng nhập.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="vi" suppressHydrationWarning>
      <body>{children}</body>
    </html>
  );
}
