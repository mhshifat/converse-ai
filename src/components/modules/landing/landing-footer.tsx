import React from 'react';
import Link from 'next/link';
import { AppLogo } from '@/components/shared/app-logo';
import { APP_NAME } from '@/lib/app-branding';

const FOOTER_LINKS = {
  Product: [
    { label: 'Features', href: '#features' },
    { label: 'How it works', href: '#how-it-works' },
    { label: 'FAQ', href: '#faq' },
    { label: 'Pricing', href: '#pricing' },
  ],
  Legal: [
    { label: 'Privacy Policy', href: '/privacy' },
    { label: 'Terms of Service', href: '/terms' },
    { label: 'Cookie Policy', href: '/cookies' },
    { label: 'Security', href: '/security' },
  ],
} as const;

export function LandingFooter() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="relative bg-gray-950 text-gray-400 overflow-hidden">
      {/* Top gradient line */}
      <div className="h-px bg-linear-to-r from-transparent via-blue-500/40 to-transparent" />

      <div className="mx-auto max-w-7xl px-6 lg:px-8 py-16 lg:py-20">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-10 lg:gap-12">
          {/* Brand column */}
          <div className="md:col-span-2 max-w-md">
            <Link href="/" className="inline-flex items-center gap-2.5 mb-4">
              <AppLogo size={28} animated className="text-gray-200" />
              <span className="text-lg font-bold text-white tracking-tight">
                {APP_NAME}
              </span>
            </Link>
            <p className="text-sm text-gray-500 leading-relaxed mb-2">
              {APP_NAME} = chat + potoo, the wide-eyed bird that watches everything.
              Voice and text AI chatbots that don&apos;t miss a customer.
            </p>
          </div>

          {/* Link columns */}
          {Object.entries(FOOTER_LINKS).map(([group, links]) => (
            <div key={group}>
              <h4 className="text-xs font-semibold text-gray-200 uppercase tracking-wider mb-4">
                {group}
              </h4>
              <ul className="space-y-2.5">
                {links.map((link) => (
                  <li key={link.label}>
                    <Link
                      href={link.href}
                      className="text-sm hover:text-gray-200 transition-colors"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Bottom bar */}
        <div className="mt-14 pt-8 border-t border-gray-800 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-xs text-gray-500">
            &copy; {currentYear} {APP_NAME}. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}
