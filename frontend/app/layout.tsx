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
      <body className="bg-slate-950 text-slate-50">
        <nav className="bg-gradient-to-r from-sky-800 via-cyan-700 to-emerald-600 text-white shadow-lg">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between h-16">
              <div className="flex items-center space-x-8">
                <a href="/" className="font-bold text-xl">
                  🎯 Interview Ops
                </a>
                <div className="hidden md:flex space-x-4">
                  <a
                    href="/"
                    className="hover:bg-white hover:bg-opacity-10 px-3 py-2 rounded-md text-sm font-medium transition"
                  >
                    Dashboard
                  </a>
                  <a
                    href="/dashboard"
                    className="hover:bg-white hover:bg-opacity-10 px-3 py-2 rounded-md text-sm font-medium transition"
                  >
                    Legacy Dashboard
                  </a>
                  <a
                    href="/briefing"
                    className="hover:bg-white hover:bg-opacity-10 px-3 py-2 rounded-md text-sm font-medium transition"
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
