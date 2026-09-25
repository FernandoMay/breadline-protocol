import * as StellarSdk from '@stellar/stellar-sdk';
import { sorobanServer, ESCROW_CONTRACT_ID, NETWORK_PASSPHRASE } from './stellar';

export { ESCROW_CONTRACT_ID } from './stellar';

// ─── On-chain types ───

export type OnChainEscrowState = 'Created' | 'Funded' | 'Released' | 'Refunded' | 'Disputed';

export interface OnChainEscrow {
  buyer: string;
  seller: string;
  token: string;
  amount: bigint;
  state: OnChainEscrowState;
  created_at: bigint;
  deadline: bigint;
  service_description: string;
}

// ─── Parse Soroban result ───

function parseEscrowResult(retval: StellarSdk.xdr.ScVal): OnChainEscrow {
  const native = StellarSdk.scValToNative(retval) as Record<string, unknown>;

  const stateMap: Record<string, OnChainEscrowState> = {
    Created: 'Created',
    Funded: 'Funded',
    Released: 'Released',
    Refunded: 'Refunded',
    Disputed: 'Disputed',
  };

  // Soroban enum becomes an object like { Created: [] } or { Funded: [] }
  const rawStateObj = native.state as Record<string, unknown>;
  const rawStateKey = rawStateObj ? Object.keys(rawStateObj)[0] : 'Created';

  return {
    buyer: String(native.buyer ?? ''),
    seller: String(native.seller ?? ''),
    token: String(native.token ?? ''),
    amount: BigInt(String(native.amount ?? '0')),
    state: stateMap[rawStateKey] ?? 'Created',
    created_at: BigInt(String(native.created_at ?? '0')),
    deadline: BigInt(String(native.deadline ?? '0')),
    service_description: String(native.service_description ?? ''),
  };
}

// ─── Read escrow from chain ───

export async function fetchEscrow(): Promise<OnChainEscrow | null> {
  try {
    const contract = new StellarSdk.Contract(ESCROW_CONTRACT_ID);
    const source = new StellarSdk.Account(
      'GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWHF',
      '0'
    );
    const tx = new StellarSdk.TransactionBuilder(source, {
      fee: '100',
      networkPassphrase: NETWORK_PASSPHRASE,
    })
      .addOperation(contract.call('get_escrow'))
      .setTimeout(30)
      .build();

    const result = await sorobanServer.simulateTransaction(tx);

    if ('error' in result) return null;
    if (!result.result || !('retval' in result.result)) return null;

    return parseEscrowResult(result.result.retval);
  } catch {
    return null;
  }
}

// ─── Check if expired ───

export async function fetchIsExpired(): Promise<boolean> {
  try {
    const contract = new StellarSdk.Contract(ESCROW_CONTRACT_ID);
    const source = new StellarSdk.Account(
      'GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWHF',
      '0'
    );
    const tx = new StellarSdk.TransactionBuilder(source, {
      fee: '100',
      networkPassphrase: NETWORK_PASSPHRASE,
    })
      .addOperation(contract.call('is_expired'))
      .setTimeout(30)
      .build();

    const result = await sorobanServer.simulateTransaction(tx);

    if ('error' in result) return false;
    if (!result.result || !('retval' in result.result)) return false;

    return StellarSdk.scValToNative(result.result.retval) as boolean;
  } catch {
    return false;
  }
}

// ─── Build + sign + submit helpers ───

async function buildInvokeTx(
  method: string,
  ...args: StellarSdk.xdr.ScVal[]
): Promise<StellarSdk.Transaction> {
  const contract = new StellarSdk.Contract(ESCROW_CONTRACT_ID);
  const source = new StellarSdk.Account(
    'GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWHF',
    '0'
  );

  const tx = new StellarSdk.TransactionBuilder(source, {
    fee: StellarSdk.BASE_FEE,
    networkPassphrase: NETWORK_PASSPHRASE,
  })
    .addOperation(contract.call(method, ...args))
    .setTimeout(180)
    .build();

  const simulated = await sorobanServer.simulateTransaction(tx);
  if ('error' in simulated) throw new Error(String(simulated.error));

  return sorobanServer.prepareTransaction(tx);
}

async function signAndSubmit(
  tx: StellarSdk.Transaction,
  signTransaction: (xdr: string) => Promise<string | null>
): Promise<{ success: boolean; hash?: string; error?: string }> {
  const signedXdr = await signTransaction(tx.toXDR());
  if (!signedXdr) return { success: false, error: 'Transaction signing cancelled' };

  const signedTx = StellarSdk.TransactionBuilder.fromXDR(signedXdr, NETWORK_PASSPHRASE);
  const result = await sorobanServer.sendTransaction(signedTx);

  if ('error' in result) return { success: false, error: String(result.error) };
  return { success: true, hash: result.hash };
}

// ─── USDC Testnet token placeholder ───
// Replace with real USDC issuer on testnet when available.
// CBIEL... is the SAC address for USDC on Stellar Testnet as documented in
// Stellar Docs / Circle. If no USDC SAC exists in your environment, this
// address serves as placeholder — deploy will fail until a real token SAC is
// deployed and funded. Documented as placeholder; swap for production token.
export const USDC_TOKEN_ADDRESS =
  'CBIELTK6YBZJU5UP2WWQEUCYKLPU6AUNZ2BQ4WWFEIE3USCIHMXQDAMA';

// ─── Contract actions ───

export async function createEscrowOnChain(
  buyerAddress: string,
  sellerAddress: string,
  amountUsdc: number,
  deadlineTimestamp: number,
  description: string,
  signTransaction: (xdr: string) => Promise<string | null>,
  tokenAddress: string = USDC_TOKEN_ADDRESS,
) {
  const amountStroops = BigInt(Math.round(amountUsdc * 10_000_000));
  const tx = await buildInvokeTx(
    'create_escrow',
    StellarSdk.nativeToScVal(buyerAddress, { type: 'address' }),
    StellarSdk.nativeToScVal(sellerAddress, { type: 'address' }),
    StellarSdk.nativeToScVal(tokenAddress, { type: 'address' }),
    StellarSdk.nativeToScVal(amountStroops, { type: 'i128' }),
    StellarSdk.nativeToScVal(BigInt(deadlineTimestamp), { type: 'u64' }),
    StellarSdk.nativeToScVal(description, { type: 'string' }),
  );
  return signAndSubmit(tx, signTransaction);
}

export async function fundEscrowOnChain(
  signTransaction: (xdr: string) => Promise<string | null>
) {
  const tx = await buildInvokeTx('fund_escrow');
  return signAndSubmit(tx, signTransaction);
}

export async function releaseFundsOnChain(
  signTransaction: (xdr: string) => Promise<string | null>
) {
  const tx = await buildInvokeTx('release_funds');
  return signAndSubmit(tx, signTransaction);
}

export async function refundEscrowOnChain(
  callerAddress: string,
  signTransaction: (xdr: string) => Promise<string | null>
) {
  const tx = await buildInvokeTx(
    'refund_buyer',
    StellarSdk.nativeToScVal(callerAddress, { type: 'address' }),
  );
  return signAndSubmit(tx, signTransaction);
}

export async function raiseDisputeOnChain(
  callerAddress: string,
  signTransaction: (xdr: string) => Promise<string | null>
) {
  const tx = await buildInvokeTx(
    'raise_dispute',
    StellarSdk.nativeToScVal(callerAddress, { type: 'address' }),
  );
  return signAndSubmit(tx, signTransaction);
}

export async function autoRefundIfExpiredOnChain(
  signTransaction: (xdr: string) => Promise<string | null>
) {
  const tx = await buildInvokeTx('auto_refund_if_expired');
  return signAndSubmit(tx, signTransaction);
}

// ─── USDC helpers ───

export function usdcToStroops(usdc: number): bigint {
  return BigInt(Math.round(usdc * 10_000_000));
}

export function stroopsToUsdc(stroops: bigint): number {
  return Number(stroops) / 10_000_000;
}

export function formatScAmount(stroops: bigint): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
  }).format(stroopsToUsdc(stroops));
}
