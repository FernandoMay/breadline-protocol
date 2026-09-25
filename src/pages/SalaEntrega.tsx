import { useState, useEffect, useCallback } from 'react';
import {
  fetchEscrow,
  releaseFundsOnChain,
  refundEscrowOnChain,
  raiseDisputeOnChain,
  autoRefundIfExpiredOnChain,
  formatScAmount,
  type OnChainEscrow,
  type OnChainEscrowState,
} from '../lib/contract';
import { useActiveEscrowId } from '../lib/activeEscrow';
import { useStellarWallet } from '../hooks/useStellarWallet';

// ─── Derived helpers ───

function stateLabel(state: OnChainEscrowState): string {
  const map: Record<OnChainEscrowState, string> = {
    Created: 'Creado',
    Funded: 'Fondeado',
    Released: 'Liberado',
    Refunded: 'Reembolsado',
    Disputed: 'En Disputa',
  };
  return map[state] ?? state;
}

function stateColor(state: OnChainEscrowState): string {
  const map: Record<OnChainEscrowState, string> = {
    Created: 'bg-secondary/15 text-secondary',
    Funded: 'bg-tertiary/15 text-tertiary',
    Released: 'bg-tertiary/15 text-tertiary',
    Refunded: 'bg-error/15 text-error',
    Disputed: 'bg-error/15 text-error',
  };
  return map[state] ?? 'bg-secondary/15 text-secondary';
}

function stateDotColor(state: OnChainEscrowState): string {
  const map: Record<OnChainEscrowState, string> = {
    Created: 'bg-secondary',
    Funded: 'bg-tertiary',
    Released: 'bg-tertiary',
    Refunded: 'bg-error',
    Disputed: 'bg-error',
  };
  return map[state] ?? 'bg-secondary';
}

function lifecycleSteps(state: OnChainEscrowState) {
  const order: OnChainEscrowState[] = ['Created', 'Funded', 'Released'];
  const activeIdx = order.indexOf(state === 'Disputed' ? 'Funded' : state === 'Refunded' ? 'Created' : state);

  const labels = ['Orden Creada', 'Fondos en Custodia', 'En Revision', 'Liberacion'];
  const statusMap: OnChainEscrowState[] = ['Created', 'Funded', 'Funded', 'Released'];

  return labels.map((label, i) => {
    let status: 'completed' | 'active' | 'pending';
    if (state === 'Disputed') {
      status = i < 2 ? 'completed' : i === 2 ? 'active' : 'pending';
    } else if (state === 'Refunded') {
      status = i === 0 ? 'completed' : 'pending';
    } else {
      const stepState = statusMap[i];
      const stepIdx = order.indexOf(stepState);
      if (stepIdx < activeIdx) status = 'completed';
      else if (stepIdx === activeIdx) status = 'active';
      else status = 'pending';
    }
    return { label, status };
  });
}

function formatDeadline(deadline: bigint): string {
  const now = Date.now();
  const deadlineMs = Number(deadline) * 1000;
  const diff = deadlineMs - now;
  if (diff <= 0) return 'Vencido';

  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  return `${String(days).padStart(2, '0')}d ${String(hours).padStart(2, '0')}h ${String(minutes).padStart(2, '0')}m`;
}

function formatTimestamp(ts: bigint): string {
  const date = new Date(Number(ts) * 1000);
  return date.toLocaleDateString('es-AR', { day: 'numeric', month: 'short' }) + ' ' +
    date.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' });
}

function shortAddress(addr: string): string {
  if (!addr || addr.length < 12) return addr ?? '';
  return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
}

// ─── Chat message type ───

interface ChatMsg {
  sender: 'buyer' | 'seller';
  name: string;
  role: string;
  message: string;
  time: string;
}

// ─── Component ───

export default function SalaEntrega() {
  const wallet = useStellarWallet();
  const { connected, address, signTransaction } = wallet;

  // The contract this wallet is really operating on.
  const activeContractId = useActiveEscrowId(address);

  const [escrow, setEscrow] = useState<OnChainEscrow | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [showReleaseModal, setShowReleaseModal] = useState(false);
  const [newComment, setNewComment] = useState('');
  const [chat, setChat] = useState<ChatMsg[]>([]);

  // ─── Fetch escrow on mount ───

  const loadEscrow = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const data = await fetchEscrow(activeContractId);
      setEscrow(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al cargar el escrow');
    } finally {
      setLoading(false);
    }
  }, [activeContractId]);

  useEffect(() => {
    loadEscrow();
  }, [loadEscrow]);

  // ─── Refresh after action ───

  const refreshAfterAction = useCallback(async () => {
    setActionLoading('refresh');
    try {
      const data = await fetchEscrow(activeContractId);
      setEscrow(data);
    } finally {
      setActionLoading(null);
    }
  }, [activeContractId]);

  // ─── Actions ───

  const handleRelease = useCallback(async () => {
    if (!signTransaction) return;
    setActionLoading('release');
    try {
      const result = await releaseFundsOnChain(signTransaction, activeContractId);
      if (result.success) {
        setShowReleaseModal(false);
        await refreshAfterAction();
      } else {
        setError(result.error ?? 'Error al liberar fondos');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al liberar fondos');
    } finally {
      setActionLoading(null);
    }
  }, [signTransaction, activeContractId, refreshAfterAction]);

  const handleRefund = useCallback(async () => {
    if (!signTransaction || !address) return;
    setActionLoading('refund');
    try {
      const result = await refundEscrowOnChain(address, signTransaction, activeContractId);
      if (result.success) {
        await refreshAfterAction();
      } else {
        setError(result.error ?? 'Error al reembolsar');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al reembolsar');
    } finally {
      setActionLoading(null);
    }
  }, [signTransaction, address, activeContractId, refreshAfterAction]);

  const handleDispute = useCallback(async () => {
    if (!signTransaction || !address) return;
    setActionLoading('dispute');
    try {
      const result = await raiseDisputeOnChain(address, signTransaction, activeContractId);
      if (result.success) {
        await refreshAfterAction();
      } else {
        setError(result.error ?? 'Error al abrir disputa');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al abrir disputa');
    } finally {
      setActionLoading(null);
    }
  }, [signTransaction, address, activeContractId, refreshAfterAction]);

  const handleAutoRefund = useCallback(async () => {
    if (!signTransaction) return;
    setActionLoading('auto-refund');
    try {
      const result = await autoRefundIfExpiredOnChain(signTransaction, activeContractId);
      if (result.success) {
        await refreshAfterAction();
      } else {
        setError(result.error ?? 'Error al ejecutar auto-reembolso');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al ejecutar auto-reembolso');
    } finally {
      setActionLoading(null);
    }
  }, [signTransaction, activeContractId, refreshAfterAction]);

  // ─── Chat ───

  const handleSend = () => {
    if (!newComment.trim()) return;
    const now = new Date();
    setChat([
      ...chat,
      {
        sender: 'seller' as const,
        name: 'Vendedor',
        role: 'Vendedor',
        message: newComment.trim(),
        time: now.toLocaleDateString('es-AR', { day: 'numeric', month: 'short' }) + ', ' + now.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' }),
      },
    ]);
    setNewComment('');
  };

  // ─── Derived state ───

  const isBuyer = connected && escrow && address === escrow.buyer;
  const isSeller = connected && escrow && address === escrow.seller;
  const canAct = connected && (isBuyer || isSeller);
  const isExpired = escrow && Date.now() >= Number(escrow.deadline) * 1000;

  // ─── Render ───

  return (
    <div className="flex flex-col w-full pb-16 space-y-8">
      {/* Status Banner */}
      <section className="relative overflow-hidden rounded-xl bg-surface-container-lowest p-6 shadow-sm">
        <div className="absolute -right-16 -top-16 w-64 h-64 rounded-full bg-primary/5 blur-3xl pointer-events-none"></div>
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex flex-col gap-1">
            <div className="flex flex-wrap items-center gap-2">
              {escrow ? (
                <>
                  <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${stateColor(escrow.state)}`}>
                    <span className={`w-2 h-2 rounded-full animate-pulse ${stateDotColor(escrow.state)}`}></span>
                    {stateLabel(escrow.state)}
                  </span>
                  <span className="font-code-md text-xs text-secondary bg-surface-container-low px-2 py-0.5 rounded">ID: {shortAddress(activeContractId)}</span>
                </>
              ) : (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-secondary/15 text-secondary text-xs font-semibold">
                  Sin escrow activo
                </span>
              )}
            </div>
            <h1 className="text-2xl md:text-3xl text-on-surface tracking-tight font-bold mt-1">
              Sala de Entrega y Revision
            </h1>
            <p className="text-sm text-secondary max-w-xl">
              El comprador tiene un plazo definido para revisar los entregables y liberar los fondos. Si no hay respuesta antes del vencimiento, el contrato ejecuta un reembolso automatico a favor del comprador.
            </p>
          </div>
          {escrow && (
            <div className="flex items-center gap-3 shrink-0">
              <div className="px-4 py-3 rounded-xl bg-surface-container-low flex flex-col items-center">
                <span className="text-xs text-secondary uppercase font-semibold">Revision en</span>
                <span className="font-code-md text-2xl text-primary font-bold tracking-tight">{formatDeadline(escrow.deadline)}</span>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* Loading state */}
      {loading && (
        <section className="rounded-xl bg-surface-container-lowest p-12 shadow-sm flex flex-col items-center gap-4">
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
          <span className="text-sm text-secondary">Cargando datos del escrow on-chain...</span>
        </section>
      )}

      {/* Error banner */}
      {error && (
        <section className="rounded-xl bg-error/5 border border-error/20 p-4 shadow-sm flex items-center gap-3">
          <svg className="w-5 h-5 text-error shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
          <span className="text-sm text-error flex-1">{error}</span>
          <button onClick={() => setError('')} className="text-xs text-error hover:underline">Cerrar</button>
        </section>
      )}

      {/* Empty state */}
      {!loading && !escrow && (
        <section className="rounded-xl bg-surface-container-lowest p-12 shadow-sm flex flex-col items-center gap-4 text-center">
          <div className="w-16 h-16 rounded-full bg-surface-container-low flex items-center justify-center">
            <svg className="w-8 h-8 text-secondary" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" /></svg>
          </div>
          <h2 className="text-lg text-on-surface font-semibold">No hay escrow activo</h2>
          <p className="text-sm text-secondary max-w-md">
            No se encontro un contrato de escrow en la cadena. Crea un escrow o verifica que el contrato este desplegado en Soroban Testnet.
          </p>
          {!connected && (
            <p className="text-xs text-secondary">Conecta tu wallet para interactuar con el escrow.</p>
          )}
        </section>
      )}

      {/* Main Content (only when escrow exists) */}
      {escrow && !loading && (
        <>
          {/* Lifecycle Progress Bar */}
          <section className="rounded-xl bg-surface-container-lowest p-6 shadow-sm">
            <div className="flex items-center justify-between">
              {lifecycleSteps(escrow.state).map((step, i) => (
                <div key={step.label} className="flex items-center flex-1 last:flex-none">
                  <div className="flex flex-col items-center gap-2 relative">
                    <div
                      className={`w-10 h-10 rounded-full flex items-center justify-center text-xs font-bold shrink-0 transition-all ${
                        step.status === 'completed'
                          ? 'bg-primary text-on-primary'
                          : step.status === 'active'
                          ? 'bg-primary/15 text-primary ring-4 ring-primary/10 animate-pulse'
                          : 'bg-surface-container-low text-secondary'
                      }`}
                    >
                      {step.status === 'completed' ? (
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                      ) : (
                        <span>{i + 1}</span>
                      )}
                    </div>
                    <span className={`text-xs font-semibold whitespace-nowrap ${step.status === 'active' ? 'text-primary' : step.status === 'completed' ? 'text-on-surface' : 'text-secondary'}`}>
                      {step.label}
                    </span>
                  </div>
                  {i < 3 && (
                    <div className={`flex-1 h-0.5 mx-3 mt-[-20px] ${step.status === 'completed' ? 'bg-primary' : 'bg-surface-container-low'}`}></div>
                  )}
                </div>
              ))}
            </div>
          </section>

          {/* Main Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            {/* Left Panel (8 cols) */}
            <div className="lg:col-span-8 flex flex-col gap-6">
              {/* Seller Delivery Brief */}
              <section className="rounded-xl bg-surface-container-lowest p-6 shadow-sm flex flex-col gap-4">
                <div className="flex items-center justify-between">
                  <h2 className="text-lg text-on-surface font-semibold flex items-center gap-2">
                    <svg className="w-5 h-5 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
                    Entregable del Vendedor
                  </h2>
                  {(escrow.state === 'Released' || escrow.state === 'Funded') && (
                    <span className="px-2.5 py-0.5 rounded-full bg-tertiary/10 text-tertiary text-xs font-semibold flex items-center gap-1">
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" /></svg>
                      Activo
                    </span>
                  )}
                </div>

                {/* Seller Info */}
                <div className="flex items-center gap-3 p-3 bg-surface-container-low rounded-xl">
                  <div className="w-10 h-10 rounded-full bg-primary-container text-on-primary flex items-center justify-center text-sm font-bold shrink-0">
                    {escrow.seller ? escrow.seller.slice(0, 2).toUpperCase() : 'SV'}
                  </div>
                  <div className="flex flex-col">
                    <span className="text-sm text-on-surface font-semibold">Vendedor</span>
                    <span className="text-xs text-secondary font-code-md">{shortAddress(escrow.seller)}</span>
                  </div>
                </div>

                {/* Service Description */}
                <div className="p-4 bg-surface-container-low/60 rounded-xl border-l-4 border-primary">
                  <p className="text-sm text-on-surface italic leading-relaxed">
                    "{escrow.service_description || 'Sin descripcion proporcionada.'}"
                  </p>
                  <span className="text-xs text-secondary mt-2 block font-code-md">Creado: {formatTimestamp(escrow.created_at)}</span>
                </div>
              </section>

              {/* Communication Channel */}
              <section className="rounded-xl bg-surface-container-lowest p-6 shadow-sm flex flex-col gap-4">
                <div className="flex items-center justify-between">
                  <h2 className="text-lg text-on-surface font-semibold flex items-center gap-2">
                    <svg className="w-5 h-5 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" /></svg>
                    Canal de Comunicacion
                  </h2>
                  <span className="px-2.5 py-0.5 rounded-full bg-primary/10 text-primary text-xs font-semibold flex items-center gap-1.5">
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
                    Local MVP
                  </span>
                </div>

                {/* Chat Messages */}
                <div className="flex flex-col gap-4 max-h-80 overflow-y-auto p-4 bg-surface-container-low/40 rounded-xl">
                  {chat.length === 0 && (
                    <div className="text-center py-8">
                      <p className="text-sm text-secondary">No hay mensajes todavia. Envia el primero.</p>
                    </div>
                  )}
                  {chat.map((msg, i) => (
                    <div key={i} className={`flex items-start gap-3 ${msg.sender === 'seller' ? 'flex-row-reverse' : ''}`}>
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${msg.sender === 'buyer' ? 'bg-secondary-container text-on-secondary-container' : 'bg-primary-container text-on-primary'}`}>
                        {msg.sender === 'buyer' ? 'CO' : 'VE'}
                      </div>
                      <div className={`flex flex-col max-w-xs ${msg.sender === 'seller' ? 'items-end' : ''}`}>
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-xs text-on-surface font-semibold">{msg.name}</span>
                          <span className="text-[10px] text-secondary">{msg.role}</span>
                        </div>
                        <div className={`px-3.5 py-2.5 rounded-xl text-sm leading-relaxed ${msg.sender === 'buyer' ? 'bg-surface-container-lowest text-on-surface border border-outline-variant/30' : 'bg-primary text-on-primary'}`}>
                          {msg.message}
                        </div>
                        <span className="font-code-md text-[10px] text-outline mt-1">{msg.time}</span>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Comment Input */}
                <div className="flex items-start gap-3 pt-2">
                  <div className="w-8 h-8 rounded-full bg-primary-container text-on-primary flex items-center justify-center text-xs font-bold shrink-0">VE</div>
                  <div className="flex-1 flex flex-col gap-2">
                    <textarea
                      className="w-full px-4 py-2.5 rounded-lg bg-surface-container-low text-on-surface text-sm focus:bg-surface-container-lowest focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all placeholder:text-outline resize-none leading-relaxed"
                      placeholder={connected ? 'Escribe un comentario...' : 'Conecta tu wallet para chatear...'}
                      rows={2}
                      value={newComment}
                      onChange={(e) => setNewComment(e.target.value)}
                      onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
                      disabled={!connected}
                    />
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] text-secondary flex items-center gap-1">
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
                        Mensajes locales (MVP)
                      </span>
                      <button
                        className="px-4 py-1.5 rounded-lg bg-primary text-on-primary text-xs font-semibold hover:bg-primary-container transition-colors flex items-center gap-1.5 disabled:opacity-40 disabled:cursor-not-allowed"
                        onClick={handleSend}
                        disabled={!newComment.trim() || !connected}
                      >
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" /></svg>
                        Enviar
                      </button>
                    </div>
                  </div>
                </div>
              </section>
            </div>

            {/* Right Panel (4 cols, sticky) */}
            <div className="lg:col-span-4 flex flex-col gap-6 lg:sticky lg:top-24">
              {/* Buyer Decision Zone */}
              <section className="rounded-xl bg-surface-container-lowest p-6 shadow-sm flex flex-col gap-4">
                <div className="flex items-center justify-between">
                  <h2 className="text-lg text-on-surface font-semibold flex items-center gap-2">
                    <svg className="w-5 h-5 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" /></svg>
                    Decision del Comprador
                  </h2>
                </div>

                <div className="p-4 bg-tertiary/5 rounded-xl border border-tertiary/15 flex flex-col gap-3">
                  <span className="text-xs text-secondary uppercase font-semibold">Fondos en Custodia</span>
                  <div className="flex items-baseline gap-2">
                    <span className="text-3xl text-on-surface font-bold font-code-md">{formatScAmount(escrow.amount)}</span>
                    <span className="text-sm text-secondary font-semibold">USDC</span>
                  </div>
                  <div className="h-px bg-outline-variant/30"></div>
                  <div className="flex items-center justify-between text-xs text-secondary">
                    <span>Comision Breadline (0.8%):</span>
                    <span className="font-code-md text-on-surface font-medium">
                      -{formatScAmount(BigInt(Math.round(Number(escrow.amount) * 0.008)))}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-xs text-secondary">
                    <span>Neto al vendedor:</span>
                    <span className="font-code-md text-tertiary font-bold">
                      {formatScAmount(BigInt(Math.round(Number(escrow.amount) * 0.992)))}
                    </span>
                  </div>
                </div>

                {/* State-specific actions */}
                {escrow.state === 'Created' && (
                  <div className="p-3 bg-secondary/5 rounded-lg border border-secondary/15">
                    <p className="text-xs text-secondary flex items-center gap-2">
                      <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                      Esperando depósito del comprador
                    </p>
                  </div>
                )}

                {escrow.state === 'Funded' && (
                  <>
                    <button
                      className="w-full py-3 px-4 rounded-xl bg-primary hover:bg-primary-container text-on-primary text-sm font-bold shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2 active:scale-[0.99] disabled:opacity-40 disabled:cursor-not-allowed"
                      onClick={() => setShowReleaseModal(true)}
                      disabled={!isBuyer || actionLoading !== null}
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" /></svg>
                      {actionLoading === 'release' ? 'Liberando...' : 'Aprobar Entrega y Liberar Fondos'}
                    </button>

                    {!isBuyer && connected && (
                      <p className="text-xs text-secondary text-center">Solo el comprador puede liberar fondos.</p>
                    )}

                    {/* Deadline refund notice */}
                    <div className="p-3 bg-secondary/5 rounded-lg border border-secondary/15">
                      <p className="text-xs text-secondary leading-relaxed">
                        <strong className="text-on-surface">Política de vencimiento:</strong> al vencer el plazo, el pago queda bloqueado y el contrato habilita el reembolso automático al comprador. Cualquiera puede ejecutarlo on-chain, sin autorización de ninguna de las partes.
                      </p>
                    </div>

                    {/* Auto-refund button when expired */}
                    {isExpired && (
                      <button
                        className="w-full py-3 px-4 rounded-xl bg-error hover:bg-error/90 text-on-error text-sm font-bold shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2 active:scale-[0.99] disabled:opacity-40 disabled:cursor-not-allowed"
                        onClick={handleAutoRefund}
                        disabled={actionLoading !== null}
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                        {actionLoading === 'auto-refund' ? 'Ejecutando...' : 'Ejecutar Auto-Reembolso por Vencimiento'}
                      </button>
                    )}

                    <div className="flex items-center gap-2">
                      <button
                        className="flex-1 py-2.5 px-4 rounded-xl bg-surface-container text-on-surface text-xs font-semibold hover:bg-surface-container-high transition-colors border border-outline-variant/30 disabled:opacity-40 disabled:cursor-not-allowed"
                        onClick={handleDispute}
                        disabled={!canAct || actionLoading !== null}
                      >
                        {actionLoading === 'dispute' ? 'Abriendo...' : 'Abrir Disputa'}
                      </button>
                    </div>

                    <div className="flex items-center justify-center pt-1">
                      <button
                        className="text-xs text-secondary hover:text-error transition-colors flex items-center gap-1 underline underline-offset-2 disabled:opacity-40 disabled:cursor-not-allowed"
                        onClick={handleRefund}
                        disabled={!canAct || actionLoading !== null}
                      >
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
                        {actionLoading === 'refund' ? 'Reembolsando...' : 'Rechazar Entrega / Reembolsar'}
                      </button>
                    </div>
                  </>
                )}

                {escrow.state === 'Released' && (
                  <div className="p-4 bg-tertiary/10 rounded-xl border border-tertiary/20 flex flex-col gap-2 items-center">
                    <svg className="w-8 h-8 text-tertiary" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                    <span className="text-sm text-tertiary font-bold">Fondos Liberados</span>
                    <span className="text-xs text-secondary">La transaccion se ejecutó on-chain.</span>
                  </div>
                )}

                {escrow.state === 'Disputed' && (
                  <div className="p-4 bg-error/10 rounded-xl border border-error/20 flex flex-col gap-2 items-center">
                    <svg className="w-8 h-8 text-error" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
                    <span className="text-sm text-error font-bold">Disputa Activa</span>
                    <span className="text-xs text-secondary">La disputa congela la liquidacion. El arbitraje previo al vencimiento no esta implementado todavia.</span>
                    <span className="text-xs text-secondary mt-1">Al vencer el plazo, el contrato reembolsa al comprador de forma automatica.</span>
                  </div>
                )}

                {escrow.state === 'Refunded' && (
                  <div className="p-4 bg-secondary/10 rounded-xl border border-secondary/20 flex flex-col gap-2 items-center">
                    <svg className="w-8 h-8 text-secondary" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
                    <span className="text-sm text-secondary font-bold">Reembolsado</span>
                    <span className="text-xs text-secondary">Los fondos fueron devueltos al comprador.</span>
                  </div>
                )}
              </section>

              {/* Cryptographic Vault Panel */}
              <section className="rounded-xl bg-surface-container-lowest p-6 shadow-sm flex flex-col gap-4">
                <div className="flex items-center justify-between">
                  <h2 className="text-sm text-on-surface font-semibold flex items-center gap-2">
                    <svg className="w-4 h-4 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
                    Panel Criptografico
                  </h2>
                  <span className="font-code-md text-[10px] px-2 py-0.5 rounded bg-surface-container-low text-secondary">Soroban Testnet</span>
                </div>

                {/* Contract Address */}
                <div className="p-3 bg-surface-container-low rounded-lg flex flex-col gap-1.5">
                  <span className="text-[10px] text-secondary uppercase font-semibold">Direccion del Contrato</span>
                  <div className="flex items-center gap-2">
                    <span className="font-code-md text-[11px] text-on-surface font-medium truncate select-all flex-1">{activeContractId}</span>
                    <button className="shrink-0 p-1 rounded text-secondary hover:text-primary transition-colors">
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>
                    </button>
                  </div>
                </div>

                {/* Buyer / Seller addresses */}
                <div className="flex flex-col gap-2">
                  <span className="text-[10px] text-secondary uppercase font-semibold">Participantes</span>
                  <div className="flex items-center justify-between p-2.5 bg-surface-container-low rounded-lg">
                    <span className="text-xs text-secondary">Comprador</span>
                    <span className="font-code-md text-[11px] text-on-surface font-medium">{shortAddress(escrow.buyer)}</span>
                  </div>
                  <div className="flex items-center justify-between p-2.5 bg-surface-container-low rounded-lg">
                    <span className="text-xs text-secondary">Vendedor</span>
                    <span className="font-code-md text-[11px] text-on-surface font-medium">{shortAddress(escrow.seller)}</span>
                  </div>
                </div>

                {/* Balance Breakdown */}
                <div className="flex flex-col gap-2">
                  <span className="text-[10px] text-secondary uppercase font-semibold">Balance del Contrato</span>
                  <div className="flex items-center justify-between p-2.5 bg-surface-container-low rounded-lg">
                    <span className="text-xs text-secondary">Total depositado</span>
                    <span className="font-code-md text-xs text-on-surface font-bold">{formatScAmount(escrow.amount)}</span>
                  </div>
                  <div className="flex items-center justify-between p-2.5 bg-surface-container-low rounded-lg">
                    <span className="text-xs text-secondary">Garantia del contrato</span>
                    <span className="font-code-md text-xs text-primary font-bold">{formatScAmount(escrow.amount)}</span>
                  </div>
                  <div className="flex items-center justify-between p-2.5 bg-surface-container-low rounded-lg">
                    <span className="text-xs text-secondary">Estado on-chain</span>
                    <span className="font-code-md text-xs font-bold flex items-center gap-1.5">
                      <span className={`w-2 h-2 rounded-full ${stateDotColor(escrow.state)}`}></span>
                      {stateLabel(escrow.state)}
                    </span>
                  </div>
                </div>

                {/* Audit Log - derived from escrow state */}
                <div className="flex flex-col gap-2">
                  <span className="text-[10px] text-secondary uppercase font-semibold">Registro de Auditoria</span>
                  <div className="flex flex-col gap-1.5">
                    <div className="flex items-start gap-2 p-2 bg-surface-container-low/60 rounded-lg">
                      <div className="w-1.5 h-1.5 rounded-full bg-tertiary mt-1.5 shrink-0"></div>
                      <div className="flex flex-col flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-[11px] text-on-surface font-medium truncate">Escrow creado</span>
                          <span className="font-code-md text-[10px] text-secondary shrink-0">{formatTimestamp(escrow.created_at)}</span>
                        </div>
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-code-md text-[10px] text-outline">{shortAddress(escrow.buyer)} → {shortAddress(escrow.seller)}</span>
                          <span className="font-code-md text-[10px] text-secondary font-medium">{formatScAmount(escrow.amount)}</span>
                        </div>
                      </div>
                    </div>

                    {escrow.state !== 'Created' && (
                      <div className="flex items-start gap-2 p-2 bg-surface-container-low/60 rounded-lg">
                        <div className="w-1.5 h-1.5 rounded-full bg-tertiary mt-1.5 shrink-0"></div>
                        <div className="flex flex-col flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-[11px] text-on-surface font-medium truncate">Fondos depositados</span>
                          </div>
                          <div className="flex items-center justify-between gap-2">
                            <span className="font-code-md text-[10px] text-outline">on-chain</span>
                            <span className="font-code-md text-[10px] text-secondary font-medium">{formatScAmount(escrow.amount)}</span>
                          </div>
                        </div>
                      </div>
                    )}

                    {escrow.state === 'Released' && (
                      <div className="flex items-start gap-2 p-2 bg-surface-container-low/60 rounded-lg">
                        <div className="w-1.5 h-1.5 rounded-full bg-tertiary mt-1.5 shrink-0"></div>
                        <div className="flex flex-col flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-[11px] text-on-surface font-medium truncate">Fondos liberados al vendedor</span>
                          </div>
                          <div className="flex items-center justify-between gap-2">
                            <span className="font-code-md text-[10px] text-outline">on-chain</span>
                            <span className="font-code-md text-[10px] text-tertiary font-bold">{formatScAmount(escrow.amount)}</span>
                          </div>
                        </div>
                      </div>
                    )}

                    {escrow.state === 'Refunded' && (
                      <div className="flex items-start gap-2 p-2 bg-surface-container-low/60 rounded-lg">
                        <div className="w-1.5 h-1.5 rounded-full bg-error mt-1.5 shrink-0"></div>
                        <div className="flex flex-col flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-[11px] text-on-surface font-medium truncate">Reembolso al comprador</span>
                          </div>
                          <div className="flex items-center justify-between gap-2">
                            <span className="font-code-md text-[10px] text-outline">on-chain</span>
                            <span className="font-code-md text-[10px] text-secondary font-medium">{formatScAmount(escrow.amount)}</span>
                          </div>
                        </div>
                      </div>
                    )}

                    {escrow.state === 'Disputed' && (
                      <div className="flex items-start gap-2 p-2 bg-surface-container-low/60 rounded-lg">
                        <div className="w-1.5 h-1.5 rounded-full bg-error mt-1.5 shrink-0"></div>
                        <div className="flex flex-col flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-[11px] text-on-surface font-medium truncate">Disputa abierta</span>
                          </div>
                          <div className="flex items-center justify-between gap-2">
                            <span className="font-code-md text-[10px] text-outline">on-chain</span>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </section>
            </div>
          </div>
        </>
      )}

      {/* Release Confirmation Modal */}
      {showReleaseModal && escrow && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-inverse-surface/60 backdrop-blur-sm" onClick={() => setShowReleaseModal(false)}></div>
          <div className="relative z-10 w-full max-w-md bg-surface-container-lowest rounded-2xl shadow-xl p-6 flex flex-col gap-5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-10 h-10 rounded-full bg-tertiary/15 flex items-center justify-center">
                  <svg className="w-5 h-5 text-tertiary" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" /></svg>
                </div>
                <h3 className="text-lg text-on-surface font-semibold">Confirmar Liberacion de Fondos</h3>
              </div>
              <button
                className="p-1.5 rounded-lg text-secondary hover:text-on-surface hover:bg-surface-container-low transition-colors"
                onClick={() => setShowReleaseModal(false)}
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>

            <p className="text-sm text-secondary leading-relaxed">
              Estas a punto de liberar los fondos en custodia al vendedor. Esta accion es <strong className="text-on-surface">irrevocable</strong> una vez ejecutada en el contrato de Soroban.
            </p>

            <div className="p-4 bg-surface-container-low rounded-xl flex flex-col gap-2.5">
              <div className="flex items-center justify-between text-sm">
                <span className="text-secondary">Monto a liberar:</span>
                <span className="font-code-md text-on-surface font-bold">{formatScAmount(escrow.amount)}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-secondary">Destinatario:</span>
                <span className="text-on-surface font-semibold font-code-md">{shortAddress(escrow.seller)}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-secondary">Contrato:</span>
                <span className="font-code-md text-secondary text-xs">{shortAddress(activeContractId)}</span>
              </div>
            </div>

            <div className="p-3 bg-tertiary/5 rounded-lg border border-tertiary/15">
              <p className="text-xs text-on-surface leading-relaxed flex items-start gap-2">
                <svg className="w-4 h-4 text-tertiary shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                La transaccion se ejecutara on-chain en Stellar Testnet con un fee de approx. 0.00001 XLM.
              </p>
            </div>

            <div className="flex items-center gap-3">
              <button
                className="flex-1 py-2.5 px-4 rounded-xl bg-surface-container text-on-surface text-xs font-semibold hover:bg-surface-container-high transition-colors border border-outline-variant/30"
                onClick={() => setShowReleaseModal(false)}
              >
                Cancelar
              </button>
              <button
                className="flex-1 py-2.5 px-4 rounded-xl bg-primary hover:bg-primary-container text-on-primary text-xs font-bold shadow-md transition-all flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed"
                onClick={handleRelease}
                disabled={actionLoading === 'release'}
              >
                {actionLoading === 'release' ? (
                  <>
                    <div className="w-4 h-4 border-2 border-on-primary border-t-transparent rounded-full animate-spin"></div>
                    Liberando...
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                    Confirmar Liberacion
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
