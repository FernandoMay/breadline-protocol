import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { useStellarWallet } from '../hooks/useStellarWallet';
import { fetchEscrow, fetchIsExpired, formatScAmount } from '../lib/contract';
import type { OnChainEscrow, OnChainEscrowState } from '../lib/contract';
import { formatUSDC, truncateHash } from '../lib/stellar';

// ─── On-chain state → display helpers ───

function getEscrowStatusLabel(state: OnChainEscrowState): string {
  const labels: Record<OnChainEscrowState, string> = {
    Created: 'Orden Creada',
    Funded: 'Fondos Bloqueados',
    Released: 'Liberado',
    Refunded: 'Reembolsado',
    Disputed: 'Disputa Activa',
  };
  return labels[state];
}

function getEscrowStatusColor(state: OnChainEscrowState): string {
  const colors: Record<OnChainEscrowState, string> = {
    Created: 'bg-secondary/10 text-secondary',
    Funded: 'bg-primary/10 text-primary',
    Released: 'bg-tertiary/10 text-tertiary',
    Refunded: 'bg-secondary/10 text-secondary',
    Disputed: 'bg-error/10 text-error',
  };
  return colors[state];
}

function getEscrowDotColor(state: OnChainEscrowState): string {
  const dots: Record<OnChainEscrowState, string> = {
    Created: 'bg-secondary',
    Funded: 'bg-tertiary',
    Released: 'bg-tertiary',
    Refunded: 'bg-secondary',
    Disputed: 'bg-error',
  };
  return dots[state];
}

function truncateAddress(address: string): string {
  if (!address) return '—';
  return `${address.slice(0, 8)}...${address.slice(-6)}`;
}

function deadlineToDate(timestamp: bigint): string {
  if (timestamp === 0n) return '—';
  return new Date(Number(timestamp) * 1000).toLocaleDateString('es-AR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

// ─── Component ───

export default function Dashboard() {
  const wallet = useStellarWallet();
  const [escrow, setEscrow] = useState<OnChainEscrow | null>(null);
  const [isExpired, setIsExpired] = useState(false);
  const [loadingEscrow, setLoadingEscrow] = useState(true);

  const loadEscrow = useCallback(async () => {
    setLoadingEscrow(true);
    try {
      const data = await fetchEscrow();
      setEscrow(data);
      if (data) {
        const expired = await fetchIsExpired();
        setIsExpired(expired);
      }
    } catch {
      setEscrow(null);
    } finally {
      setLoadingEscrow(false);
    }
  }, []);

  useEffect(() => {
    loadEscrow();
  }, [loadEscrow]);

  // Pull USDC balance from wallet balances
  const usdcBalance = wallet.balances.find((b) => b.assetCode === 'USDC');
  const usdcAmount = usdcBalance ? Number(usdcBalance.balance) : 0;

  const activeStates: OnChainEscrowState[] = ['Created', 'Funded'];
  const isActiveEscrow = escrow && activeStates.includes(escrow.state);

  // ─── Not connected state ───

  if (!wallet.connected && !loadingEscrow) {
    return (
      <div className="flex flex-col w-full pb-16 space-y-8">
        <section className="relative overflow-hidden rounded-xl bg-surface-container-lowest p-8 shadow-sm">
          <div className="absolute -right-24 -top-24 w-96 h-96 rounded-full bg-surface-container-high/40 blur-3xl pointer-events-none"></div>
          <div className="relative z-10 flex flex-col items-center justify-center gap-6 py-12 text-center">
            <div className="w-16 h-16 rounded-2xl bg-primary-container flex items-center justify-center">
              <svg className="w-8 h-8 text-on-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
              </svg>
            </div>
            <h1 className="text-2xl md:text-3xl text-on-surface tracking-tight font-bold">
              Conectá tu wallet para comenzar
            </h1>
            <p className="text-sm text-secondary max-w-md">
              Conectá tu wallet Freighter para ver tus escrows, balances y operaciones en la red Stellar.
            </p>
            <button
              onClick={wallet.connect}
              disabled={wallet.loading}
              className="inline-flex items-center gap-2 px-6 py-3 rounded-lg bg-primary-container text-on-primary text-sm font-semibold hover:bg-primary transition-all shadow-md disabled:opacity-50"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
              </svg>
              {wallet.loading ? 'Conectando...' : 'Conectar Wallet'}
            </button>
            {wallet.error && (
              <p className="text-xs text-error mt-2">{wallet.error}</p>
            )}
          </div>
        </section>
      </div>
    );
  }

  // ─── Loading state ───

  if (loadingEscrow && wallet.connected) {
    return (
      <div className="flex flex-col w-full pb-16 space-y-8">
        <section className="relative overflow-hidden rounded-xl bg-surface-container-lowest p-8 shadow-sm">
          <div className="relative z-10 flex flex-col items-center justify-center gap-4 py-12">
            <div className="w-10 h-10 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
            <p className="text-sm text-secondary">Cargando datos on-chain...</p>
          </div>
        </section>
      </div>
    );
  }

  // ─── Connected dashboard ───

  const hasEscrow = escrow !== null;

  return (
    <div className="flex flex-col w-full pb-16 space-y-8">
      {/* Hero Section */}
      <section className="relative overflow-hidden rounded-xl bg-surface-container-lowest p-8 shadow-sm">
        <div className="absolute -right-24 -top-24 w-96 h-96 rounded-full bg-surface-container-high/40 blur-3xl pointer-events-none"></div>
        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="flex flex-col gap-2 max-w-2xl">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-surface-container-low text-primary text-xs font-semibold">
                <svg className="w-4 h-4 text-tertiary" fill="currentColor" viewBox="0 0 24 24"><path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
                Conectado a Stellar Testnet
              </span>
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-surface-container-low text-secondary font-code-md text-xs">
                {truncateAddress(wallet.address)}
              </span>
            </div>
            <h1 className="text-3xl md:text-4xl text-on-surface tracking-tight font-bold">
              {hasEscrow
                ? <>Tenés <span className="text-primary font-bold">un escrow activo</span></>
                : <>Bienvenido, <span className="text-primary font-bold">creá tu primer escrow</span></>
              }
            </h1>
            <p className="text-sm text-secondary">
              {hasEscrow
                ? `${getEscrowStatusLabel(escrow.state)} · ${escrow.service_description.slice(0, 80)}${escrow.service_description.length > 80 ? '…' : ''}`
                : 'Conectá tu wallet y creá un escrow para bloquear fondos de forma trustless en Stellar.'
              }
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3 shrink-0">
            <Link to="/vista-comprador" className="inline-flex items-center gap-2 px-5 py-3 rounded-lg bg-surface-container text-on-surface text-sm font-semibold hover:bg-surface-container-high transition-all shadow-sm">
              <svg className="w-5 h-5 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" /></svg>
              Retirar a Banco Local
            </Link>
            <Link to="/crear-escrow" className="inline-flex items-center gap-2 px-5 py-3 rounded-lg bg-primary-container text-on-primary text-sm font-semibold hover:bg-primary transition-all shadow-md">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" /></svg>
              + Crear Orden de Escrow
            </Link>
          </div>
        </div>
      </section>

      {/* Stats Cards */}
      <section className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-5">
        <StatCard
          title="Total en Custodia"
          value={hasEscrow && isActiveEscrow ? formatScAmount(escrow.amount) : '$0.00'}
          subtitle="Fondos bloqueados en contrato Soroban, 100% trustless."
          icon="lock"
          iconColor="text-primary"
          footer={hasEscrow && isActiveEscrow ? '1 contrato inmutable activo' : 'Sin escrows activos'}
          footerColor="text-tertiary"
        />
        <StatCard
          title="Balance USDC"
          value={formatUSDC(usdcAmount)}
          subtitle="Tu balance disponible en la wallet conectada."
          icon="wallet"
          iconColor="text-tertiary"
          footer="Red Stellar Testnet"
          footerColor="text-primary"
        />
        <StatCard
          title="Escrow State"
          value={hasEscrow ? getEscrowStatusLabel(escrow.state) : 'Sin datos'}
          subtitle={hasEscrow ? escrow.service_description.slice(0, 60) + (escrow.service_description.length > 60 ? '…' : '') : 'Creá un escrow para ver el estado aquí.'}
          icon="check"
          iconColor="bg-primary-container"
          footer={hasEscrow ? `Vence: ${deadlineToDate(escrow.deadline)}` : '—'}
          footerColor="text-secondary"
        />
        <StatCard
          title="Wallet"
          value={wallet.address ? truncateHash(wallet.address, 6) : '—'}
          subtitle={`Red: ${wallet.network || 'TESTNET'} · ${wallet.balances.length} activos`}
          icon="savings"
          iconColor="text-tertiary"
          footer="Freighter conectado"
          footerColor="text-tertiary"
        />
      </section>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Escrow Detail */}
        <div className="lg:col-span-8 flex flex-col space-y-6">
          <div className="rounded-xl bg-surface-container-lowest p-6 shadow-sm flex flex-col gap-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h2 className="text-lg text-on-surface font-semibold">
                  {hasEscrow ? 'Detalle del Escrow On-Chain' : 'Órdenes de Custodia'}
                </h2>
                <p className="text-xs text-secondary">
                  {hasEscrow
                    ? 'Datos leídos directamente del contrato Soroban en Stellar Testnet'
                    : 'Monitoreo determinista de depósitos, entregas y confirmaciones multi-firma'
                  }
                </p>
              </div>
              <button
                onClick={loadEscrow}
                className="px-3.5 py-1.5 rounded-lg bg-surface-container-low text-secondary text-xs font-semibold hover:bg-surface-container transition-colors shrink-0"
              >
                Actualizar
              </button>
            </div>

            {hasEscrow ? (
              <>
                {/* Filter Tabs — single active escrow */}
                <div className="flex items-center gap-2 overflow-x-auto pb-1 text-xs font-medium">
                  <button className="px-3.5 py-1.5 rounded-full bg-primary text-on-primary font-semibold shrink-0">
                    Activo ({getEscrowStatusLabel(escrow.state)})
                  </button>
                </div>

                {/* Table */}
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-surface-container-low/60 rounded-lg text-secondary text-xs uppercase tracking-wider">
                        <th className="py-3 px-4 rounded-l-lg">Direcciones</th>
                        <th className="py-3 px-4">Monto (USDC)</th>
                        <th className="py-3 px-4">Estado</th>
                        <th className="py-3 px-4">Servicio</th>
                        <th className="py-3 px-4">Vencimiento</th>
                        <th className="py-3 px-4 text-right rounded-r-lg">Acción</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-surface-container-low text-xs">
                      <tr className="hover:bg-surface-container-low/40 transition-colors">
                        <td className="py-4 px-4">
                          <div className="flex flex-col gap-1">
                            <span className="font-semibold text-on-surface">
                              Buyer
                            </span>
                            <span className="font-code-md text-secondary text-[11px]">
                              {truncateAddress(escrow.buyer)}
                            </span>
                            <span className="font-semibold text-on-surface mt-1">
                              Seller
                            </span>
                            <span className="font-code-md text-secondary text-[11px]">
                              {truncateAddress(escrow.seller)}
                            </span>
                          </div>
                        </td>
                        <td className="py-4 px-4 font-code-md font-bold text-on-surface">
                          {formatScAmount(escrow.amount)}
                        </td>
                        <td className="py-4 px-4">
                          <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${getEscrowStatusColor(escrow.state)}`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${getEscrowDotColor(escrow.state)}`}></span>
                            {getEscrowStatusLabel(escrow.state)}
                          </span>
                          {isExpired && (
                            <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded-full bg-error/10 text-error text-[10px] font-semibold">
                              EXPIRED
                            </span>
                          )}
                        </td>
                        <td className="py-4 px-4">
                          <div className="flex flex-col gap-1">
                            <span className="text-on-surface font-medium text-[12px] max-w-[180px] truncate">
                              {escrow.service_description}
                            </span>
                          </div>
                        </td>
                        <td className="py-4 px-4 font-code-md text-secondary text-[12px]">
                          {deadlineToDate(escrow.deadline)}
                        </td>
                        <td className="py-4 px-4 text-right">
                          <Link
                            to="/sala-de-entrega"
                            className="px-2.5 py-1.5 rounded-lg bg-surface-container text-primary text-xs font-semibold hover:bg-surface-container-high transition-colors inline-flex items-center gap-1"
                          >
                            <span>Sala de Entrega</span>
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                          </Link>
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                {/* Escrow raw details */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-2">
                  <div className="bg-surface-container-low rounded-lg p-4 flex flex-col gap-1.5">
                    <span className="text-[11px] text-secondary uppercase tracking-wider font-semibold">Created At</span>
                    <span className="font-code-md text-xs text-on-surface">
                      {escrow.created_at > 0n
                        ? new Date(Number(escrow.created_at) * 1000).toLocaleString('es-AR')
                        : '—'
                      }
                    </span>
                  </div>
                  <div className="bg-surface-container-low rounded-lg p-4 flex flex-col gap-1.5">
                    <span className="text-[11px] text-secondary uppercase tracking-wider font-semibold">Deadline</span>
                    <span className="font-code-md text-xs text-on-surface">
                      {escrow.deadline > 0n
                        ? new Date(Number(escrow.deadline) * 1000).toLocaleString('es-AR')
                        : '—'
                      }
                    </span>
                  </div>
                </div>
              </>
            ) : (
              /* Empty state */
              <div className="flex flex-col items-center justify-center py-16 gap-4">
                <div className="w-14 h-14 rounded-2xl bg-surface-container flex items-center justify-center">
                  <svg className="w-7 h-7 text-secondary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                  </svg>
                </div>
                <p className="text-sm text-on-surface font-semibold">No hay escrows en la chain</p>
                <p className="text-xs text-secondary text-center max-w-sm">
                  Creá un escrow para bloquear fondos de forma trustless. Los datos se leen directamente del contrato Soroban en Stellar.
                </p>
                <Link
                  to="/crear-escrow"
                  className="mt-2 inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-primary-container text-on-primary text-xs font-semibold hover:bg-primary transition-all shadow-md"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" /></svg>
                  + Crear Escrow
                </Link>
              </div>
            )}
          </div>

          {/* Bottom Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div className="rounded-xl bg-surface-container-lowest p-6 shadow-sm flex flex-col justify-between">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <svg className="w-5 h-5 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" /></svg>
                  <span className="text-lg text-on-surface font-semibold">Auditoría Criptográfica</span>
                </div>
                <span className="font-code-md text-[11px] px-2 py-0.5 rounded bg-surface-container-low text-secondary">Soroban Testnet</span>
              </div>
              <p className="text-xs text-secondary mb-4">
                Cada depósito de escrow genera una cuenta inteligente sin custodia (Trustless Work) asegurada por el consenso de validadores de Stellar.
              </p>
              <div className="bg-surface-container-low rounded-lg p-3.5 flex items-center justify-between">
                <div className="flex flex-col">
                  <span className="font-code-md text-[11px] text-secondary">Último Contrato</span>
                  <span className="font-code-md text-xs text-on-surface font-bold">
                    {hasEscrow ? truncateHash(escrow.buyer, 8) : 'Sin datos'} (0.00001 XLM gas)
                  </span>
                </div>
                <svg className="w-5 h-5 text-tertiary" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
              </div>
            </div>
            <div className="rounded-xl bg-surface-container-lowest p-6 shadow-sm flex flex-col justify-between">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <svg className="w-5 h-5 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" /></svg>
                  <span className="text-lg text-on-surface font-semibold">Términos Comerciales</span>
                </div>
                <span className="text-xs text-tertiary font-semibold">Protección 100%</span>
              </div>
              <p className="text-xs text-secondary mb-4">
                Los clientes bloquean el capital antes de que comiences a trabajar. La liberación es irrevocable una vez verificado el entregable pactado.
              </p>
              <div className="flex items-center gap-4 text-secondary text-xs">
                <div className="flex items-center gap-1">
                  <svg className="w-4 h-4 text-tertiary" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                  <span>Sin contracargos</span>
                </div>
                <div className="flex items-center gap-1">
                  <svg className="w-4 h-4 text-tertiary" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                  <span>Soporte Arbitraje LATAM</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Sidebar */}
        <div className="lg:col-span-4 flex flex-col space-y-6">
          {/* Wallet Info */}
          <div className="rounded-xl bg-surface-container-lowest p-6 shadow-sm flex flex-col gap-5">
            <div className="flex items-center justify-between">
              <span className="text-lg text-on-surface font-semibold">Tu Wallet</span>
              <span className="px-2 py-0.5 rounded bg-surface-container text-primary font-code-md text-[11px] font-semibold">
                {wallet.network || 'TESTNET'}
              </span>
            </div>
            <div className="flex flex-col gap-3">
              <div className="bg-surface-container-low rounded-lg p-3.5 flex flex-col gap-1.5">
                <span className="text-[11px] text-secondary uppercase tracking-wider font-semibold">Dirección</span>
                <span className="font-code-md text-[12px] text-on-surface break-all">
                  {wallet.address}
                </span>
              </div>
              {usdcBalance && (
                <div className="bg-surface-container-low rounded-lg p-3.5 flex items-center justify-between">
                  <div className="flex flex-col">
                    <span className="text-[11px] text-secondary uppercase tracking-wider font-semibold">Balance USDC</span>
                    <span className="font-code-md text-sm text-on-surface font-bold">{formatUSDC(usdcAmount)}</span>
                  </div>
                  <svg className="w-5 h-5 text-tertiary" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                </div>
              )}
              {wallet.balances.filter((b) => b.assetCode !== 'USDC').map((balance) => (
                <div key={`${balance.assetCode}-${balance.issuer ?? ''}`} className="bg-surface-container-low rounded-lg p-3.5 flex items-center justify-between">
                  <div className="flex flex-col">
                    <span className="text-[11px] text-secondary uppercase tracking-wider font-semibold">{balance.assetCode}</span>
                    <span className="font-code-md text-sm text-on-surface font-bold">{Number(balance.balance).toFixed(4)}</span>
                  </div>
                </div>
              ))}
            </div>
            <button
              onClick={wallet.disconnect}
              className="w-full py-2.5 rounded-lg bg-surface-container text-error text-xs font-semibold hover:bg-error/10 transition-colors text-center"
            >
              Desconectar Wallet
            </button>
          </div>

          {/* Local Ramp */}
          <div className="rounded-xl bg-surface-container-lowest p-6 shadow-sm flex flex-col gap-5">
            <div className="flex items-center justify-between">
              <span className="text-lg text-on-surface font-semibold">Rampa Local Instantánea</span>
              <span className="px-2 py-0.5 rounded bg-surface-container text-primary font-code-md text-[11px] font-semibold">Anchor SEP-24</span>
            </div>
            <p className="text-xs text-secondary">
              Retira tus USDC directo a tu banco en moneda local (ARS, BRL, MXN, COP) en cuestión de minutos y con comisiones casi nulas.
            </p>
            <div className="space-y-3">
              {[
                { code: 'AR', name: 'Transferencia ARS (CVU/CBU)', sub: 'Acreditación instantánea 24/7', color: 'text-primary' },
                { code: 'BR', name: 'PIX Brasil (BRL)', sub: 'Liquidación en < 30 segundos', color: 'text-tertiary' },
                { code: 'MX', name: 'SPEI México (MXN)', sub: 'Tipo de cambio institucional mayorista', color: 'bg-primary-container' },
              ].map((item) => (
                <div key={item.code} className="flex items-center justify-between p-3 rounded-lg bg-surface-container-low hover:bg-surface-container transition-colors cursor-pointer">
                  <div className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-full bg-surface-container-lowest flex items-center justify-center font-bold text-xs ${item.color}`}>
                      {item.code}
                    </div>
                    <div className="flex flex-col">
                      <span className="text-sm text-on-surface font-semibold">{item.name}</span>
                      <span className="text-[12px] text-secondary">{item.sub}</span>
                    </div>
                  </div>
                  <svg className="w-4 h-4 text-secondary" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                </div>
              ))}
            </div>
            <button className="w-full py-2.5 rounded-lg bg-surface-container text-primary text-xs font-semibold hover:bg-surface-container-high transition-colors text-center">
              Configurar Cuentas Bancarias
            </button>
          </div>

          {/* Network Info */}
          <div className="rounded-xl bg-surface-container-lowest p-6 shadow-sm flex flex-col gap-4">
            <span className="text-xs text-secondary uppercase tracking-wider font-semibold">Info de Red</span>
            <div className="flex flex-col space-y-3">
              <div className="flex items-start gap-3">
                <div className="w-2 h-2 mt-2 rounded-full bg-tertiary shrink-0"></div>
                <div className="flex flex-col">
                  <span className="text-xs text-on-surface font-medium">Stellar Testnet</span>
                  <span className="text-[12px] text-secondary">Red de prueba para desarrollo</span>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-2 h-2 mt-2 rounded-full bg-primary shrink-0"></div>
                <div className="flex flex-col">
                  <span className="text-xs text-on-surface font-medium">Soroban Contracts</span>
                  <span className="text-[12px] text-secondary">Smart contracts en Rust → Wasm</span>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-2 h-2 mt-2 rounded-full bg-secondary shrink-0"></div>
                <div className="flex flex-col">
                  <span className="text-xs text-on-surface font-medium">USDC on Stellar</span>
                  <span className="text-[12px] text-secondary">1 USDC = 10,000,000 stroops</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function StatCard({ title, value, subtitle, icon, iconColor, footer, footerColor }: {
  title: string;
  value: string;
  subtitle: string;
  icon: string;
  iconColor: string;
  footer: string;
  footerColor: string;
  valueSuffix?: string;
}) {
  const iconPaths: Record<string, string> = {
    lock: 'M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z',
    wallet: 'M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z',
    check: 'M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z',
    savings: 'M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z',
  };

  return (
    <div className="relative overflow-hidden rounded-xl bg-surface-container-lowest p-6 shadow-sm flex flex-col justify-between">
      <div className="flex items-center justify-between mb-4">
        <span className="text-xs text-secondary uppercase tracking-wider">{title}</span>
        <div className="w-8 h-8 rounded-lg bg-surface-container-low flex items-center justify-center">
          <svg className={`w-5 h-5 ${iconColor}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={iconPaths[icon]} /></svg>
        </div>
      </div>
      <div>
        <div className="flex items-baseline gap-2">
          <span className="text-3xl text-on-surface font-bold">{value}</span>
        </div>
        <p className="text-xs text-secondary mt-1">{subtitle}</p>
      </div>
      <div className="mt-4 pt-3 flex items-center gap-2 text-xs">
        <span className="w-1.5 h-1.5 rounded-full bg-current" style={{ color: footerColor === 'text-tertiary' ? '#006645' : footerColor === 'text-primary' ? '#0050cb' : '#565d79' }}></span>
        <span className={footerColor}>{footer}</span>
      </div>
    </div>
  );
}
