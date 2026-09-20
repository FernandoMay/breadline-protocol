export interface EscrowOrder {
  id: string;
  clientName: string;
  clientEmail: string;
  clientCountry: string;
  serviceTitle: string;
  serviceDescription: string;
  acceptanceCriteria: string;
  briefUrl?: string;
  amount: number;
  fee: number;
  netAmount: number;
  deliveryDays: number;
  reviewDays: number;
  paymentMode: 'single' | 'milestones';
  milestones?: Milestone[];
  status: EscrowStatus;
  contractAddress?: string;
  transactionHash?: string;
  createdAt: string;
  updatedAt: string;
  deadline: string;
  reviewDeadline?: string;
  sellerWallet?: string;
  buyerWallet?: string;
}

export interface Milestone {
  id: string;
  label: string;
  percentage: number;
  amount: number;
  status: 'pending' | 'in_progress' | 'delivered' | 'approved' | 'released';
}

export type EscrowStatus =
  | 'created'
  | 'pending_deposit'
  | 'funded'
  | 'in_progress'
  | 'delivered'
  | 'under_review'
  | 'disputed'
  | 'completed'
  | 'cancelled';

export interface Dispute {
  id: string;
  escrowId: string;
  raisedBy: 'buyer' | 'seller';
  reason: string;
  evidence: Evidence[];
  status: 'open' | 'conciliation' | 'arbitration' | 'resolved';
  resolution?: string;
  resolvedAt?: string;
}

export interface Evidence {
  id: string;
  name: string;
  hash: string;
  uploadedBy: string;
  uploadedAt: string;
  type: 'document' | 'image' | 'archive' | 'log';
}

export interface UserProfile {
  name: string;
  role: string;
  walletAddress: string;
  avatar?: string;
  location: string;
  reputation: number;
  totalVolume: number;
  completedEscrows: number;
}

export interface NetworkStats {
  finalityTime: string;
  networkFee: string;
  ledgerSequence: number;
  networkVersion: string;
}
