'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Menu, X, Search, Bell, User, Moon, Sun, ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/Button';

export function DashboardHeader() {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(false); // Default to false to match server-side (usually light) or handle hydration
  const [mounted, setMounted] = useState(false);

  // Initialize theme based on preference or system
  useEffect(() => {
    setMounted(true);
    const savedTheme = localStorage.getItem('theme');
    const systemPrefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    
    const isDark = savedTheme === 'dark' || (!savedTheme && systemPrefersDark);
    
    setIsDarkMode(isDark);
    if (isDark) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, []);

  const toggleTheme = () => {
    const newIsDark = !isDarkMode;
    setIsDarkMode(newIsDark);
    if (newIsDark) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  };

  const navLinks = [
    { name: 'Product', href: '/product' },
    { name: 'Developers', href: '/developers' },
    { name: 'Pricing', href: '/pricing' },
    { name: 'Docs', href: '/docs' },
  ];

  return (
    <header className="fixed top-0 left-0 w-full z-50 border-b border-gray-200 dark:border-grey-15 bg-white dark:bg-grey-08 transition-colors duration-200">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-6">
        {/* Left: Logo & Desktop Nav */}
        <div className="flex items-center gap-8">
          <Link href="/" className="flex items-center gap-2 group">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-purple-60 text-white font-bold text-lg group-hover:bg-purple-70 transition-colors">
              O
            </div>
            <span className="text-xl font-bold text-gray-900 dark:text-white font-primary tracking-tight">
              Owner AI
            </span>
          </Link>

          <nav className="hidden md:flex items-center gap-6">
            {navLinks.map((link) => (
              <Link
                key={link.name}
                href={link.href}
                className="text-sm font-medium text-gray-500 hover:text-gray-900 dark:text-grey-60 dark:hover:text-white transition-colors"
              >
                {link.name}
              </Link>
            ))}
          </nav>
        </div>

        {/* Right: Actions */}
        <div className="hidden md:flex items-center gap-4">
          <button className="flex items-center gap-2 rounded-md border border-gray-200 dark:border-grey-15 bg-gray-50 dark:bg-grey-10 px-3 py-1.5 text-sm text-gray-500 dark:text-grey-60 hover:border-gray-300 dark:hover:border-grey-60 transition-colors">
            <Search className="h-4 w-4" />
            <span className="mr-2">Search...</span>
            <kbd className="hidden rounded bg-gray-200 dark:bg-grey-15 px-1.5 py-0.5 text-xs font-medium text-gray-500 dark:text-grey-60 lg:inline-block">
              ⌘K
            </kbd>
          </button>

          <div className="flex items-center gap-2 border-l border-gray-200 dark:border-grey-15 pl-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={toggleTheme}
              className="text-gray-500 hover:text-gray-900 dark:text-grey-60 dark:hover:text-white transition-all"
              aria-label="Toggle theme"
              data-testid="theme-toggle"
            >
              {mounted ? (
                isDarkMode ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />
              ) : (
                <div className="h-5 w-5" /> // Placeholder
              )}
            </Button>
            
            <Button 
              variant="ghost" 
              size="sm" 
              className="text-gray-500 hover:text-gray-900 dark:text-grey-60 dark:hover:text-white"
            >
              <Bell className="h-5 w-5" />
            </Button>

            <Link href="/profile" className="ml-2">
              <div className="h-8 w-8 rounded-full bg-purple-60/20 flex items-center justify-center text-purple-60 border border-purple-60/30 hover:bg-purple-60/30 transition-colors">
                <User className="h-4 w-4" />
              </div>
            </Link>
          </div>
        </div>

        {/* Mobile Menu Toggle */}
        <div className="flex md:hidden items-center gap-4">
           <Button
              variant="ghost"
              size="sm"
              onClick={toggleTheme}
              className="text-gray-500 hover:text-gray-900 dark:text-grey-60 dark:hover:text-white transition-all"
              aria-label="Toggle theme"
            >
              {mounted ? (
                isDarkMode ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />
              ) : (
                <div className="h-5 w-5" />
              )}
            </Button>
          <button
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="text-gray-500 hover:text-gray-900 dark:text-grey-60 dark:hover:text-white"
            aria-label="Toggle menu"
          >
            {isMobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
        </div>
      </div>

      {/* Mobile Menu Overlay */}
      {isMobileMenuOpen && (
        <div className="md:hidden border-t border-gray-200 dark:border-grey-15 bg-white dark:bg-grey-08 px-6 py-4 shadow-lg absolute w-full left-0">
          <nav className="flex flex-col space-y-4">
            {navLinks.map((link) => (
              <Link
                key={link.name}
                href={link.href}
                className="text-base font-medium text-gray-600 hover:text-gray-900 dark:text-grey-60 dark:hover:text-white"
                onClick={() => setIsMobileMenuOpen(false)}
              >
                {link.name}
              </Link>
            ))}
            <div className="pt-4 border-t border-gray-200 dark:border-grey-15 flex flex-col gap-4">
              <button className="flex w-full items-center gap-2 rounded-md border border-gray-200 dark:border-grey-15 bg-gray-50 dark:bg-grey-10 px-3 py-2 text-sm text-gray-500 dark:text-grey-60">
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
