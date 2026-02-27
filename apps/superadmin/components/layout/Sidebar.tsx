'use client';

import { useState } from 'react';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { twMerge } from 'tailwind-merge';
import { navItems } from './nav-items';

interface SidebarProps {
  accessibleHrefs?: string[];
}

export function Sidebar({ accessibleHrefs }: SidebarProps) {
  const pathname = usePathname();
  const [isHovered, setIsHovered] = useState(false);

  // Filter nav items if accessibleHrefs is provided; otherwise show all
  const visibleItems = accessibleHrefs
    ? navItems.filter(item => accessibleHrefs.includes(item.href))
    : navItems;

  return (
    <aside
      className={twMerge(
        "fixed left-0 top-16 z-40 h-[calc(100vh-4rem)] bg-bg-primary border-r border-border-default transition-all duration-300 ease-in-out flex flex-col",
        isHovered ? "w-64" : "w-16"
      )}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      role="navigation"
      aria-label="Main Navigation"
    >
      <div className="flex flex-col flex-1 py-4 overflow-y-auto overflow-x-hidden scrollbar-thin scrollbar-thumb-gray-700">
        <nav className="flex-1 space-y-1 px-2">
          {visibleItems.map((item) => {
            const isActive = pathname === item.href || (item.href !== '/superadmin' && pathname?.startsWith(item.href));

            return (
              <Link
                key={item.name}
                href={item.href}
                className={twMerge(
                  "group flex items-center px-3 py-2.5 rounded-md transition-colors duration-200",
                  isActive
                    ? "bg-emerald-500/10 text-emerald-500"
                    : "text-text-secondary hover:bg-bg-tertiary hover:text-text-primary"
                )}
                title={!isHovered ? item.name : undefined}
              >
                <item.icon
                  className={twMerge(
                    "flex-shrink-0 w-5 h-5 transition-colors",
                    isActive ? "text-emerald-500" : "text-text-secondary group-hover:text-text-primary"
                  )}
                />
                <span
                  className={twMerge(
                    "ml-3 whitespace-nowrap transition-all duration-300",
                    isHovered
                      ? "opacity-100 translate-x-0"
                      : "opacity-0 -translate-x-4 w-0 overflow-hidden"
                  )}
                >
                  {item.name}
                </span>
              </Link>
            );
          })}
        </nav>

        {/* Bottom Section (Optional User Profile or Version) */}
        <div className="mt-auto px-2 py-4 border-t border-border-default">
           <div className="flex items-center px-3 py-2">
              <div className="w-8 h-8 rounded-full bg-bg-tertiary flex-shrink-0" />
              <div
                className={twMerge(
                  "ml-3 overflow-hidden transition-all duration-300",
                   isHovered ? "opacity-100 w-auto" : "opacity-0 w-0"
                )}
              >
                <p className="text-sm font-medium text-text-primary truncate">Admin User</p>
                <p className="text-xs text-text-secondary truncate">admin@example.com</p>
              </div>
           </div>
        </div>
      </div>
    </aside>
  );
}
