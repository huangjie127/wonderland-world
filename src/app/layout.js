import "./globals.css";
import Link from "next/link";
import ClientNav from "./ClientNav";
import { AuthProvider } from "./providers";

export const metadata = {
  metadataBase: new URL('https://ocbase.xyz'),
  title: {
    default: "OCBase - OC World",
    template: "%s | OCBase"
  },
  description: "Create, Manage and Share your Original Characters.",
  openGraph: {
    title: "OCBase - OC World",
    description: "Create, Manage and Share your Original Characters.",
    url: 'https://ocbase.xyz',
    siteName: 'OCBase',
    locale: 'zh_CN',
    type: 'website',
  },
};

export default function RootLayout({ children }) {
  return (
    <html lang="zh-CN">
      <body>
        <AuthProvider>
          <ClientNav />
          <main className="p-6">{children}</main>
        </AuthProvider>
      </body>
    </html>
  );
}

