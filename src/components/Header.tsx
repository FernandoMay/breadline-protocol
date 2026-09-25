import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useStellarWallet } from '../hooks/useStellarWallet';
import type { StellarWalletValue } from '../hooks/useStellarWallet';
import { truncateAddress } from '../lib/stellar';
import Toast from './Toast';

const navItems = [
  { path: '/dashboard', label: 'Dashboard', icon: 'M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6' },
  { path: '/crear-escrow', label: 'Crear Escrow', icon: 'M12 6v6m0 0v6m0-6h6m-6 0H6' },
  { path: '/vista-comprador', label: 'Vista Comprador', icon: 'M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 100 4 2 2 0 000-4z' },
  { path: '/sala-de-entrega', label: 'Sala de Entrega', icon: 'M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z' },
  { path: '/disputas-y-arbitraje', label: 'Disputas y Arbitraje', icon: 'M3 6l3 1m0 0l-3 9a5.002 5.002 0 006.001 0M6 7l3 9M6 7l6-2m6 2l3-1m-3 1l3 9a5.002 5.002 0 006.001 0M18 7l3 9m-3-9l-6-2m0-2v2m0 16V5m0 16H9m3 0h3' },
  { path: '/certificados', label: 'Visor de Certificados', icon: 'M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z' },
];

interface FundingBannerProps {
  wallet: StellarWalletValue;
  onFunded: () => void;
  onFailed: (message: string) => void;
}

/**
 * Persistent testnet onboarding banner: a keypair that is not on the ledger, or that
 * holds no XLM, connects fine and then fails every Soroban call with an opaque
 * error. It is intentionally not dismissible — on testnet the funding step is a
 * hard requirement — and disappears on its own once the account holds XLM.
 */
export function FundingBanner({ wallet, onFunded, onFailed }: FundingBannerProps) {
  // The banner only renders while funding is needed, so the remaining possible
  // reason is an account that is not on the ledger.
  const reasonText =
    wallet.fundingState === 'zero_balance'
      ? 'Tu cuenta existe en Stellar Testnet, pero tiene 0 XLM. Sin saldo no podés pagar comisiones ni firmar transacciones de Soroban.'
      : 'Esta cuenta todavía no existe en Stellar Testnet. Fondeala para poder firmar transacciones de Soroban.';

  const handleFund = async () => {
    const result = await wallet.fundTestnetXlm();
    if (result.success) {
      onFunded();
    } else {
      onFailed(result.error ?? 'No se pudo fondear la cuenta de testnet.');
    }
  };

  return (
    <div className="border-t border-outline-variant/30 bg-surface-container-lowest">
      <div className="w-full max-w-[1440px] mx-auto px-4 md:px-8 py-3 flex flex-col lg:flex-row lg:items-center gap-3 lg:gap-6">
        <div className="flex items-start gap-3 min-w-0 flex-1">
          <svg
            className="w-5 h-5 shrink-0 mt-0.5 text-error"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 9v2m0 4h.01M5.07 19h13.86a2 2 0 001.74-3L13.74 4a2 2 0 00-3.48 0l-7 12a2 2 0 001.74 3z"
            />
          </svg>

          <div className="min-w-0 flex flex-col gap-1">
            <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
              <span className="text-headline-sm font-semibold text-on-surface leading-tight">
                Cuenta de testnet sin fondear
              </span>
              <span className="px-2 py-0.5 rounded-full bg-surface-container-low border border-outline-variant/40 text-label-sm font-semibold text-secondary uppercase tracking-wide">
                XLM de prueba · sin valor real
              </span>
              <span className="font-code-md text-body-sm text-secondary">
                {truncateAddress(wallet.address, 6)}
              </span>
            </div>

            <p className="text-body-sm text-on-surface-variant leading-snug">{reasonText}</p>
            <p className="text-label-sm text-secondary leading-snug">
              USDC es un activo aparte: después del fondeo sigue en 0 y necesita una trustline, que no
              se otorga automáticamente.
            </p>

            {wallet.fundingError && (
              <p className="text-label-sm font-semibold text-error leading-snug" role="alert">
                {wallet.fundingError}
              </p>
            )}
          </div>
        </div>

        <div className="shrink-0">
          <button
            onClick={handleFund}
            disabled={wallet.fundingLoading}
            className="w-full sm:w-auto flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-primary hover:bg-primary-container text-on-primary text-sm font-semibold shadow-sm transition-all cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {wallet.fundingLoading ? (
              <svg className="w-4 h-4 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                />
              </svg>
            ) : (
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            )}
            <span>{wallet.fundingLoading ? 'Fondeando…' : 'Fondear XLM de prueba'}</span>
          </button>
        </div>
      </div>
    </div>
  );
}

export default function Header() {
  const location = useLocation();
  const wallet = useStellarWallet();

  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);

  const handleConnect = async () => {
    const result = await wallet.connect();
    if (!result.success && result.error) {
      setToast({ message: result.error, type: 'error' });
    } else {
      setToast({ message: 'Wallet connected successfully', type: 'success' });
    }
  };

  const handleDisconnect = () => {
    wallet.disconnect();
    setToast({ message: 'Wallet disconnected', type: 'info' });
  };

  const showFundingBanner = wallet.connected && wallet.needsFunding;

  return (
    <header className="sticky top-0 w-full z-50 bg-surface-container-lowest/95 backdrop-blur-md shadow-[0_1px_3px_rgba(11,28,48,0.04)]">
      <div className="h-20 w-full max-w-[1440px] mx-auto px-4 md:px-8 flex items-center justify-between gap-6 border-b border-outline-variant/30">
        {/* Logo */}
        <div className="flex items-center gap-6 shrink-0">
          <a href="/" className="flex items-center gap-2">
            <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
              <svg className="w-5 h-5 text-on-primary" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/>
              </svg>
            </div>
            <div className="flex flex-col">
              <span className="text-headline-sm tracking-tight text-on-surface leading-none font-semibold">Breadline</span>
              <span className="text-[11px] text-secondary font-medium tracking-wide uppercase mt-0.5">Institutional Escrow</span>
            </div>
          </a>
          <div className="hidden xl:flex items-center gap-1 px-2 py-1 rounded-full bg-surface-container-low border border-outline-variant/40">
            <span className="w-2 h-2 rounded-full bg-tertiary animate-pulse"></span>
            <span className="font-code-md text-xs text-on-surface-variant font-medium">Stellar Network • Testnet</span>
          </div>
        </div>

        {/* Navigation */}
        <nav className="hidden lg:flex items-center gap-1 bg-surface-container-low/70 p-1.5 rounded-xl border border-outline-variant/30">
          {navItems.map((item) => {
            const isActive = location.pathname === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                  isActive
                    ? 'bg-surface-container-high text-primary font-semibold shadow-[inset_0_1px_0_rgba(255,255,255,0.6)]'
                    : 'text-on-surface-variant hover:bg-surface-container-highest hover:text-on-surface'
                }`}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>

        {/* Right side */}
        <div className="flex items-center gap-4 shrink-0">
          <div className="hidden 2xl:flex items-center gap-1 px-2 py-1.5 rounded-lg bg-surface-container-lowest border border-outline-variant/40 shadow-sm">
            <svg className="w-4 h-4 text-tertiary" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
            <div className="flex flex-col text-left leading-none">
              <span className="font-code-md text-[11px] text-on-surface font-semibold">&lt;3.2s finality</span>
              <span className="font-code-md text-[10px] text-secondary">0.00001 XLM fee</span>
            </div>
          </div>

          <div className="flex items-center bg-surface-container-low p-0.5 rounded-lg border border-outline-variant/40">
            <button className="px-2.5 py-1 rounded-md text-xs font-semibold bg-surface-container-lowest text-primary shadow-sm">USDC</button>
            <button className="px-2.5 py-1 rounded-md text-xs font-semibold text-secondary hover:text-on-surface transition-colors">USD</button>
          </div>

          <button className="relative p-2 rounded-lg text-secondary hover:text-on-surface hover:bg-surface-container-low transition-colors">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" /></svg>
            <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-primary ring-2 ring-surface-container-lowest"></span>
          </button>

          <div className="h-6 w-px bg-outline-variant/40 hidden sm:block"></div>

          <div className="flex items-center gap-3 pl-1">
            {wallet.connected ? (
              <>
                <div className="hidden md:flex flex-col text-right">
                  <span className="text-sm text-on-surface leading-tight font-semibold">{truncateAddress(wallet.address)}</span>
                  <span className="text-xs text-secondary leading-tight">Connected • {wallet.network}</span>
                </div>
                <div className="relative ring-1 ring-tertiary/60 rounded-full p-0.5 bg-surface-container-lowest">
                  <div className="w-8 h-8 rounded-full bg-tertiary-container flex items-center justify-center">
                    <svg className="w-4 h-4 text-on-tertiary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                    </svg>
                  </div>
                </div>
                <button
                  onClick={handleDisconnect}
                  className="px-3 py-1.5 rounded-lg text-xs font-semibold text-error hover:bg-error/10 transition-colors cursor-pointer"
                >
                  Disconnect
                </button>
              </>
            ) : (
              <button
                onClick={handleConnect}
                disabled={wallet.loading}
                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-primary hover:bg-primary-container text-on-primary text-sm font-semibold shadow-sm transition-all cursor-pointer disabled:opacity-50"
              >
                {wallet.loading ? (
                  <svg className="w-4 h-4 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                ) : (
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                  </svg>
                )}
                <span>Connect Wallet</span>
              </button>
            )}
          </div>
        </div>
      </div>
      {showFundingBanner && (
        <FundingBanner
          wallet={wallet}
          onFunded={() =>
            setToast({
              message: 'XLM de prueba recibidos. Ya podés operar en testnet.',
              type: 'success',
            })
          }
          onFailed={(message) => setToast({ message, type: 'error' })}
        />
      )}
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
    </header>
  );
}
