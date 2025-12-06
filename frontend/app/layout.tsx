import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Interview Ops - AI-Powered Interview Preparation',
  description: 'Transform your interview prep with AI-powered company research, salary insights, and calendar integration',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="bg-[#15171a] text-white antialiased">
        <nav className="bg-[#1c1e21] border-b border-[rgba(255,255,255,0.1)] sticky top-0 z-50">
          <div className="max-w-7xl mx-auto px-6 lg:px-8">
            <div className="flex justify-between h-16">
              <div className="flex items-center">
                <a href="/" className="flex items-center space-x-3">
                  <div className="w-9 h-9 bg-gradient-to-r from-[#FF9B42] to-[#F9BD2B] rounded-lg flex items-center justify-center shadow-lg">
                    <span className="text-white font-bold text-xl">I</span>
                  </div>
                  <span className="font-bold text-xl text-white">Interview Ops</span>
                </a>
              </div>
            </div>
          </div>
        </nav>
        <main className="max-w-7xl mx-auto px-6 lg:px-8 py-8">
          {children}
        </main>
      </body>
    </html>
  );
}
