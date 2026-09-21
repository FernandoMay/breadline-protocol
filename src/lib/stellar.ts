import * as StellarSdk from '@stellar/stellar-sdk';

const HORIZON_URL = 'https://horizon-testnet.stellar.org';
const SOROBAN_RPC_URL = 'https://soroban-testnet.stellar.org';

export const server = new StellarSdk.Horizon.Server(HORIZON_URL);
export const sorobanServer = new StellarSdk.rpc.Server(SOROBAN_RPC_URL);

export const NETWORK_PASSPHRASE = StellarSdk.Networks.TESTNET;

// Deployed escrow contract on Testnet
export const ESCROW_CONTRACT_ID = import.meta.env.VITE_ESCROW_CONTRACT_ID || 'CATDRV5A4GKMLVM3SJZNQ3HCCHTZ2OYQU7OBTIPKGMHYDQNZAQMYMT7G';

export const CURRENCIES = ['USDC', 'USD'] as const;

export const COUNTRIES = [
  { code: 'US', name: 'Estados Unidos', flag: '🇺🇸' },
  { code: 'GB', name: 'Reino Unido', flag: '🇬🇧' },
  { code: 'EU', name: 'Unión Europea', flag: '🇪🇺' },
  { code: 'CA', name: 'Canadá', flag: '🇨🇦' },
  { code: 'AU', name: 'Australia', flag: '🇦🇺' },
  { code: 'MX', name: 'México', flag: '🇲🇽' },
  { code: 'BR', name: 'Brasil', flag: '🇧🇷' },
  { code: 'AR', name: 'Argentina', flag: '🇦🇷' },
  { code: 'CO', name: 'Colombia', flag: '🇨🇴' },
  { code: 'CL', name: 'Chile', flag: '🇨🇱' },
] as const;

export function calculateFee(amount: number, feePercent: number = 0.008): number {
  return amount * feePercent;
}

export function calculateNet(amount: number, feePercent: number = 0.008): number {
  return amount - calculateFee(amount, feePercent);
}

export function formatUSDC(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
  }).format(amount);
}

export function generateEscrowId(): string {
  const num = Math.floor(Math.random() * 90000) + 10000;
  return `ORD-${num}`;
}

export function generateContractHash(): string {
  const chars = '0123456789ABCDEF';
  let hash = '';
  for (let i = 0; i < 40; i++) {
    hash += chars[Math.floor(Math.random() * chars.length)];
  }
  return hash;
}

export function truncateAddress(address: string, chars: number = 4): string {
  if (!address) return '';
  return `${address.slice(0, chars)}...${address.slice(-chars)}`;
}

export function truncateHash(hash: string, chars: number = 6): string {
  if (!hash) return '';
  return `${hash.slice(0, chars)}...${hash.slice(-chars)}`;
}

export function getStatusLabel(status: string): string {
  const labels: Record<string, string> = {
    created: 'Orden Creada',
    pending_deposit: 'Pendiente de Depósito',
    funded: 'Fondos Bloqueados',
    in_progress: 'En Progreso',
    delivered: 'Entregable Presentado',
    under_review: 'En Revisión',
    disputed: 'Disputa Activa',
    completed: 'Completado',
    cancelled: 'Cancelado',
  };
  return labels[status] || status;
}

export function getStatusColor(status: string): string {
  const colors: Record<string, string> = {
    created: 'bg-secondary/10 text-secondary',
    pending_deposit: 'bg-secondary/10 text-secondary',
    funded: 'bg-primary/10 text-primary',
    in_progress: 'bg-primary/10 text-primary',
    delivered: 'bg-amber-500/10 text-amber-700',
    under_review: 'bg-primary/10 text-primary',
    disputed: 'bg-error/10 text-error',
    completed: 'bg-tertiary/10 text-tertiary',
    cancelled: 'bg-secondary/10 text-secondary',
  };
  return colors[status] || 'bg-secondary/10 text-secondary';
}

// ---- Soroban Contract Interaction Functions ----

/**
 * Build an XDR transaction to create an escrow on-chain.
 * The wallet signs and submits this transaction.
 */
export function buildCreateEscrowTx(
  buyerAddress: string,
  sellerAddress: string,
  amountStroops: number, // amount in stroops (1 USDC = 10,000,000 stroops)
  deadlineTimestamp: number,
  description: string,
): StellarSdk.Transaction {
  const contract = new StellarSdk.Contract(ESCROW_CONTRACT_ID);
  const source = new StellarSdk.Account(buyerAddress, '0');

  return new StellarSdk.TransactionBuilder(source, {
    fee: StellarSdk.BASE_FEE,
    networkPassphrase: NETWORK_PASSPHRASE,
  })
    .addOperation(
      contract.call(
        'create_escrow',
        StellarSdk.nativeToScVal(buyerAddress, { type: 'address' }),
        StellarSdk.nativeToScVal(sellerAddress, { type: 'address' }),
        StellarSdk.nativeToScVal(BigInt(amountStroops), { type: 'i128' }),
        StellarSdk.nativeToScVal(BigInt(deadlineTimestamp), { type: 'u64' }),
        StellarSdk.nativeToScVal(description, { type: 'string' }),
      ),
    )
    .setTimeout(180)
    .build();
}

/**
 * Build an XDR transaction to release funds from escrow.
 */
export function buildReleaseFundsTx(
  buyerAddress: string,
): StellarSdk.Transaction {
  const contract = new StellarSdk.Contract(ESCROW_CONTRACT_ID);
  const source = new StellarSdk.Account(buyerAddress, '0');

  return new StellarSdk.TransactionBuilder(source, {
    fee: StellarSdk.BASE_FEE,
    networkPassphrase: NETWORK_PASSPHRASE,
  })
    .addOperation(contract.call('release_funds'))
    .setTimeout(180)
    .build();
}

/**
 * Build an XDR transaction to fund the escrow.
 */
export function buildFundEscrowTx(
  buyerAddress: string,
): StellarSdk.Transaction {
  const contract = new StellarSdk.Contract(ESCROW_CONTRACT_ID);
  const source = new StellarSdk.Account(buyerAddress, '0');

  return new StellarSdk.TransactionBuilder(source, {
    fee: StellarSdk.BASE_FEE,
    networkPassphrase: NETWORK_PASSPHRASE,
  })
    .addOperation(contract.call('fund_escrow'))
    .setTimeout(180)
    .build();
}

/**
 * Convert USDC amount to stroops (1 USDC = 10,000,000 stroops)
 */
export function usdcToStroops(usdc: number): number {
  return Math.round(usdc * 10_000_000);
}

/**
 * Convert stroops to USDC
 */
export function stroopsToUsdc(stroops: number): number {
  return stroops / 10_000_000;
}
