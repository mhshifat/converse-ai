'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { ConverseLogo } from '@/components/shared/converse-logo';
import { Button } from '@/components/ui/button';
import { Menu, X } from 'lucide-react';

const NAV_LINKS = [
  { label: 'Features', href: '#features' },
  { label: 'How It Works', href: '#how-it-works' },
  { label: 'Pricing', href: '#pricing' },
] as const;

interface LandingHeaderProps {
  isAuthenticated?: boolean;
}

export function LandingHeader({ isAuthenticated = false }: LandingHeaderProps) {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <header
      className={cn(
        'fixed top-0 left-0 right-0 z-50 transition-all duration-300',
        scrolled
          ? 'bg-white/80 backdrop-blur-xl shadow-sm border-b border-gray-200/50'
          : 'bg-transparent'
      )}
    >
      <nav className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4 lg:px-8">
        <Link href="/" className="flex items-center gap-2.5 group">
          <ConverseLogo size={30} animated />
          <span className="text-lg font-bold tracking-tight text-gray-900">
            Converse<span className="text-blue-600">AI</span>
          </span>
        </Link>

        {/* Desktop nav - same for all users */}
        <div className="hidden md:flex items-center gap-8">
          {NAV_LINKS.map((link) => (
            <a
              key={link.href}
              href={link.href}
              className="text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors"
            >
              {link.label}
            </a>
          ))}
        </div>

        <div className="hidden md:flex items-center gap-3">
          {isAuthenticated ? (
            <Button
              size="sm"
              asChild
              className="bg-blue-600 hover:bg-blue-700 text-white rounded-full px-5"
            >
              <Link href="/dashboard">Go to Dashboard</Link>
            </Button>
          ) : (
            <>
              <Button variant="ghost" size="sm" asChild>
                <Link href="/login">Sign In</Link>
              </Button>
              <Button
                size="sm"
                asChild
                className="bg-blue-600 hover:bg-blue-700 text-white rounded-full px-5"
              >
                <Link href="/signup">Get Started Free</Link>
              </Button>
            </>
          )}
        </div>

        {/* Mobile toggle */}
        <button
          type="button"
          className="md:hidden p-2 text-gray-700"
          onClick={() => setMobileOpen(!mobileOpen)}
          aria-label="Toggle menu"
        >
          {mobileOpen ? <X className="size-5" /> : <Menu className="size-5" />}
        </button>
      </nav>

      {/* Mobile menu */}
      {mobileOpen && (
        <div className="md:hidden bg-white/95 backdrop-blur-xl border-t border-gray-100 px-6 pb-6 pt-2">
          {NAV_LINKS.map((link) => (
            <a
              key={link.href}
              href={link.href}
              className="block py-3 text-sm font-medium text-gray-700 hover:text-gray-900"
              onClick={() => setMobileOpen(false)}
            >
              {link.label}
            </a>
          ))}
          <div className="mt-4 flex flex-col gap-2">
            {isAuthenticated ? (
              <Button
                size="sm"
                asChild
                className="bg-blue-600 hover:bg-blue-700 text-white"
              >
                <Link href="/dashboard" onClick={() => setMobileOpen(false)}>
                  Go to Dashboard
                </Link>
              </Button>
            ) : (
              <>
                <Button variant="outline" size="sm" asChild>
                  <Link href="/login">Sign In</Link>
                </Button>
                <Button
                  size="sm"
                  asChild
                  className="bg-blue-600 hover:bg-blue-700 text-white"
                >
                  <Link href="/signup">Get Started Free</Link>
                </Button>
              </>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
