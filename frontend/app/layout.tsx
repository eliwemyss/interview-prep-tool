import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Interview Prep Tool',
  description: 'Prepare for your interviews with AI-powered research and insights',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="bg-[#15171a] text-white">
        <nav className="bg-[#1c1e21] border-b border-[rgba(255,255,255,0.1)] sticky top-0 z-50">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between h-16">
              <div className="flex items-center space-x-8">
                <a href="/" className="flex items-center space-x-2">
                  <div className="w-8 h-8 bg-gradient-to-r from-[#FF9B42] to-[#F9BD2B] rounded-lg flex items-center justify-center">
                    <span className="text-white font-bold text-lg">I</span>
                  </div>
                  <span className="font-bold text-xl text-white">Interview Ops</span>
                </a>
                <div className="hidden md:flex space-x-1">
                  <a
                    href="/"
                    className="text-white bg-[#25272a] px-4 py-2 rounded-lg text-sm font-medium"
                  >
                    Dashboard
                  </a>
                  <a
                    href="/briefing"
                    className="text-[#9ca3af] hover:text-white hover:bg-[#25272a] px-4 py-2 rounded-lg text-sm font-medium transition"
                  >
                    Briefing
                  </a>
                </div>
              </div>
            </div>
          </div>
        </nav>
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {children}
        </main>

        <footer className="bg-slate-900 text-slate-300 border-t border-slate-800 mt-16">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <p className="text-center text-slate-400">
              © 2024 Interview Prep Tool. Built for serious interview prep.
            </p>
          </div>
        </footer>
      </body>
    </html>
  );
}
