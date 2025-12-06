import type { Metadata } from 'next';
import './globals.css';
import { PHProvider } from './providers';
import { Sidebar } from '../components/Sidebar';

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
        <PHProvider>
          <div className="flex h-screen overflow-hidden">
            <Sidebar />
            <main className="flex-1 overflow-y-auto ml-64 transition-all duration-300">
              <div className="max-w-7xl mx-auto px-8 py-8">
                {children}
              </div>
            </main>
          </div>
        </PHProvider>
      </body>
    </html>
  );
}
