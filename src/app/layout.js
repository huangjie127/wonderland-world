import "./globals.css";
import Link from "next/link";
import ClientNav from "./ClientNav";
import { AuthProvider } from "./providers";

export const metadata = {
  title: "Persona Archive",
  description: "Multi-persona role archive",
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

