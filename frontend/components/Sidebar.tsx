'use client';

import React, { useState } from 'react';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import {
  Home,
  Briefcase,
  Calendar,
  BarChart,
  Settings,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import clsx from 'clsx';

interface NavItem {
  name: string;
  href: string;
  icon: React.ElementType;
}

const navItems: NavItem[] = [
  { name: 'Dashboard', href: '/', icon: Home },
  { name: 'Companies', href: '/companies', icon: Briefcase },
  { name: 'Calendar', href: '/calendar', icon: Calendar },
  { name: 'Analytics', href: '/analytics', icon: BarChart },
  { name: 'Settings', href: '/settings', icon: Settings },
];

export function Sidebar() {
  const [collapsed, setCollapsed] = useState(false);
  const pathname = usePathname();

  return (
    <div
      className={clsx(
        'fixed left-0 top-0 h-full bg-[#1c1e21] border-r border-[rgba(255,255,255,0.1)] transition-all duration-300 z-50',
        collapsed ? 'w-16' : 'w-64'
      )}
    >
      <div className="flex flex-col h-full">
        {/* Logo */}
        <div className="flex items-center justify-between p-4 border-b border-[rgba(255,255,255,0.1)]">
          {!collapsed && (
            <Link href="/" className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-gradient-to-r from-[#FF9B42] to-[#F9BD2B] rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-lg">I</span>
              </div>
              <span className="font-bold text-lg text-white">Interview Ops</span>
            </Link>
          )}
          {collapsed && (
            <div className="w-8 h-8 bg-gradient-to-r from-[#FF9B42] to-[#F9BD2B] rounded-lg flex items-center justify-center mx-auto">
              <span className="text-white font-bold text-lg">I</span>
            </div>
          )}
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-2 py-4 space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href || pathname?.startsWith(item.href + '/');

            return (
              <Link
                key={item.name}
                href={item.href}
                className={clsx(
                  'flex items-center px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 group relative',
                  isActive
                    ? 'bg-[#25272a] text-white border-l-4 border-[#FF9B42]'
                    : 'text-[#9ca3af] hover:bg-[#25272a] hover:text-white border-l-4 border-transparent'
                )}
              >
                <Icon className="w-5 h-5 flex-shrink-0" />
                {!collapsed && <span className="ml-3">{item.name}</span>}
                {collapsed && (
                  <div className="absolute left-full ml-2 px-2 py-1 bg-[#25272a] text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
                    {item.name}
                  </div>
                )}
              </Link>
            );
          })}
        </nav>

        {/* Toggle Button */}
        <div className="p-4 border-t border-[rgba(255,255,255,0.1)]">
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="w-full flex items-center justify-center px-3 py-2 rounded-lg text-[#9ca3af] hover:bg-[#25272a] hover:text-white transition-all duration-200"
          >
            {collapsed ? (
              <ChevronRight className="w-5 h-5" />
            ) : (
              <>
                <ChevronLeft className="w-5 h-5" />
                <span className="ml-2 text-sm">Collapse</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
