import { useState, useCallback, useEffect } from 'react';
import * as StellarSdk from '@stellar/stellar-sdk';

interface Freighter {
  getAddress(): Promise<{ address: string }>;
  signTransaction(
    xdr: string,
    opts?: { networkPassphrase?: string; accountToSign?: string }
  ): Promise<string>;
}

interface WalletBalance {
  assetCode: string;
  balance: string;
  issuer?: string;
}

function getFreighter(): Freighter | null {
  if (typeof window === 'undefined') return null;
  const w = window as unknown as Record<string, unknown>;
  const f = w.freighter;
  if (f && typeof f === 'object') {
    const obj = f as Record<string, unknown>;
    if (typeof obj.getAddress === 'function' && typeof obj.signTransaction === 'function') {
      return f as unknown as Freighter;
    }
  }
  return null;
}

export function useStellarWallet() {
  const [connected, setConnected] = useState(false);
  const [address, setAddress] = useState('');
  const [network, setNetwork] = useState('');
  const [balances, setBalances] = useState<WalletBalance[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const fetchBalances = useCallback(async (stellarAddress: string) => {
    try {
      const server = new StellarSdk.Horizon.Server('https://horizon-testnet.stellar.org');
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
      console.error('Failed to fetch balances:', err);
    }
  }, []);

  const connect = useCallback(async (): Promise<{ success: boolean; error?: string }> => {
    const freighter = getFreighter();
    if (!freighter) {
      const msg = 'Freighter wallet not detected. Please install the Freighter browser extension.';
      setError(msg);
      return { success: false, error: msg };
    }

    setLoading(true);
    setError('');

    try {
      const result = await freighter.getAddress();
      setAddress(result.address);
      setConnected(true);
      setNetwork('TESTNET');
      await fetchBalances(result.address);
      return { success: true };
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to connect wallet';
      setError(message);
      return { success: false, error: message };
    } finally {
      setLoading(false);
    }
  }, [fetchBalances]);

  const disconnect = useCallback(() => {
    setConnected(false);
    setAddress('');
    setNetwork('');
    setBalances([]);
    setError('');
  }, []);

  const signTransaction = useCallback(
    async (xdr: string): Promise<string | null> => {
      const freighter = getFreighter();
      if (!freighter) {
        setError('Freighter wallet not detected');
        return null;
      }

      try {
        setLoading(true);
        const signedXdr = await freighter.signTransaction(xdr, {
          networkPassphrase: StellarSdk.Networks.TESTNET,
        });
        return signedXdr;
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to sign transaction';
        setError(message);
        return null;
      } finally {
        setLoading(false);
      }
    },
    []
  );

  const getBalance = useCallback(
    (assetCode: string, assetIssuer?: string): string => {
      const balance = balances.find(
        (b) => b.assetCode === assetCode && (!assetIssuer || b.issuer === assetIssuer)
      );
      return balance?.balance ?? '0';
    },
    [balances]
  );

  // Auto-connect if previously connected
  useEffect(() => {
    const freighter = getFreighter();
    if (freighter) {
      freighter
        .getAddress()
        .then((result) => {
          setAddress(result.address);
          setConnected(true);
          setNetwork('TESTNET');
          return fetchBalances(result.address);
        })
        .catch(() => {
          // Not connected yet, ignore
        });
    }
  }, [fetchBalances]);

  return {
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
  };
}
