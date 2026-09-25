import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import * as StellarSdk from '@stellar/stellar-sdk';

const TESTNET_HORIZON_URL = 'https://horizon-testnet.stellar.org';
const FRIENDBOT_URL = 'https://friendbot.stellar.org';
const REQUIRED_NETWORK = 'TESTNET';

/** Horizon may not have indexed the account Friendbot just created yet. */
const FUNDING_POLL_ATTEMPTS = 3;
const FUNDING_POLL_INTERVAL_MS = 1500;

/**
 * Why a connected testnet account cannot operate yet.
 * - `account_not_found`: the keypair is not on the ledger at all (Horizon 404).
 * - `zero_balance`: the account exists but holds no native XLM, so it cannot pay fees.
 * - `funded`: the account holds native XLM and can sign transactions.
 * - `unknown`: balances could not be read, so no funding claim is made.
 */
type FundingState = 'unknown' | 'account_not_found' | 'zero_balance' | 'funded';

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

const ERROR_FUND_NO_ADDRESS = 'Conectá una wallet antes de pedir XLM de prueba.';
// Friendbot answers 400 both for an already funded account and for per-address rate
// limiting, so the wording covers both without claiming a cause we cannot verify.
const ERROR_FRIENDBOT_REJECTED =
  'Friendbot rechazó la solicitud. Si ya habés pedido el fondeo, esperá unos segundos y volvé a intentar.';
const ERROR_FRIENDBOT_RATE_LIMIT =
  'Friendbot está limitando las solicitudes. Esperá unos segundos y volvé a intentar.';
const ERROR_FRIENDBOT_NETWORK =
  'No se pudo contactar a Friendbot. Revisá tu conexión a internet e intentá de nuevo.';
const ERROR_FRIENDBOT_PENDING =
  'Friendbot respondió bien, pero Horizon todavía no muestra el saldo. Esperá unos segundos e intentá de nuevo.';

function friendbotErrorMessage(status: number): string {
  if (status === 429) return ERROR_FRIENDBOT_RATE_LIMIT;
  if (status === 400) return ERROR_FRIENDBOT_REJECTED;
  return `Friendbot respondió con un error (${status}). Esperá unos segundos y volvé a intentar.`;
}

/** Horizon answers 404 for a keypair that is not on the ledger yet. */
function isAccountNotFoundError(err: unknown): boolean {
  if (err instanceof StellarSdk.NotFoundError) return true;
  const status = (err as { response?: { status?: number } } | null)?.response?.status;
  return status === 404;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

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
  // Testnet onboarding: a keypair with no ledger entry and an account with zero
  // native balance can both connect but fail on every later Soroban call.
  const [fundingState, setFundingState] = useState<FundingState>('unknown');
  const [fundingLoading, setFundingLoading] = useState(false);
  const [fundingError, setFundingError] = useState('');
  // Last known non-testnet selection, so signTransaction can fail fast.
  const networkMismatchRef = useRef('');

  /**
   * Read the account from Horizon and classify its funding situation.
   * Returns the resulting state so callers (funding poll) can react to it.
   */
  const fetchBalances = useCallback(
    async (stellarAddress: string): Promise<FundingState> => {
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

        const native = accountBalances.find((b) => b.assetCode === 'XLM');
        const state: FundingState = native && Number(native.balance) > 0 ? 'funded' : 'zero_balance';
        setFundingState(state);
        return state;
      } catch (err) {
        // A brand-new testnet keypair is not on the ledger yet, so Horizon answers
        // 404. That is a funding gap, not a connection failure: the wallet stays
        // usable, so the reason is recorded and the onboarding banner takes over.
        console.error('Failed to fetch balances:', err);
        setBalances([]);
        const state: FundingState = isAccountNotFoundError(err) ? 'account_not_found' : 'unknown';
        setFundingState(state);
        return state;
      }
    },
    []
  );

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
    setFundingState('unknown');
    setFundingError('');
    setFundingLoading(false);
    networkMismatchRef.current = '';
  }, []);

  /**
   * Re-read the account a few times. Friendbot answers before Horizon has
   * necessarily indexed the new account, and a single 404 right after a 200 would
   * leave the onboarding banner up on a false negative.
   */
  const refreshFundingState = useCallback(
    async (stellarAddress: string): Promise<FundingState> => {
      let state: FundingState = 'unknown';
      for (let attempt = 0; attempt < FUNDING_POLL_ATTEMPTS; attempt += 1) {
        state = await fetchBalances(stellarAddress);
        if (state === 'funded') break;
        if (attempt < FUNDING_POLL_ATTEMPTS - 1) {
          await sleep(FUNDING_POLL_INTERVAL_MS);
        }
      }
      return state;
    },
    [fetchBalances]
  );

  /**
   * Ask Friendbot for testnet XLM on the connected account.
   * A 400 is ambiguous (already funded vs. rate limited), so Horizon is re-read
   * before reporting a failure: a funded account is reported as success, which
   * keeps repeated clicks harmless.
   */
  const fundTestnetXlm = useCallback(async (): Promise<{ success: boolean; error?: string }> => {
    if (!address) {
      setFundingError(ERROR_FUND_NO_ADDRESS);
      return { success: false, error: ERROR_FUND_NO_ADDRESS };
    }

    setFundingLoading(true);
    setFundingError('');

    try {
      const response = await fetch(`${FRIENDBOT_URL}?addr=${encodeURIComponent(address)}`);
      const state = await refreshFundingState(address);

      if (state !== 'funded') {
        const message = response.ok ? ERROR_FRIENDBOT_PENDING : friendbotErrorMessage(response.status);
        setFundingError(message);
        return { success: false, error: message };
      }

      return { success: true };
    } catch {
      setFundingError(ERROR_FRIENDBOT_NETWORK);
      return { success: false, error: ERROR_FRIENDBOT_NETWORK };
    } finally {
      setFundingLoading(false);
    }
  }, [address, refreshFundingState]);

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
      // Both an account that is not on the ledger and one with zero XLM block every
      // Soroban call, so both require the friendbot onboarding step.
      needsFunding: fundingState === 'account_not_found' || fundingState === 'zero_balance',
      fundingState,
      fundingLoading,
      fundingError,
      fundTestnetXlm,
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
      fundingState,
      fundingLoading,
      fundingError,
      fundTestnetXlm,
    ]
  );

  return <StellarWalletContext.Provider value={value}>{children}</StellarWalletContext.Provider>;
}

export interface StellarWalletValue {
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
  /** True when the connected account cannot pay fees or sign Soroban transactions. */
  needsFunding: boolean;
  /** Why funding is needed, so the UI can word the message accurately. */
  fundingState: 'unknown' | 'account_not_found' | 'zero_balance' | 'funded';
  /** Loading flag for the funding action only, independent of `loading`. */
  fundingLoading: boolean;
  /** User-facing reason the last funding attempt did not complete. */
  fundingError: string;
  /** Request testnet XLM from Friendbot for the connected account. */
  fundTestnetXlm: () => Promise<{ success: boolean; error?: string }>;
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
