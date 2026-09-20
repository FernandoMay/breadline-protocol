import * as StellarSdk from '@stellar/stellar-sdk';
import type { EscrowOrder } from '../types';

const HORIZON_URL = 'https://horizon-testnet.stellar.org';

export const server = new StellarSdk.Horizon.Server(HORIZON_URL);

export const NETWORK_PASSPHRASE = StellarSdk.Networks.TESTNET;

// Smart contract ID - will be set after deployment
export const ESCROW_CONTRACT_ID = import.meta.env.VITE_ESCROW_CONTRACT_ID || '';

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

// Mock data for demo
export const MOCK_ORDERS: EscrowOrder[] = [
  {
    id: 'ORD-9482',
    clientName: 'Austin Tech Partners',
    clientEmail: 'billing@austintech.com',
    clientCountry: 'US',
    serviceTitle: 'Rediseño UI/UX App Mobile v3',
    serviceDescription: 'Rediseño completo de la interfaz de usuario para aplicación móvil v3',
    acceptanceCriteria: 'Entrega de componentes Figma, tokens de diseño y prototipo interactivo',
    amount: 2850,
    fee: 22.8,
    netAmount: 2827.2,
    deliveryDays: 15,
    reviewDays: 3,
    paymentMode: 'milestones',
    milestones: [
      { id: 'm1', label: 'Wireframes', percentage: 30, amount: 855, status: 'approved' },
      { id: 'm2', label: 'Figma Tokens', percentage: 35, amount: 997.5, status: 'in_progress' },
      { id: 'm3', label: 'Prototipo Final', percentage: 35, amount: 997.5, status: 'pending' },
    ],
    status: 'in_progress',
    contractAddress: 'CC7A9B0284F1E93B92F2B48A10C892147D3A4B9F2B',
    createdAt: '2025-03-10T14:20:00Z',
    updatedAt: '2025-03-24T09:00:00Z',
    deadline: '2025-04-24T23:59:59Z',
  },
  {
    id: 'ORD-7731',
    clientName: 'Nordic Dev Studio',
    clientEmail: 'projects@nordicdev.se',
    clientCountry: 'GB',
    serviceTitle: 'Desarrollo API REST en Go',
    serviceDescription: 'API REST completa para sistema de pagos',
    acceptanceCriteria: 'API documentada con tests unitarios y de integración, deploy en staging',
    amount: 1200,
    fee: 9.6,
    netAmount: 1190.4,
    deliveryDays: 30,
    reviewDays: 5,
    paymentMode: 'single',
    status: 'delivered',
    contractAddress: 'CB8F3E2190A4D76B5C8E1234FEDCBA987654321AB',
    createdAt: '2025-02-15T10:00:00Z',
    updatedAt: '2025-03-22T16:30:00Z',
    deadline: '2025-04-18T23:59:59Z',
    reviewDeadline: '2025-03-27T23:59:59Z',
  },
  {
    id: 'ORD-5520',
    clientName: 'GrowthVentures',
    clientEmail: 'ops@growthventures.ca',
    clientCountry: 'CA',
    serviceTitle: 'Campaña Q2 Performance',
    serviceDescription: 'Estrategia y ejecución de campaña de marketing digital Q2',
    acceptanceCriteria: 'Plan de campaña, creativos, configuración de ads y reporte de métricas',
    amount: 800,
    fee: 6.4,
    netAmount: 793.6,
    deliveryDays: 45,
    reviewDays: 7,
    paymentMode: 'single',
    status: 'pending_deposit',
    createdAt: '2025-03-20T08:00:00Z',
    updatedAt: '2025-03-20T08:00:00Z',
    deadline: '2025-05-05T23:59:59Z',
  },
];

export const MOCK_USER = {
  name: 'Camila Valenzuela',
  role: 'Freelance Studio Lead',
  walletAddress: 'GA4F8YTR2MKVIQXN7Z6H3K9B2C1D0EFGH876543210AB',
  location: 'Buenos Aires, AR',
  reputation: 99.4,
  totalVolume: 74200,
  completedEscrows: 28,
  avatar: 'https://lh3.googleusercontent.com/aida-public/AB6AXuA2vROGcxJmm1KoHTtQaQbPuReQ0pwmBI088fx7HS4z0fsAKssSEjASrhIn4N4aAySCuy5hhpoa2LuT4GWOxeBmG14dR7cKBmv5_BCmvO-7Z-_VBCPcPUpawrfhPspKv3-zhwMSwzAm3x65qao1aJ2Xe42i31ne7pzbGOgQJnlGtpKlNxEjHA5k4EiBiwL3fHGNKCe0PSeHJGGH8to7kSdo7_iKpopHduGeLEKgbUOqaf7dweePFpW87g',
};
