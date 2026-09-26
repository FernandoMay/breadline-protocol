import { Outlet } from 'react-router-dom';
import Header from './Header';

export default function Layout() {
  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />
      {/* The header is sticky and in normal flow, so it already occupies its own
          space; pages no longer need top padding to clear it. */}
      <main className="w-full max-w-[1440px] mx-auto px-4 md:px-8 flex-1">
        <Outlet />
      </main>
      <footer className="w-full border-t border-outline-variant/30 bg-surface-container-lowest py-6 mt-auto">
        <div className="max-w-[1440px] mx-auto px-4 md:px-8 flex flex-col md:flex-row items-center justify-between gap-4 text-on-surface-variant text-sm">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-on-surface">Breadline Protocol</span>
            <span className="text-outline-variant">•</span>
            <span>Garantía criptográfica descentralizada sobre Stellar</span>
          </div>
          <div className="flex items-center gap-6">
            <span className="font-code-md text-xs text-secondary">Soroban · Testnet · Prototype</span>
            <a
              href="https://github.com/FernandoMay/breadline-protocol"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 text-tertiary font-medium hover:underline"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
              <span>Código abierto · GitHub</span>
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}
