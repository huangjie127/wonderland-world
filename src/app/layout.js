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
      <body className="min-h-screen relative overflow-x-hidden" style={{
        background: 'linear-gradient(180deg, #fff1f2 0%, #fdfbf7 50%, #f0f9ff 100%)', // Pale pink -> Cream -> Pale Blue
        color: '#1f2937'
      }}>
        {/* Global Background Elements */}
        <div className="fixed inset-0 z-[-1] overflow-hidden pointer-events-none">
            {/* Watercolor Blob 1 (Teal/Blue) - Top Right */}
            <div className="absolute top-[-10%] right-[-10%] w-[600px] h-[600px] rounded-full opacity-60"
                style={{
                    background: 'radial-gradient(circle, rgba(204,251,241,0.4) 0%, rgba(204,251,241,0) 70%)',
                    filter: 'blur(80px)'
                }}
            ></div>

            {/* Watercolor Blob 2 (Pink/Rose) - Bottom Left */}
            <div className="absolute bottom-[10%] left-[-10%] w-[500px] h-[500px] rounded-full opacity-60"
                style={{
                    background: 'radial-gradient(circle, rgba(253,164,175,0.2) 0%, rgba(253,164,175,0) 70%)',
                    filter: 'blur(60px)'
                }}
            ></div>

            {/* Geometric Sun/Moon - Top Center */}
            <div className="absolute top-[5%] left-1/2 -translate-x-1/2 w-96 h-96 rounded-full"
                style={{
                    backgroundColor: 'rgba(255,255,255,0.4)',
                    boxShadow: '0 0 60px rgba(255,255,255,0.6)'
                }}
            ></div>

            {/* Plants (SVG) - Bottom Left Fixed */}
            <div className="absolute bottom-0 left-0 opacity-40 hidden md:block" style={{ width: '300px', height: '300px' }}>
                <svg viewBox="0 0 100 100" fill="none" stroke="#4b5563" strokeWidth="0.3" style={{ width: '100%', height: '100%' }}>
                        <path d="M20 100 Q 25 70 10 40" />
                        <circle cx="10" cy="40" r="2" fill="#4b5563" stroke="none" opacity="0.6" />
                        <path d="M20 100 Q 35 60 45 30" />
                        <circle cx="45" cy="30" r="3" fill="#4b5563" stroke="none" opacity="0.6" />
                        <path d="M20 100 Q 10 80 0 60" />
                        <circle cx="0" cy="60" r="1.5" fill="#4b5563" stroke="none" opacity="0.6" />
                </svg>
            </div>
            
            {/* Plants (SVG) - Bottom Right Fixed */}
            <div className="absolute bottom-0 right-0 opacity-40 hidden md:block" style={{ width: '280px', height: '280px', transform: 'scaleX(-1)' }}>
                <svg viewBox="0 0 100 100" fill="none" stroke="#4b5563" strokeWidth="0.3" style={{ width: '100%', height: '100%' }}>
                        <path d="M80 100 Q 70 60 90 30" />
                        <circle cx="90" cy="30" r="2.5" fill="#4b5563" stroke="none" opacity="0.6" />
                        <path d="M80 100 Q 90 70 100 50" />
                        <circle cx="100" cy="50" r="2" fill="#4b5563" stroke="none" opacity="0.6" />
                </svg>
            </div>
        </div>

        <AuthProvider>
          <ClientNav />
          <main className="relative z-0">{children}</main>
        </AuthProvider>
      </body>
    </html>
  );
}

