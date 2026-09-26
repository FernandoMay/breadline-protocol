import { useState, useEffect, useCallback } from 'react';
import { useStellarWallet } from '../hooks/useStellarWallet';
import {
  fetchEscrow,
  raiseDisputeOnChain,
  refundEscrowOnChain,
  releaseFundsOnChain,
  formatScAmount,
} from '../lib/contract';
import type { OnChainEscrow } from '../lib/contract';
import { useActiveEscrowId } from '../lib/activeEscrow';
import { truncateAddress } from '../lib/stellar';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatTimestampFull(ts: bigint): string {
  const d = new Date(Number(ts) * 1000);
  return d.toLocaleDateString('es-MX', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function StateBadge({ state }: { state: string }) {
  const colors: Record<string, string> = {
    Created: 'bg-secondary/10 text-secondary',
    Funded: 'bg-primary/10 text-primary',
    Released: 'bg-tertiary/10 text-tertiary',
    Refunded: 'bg-error/10 text-error',
    Disputed: 'bg-error/10 text-error',
  };
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${colors[state] ?? 'bg-secondary/10 text-secondary'}`}>
      {state}
    </span>
  );
}

// ---------------------------------------------------------------------------
// Main page
// ---------------------------------------------------------------------------

export default function DisputasArbitraje() {
  const wallet = useStellarWallet();
  // The contract this wallet is really operating on.
  const activeContractId = useActiveEscrowId(wallet.address);
  const [escrow, setEscrow] = useState<OnChainEscrow | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const loadEscrow = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const data = await fetchEscrow(activeContractId);
      setEscrow(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch escrow');
    } finally {
      setLoading(false);
    }
  }, [activeContractId]);

  useEffect(() => {
    loadEscrow();
  }, [loadEscrow]);

  const handleRaiseDispute = async () => {
    if (!wallet.connected || !wallet.address || !wallet.signTransaction) return;
    setActionLoading(true);
    setError('');
    setSuccessMsg('');
    try {
      const result = await raiseDisputeOnChain(wallet.address, wallet.signTransaction, activeContractId);
      if (result.success) {
        setSuccessMsg(
          'Dispute flag set on-chain. Settlement is frozen. On-chain resolution before the deadline is not implemented yet: at the deadline anyone can trigger the auto-refund to the buyer.'
        );
        await loadEscrow();
      } else {
        setError(result.error ?? 'Failed to raise dispute');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Transaction failed');
    } finally {
      setActionLoading(false);
    }
  };

  const handleRefundBuyer = async () => {
    if (!wallet.connected || !wallet.address || !wallet.signTransaction) return;
    setActionLoading(true);
    setError('');
    setSuccessMsg('');
    try {
      const result = await refundEscrowOnChain(wallet.address, wallet.signTransaction, activeContractId);
      if (result.success) {
        setSuccessMsg('Refund to buyer executed on-chain.');
        await loadEscrow();
      } else {
        setError(result.error ?? 'Refund failed');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Transaction failed');
    } finally {
      setActionLoading(false);
    }
  };

  const handleReleaseToSeller = async () => {
    if (!wallet.connected || !wallet.signTransaction) return;
    setActionLoading(true);
    setError('');
    setSuccessMsg('');
    try {
      const result = await releaseFundsOnChain(wallet.address, wallet.signTransaction, activeContractId);
      if (result.success) {
        setSuccessMsg('Funds released to seller on-chain.');
        await loadEscrow();
      } else {
        setError(result.error ?? 'Release failed');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Transaction failed');
    } finally {
      setActionLoading(false);
    }
  };

  // -----------------------------------------------------------------------
  // Loading
  // -----------------------------------------------------------------------
  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-24 space-y-4">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        <span className="text-sm text-secondary">Loading escrow from chain...</span>
      </div>
    );
  }

  // -----------------------------------------------------------------------
  // No escrow
  // -----------------------------------------------------------------------
  if (!escrow) {
    return (
      <div className="flex flex-col items-center justify-center py-24 space-y-4">
        <svg className="w-12 h-12 text-outline" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <h2 className="text-lg font-semibold text-on-surface">No escrow found</h2>
        <p className="text-sm text-secondary text-center max-w-md">
          No on-chain escrow was detected for the current contract. Create and fund an escrow first.
        </p>
      </div>
    );
  }

  // -----------------------------------------------------------------------
  // Not in a dispute-ready state
  // -----------------------------------------------------------------------
  if (escrow.state !== 'Funded' && escrow.state !== 'Disputed') {
    return (
      <div className="flex flex-col w-full pb-16 space-y-8">
        <section className="relative overflow-hidden rounded-xl bg-secondary/5 border border-secondary/10 p-8 shadow-sm">
          <div className="relative z-10 flex flex-col gap-3 max-w-2xl">
            <div className="flex items-center gap-2">
              <StateBadge state={escrow.state} />
              <span className="font-code-md text-[11px] px-2 py-0.5 rounded-md bg-surface-container-low text-secondary">
                {activeContractId}
              </span>
            </div>
            <h1 className="text-3xl md:text-4xl text-on-surface tracking-tight font-bold">
              No dispute available
            </h1>
            <p className="text-sm text-secondary">
              The escrow must be <strong className="text-on-surface">Funded</strong> before a dispute can be opened.
              Current state: <strong className="text-on-surface">{escrow.state}</strong>.
            </p>
          </div>
        </section>

        {/* Escrow details */}
        <section className="rounded-xl bg-surface-container-lowest p-6 shadow-sm">
          <h2 className="text-lg text-on-surface font-semibold mb-4">Escrow Details</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <InfoCell label="Buyer" value={truncateAddress(escrow.buyer)} />
            <InfoCell label="Seller" value={truncateAddress(escrow.seller)} />
            <InfoCell label="Amount" value={formatScAmount(escrow.amount)} />
            <InfoCell label="Created" value={formatTimestampFull(escrow.created_at)} />
            <InfoCell label="Deadline" value={formatTimestampFull(escrow.deadline)} />
            <InfoCell label="Description" value={escrow.service_description} />
          </div>
        </section>
      </div>
    );
  }

  // -----------------------------------------------------------------------
  // Funded — can raise dispute
  // -----------------------------------------------------------------------
  if (escrow.state === 'Funded') {
    return (
      <div className="flex flex-col w-full pb-16 space-y-8">
        {/* Banner */}
        <section className="relative overflow-hidden rounded-xl bg-primary/5 border border-primary/20 p-8 shadow-sm">
          <div className="absolute -right-20 -top-20 w-80 h-80 rounded-full bg-primary/10 blur-3xl pointer-events-none" />
          <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
            <div className="flex flex-col gap-2 max-w-2xl">
              <div className="flex flex-wrap items-center gap-2">
                <StateBadge state={escrow.state} />
                <span className="font-code-md text-[11px] px-2 py-0.5 rounded-md bg-surface-container-low text-secondary">
                  {activeContractId}
                </span>
              </div>
              <h1 className="text-3xl md:text-4xl text-on-surface tracking-tight font-bold">
                Escrow Funded — Ready for Dispute
              </h1>
              <p className="text-sm text-secondary">
                Funds are locked on-chain. Either party may raise a dispute, which freezes settlement.
                There is no arbitrator on-chain yet: a disputed escrow can only be settled by the
                auto-refund to the buyer once the deadline is reached.
              </p>
            </div>
          </div>
        </section>

        {/* Escrow details */}
        <section className="rounded-xl bg-surface-container-lowest p-6 shadow-sm">
          <h2 className="text-lg text-on-surface font-semibold mb-4">Escrow Details</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <InfoCell label="Buyer" value={truncateAddress(escrow.buyer)} />
            <InfoCell label="Seller" value={truncateAddress(escrow.seller)} />
            <InfoCell label="Amount" value={formatScAmount(escrow.amount)} highlight />
            <InfoCell label="Created" value={formatTimestampFull(escrow.created_at)} />
            <InfoCell label="Deadline" value={formatTimestampFull(escrow.deadline)} />
            <InfoCell label="Description" value={escrow.service_description} />
          </div>
        </section>

        {/* Raise dispute button */}
        <section className="rounded-xl bg-surface-container-lowest p-6 shadow-sm">
          <div className="flex flex-col gap-4">
            <h2 className="text-lg text-on-surface font-semibold">Open Dispute</h2>
            {!wallet.connected ? (
              <p className="text-sm text-secondary">
                Connect your Stellar wallet to raise a dispute.
              </p>
            ) : (
              <>
                <p className="text-sm text-secondary">
                  Connected as: <span className="font-code-md text-on-surface">{truncateAddress(wallet.address)}</span>
                </p>
                <button
                  onClick={handleRaiseDispute}
                  disabled={actionLoading}
                  className="self-start inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-primary text-on-primary text-sm font-semibold hover:opacity-90 disabled:opacity-50 transition-colors"
                >
                  {actionLoading && (
                    <div className="w-4 h-4 border-2 border-on-primary border-t-transparent rounded-full animate-spin" />
                  )}
                  Abrir Disputa
                </button>
              </>
            )}
            {error && (
              <div className="p-3 rounded-lg bg-error/10 border border-error/20 text-sm text-error">
                {error}
              </div>
            )}
            {successMsg && (
              <div className="p-3 rounded-lg bg-tertiary/10 border border-tertiary/20 text-sm text-tertiary">
                {successMsg}
              </div>
            )}
          </div>
        </section>
      </div>
    );
  }

  // -----------------------------------------------------------------------
  // Disputed — show full dispute panel
  // -----------------------------------------------------------------------
  return (
    <div className="flex flex-col w-full pb-16 space-y-8">
      {/* Banner */}
      <section className="relative overflow-hidden rounded-xl bg-error/5 border border-error/20 p-8 shadow-sm">
        <div className="absolute -right-20 -top-20 w-80 h-80 rounded-full bg-error/10 blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="flex flex-col gap-2 max-w-2xl">
            <div className="flex flex-wrap items-center gap-2">
              <StateBadge state={escrow.state} />
              <span className="font-code-md text-[11px] px-2 py-0.5 rounded-md bg-surface-container-low text-secondary">
                {activeContractId}
              </span>
            </div>
            <h1 className="text-3xl md:text-4xl text-on-surface tracking-tight font-bold">
              Dispute Flag Raised — Settlement Frozen
            </h1>
            <p className="text-sm text-secondary">
              This escrow is flagged as disputed on-chain. <strong className="text-on-surface">No arbitrator
              or jury exists on-chain yet</strong>, so neither release nor refund can be executed while the
              dispute stands. The funds are never stranded: at the deadline the contract can be settled by
              <code className="font-code-md"> auto_refund_if_expired</code>, which returns the tokens to the buyer.
            </p>
          </div>
        </div>
      </section>

      {/* Escrow details */}
      <section className="rounded-xl bg-surface-container-lowest p-6 shadow-sm">
        <h2 className="text-lg text-on-surface font-semibold mb-4">Escrow Details</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <InfoCell label="Buyer" value={escrow.buyer} mono />
          <InfoCell label="Seller" value={escrow.seller} mono />
          <InfoCell label="Amount" value={formatScAmount(escrow.amount)} highlight />
          <InfoCell label="Created" value={formatTimestampFull(escrow.created_at)} />
          <InfoCell label="Deadline" value={formatTimestampFull(escrow.deadline)} />
          <InfoCell label="Description" value={escrow.service_description} />
        </div>
      </section>

      {/* Two-column: Buyer vs Seller */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
        {/* Buyer */}
        <section className="rounded-xl bg-surface-container-lowest p-6 shadow-sm flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-9 h-9 rounded-full bg-primary-container flex items-center justify-center shrink-0">
                <svg className="w-5 h-5 text-on-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 100 4 2 2 0 000-4z" />
                </svg>
              </div>
              <div className="flex flex-col">
                <span className="text-sm text-on-surface font-semibold">Buyer Position</span>
                <span className="text-[11px] text-secondary">Refund claimant</span>
              </div>
            </div>
            <span className="px-2 py-0.5 rounded-full bg-primary-container text-on-primary text-[10px] font-bold">
              Party A
            </span>
          </div>
          <div className="p-3.5 rounded-xl bg-surface-container-low/60">
            <span className="text-xs text-secondary uppercase font-semibold tracking-wider block mb-1">Wallet Address</span>
            <span className="font-code-md text-xs text-on-surface break-all">{escrow.buyer}</span>
          </div>
          <div className="p-3.5 rounded-xl bg-surface-container-low/60">
            <span className="text-xs text-secondary uppercase font-semibold tracking-wider block mb-1">Escrow Share</span>
            <span className="text-2xl text-on-surface font-bold font-code-md">{formatScAmount(escrow.amount)}</span>
          </div>
        </section>

        {/* Seller */}
        <section className="rounded-xl bg-surface-container-lowest p-6 shadow-sm flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-9 h-9 rounded-full bg-tertiary-container flex items-center justify-center shrink-0">
                <svg className="w-5 h-5 text-on-tertiary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
              </div>
              <div className="flex flex-col">
                <span className="text-sm text-on-surface font-semibold">Seller Position</span>
                <span className="text-[11px] text-secondary">Release claimant</span>
              </div>
            </div>
            <span className="px-2 py-0.5 rounded-full bg-tertiary text-on-tertiary text-[10px] font-bold">
              Party B
            </span>
          </div>
          <div className="p-3.5 rounded-xl bg-surface-container-low/60">
            <span className="text-xs text-secondary uppercase font-semibold tracking-wider block mb-1">Wallet Address</span>
            <span className="font-code-md text-xs text-on-surface break-all">{escrow.seller}</span>
          </div>
          <div className="p-3.5 rounded-xl bg-surface-container-low/60">
            <span className="text-xs text-secondary uppercase font-semibold tracking-wider block mb-1">Escrow Share</span>
            <span className="text-2xl text-tertiary font-bold font-code-md">{formatScAmount(escrow.amount)}</span>
          </div>
        </section>
      </div>

      {/* Resolution Actions */}
      <section className="rounded-xl bg-surface-container-lowest p-6 shadow-sm flex flex-col gap-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-full bg-surface-container-high flex items-center justify-center shrink-0">
              <svg className="w-5 h-5 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 6l3 1m0 0l-3 9a5.002 5.002 0 006.001 0M6 7l3 9M6 7l6-2m6 2l3-1m-3 1l-3 9a5.002 5.002 0 006.001 0M18 7l3 9m-3-9l-6-2m0-2v2m0 16V5m0 16H9m3 0h3" />
              </svg>
            </div>
            <h2 className="text-lg text-on-surface font-semibold">Resolution Actions</h2>
          </div>
          <span className="px-2 py-0.5 rounded text-[10px] bg-surface-container-high text-secondary">Roadmap</span>
        </div>

        <p className="text-sm text-secondary">
          <code className="font-code-md">release_funds</code> and{' '}
          <code className="font-code-md">refund_buyer</code> both require the escrow to be{' '}
          <strong className="text-on-surface">Funded</strong>. While it is{' '}
          <strong className="text-on-surface">Disputed</strong> the contract rejects them, so there is no
          pre-deadline split or ruling to execute. The only available settlement is the permissionless
          auto-refund to the buyer once the deadline is reached.
        </p>

        {!wallet.connected ? (
          <p className="text-sm text-secondary">Connect your Stellar wallet to interact with this escrow.</p>
        ) : (
          <div className="flex flex-col sm:flex-row gap-4">
            <button
              onClick={handleRefundBuyer}
              disabled
              title="Unavailable: refund_buyer requires the Funded state"
              className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-lg bg-surface-container-high text-secondary text-sm font-semibold cursor-not-allowed"
            >
              Refund to Buyer
            </button>
            <button
              onClick={handleReleaseToSeller}
              disabled
              title="Unavailable: release_funds requires the Funded state"
              className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-lg bg-surface-container-high text-secondary text-sm font-semibold cursor-not-allowed"
            >
              Release to Seller
            </button>
          </div>
        )}

        {error && (
          <div className="p-3 rounded-lg bg-error/10 border border-error/20 text-sm text-error">
            {error}
          </div>
        )}
        {successMsg && (
          <div className="p-3 rounded-lg bg-tertiary/10 border border-tertiary/20 text-sm text-tertiary">
            {successMsg}
          </div>
        )}
      </section>

      {/* Disclaimer */}
      <section className="rounded-xl bg-surface-container-lowest p-6 shadow-sm">
        <div className="p-3 rounded-lg bg-tertiary/5 border border-tertiary/10 flex items-start gap-3">
          <svg className="w-4 h-4 text-tertiary shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
          </svg>
          <p className="text-xs text-on-surface leading-relaxed">
            Settlement on Stellar Testnet is final and cannot be reversed. Honest scope of the current
            contract: <code className="font-code-md">raise_dispute</code> only records the dispute flag and
            blocks release/refund. It does not split funds between parties — there is no on-chain arbitrator,
            jury or multi-sig signature set yet. Pre-deadline dispute resolution is roadmap.
          </p>
        </div>
      </section>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Reusable info cell
// ---------------------------------------------------------------------------

function InfoCell({
  label,
  value,
  highlight,
  mono,
}: {
  label: string;
  value: string;
  highlight?: boolean;
  mono?: boolean;
}) {
  return (
    <div className="p-3.5 rounded-xl bg-surface-container-low/60 flex flex-col gap-1">
      <span className="text-[11px] text-secondary uppercase font-semibold tracking-wider">{label}</span>
      <span
        className={`text-sm leading-relaxed break-all ${
          highlight ? 'text-primary font-bold' : 'text-on-surface'
        } ${mono ? 'font-code-md' : ''}`}
      >
        {value}
      </span>
    </div>
  );
}
