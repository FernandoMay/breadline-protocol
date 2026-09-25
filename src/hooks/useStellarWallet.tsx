import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import * as StellarSdk from '@stellar/stellar-sdk';

const TESTNET_HORIZON_URL = 'https://horizon-testnet.stellar.org';
const REQUIRED_NETWORK = 'TESTNET';

interface FreighterApi {
  isConnected(): Promise<{ isConnected: boolean; error?: string }>;
  getAddress(): Promise<{ address: string; error?: string }>;
  getPublicKey(): Promise<{ address: string; error?: string }>;
  /** Present on modern Freighter builds; absent on older ones (handled as best-effort). */
  getNetwork?(): Promise<{ network?: string; error?: string }>;
  signTransaction(
    xdr: string,
    opts?: { networkPassphrase?: string; network?: string; address?: string }
  ): Promise<{ signedTxXdr: string; signerAddress: string; error?: string }>;
}

interface WalletBalance {
  assetCode: string;
  balance: string;
  issuer?: string;
}

function getFreighter(): FreighterApi | null {
  if (typeof window === 'undefined') return null;
  const w = window as unknown as Record<string, unknown>;
  // Freighter injects as window.freighterApi (not window.freighter)
  const f = w.freighterApi;
  if (f && typeof f === 'object') {
    const obj = f as Record<string, unknown>;
    if (
      typeof obj.getAddress === 'function' &&
      typeof obj.signTransaction === 'function' &&
      typeof obj.isConnected === 'function'
    ) {
      return f as unknown as FreighterApi;
    }
  }
  return null;
}

const ERROR_NOT_INSTALLED = 'Extensión Freighter no detectada. Instalala y recargá la página.';
const ERROR_LOCKED =
  'Freighter bloqueado o el sitio no fue aprobado. Desbloqueá la extensión y aprobá la conexión.';
const ERROR_REJECTED = 'Rechazaste la conexión en Freighter.';
const ERROR_GENERIC = 'No se pudo conectar con Freighter.';
const ERROR_SIGN_CANCELLED = 'Rechazaste la firma de la transacción en Freighter.';

function networkMismatchMessage(walletNetwork: string): string {
  return `Freighter está en ${walletNetwork}. Breadline opera en Stellar Testnet. Cambiá la red en Freighter.`;
}

/**
 * Translate a raw Freighter failure into an actionable message.
 * The extension reports bare English strings that vary by version, so the
 * wording is matched defensively and anything unknown is surfaced verbatim.
 */
function describeFailure(reason: string, fallback: string): string {
  const normalized = reason.toLowerCase();

  if (
    normalized.includes('locked') ||
    normalized.includes('bloquead') ||
    normalized.includes('not approved') ||
    normalized.includes('unauthorized') ||
    normalized.includes('unauthorised') ||
    normalized.includes('permission')
  ) {
    return ERROR_LOCKED;
  }

  if (
    normalized.includes('denied') ||
    normalized.includes('reject') ||
    normalized.includes('declin') ||
    normalized.includes('cancel') ||
    normalized.includes('user closed')
  ) {
    return ERROR_REJECTED;
  }

  if (
    normalized.includes('not installed') ||
    normalized.includes('extension is not') ||
    normalized.includes('no detectada')
  ) {
    return ERROR_NOT_INSTALLED;
  }

  return reason || fallback;
}

/** Read the network Freighter is actually on. Older builds omit this, so failure is non-fatal. */
async function readWalletNetwork(freighter: FreighterApi): Promise<string> {
  if (typeof freighter.getNetwork !== 'function') return '';
  try {
    const result = await freighter.getNetwork();
    const value = result?.network;
    return typeof value === 'string' ? value.trim().toUpperCase() : '';
  } catch {
    return '';
  }
}

export function WalletProvider({ children }: { children: ReactNode }) {
  const [connected, setConnected] = useState(false);
  const [address, setAddress] = useState('');
  const [network, setNetwork] = useState('');
  const [balances, setBalances] = useState<WalletBalance[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  // Last known non-testnet selection, so signTransaction can fail fast.
  const networkMismatchRef = useRef('');

  const fetchBalances = useCallback(async (stellarAddress: string) => {
    try {
      const server = new StellarSdk.Horizon.Server(TESTNET_HORIZON_URL);
      const account = await server.loadAccount(stellarAddress);
      const accountBalances: WalletBalance[] = account.balances.map((b) => {
        if (b.asset_type === 'native') {
          return { assetCode: 'XLM', balance: b.balance };
        }
        if (b.asset_type === 'credit_alphanum4' || b.asset_type === 'credit_alphanum12') {
          return {
            assetCode: b.asset_code,
            balance: b.balance,
            issuer: b.asset_issuer,
          };
        }
        return { assetCode: 'UNKNOWN', balance: b.balance };
      });
      setBalances(accountBalances);
    } catch (err) {
      // A fresh testnet account with zero trustlines can fail to load; the wallet
      // stays usable, so this must not surface as a connection error.
      console.error('Failed to fetch balances:', err);
    }
  }, []);

  /**
   * Resolve the public key and validate the network selection.
   * Returns the address on success, or the user-facing reason for the failure.
   */
  const resolveAddress = useCallback(
    async (
      freighter: FreighterApi
    ): Promise<{ ok: true; address: string } | { ok: false; message: string }> => {
      let publicKey: string;
      try {
        const result = await freighter.getAddress();
        if (result?.error) {
          return { ok: false, message: describeFailure(result.error, ERROR_GENERIC) };
        }
        publicKey = result.address;
      } catch (err) {
        const reason = err instanceof Error ? err.message : String(err ?? '');
        return { ok: false, message: describeFailure(reason, ERROR_GENERIC) };
      }

      if (!publicKey) {
        return { ok: false, message: ERROR_GENERIC };
      }

      const walletNetwork = await readWalletNetwork(freighter);
      if (walletNetwork && walletNetwork !== REQUIRED_NETWORK) {
        networkMismatchRef.current = walletNetwork;
        return { ok: false, message: networkMismatchMessage(walletNetwork) };
      }

      networkMismatchRef.current = '';
      return { ok: true, address: publicKey };
    },
    []
  );

  const connect = useCallback(async (): Promise<{ success: boolean; error?: string }> => {
    const freighter = getFreighter();
    if (!freighter) {
      setError(ERROR_NOT_INSTALLED);
      return { success: false, error: ERROR_NOT_INSTALLED };
    }

    setLoading(true);
    setError('');

    try {
      const result = await resolveAddress(freighter);
      if (!result.ok) {
        setError(result.message);
        return { success: false, error: result.message };
      }

      setAddress(result.address);
      setConnected(true);
      setNetwork((await readWalletNetwork(freighter)) || REQUIRED_NETWORK);
      await fetchBalances(result.address);
      return { success: true };
    } finally {
      setLoading(false);
    }
  }, [fetchBalances, resolveAddress]);

  const disconnect = useCallback(() => {
    setConnected(false);
    setAddress('');
    setNetwork('');
    setBalances([]);
    setError('');
    networkMismatchRef.current = '';
  }, []);

  const signTransaction = useCallback(async (xdr: string): Promise<string | null> => {
    const mismatch = networkMismatchRef.current;
    if (mismatch) {
      const message = networkMismatchMessage(mismatch);
      setError(message);
      return null;
    }

    const freighter = getFreighter();
    if (!freighter) {
      setError(ERROR_NOT_INSTALLED);
      return null;
    }

    try {
      setLoading(true);
      const result = await freighter.signTransaction(xdr, {
        networkPassphrase: StellarSdk.Networks.TESTNET,
      });
      if (result.error) {
        setError(describeFailure(result.error, ERROR_SIGN_CANCELLED));
        return null;
      }
      return result.signedTxXdr;
    } catch (err) {
      const reason = err instanceof Error ? err.message : String(err ?? '');
      setError(describeFailure(reason, ERROR_SIGN_CANCELLED));
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  const getBalance = useCallback(
    (assetCode: string, assetIssuer?: string): string => {
      const balance = balances.find(
        (b) => b.assetCode === assetCode && (!assetIssuer || b.issuer === assetIssuer)
      );
      return balance?.balance ?? '0';
    },
    [balances]
  );

  // Single auto-connect for the whole app: restore a previous session silently.
  // Any failure here is expected (locked extension, not approved yet), so it must
  // not populate `error` — the user has not attempted an action yet.
  useEffect(() => {
    const freighter = getFreighter();
    if (!freighter) return;

    let cancelled = false;

    void (async () => {
      const result = await resolveAddress(freighter);
      if (cancelled || !result.ok) return;

      setAddress(result.address);
      setConnected(true);
      setNetwork((await readWalletNetwork(freighter)) || REQUIRED_NETWORK);
      await fetchBalances(result.address);
    })();

    return () => {
      cancelled = true;
    };
  }, [fetchBalances, resolveAddress]);

  const value = useMemo(
    () => ({
      connected,
      address,
      network,
      balances,
      loading,
      error,
      connect,
      disconnect,
      signTransaction,
      getBalance,
    }),
    [
      connected,
      address,
      network,
      balances,
      loading,
      error,
      connect,
      disconnect,
      signTransaction,
      getBalance,
    ]
  );

  return <StellarWalletContext.Provider value={value}>{children}</StellarWalletContext.Provider>;
}

interface StellarWalletValue {
  connected: boolean;
  address: string;
  network: string;
  balances: WalletBalance[];
  loading: boolean;
  error: string;
  connect: () => Promise<{ success: boolean; error?: string }>;
  disconnect: () => void;
  signTransaction: (xdr: string) => Promise<string | null>;
  getBalance: (assetCode: string, assetIssuer?: string) => string;
}

const StellarWalletContext = createContext<StellarWalletValue | null>(null);

/**
 * Read the shared wallet state. Every component in the tree observes the same
 * connection, so connecting from the header updates the pages too.
 */
export function useStellarWallet(): StellarWalletValue {
  const context = useContext(StellarWalletContext);
  if (!context) {
    throw new Error(
      'useStellarWallet must be used within a <WalletProvider>. Mount <WalletProvider> once at the app root.'
    );
  }
  return context;
}
