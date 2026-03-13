'use client';

import React, { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Menu, X, Search, Bell, User, ChevronDown, Settings, LogOut } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { ThemeToggle } from '@/components/theme-toggle';
import { createClient } from '@/utils/supabase/client';

type DashboardHeaderProps = {
  userRoles?: string[];
};

export function DashboardHeader({ userRoles = [] }: DashboardHeaderProps) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);
  const router = useRouter();
  const supabase = createClient();
  const MAIN_SITE_URL = process.env.NEXT_PUBLIC_MAIN_SITE_URL || 'http://localhost:3000';

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
        setIsUserMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [userMenuRef]);

  const handleSignOut = async () => {
    try {
      await supabase.auth.signOut();
      localStorage.clear();
      sessionStorage.clear();
      // Redirect to Main Site Login
      window.location.assign(`${MAIN_SITE_URL}/login`);
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  const uniqueRoles = Array.from(new Set(userRoles)).filter(Boolean);

  const handleSwitchRole = (role: string) => {
    // 導向 Web App Portal 的特定角色入口，交給 /portal/[role] 自行轉址到對應 Dashboard
    const target = `${MAIN_SITE_URL}/portal/${encodeURIComponent(role)}`;
    window.location.assign(target);
  };

  const navLinks = [
    { name: 'Home', href: MAIN_SITE_URL },
    { name: 'Pricing', href: `${MAIN_SITE_URL}/pricing` },
    { name: 'Project Files', href: '/docs' },
    { name: 'Project Progress Dashboard', href: 'http://localhost:3001/superadmin/dashboard/project-progress' },
  ];

  return (
    <header className="fixed top-0 left-0 w-full z-50 border-b border-border-default bg-bg-primary transition-colors duration-200">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-6">
        {/* Left: Logo & Desktop Nav */}
        <div className="flex items-center gap-8">
          <Link href="/" className="flex items-center gap-2 group">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-purple-60 text-white font-bold text-lg group-hover:bg-purple-70 transition-colors">
              O
            </div>
            <span className="text-xl font-bold text-text-primary font-primary tracking-tight">
              Owner AI
            </span>
          </Link>

          <nav className="hidden md:flex items-center gap-6">
            {navLinks.map((link) => (
              <Link
                key={link.name}
                href={link.href}
                className="text-sm font-medium text-text-secondary hover:text-text-primary transition-colors"
                target="_blank"
                rel="noopener noreferrer"
              >
                {link.name}
              </Link>
            ))}
          </nav>
        </div>

        {/* Right: Actions */}
        <div className="hidden md:flex items-center gap-4">
          <button className="flex items-center gap-2 rounded-md border border-border-default bg-bg-secondary px-3 py-1.5 text-sm text-text-secondary hover:border-border-light transition-colors">
            <Search className="h-4 w-4" />
            <span className="mr-2">Search...</span>
            <kbd className="hidden rounded bg-bg-tertiary px-1.5 py-0.5 text-xs font-medium text-text-secondary lg:inline-block">
              ⌘K
            </kbd>
          </button>

          <div className="flex items-center gap-2 border-l border-border-default pl-4">
            <ThemeToggle />
            
            <Button 
              variant="ghost" 
              size="sm" 
              className="text-text-secondary hover:text-text-primary"
            >
              <Bell className="h-5 w-5" />
            </Button>

            <div className="relative ml-2" ref={userMenuRef}>
              <button
                onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                className="h-8 w-8 rounded-full bg-purple-60/20 flex items-center justify-center text-purple-60 border border-purple-60/30 hover:bg-purple-60/30 transition-colors focus:outline-none focus:ring-2 focus:ring-purple-60 focus:ring-offset-2 focus:ring-offset-bg-primary"
                aria-expanded={isUserMenuOpen}
                aria-haspopup="true"
                aria-label="User menu"
              >
                <User className="h-4 w-4" />
              </button>

              {isUserMenuOpen && (
                <div className="absolute right-0 mt-2 w-48 origin-top-right rounded-md bg-bg-primary shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none border border-border-default z-50">
                  <div className="py-1" role="menu" aria-orientation="vertical" aria-labelledby="user-menu-button">
                    <Link
                      href="/profile"
                      className="flex items-center px-4 py-2 text-sm text-text-secondary hover:bg-bg-secondary hover:text-text-primary transition-colors"
                      role="menuitem"
                      onClick={() => setIsUserMenuOpen(false)}
                    >
                      <User className="mr-3 h-4 w-4" />
                      Profile
                    </Link>
                    {uniqueRoles.length > 0 && (
                      <>
                        <div className="px-4 pt-2 pb-1 text-[11px] font-semibold uppercase tracking-wide text-text-tertiary">
                          角色切換
                        </div>
                        {uniqueRoles.map((role) => (
                          <button
                            key={role}
                            type="button"
                            onClick={() => {
                              setIsUserMenuOpen(false);
                              handleSwitchRole(role);
                            }}
                            className="flex w-full items-center px-4 py-1.5 text-sm text-text-secondary hover:bg-bg-secondary hover:text-text-primary transition-colors"
                            role="menuitem"
                          >
                            <span className="mr-2 inline-flex h-5 w-5 items-center justify-center rounded-full bg-purple-60/10 text-[10px] font-semibold text-purple-60 uppercase">
                              {role === 'super_admin' ? 'SA' : role.charAt(0)}
                            </span>
                            <span className="truncate">{role}</span>
                          </button>
                        ))}
                        <div className="my-1 h-px bg-border-default" />
                      </>
                    )}
                    <Link
                      href="/superadmin/settings"
                      className="flex items-center px-4 py-2 text-sm text-text-secondary hover:bg-bg-secondary hover:text-text-primary transition-colors"
                      role="menuitem"
                      onClick={() => setIsUserMenuOpen(false)}
                    >
                      <Settings className="mr-3 h-4 w-4" />
                      Settings
                    </Link>
                    <button
                      onClick={handleSignOut}
                      className="flex w-full items-center px-4 py-2 text-sm text-red-500 hover:bg-bg-secondary hover:text-red-600 transition-colors"
                      role="menuitem"
                    >
                      <LogOut className="mr-3 h-4 w-4" />
                      Sign out
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Mobile Menu Toggle */}
        <div className="flex md:hidden items-center gap-4">
           <ThemeToggle />
          <button
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="text-text-secondary hover:text-text-primary"
            aria-label="Toggle menu"
          >
            {isMobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
        </div>
      </div>

      {/* Mobile Menu Overlay */}
      {isMobileMenuOpen && (
        <div className="md:hidden border-t border-border-default bg-bg-primary px-6 py-4 shadow-lg absolute w-full left-0">
          <nav className="flex flex-col space-y-4">
            {navLinks.map((link) => (
              <Link
                key={link.name}
                href={link.href}
                className="text-base font-medium text-text-secondary hover:text-text-primary"
                onClick={() => setIsMobileMenuOpen(false)}
                target="_blank"
                rel="noopener noreferrer"
              >
                {link.name}
              </Link>
            ))}
            <div className="pt-4 border-t border-border-default flex flex-col gap-4">
              <Link
                href="/profile"
                className="text-base font-medium text-text-secondary hover:text-text-primary flex items-center gap-2"
                onClick={() => setIsMobileMenuOpen(false)}
              >
                <User className="h-4 w-4" />
                Profile
              </Link>
              <Link
                href="/superadmin/settings"
                className="text-base font-medium text-text-secondary hover:text-text-primary flex items-center gap-2"
                onClick={() => setIsMobileMenuOpen(false)}
              >
                <Settings className="h-4 w-4" />
                Settings
              </Link>
              <button
                onClick={() => { handleSignOut(); setIsMobileMenuOpen(false); }}
                className="text-base font-medium text-red-500 hover:text-red-600 text-left flex items-center gap-2"
              >
                <LogOut className="h-4 w-4" />
                Sign out
              </button>

              <button className="flex w-full items-center gap-2 rounded-md border border-border-default bg-bg-secondary px-3 py-2 text-sm text-text-secondary">
                <Search className="h-4 w-4" />
                <span>Search documentation...</span>
              </button>
            </div>
          </nav>
        </div>
      )}
    </header>
  );
}
