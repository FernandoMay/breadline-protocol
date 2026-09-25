import { useSyncExternalStore } from 'react';
import * as StellarSdk from '@stellar/stellar-sdk';
import { ESCROW_CONTRACT_ID } from './stellar';

/**
 * The escrow contract is single-use per instance: `create_escrow` sets an
 * `INITIALIZED` instance flag and every later call fails with
 * `AlreadyInitialized`. A shared contract id can therefore only ever serve ONE
 * escrow, for the whole network.
 *
 * So the contract id is resolved per wallet instead of being a constant. Each
 * user deploys their own instance on demand and the resulting id is kept in
 * `localStorage` under a wallet-scoped key. When nothing is stored we fall back
 * to `ESCROW_CONTRACT_ID`, the shared seed instance.
 */

const STORAGE_PREFIX = 'breadline.activeEscrow.';

/** Where the currently-active contract id came from, so the UI can label it honestly. */
export type ActiveEscrowSource = 'wallet' | 'seed';

export interface ActiveEscrow {
  /** The contract id every escrow read and write must target. */
  contractId: string;
  /** True when this is a per-user instance, false for the shared seed. */
  isUserDeployed: boolean;
  /** Wallet that owns the stored instance, empty when nothing is stored yet. */
  walletAddress: string;
}

function readStorage(key: string): string | null {
  try {
    return window.localStorage.getItem(key);
  } catch {
    // Private browsing / disabled storage: fall back to the seed silently.
    return null;
  }
}

function writeStorage(key: string, value: string | null): void {
  try {
    if (value === null) window.localStorage.removeItem(key);
    else window.localStorage.setItem(key, value);
  } catch {
    // Storage is unavailable; the active id simply stays on the seed.
  }
}

/** Contract ids are strkey `C...`; anything else in storage is treated as absent. */
function isContractId(value: string | null): value is string {
  return value !== null && value !== '' && StellarSdk.StrKey.isValidContract(value);
}

export function activeEscrowStorageKey(walletAddress: string): string {
  return `${STORAGE_PREFIX}${walletAddress}`;
}

/**
 * Resolve the escrow contract this wallet is working with.
 *
 * Without a stored id the seed instance is returned, so a first-time visitor
 * still sees a real (uninitialized) contract rather than a broken app.
 */
export function getActiveEscrow(walletAddress?: string): ActiveEscrow {
  const address = (walletAddress ?? '').trim();
  if (!address) {
    return { contractId: ESCROW_CONTRACT_ID, isUserDeployed: false, walletAddress: '' };
  }

  const stored = readStorage(activeEscrowStorageKey(address));
  if (isContractId(stored)) {
    return { contractId: stored, isUserDeployed: true, walletAddress: address };
  }

  return { contractId: ESCROW_CONTRACT_ID, isUserDeployed: false, walletAddress: address };
}

/** The id every read and write must target. */
export function getActiveEscrowId(walletAddress?: string): string {
  return getActiveEscrow(walletAddress).contractId;
}

/** Remember a freshly deployed instance for this wallet. */
export function setActiveEscrowId(walletAddress: string, contractId: string): void {
  if (!isContractId(contractId)) {
    throw new Error(`Identificador de contrato invalido: ${contractId}`);
  }
  writeStorage(activeEscrowStorageKey(walletAddress.trim()), contractId);
  notify();
}

/**
 * Forget the stored instance so the next escrow call deploys a new one.
 * The seed becomes active again immediately.
 */
export function clearActiveEscrowId(walletAddress: string): void {
  writeStorage(activeEscrowStorageKey(walletAddress.trim()), null);
  notify();
}

// ─── Change notification ───
// A module-level store keeps every page in sync after a deploy: `useSyncExternalStore`
// cannot watch `localStorage`, and polling it would be both slower and wrong.

type Listener = () => void;

const listeners = new Set<Listener>();
let snapshotCache = new Map<string, string>();

function notify(): void {
  snapshotCache = new Map();
  for (const listener of listeners) listener();
}

function subscribe(listener: Listener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function readSnapshot(walletAddress: string): string {
  const address = walletAddress.trim();
  const cached = snapshotCache.get(address);
  if (cached !== undefined) return cached;

  const value = getActiveEscrowId(address);
  snapshotCache.set(address, value);
  return value;
}

/**
 * The active contract id as React state, so a component re-renders the moment a
 * new instance is deployed or cleared.
 *
 * Pass the connected wallet address: an empty address resolves to the seed.
 */
export function useActiveEscrowId(walletAddress?: string): string {
  const address = (walletAddress ?? '').trim();
  return useSyncExternalStore(
    subscribe,
    () => readSnapshot(address),
    () => ESCROW_CONTRACT_ID,
  );
}

// Another tab deployed or cleared an instance: mirror it here too.
if (typeof window !== 'undefined') {
  window.addEventListener('storage', (event) => {
    if (event.key?.startsWith(STORAGE_PREFIX)) notify();
  });
}
