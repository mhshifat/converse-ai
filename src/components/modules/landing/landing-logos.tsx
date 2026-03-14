import React from 'react';

const COMPANIES = [
  'Acme Corp', 'TechFlow', 'CloudBase', 'DataSync',
  'InnoVate', 'ScaleUp', 'NexGen', 'VeloCity',
] as const;

function CompanyLogo({ name }: { name: string }) {
  return (
    <span className="flex items-center gap-2 text-gray-400 select-none px-8">
      <svg className="size-5 opacity-50" viewBox="0 0 24 24" fill="currentColor">
        <rect x="3" y="3" width="18" height="18" rx="4" opacity="0.15" />
        <circle cx="12" cy="12" r="4" opacity="0.3" />
      </svg>
      <span className="text-sm font-semibold tracking-wide whitespace-nowrap">{name}</span>
    </span>
  );
}

export function LandingLogos() {
  return (
    <section className="relative py-14 bg-white border-y border-gray-100 overflow-hidden">
      <p className="text-center text-xs font-semibold uppercase tracking-widest text-gray-400 mb-8">
        Trusted by forward-thinking teams
      </p>
      <div className="relative">
        {/* Fade edges */}
        <div className="pointer-events-none absolute left-0 top-0 bottom-0 w-24 bg-linear-to-r from-white to-transparent z-10" />
        <div className="pointer-events-none absolute right-0 top-0 bottom-0 w-24 bg-linear-to-l from-white to-transparent z-10" />

        <div
          className="flex w-max"
          style={{ animation: 'lp-ticker 30s linear infinite' }}
        >
          {[...COMPANIES, ...COMPANIES].map((name, i) => (
            <CompanyLogo key={`${name}-${i}`} name={name} />
          ))}
        </div>
      </div>
    </section>
  );
}
