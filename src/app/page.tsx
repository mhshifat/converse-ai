import React from 'react';
import { BentoGrid } from '../components/shared/bento-grid';
import { AnimatedBackground } from '../components/shared/animated-background';
import { MicroPulse } from '../components/shared/micro-pulse';
// import { Button } from 'shadcn/ui'; // Uncomment after shadcn/ui setup

export default function HomePage() {
  return (
    <main className="relative min-h-screen flex flex-col items-center justify-center bg-linear-to-br from-blue-50 to-blue-100 overflow-hidden">
      <AnimatedBackground />
      <section className="z-10 w-full max-w-7xl px-4 py-12">
        <h1 className="text-4xl md:text-6xl font-bold text-center mb-6">
          Automate, Connect, <span className="text-blue-500">Engage</span>
          <MicroPulse className="ml-2 align-middle" />
        </h1>
        <p className="text-lg md:text-2xl text-center mb-10 text-gray-700">
          Build powerful, multi-tenant AI chatbots for your business with creative, modern UI.
        </p>
        {/* <Button>Get Started</Button> */}
        <BentoGrid>
          <div className="bg-white rounded-xl shadow-lg p-6 flex flex-col items-center justify-center min-h-45">
            <span className="text-3xl mb-2">🤖</span>
            <h2 className="font-semibold text-lg mb-1">AI Chatbot</h2>
            <p className="text-gray-500 text-center">Customizable, embeddable, and smart.</p>
          </div>
          <div className="bg-white rounded-xl shadow-lg p-6 flex flex-col items-center justify-center min-h-45">
            <span className="text-3xl mb-2">🔒</span>
            <h2 className="font-semibold text-lg mb-1">Secure Auth</h2>
            <p className="text-gray-500 text-center">Multi-provider, pluggable authentication.</p>
          </div>
          <div className="bg-white rounded-xl shadow-lg p-6 flex flex-col items-center justify-center min-h-45">
            <span className="text-3xl mb-2">📊</span>
            <h2 className="font-semibold text-lg mb-1">Analytics</h2>
            <p className="text-gray-500 text-center">Track engagement and performance.</p>
          </div>
          <div className="bg-white rounded-xl shadow-lg p-6 flex flex-col items-center justify-center min-h-45">
            <span className="text-3xl mb-2">⚡</span>
            <h2 className="font-semibold text-lg mb-1">Integrations</h2>
            <p className="text-gray-500 text-center">Email, SMS, Discord, and more.</p>
          </div>
        </BentoGrid>
      </section>
    </main>
  );
}
