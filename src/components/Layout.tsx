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
            <span className="font-code-md text-xs text-secondary">Soroban Smart Contracts v20.1</span>
            <div className="flex items-center gap-1 text-tertiary font-medium">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" /></svg>
              <span>Auditoría Institucional Activa</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
