import * as StellarSdk from '@stellar/stellar-sdk';
import { sorobanServer, NETWORK_PASSPHRASE } from './stellar';
import { getActiveEscrowId } from './activeEscrow';

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

/**
 * A Soroban unit-variant enum arrives as a one-element array (`['Released']`),
 * not as `{ Released: [] }`. Reading `Object.keys(...)[0]` on the array yields
 * `"0"`, which silently mapped every settled escrow back to `Created`.
 */
function parseEscrowState(raw: unknown): OnChainEscrowState {
  if (Array.isArray(raw)) {
    const variant = String(raw[0] ?? '');
    if (variant) return variant as OnChainEscrowState;
  }
  if (raw && typeof raw === 'object') {
    const variant = Object.keys(raw as Record<string, unknown>)[0];
    if (variant) return variant as OnChainEscrowState;
  }
  return 'Created';
}

function parseEscrowResult(retval: StellarSdk.xdr.ScVal): OnChainEscrow {
  const native = StellarSdk.scValToNative(retval) as Record<string, unknown>;

  return {
    buyer: String(native.buyer ?? ''),
    seller: String(native.seller ?? ''),
    token: String(native.token ?? ''),
    amount: BigInt(String(native.amount ?? '0')),
    state: parseEscrowState(native.state),
    created_at: BigInt(String(native.created_at ?? '0')),
    deadline: BigInt(String(native.deadline ?? '0')),
    service_description: String(native.service_description ?? ''),
  };
}

// ─── Read escrow from chain ───

/**
 * Read the escrow held by `contractId`.
 *
 * Defaults to this wallet's active instance (see `activeEscrow.ts`), so a
 * read never drifts onto the shared seed once the user owns a real instance.
 */
export async function fetchEscrow(contractId: string = getActiveEscrowId()): Promise<OnChainEscrow | null> {
  try {
    const contract = new StellarSdk.Contract(contractId);
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

export async function fetchIsExpired(contractId: string = getActiveEscrowId()): Promise<boolean> {
  try {
    const contract = new StellarSdk.Contract(contractId);
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

/**
 * What a `get_escrow` probe says about a contract instance.
 *
 * Measured against Testnet on this contract:
 * - unused instance  -> simulation fails with `HostError: Error(Contract, #1)`,
 *                      which is the `NotInitialized` guard
 * - used instance    -> simulation succeeds and returns the stored escrow
 * - not a contract   -> simulation fails with `HostError: Error(Storage, MissingValue)`
 */
export type ContractAvailability =
  | { state: 'unused' }
  | { state: 'in-use' }
  | { state: 'unknown'; reason: string };

/** Contract error #1 is `NotInitialized`; see the `EscrowError` enum in lib.rs. */
const NOT_INITIALIZED_ERROR = /Error\(Contract,\s*#1\)/;

/**
 * Decide whether `contractId` can still take a new escrow.
 *
 * Only `unused` is trustworthy enough to reuse. A failure we cannot attribute to
 * the `NotInitialized` guard means the instance is unreachable or is not a
 * contract at all, and reusing it would be a guess.
 */
export async function probeContract(contractId: string): Promise<ContractAvailability> {
  try {
    const contract = new StellarSdk.Contract(contractId);
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

    if (!('error' in result)) return { state: 'in-use' };
    if (NOT_INITIALIZED_ERROR.test(String(result.error))) return { state: 'unused' };
    return { state: 'unknown', reason: summarizeError(result.error) };
  } catch (err) {
    return { state: 'unknown', reason: summarizeError(err) };
  }
}

/** True when the instance is provably free for a new escrow. */
export async function isContractUnused(contractId: string): Promise<boolean> {
  return (await probeContract(contractId)).state === 'unused';
}

// ─── Build + sign + submit helpers ───

async function buildInvokeTx(
  method: string,
  contractId: string,
  ...args: StellarSdk.xdr.ScVal[]
): Promise<StellarSdk.Transaction> {
  const contract = new StellarSdk.Contract(contractId);
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

  // A rejection is `status: 'ERROR'` with a `TransactionResult` XDR, not an
  // `error` field, so checking for `error` here reported success for a
  // transaction the network had already thrown away.
  if (result.status === 'ERROR') {
    const reason = describeTransactionResult(result.errorResult) ?? result.status;
    return { success: false, error: `Transaction rejected by the network (${reason})` };
  }
  if (result.status === 'TRY_AGAIN_LATER') {
    return { success: false, error: 'Network busy, try again in a few seconds' };
  }
  return { success: true, hash: result.hash };
}

// ─── USDC on Stellar Testnet ───
// Stellar Asset Contract (SAC) for Circle's testnet USDC.
//   issuer: USDC:GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5
// The SAC id is derived deterministically from the issuer + network
// (Asset.contractId(Networks.TESTNET)) and was verified as deployed on
// testnet: it exposes the full SEP-41 interface (transfer/balance/mint/approve).
// Transfer amounts use 7 decimals => 1 USDC = 10,000,000 base units.
// The SAC is deployed and reachable, but holding a balance still requires a
// trustline plus testnet USDC, which must be obtained from Circle's faucet.
export const USDC_TOKEN_ADDRESS =
  'CBIELTK6YBZJU5UP2WWQEUCYKLPU6AUNZ2BQ4WWFEIE3USCIHMXQDAMA';

// ─── Contract actions ───
// Every action targets this wallet's active instance. `contractId` is an
// explicit override so a caller can address a specific instance; omitting it
// resolves the active one, which is what the pages do.

export async function createEscrowOnChain(
  buyerAddress: string,
  sellerAddress: string,
  amountUsdc: number,
  deadlineTimestamp: number,
  description: string,
  signTransaction: (xdr: string) => Promise<string | null>,
  tokenAddress: string = USDC_TOKEN_ADDRESS,
  contractId: string = getActiveEscrowId(),
) {
  const amountBaseUnits = BigInt(Math.round(amountUsdc * USDC_BASE_UNITS));
  const tx = await buildInvokeTx(
    'create_escrow',
    contractId,
    StellarSdk.nativeToScVal(buyerAddress, { type: 'address' }),
    StellarSdk.nativeToScVal(sellerAddress, { type: 'address' }),
    StellarSdk.nativeToScVal(tokenAddress, { type: 'address' }),
    StellarSdk.nativeToScVal(amountBaseUnits, { type: 'i128' }),
    StellarSdk.nativeToScVal(BigInt(deadlineTimestamp), { type: 'u64' }),
    StellarSdk.nativeToScVal(description, { type: 'string' }),
  );
  return signAndSubmit(tx, signTransaction);
}

export async function fundEscrowOnChain(
  signTransaction: (xdr: string) => Promise<string | null>,
  contractId: string = getActiveEscrowId(),
) {
  const tx = await buildInvokeTx('fund_escrow', contractId);
  return signAndSubmit(tx, signTransaction);
}

export async function releaseFundsOnChain(
  signTransaction: (xdr: string) => Promise<string | null>,
  contractId: string = getActiveEscrowId(),
) {
  const tx = await buildInvokeTx('release_funds', contractId);
  return signAndSubmit(tx, signTransaction);
}

export async function refundEscrowOnChain(
  callerAddress: string,
  signTransaction: (xdr: string) => Promise<string | null>,
  contractId: string = getActiveEscrowId(),
) {
  const tx = await buildInvokeTx(
    'refund_buyer',
    contractId,
    StellarSdk.nativeToScVal(callerAddress, { type: 'address' }),
  );
  return signAndSubmit(tx, signTransaction);
}

export async function raiseDisputeOnChain(
  callerAddress: string,
  signTransaction: (xdr: string) => Promise<string | null>,
  contractId: string = getActiveEscrowId(),
) {
  const tx = await buildInvokeTx(
    'raise_dispute',
    contractId,
    StellarSdk.nativeToScVal(callerAddress, { type: 'address' }),
  );
  return signAndSubmit(tx, signTransaction);
}

export async function autoRefundIfExpiredOnChain(
  signTransaction: (xdr: string) => Promise<string | null>,
  contractId: string = getActiveEscrowId(),
) {
  const tx = await buildInvokeTx('auto_refund_if_expired', contractId);
  return signAndSubmit(tx, signTransaction);
}

// ─── Per-user contract deployment ───
//
// The escrow contract is single-use per instance, so the app cannot share one
// contract id. Each user deploys their own instance and the resulting id is
// stored per wallet (see `activeEscrow.ts`).
//
// WHY TWO TRANSACTIONS AND NOT ONE
// A Soroban transaction may contain at most ONE operation. A two-operation
// `uploadContractWasm` + `createContract` envelope is rejected by the network
// with "Transaction contains more than one operation" (verified against
// soroban-testnet RPC). So the deploy is necessarily:
//
//   tx1: uploadContractWasm(wasm)                  -> yields the wasmId
//   tx2: createContract(wasmHash, salt, deployer)  -> yields the contract id
//
// WHY NO `Contract.deploy()`
// `@stellar/stellar-sdk` 17.1.0 has no `Contract.deploy` and no
// `AssembledTransaction` on the main entry point, and the `createCustomContract`
// operation it does expose requires a real deployer `Address` rather than the
// legacy `ScVal::Void` placeholder. This uses `TransactionBuilder` plus
// `Operation.uploadContractWasm` / `Operation.createCustomContract` directly.
//
// WHY THE wasmId IS JUST sha256(wasm)
// `createContract` is keyed by `ContractCode.hash`, which is the SHA-256 of the
// WASM bytes — NOT the hash of the `ContractCodeEntry` XDR. Both were tried
// against testnet: the entry-XDR hash fails with "Wasm does not exist", the
// plain SHA-256 succeeds. The upload transaction's own return value is checked
// against the locally computed value as a guard.

/** Shipped in `public/`, so `BASE_URL` is prefixed to survive a non-root deploy. */
const WASM_URL = `${import.meta.env.BASE_URL}escrow.wasm`;

const DEPLOY_TX_TIMEOUT_S = 300;
const LEDGER_POLL_ATTEMPTS = 40;
const LEDGER_POLL_INTERVAL_MS = 2000;

export type DeployStep =
  | 'fetching-wasm'
  | 'uploading-wasm'
  | 'creating-contract'
  | 'confirming';

export interface DeployEscrowResult {
  /** The freshly created contract id. */
  contractId: string;
  /** Transaction that uploaded the WASM. */
  uploadTxHash: string;
  /** Transaction that created the contract instance. */
  createTxHash: string;
}

export interface DeployEscrowOptions {
  signTransaction: (xdr: string) => Promise<string | null>;
  /** The connected account that pays fees and owns the new instance. */
  sourceAddress: string;
  /** Progress callback, so the UI can say what is being signed. */
  onProgress?: (step: DeployStep, contractId?: string) => void;
  /** Override the WASM location; defaults to the copy shipped in `public/`. */
  wasmUrl?: string;
}

/** Sequence problems are the one failure worth an automatic rebuild + retry. */
function looksLikeStaleSequence(text: string): boolean {
  const normalized = text.toLowerCase();
  return (
    normalized.includes('txbadseq') ||
    normalized.includes('badseq') ||
    normalized.includes('txtoosoon') ||
    normalized.includes('txtooearly') ||
    normalized.includes('bad sequence') ||
    normalized.includes('sequence')
  );
}

/**
 * Readable arm name out of the `TransactionResult` XDR the RPC returns on
 * rejection (`txBadSeq`, `txFailed`, ...), which is more actionable than
 * dumping base64 at the user.
 */
function describeTransactionResult(result?: StellarSdk.xdr.TransactionResult): string | null {
  // `TransactionResult.result` is the arm value itself (`txSuccess`, `txBadSeq`, ...).
  const arm = result?.result as { type?: string } | undefined;
  return arm?.type ?? null;
}

/** RPC errors arrive as multi-line host diagnostics; one line is enough for the user. */
function summarizeError(error: unknown): string {
  const text = error instanceof Error ? error.message : String(error);
  const firstLine = text.split('\n').find((line) => line.trim().length > 0) ?? text;
  return firstLine.trim().slice(0, 220);
}

function randomSalt(): Uint8Array {
  const salt = new Uint8Array(32);
  crypto.getRandomValues(salt);
  return salt;
}

/**
 * The `ContractCode.hash` that `createContract` is keyed by: SHA-256 of the
 * WASM bytes. Returns null when `crypto.subtle` is unavailable, which happens
 * outside a secure context (plain-http LAN origin); the upload result is then
 * used as the source of truth instead.
 */
async function computeWasmId(wasm: Uint8Array): Promise<Uint8Array | null> {
  if (typeof crypto === 'undefined' || !crypto.subtle) return null;
  // `slice()` gives an independent buffer: `crypto.subtle` rejects a view that
  // is not backed by a plain ArrayBuffer.
  const digest = await crypto.subtle.digest('SHA-256', wasm.slice() as BufferSource);
  return new Uint8Array(digest);
}

function toHex(bytes: Uint8Array): string {
  return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
}

async function fetchWasm(wasmUrl: string): Promise<Uint8Array> {
  let response: Response;
  try {
    response = await fetch(wasmUrl);
  } catch (err) {
    throw new Error(`No se pudo descargar el WASM del contrato: ${summarizeError(err)}`);
  }
  if (!response.ok) {
    throw new Error(
      `No se pudo descargar el WASM del contrato (HTTP ${response.status}). Verificá que ${wasmUrl} esté publicado.`,
    );
  }
  return new Uint8Array(await response.arrayBuffer());
}

/** Poll until the submitted transaction is in a ledger, so callers never read a half-applied state. */
async function waitForLedger(hash: string, what: string): Promise<void> {
  for (let attempt = 0; attempt < LEDGER_POLL_ATTEMPTS; attempt += 1) {
    const tx = await sorobanServer.getTransaction(hash);
    if (tx.status === 'SUCCESS') return;
    if (tx.status === 'FAILED') {
      throw new Error(`La transaccion de ${what} fue rechazada por la red (${hash}).`);
    }
    await new Promise((resolve) => setTimeout(resolve, LEDGER_POLL_INTERVAL_MS));
  }
  throw new Error(
    `La transaccion de ${what} no fue confirmada a tiempo (${hash}). Consultala en el explorador antes de reintentar.`,
  );
}

interface SubmitOutcome {
  hash: string;
  simulation: StellarSdk.rpc.Api.SimulateTransactionSuccessResponse;
}

/**
 * Load a fresh account, build, simulate, prepare, sign, submit.
 *
 * The account is re-read on every attempt: the sequence number is only known
 * from the network, and a stale one makes the transaction fail at submission.
 */
async function submitSorobanTx(
  build: (account: StellarSdk.Account) => StellarSdk.Transaction,
  signTransaction: (xdr: string) => Promise<string | null>,
  sourceAddress: string,
  what: string,
): Promise<SubmitOutcome> {
  let lastError = '';

  for (let attempt = 0; attempt < 2; attempt += 1) {
    let account: StellarSdk.Account;
    try {
      account = await sorobanServer.getAccount(sourceAddress);
    } catch (err) {
      throw new Error(
        `No se pudo leer la cuenta ${sourceAddress} en Stellar Testnet. Pedi XLM de prueba e intentá de nuevo. (${summarizeError(err)})`,
      );
    }

    const tx = build(account);

    const simulation = await sorobanServer.simulateTransaction(tx);
    if ('error' in simulation) {
      throw new Error(`La red rechazo ${what}: ${summarizeError(simulation.error)}`);
    }

    const prepared = await sorobanServer.prepareTransaction(tx);
    const signedXdr = await signTransaction(prepared.toXDR());
    if (!signedXdr) {
      throw new Error(`Rechazaste la firma de ${what} en Freighter. No se desplego ningun contrato.`);
    }

    const sent = await sorobanServer.sendTransaction(
      StellarSdk.TransactionBuilder.fromXDR(signedXdr, NETWORK_PASSPHRASE),
    );

    // `sendTransaction` reports a rejection as `status: 'ERROR'` plus an
    // `errorResult` XDR; there is no `error` string on this response.
    if (sent.status === 'ERROR') {
      lastError = describeTransactionResult(sent.errorResult) ?? sent.status;
      if (attempt === 0 && looksLikeStaleSequence(lastError)) {
        // Rebuild with the sequence the network actually expects.
        continue;
      }
      throw new Error(`No se pudo enviar ${what}: ${lastError}`);
    }

    if (sent.status === 'TRY_AGAIN_LATER') {
      throw new Error(
        `La red esta saturada y pidio reintentar ${what} mas tarde (${sent.status}). Intentalo de nuevo en unos segundos.`,
      );
    }

    return { hash: sent.hash, simulation };
  }

  throw new Error(`No se pudo enviar ${what}: ${lastError}`);
}

/**
 * Deploy a brand new escrow contract instance owned by `sourceAddress`.
 *
 * Throws with a Spanish message on any failure. The caller is expected to store
 * the returned `contractId` as this wallet's active instance.
 */
export async function deployEscrowContract(
  options: DeployEscrowOptions,
): Promise<DeployEscrowResult> {
  const { signTransaction, sourceAddress, onProgress, wasmUrl = WASM_URL } = options;

  if (!StellarSdk.StrKey.isValidEd25519PublicKey(sourceAddress)) {
    throw new Error(`Direccion de wallet invalida: ${sourceAddress}`);
  }

  onProgress?.('fetching-wasm');
  const wasm = await fetchWasm(wasmUrl);

  // `createContract` is keyed by sha256(wasm). Computing it locally lets tx1 and
  // tx2 be signed back to back, with no wait for tx1 to be indexed.
  let wasmId = await computeWasmId(wasm);
  // Whether tx1 still has to be polled for, which is the case only when the id
  // could not be computed locally.
  let uploadPending = false;

  // tx1 — upload the WASM.
  onProgress?.('uploading-wasm');
  const upload = await submitSorobanTx(
    (account) =>
      new StellarSdk.TransactionBuilder(account, {
        fee: StellarSdk.BASE_FEE,
        networkPassphrase: NETWORK_PASSPHRASE,
      })
        .addOperation(StellarSdk.Operation.uploadContractWasm({ wasm }))
        .setTimeout(DEPLOY_TX_TIMEOUT_S)
        .build(),
    signTransaction,
    sourceAddress,
    'la carga del WASM',
  );

  // Without `crypto.subtle` the id is unknown up front, so tx1 must be in a
  // ledger before its return value can be read.
  if (!wasmId) {
    onProgress?.('confirming');
    await waitForLedger(upload.hash, 'la carga del WASM');
    uploadPending = true;
    wasmId = await readWasmIdFromUpload(upload.hash);
    if (!wasmId) {
      throw new Error(
        'No se pudo determinar el hash del WASM subido. No se pudo completar el despliegue.',
      );
    }
  }

  // tx2 — create the instance from that WASM.
  // The salt is fixed here so a sequence retry cannot silently produce a
  // different contract id than the one reported to the user.
  const salt = randomSalt();
  const deployer = new StellarSdk.Address(sourceAddress);
  const contractWasmId: Uint8Array = wasmId;

  onProgress?.('creating-contract');
  const created = await submitSorobanTx(
    (account) =>
      new StellarSdk.TransactionBuilder(account, {
        fee: StellarSdk.BASE_FEE,
        networkPassphrase: NETWORK_PASSPHRASE,
      })
        .addOperation(
          StellarSdk.Operation.createCustomContract({
            address: deployer,
            wasmHash: contractWasmId,
            salt,
          }),
        )
        .setTimeout(DEPLOY_TX_TIMEOUT_S)
        .build(),
    signTransaction,
    sourceAddress,
    'la creacion del contrato',
  );

  // The simulation of tx2 already returned the new contract id, so the user can
  // be told the address before the transaction is even submitted.
  const retval = created.simulation.result?.retval;
  if (!retval) {
    throw new Error(
      'La simulacion de la creacion del contrato no devolvio una instancia. No se pudo completar el despliegue.',
    );
  }
  const contractId = String(StellarSdk.scValToNative(retval));
  if (!StellarSdk.StrKey.isValidContract(contractId)) {
    throw new Error(
      `La red no devolvio un contrato valido al desplegarlo (${contractId}). No se pudo completar el despliegue.`,
    );
  }
  onProgress?.('creating-contract', contractId);

  onProgress?.('confirming');
  if (!uploadPending) await waitForLedger(upload.hash, 'la carga del WASM');
  await waitForLedger(created.hash, 'la creacion del contrato');

  // Guard: the hash used to create the contract must be the one the network
  // actually stored when the WASM was uploaded.
  const stored = await readWasmIdFromUpload(upload.hash);
  if (stored && toHex(stored) !== toHex(contractWasmId)) {
    throw new Error(
      'El hash del WASM subido no coincide con el calculado localmente. Verificá el deploy antes de usarlo.',
    );
  }

  return {
    contractId,
    uploadTxHash: upload.hash,
    createTxHash: created.hash,
  };
}

/** The `ContractCode.hash` the upload host function returned for `uploadHash`. */
async function readWasmIdFromUpload(uploadHash: string): Promise<Uint8Array | null> {
  try {
    const tx = await sorobanServer.getTransaction(uploadHash);
    if (tx.status !== 'SUCCESS' || !tx.returnValue) return null;
    const value = StellarSdk.scValToNative(tx.returnValue);
    if (value instanceof Uint8Array && value.length === 32) return value;
    return null;
  } catch {
    return null;
  }
}

// ─── USDC base units ───

/**
 * Amounts on-chain are token BASE UNITS, not stroops (a stroop is the 1e-7 XLM
 * base unit). This is the base-unit scale assumed for the USDC SAC above:
 * 10,000,000 base units = 1 USDC. Confirm it against the deployed SAC's
 * `decimals()` before any mainnet use.
 */
export const USDC_BASE_UNITS = 10_000_000;

export function usdcToBaseUnits(usdc: number): bigint {
  return BigInt(Math.round(usdc * USDC_BASE_UNITS));
}

export function baseUnitsToUsdc(baseUnits: bigint): number {
  return Number(baseUnits) / USDC_BASE_UNITS;
}

export function formatScAmount(baseUnits: bigint): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
  }).format(baseUnitsToUsdc(baseUnits));
}
