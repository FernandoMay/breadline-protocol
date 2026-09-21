import React, { useState, useEffect, useCallback } from 'react';
import {
  fetchEscrow,
  fundEscrowOnChain,
  formatScAmount,
  type OnChainEscrow,
  type OnChainEscrowState,
} from '../lib/contract';
import { ESCROW_CONTRACT_ID, truncateAddress } from '../lib/stellar';
import { useStellarWallet } from '../hooks/useStellarWallet';

// ─── Types ───

type Language = 'es' | 'en';
type PaymentTab = 'card' | 'crypto' | 'wallet';
type FundStatus = 'idle' | 'loading' | 'success' | 'error';

// ─── Translations ───

const t = {
  es: {
    guaranteeStrip: 'Proteccion de Comprador Activa',
    contractId: `Contrato Soroban: ${truncateAddress(ESCROW_CONTRACT_ID, 6)}`,
    heroTitle: 'Deposito Protegido en Garantia',
    heroDescription:
      'Los fondos seran bloqueados en un contrato inteligente de Soroban hasta que confirmes la entrega satisfactoria del servicio.',
    step1Label: 'Tu Depositas',
    step1Desc: 'Envias los fondos al contrato de custodia',
    step2Label: 'Proveedor Entrega',
    step2Desc: 'El servicio se realiza bajo tus terminos',
    step3Label: 'Tu Apruebas',
    step3Desc: 'Liberas los fondos al confirmar calidad',
    tabCard: 'Tarjeta / ACH',
    tabCrypto: 'USDC Directo',
    tabWallet: 'Wallet / Passkey',
    cardNumber: 'Numero de Tarjeta',
    cardExpiry: 'Vencimiento',
    cardCVC: 'CVC',
    cardPlaceholder: '4242 4242 4242 4242',
    expiryPlaceholder: 'MM / AA',
    cvcPlaceholder: '123',
    cryptoTitle: 'Deposita USDC a la direccion del contrato',
    copyAddress: 'Copiar Direccion',
    memoLabel: 'Memo (obligatorio)',
    depositAddress: 'Direccion del Contrato',
    stellarNetwork: 'Red Stellar',
    networkValue: 'Testnet',
    walletFreighter: 'Freighter Wallet',
    walletFreighterDesc: 'Extension de navegador Stellar',
    ctaLabel: 'Confirmar y Depositar en Custodia Segura',
    ctaLoading: 'Procesando deposito...',
    ctaSuccess: 'Deposito Confirmado',
    ctaConnectWallet: 'Conectar Wallet Primero',
    trustTitle: 'Tu Dinero esta Protegido',
    trustPoint1: 'Fondos bloqueados en contrato inteligente de Soroban',
    trustPoint2: 'Solo liberados con tu confirmacion explicita',
    trustPoint3: 'Auditado por el equipo de Breadline',
    trustPoint4: 'Resolucion de disputas en menos de 48 horas',
    sidebarSeller: 'Vendedor',
    sidebarSellerAddress: 'Direccion del Vendedor',
    sidebarOrder: 'Detalles del Pedido',
    sidebarService: 'Servicio',
    sidebarDeadline: 'Fecha Limite',
    sidebarAmount: 'Monto en Custodia',
    sidebarBreakdown: 'Desglose Financiero',
    sidebarTotal: 'Total en Custodia',
    sidebarSecurity: 'Seguridad',
    securityBadge1: 'Contrato Auditado',
    securityBadge2: 'Fondos Aislados',
    securityBadge3: 'Sin Acceso Centralizado',
    poweredBy: 'Powered by Stellar / Soroban',
    noEscrowTitle: 'No hay escrow activo',
    noEscrowDesc: 'Crea un escrow primero para poder depositar fondos en custodia segura.',
    emptyStateAction: 'Crear Escrow',
    stateLabel: 'Estado del Escrow',
    buyerLabel: 'Comprador',
    sellerLabel: 'Vendedor',
    amountLabel: 'Monto',
    deadlineLabel: 'Fecha Limite',
    descriptionLabel: 'Descripcion del Servicio',
    walletConnected: 'Wallet Conectada',
    walletNotConnected: 'Wallet No Conectada',
    connectWallet: 'Conectar Freighter',
    disconnectWallet: 'Desconectar',
    stateCreated: 'Creado — Pendiente de Deposito',
    stateFunded: 'Fondos Depositados',
    stateReleased: 'Fondos Liberados',
    stateRefunded: 'Reembolsado',
    stateDisputed: 'Disputa Activa',
    fundError: 'Error al depositar fondos',
    fundRetry: 'Reintentar',
  },
  en: {
    guaranteeStrip: 'Buyer Protection Active',
    contractId: `Soroban Contract: ${truncateAddress(ESCROW_CONTRACT_ID, 6)}`,
    heroTitle: 'Protected Deposit in Escrow',
    heroDescription:
      'Funds will be locked in a Soroban smart contract until you confirm satisfactory delivery of the service.',
    step1Label: 'You Deposit',
    step1Desc: 'Send funds to the custody contract',
    step2Label: 'Provider Delivers',
    step2Desc: 'The service is performed under your terms',
    step3Label: 'You Approve',
    step3Desc: 'Release funds by confirming quality',
    tabCard: 'Card / ACH',
    tabCrypto: 'Direct USDC',
    tabWallet: 'Wallet / Passkey',
    cardNumber: 'Card Number',
    cardExpiry: 'Expiry',
    cardCVC: 'CVC',
    cardPlaceholder: '4242 4242 4242 4242',
    expiryPlaceholder: 'MM / YY',
    cvcPlaceholder: '123',
    cryptoTitle: 'Deposit USDC to the contract address',
    copyAddress: 'Copy Address',
    memoLabel: 'Memo (required)',
    depositAddress: 'Contract Address',
    stellarNetwork: 'Stellar Network',
    networkValue: 'Testnet',
    walletFreighter: 'Freighter Wallet',
    walletFreighterDesc: 'Stellar browser extension',
    ctaLabel: 'Confirm and Deposit in Secure Custody',
    ctaLoading: 'Processing deposit...',
    ctaSuccess: 'Deposit Confirmed',
    ctaConnectWallet: 'Connect Wallet First',
    trustTitle: 'Your Money is Protected',
    trustPoint1: 'Funds locked in Soroban smart contract',
    trustPoint2: 'Only released with your explicit confirmation',
    trustPoint3: 'Audited by the Breadline team',
    trustPoint4: 'Dispute resolution in under 48 hours',
    sidebarSeller: 'Seller',
    sidebarSellerAddress: 'Seller Address',
    sidebarOrder: 'Order Details',
    sidebarService: 'Service',
    sidebarDeadline: 'Deadline',
    sidebarAmount: 'Amount in Custody',
    sidebarBreakdown: 'Financial Breakdown',
    sidebarTotal: 'Total in Custody',
    sidebarSecurity: 'Security',
    securityBadge1: 'Audited Contract',
    securityBadge2: 'Isolated Funds',
    securityBadge3: 'No Centralized Access',
    poweredBy: 'Powered by Stellar / Soroban',
    noEscrowTitle: 'No active escrow',
    noEscrowDesc: 'Create an escrow first to deposit funds into secure custody.',
    emptyStateAction: 'Create Escrow',
    stateLabel: 'Escrow State',
    buyerLabel: 'Buyer',
    sellerLabel: 'Seller',
    amountLabel: 'Amount',
    deadlineLabel: 'Deadline',
    descriptionLabel: 'Service Description',
    walletConnected: 'Wallet Connected',
    walletNotConnected: 'Wallet Not Connected',
    connectWallet: 'Connect Freighter',
    disconnectWallet: 'Disconnect',
    stateCreated: 'Created — Pending Deposit',
    stateFunded: 'Funds Deposited',
    stateReleased: 'Funds Released',
    stateRefunded: 'Refunded',
    stateDisputed: 'Dispute Active',
    fundError: 'Error depositing funds',
    fundRetry: 'Retry',
  },
} as const;

// ─── Helpers ───

function formatDeadline(ts: bigint): string {
  const date = new Date(Number(ts) * 1000);
  return date.toLocaleDateString('es-AR', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

function stateColor(state: OnChainEscrowState): string {
  const map: Record<OnChainEscrowState, string> = {
    Created: 'bg-secondary/10 text-secondary',
    Funded: 'bg-primary/10 text-primary',
    Released: 'bg-tertiary/10 text-tertiary',
    Refunded: 'bg-secondary/10 text-secondary',
    Disputed: 'bg-error/10 text-error',
  };
  return map[state] ?? 'bg-secondary/10 text-secondary';
}

function stateLabelKey(state: OnChainEscrowState): string {
  const map: Record<OnChainEscrowState, keyof typeof t.es> = {
    Created: 'stateCreated',
    Funded: 'stateFunded',
    Released: 'stateReleased',
    Refunded: 'stateRefunded',
    Disputed: 'stateDisputed',
  };
  return map[state] ?? 'stateCreated';
}

function shortenAddress(addr: string): string {
  if (!addr || addr.length < 12) return addr;
  return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
}

// ─── Sub-components ───

function CopyButton({ text, label }: { text: string; label: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  return (
    <button
      type="button"
      onClick={handleCopy}
      className="mt-2 inline-flex items-center gap-2 rounded-lg bg-primary-container px-3 py-1.5 text-on-primary-container font-label-sm transition-colors hover:opacity-90"
    >
      {copied ? (
        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
        </svg>
      ) : (
        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
          <path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" />
        </svg>
      )}
      {copied ? 'Copiado' : label}
    </button>
  );
}

function QRCodeSVG() {
  return (
    <svg viewBox="0 0 164 164" className="w-40 h-40">
      <rect width="164" height="164" fill="#ffffff" rx="8" />
      <g fill="#000000">
        <rect x="16" y="16" width="40" height="40" rx="4" />
        <rect x="20" y="20" width="32" height="32" rx="2" fill="#ffffff" />
        <rect x="24" y="24" width="24" height="24" rx="2" fill="#000000" />
        <rect x="108" y="16" width="40" height="40" rx="4" />
        <rect x="112" y="20" width="32" height="32" rx="2" fill="#ffffff" />
        <rect x="116" y="24" width="24" height="24" rx="2" fill="#000000" />
        <rect x="16" y="108" width="40" height="40" rx="4" />
        <rect x="20" y="112" width="32" height="32" rx="2" fill="#ffffff" />
        <rect x="24" y="116" width="24" height="24" rx="2" fill="#000000" />
        <rect x="64" y="16" width="8" height="8" rx="1" />
        <rect x="64" y="32" width="8" height="8" rx="1" />
        <rect x="64" y="48" width="8" height="8" rx="1" />
        <rect x="80" y="16" width="8" height="8" rx="1" />
        <rect x="96" y="16" width="8" height="8" rx="1" />
        <rect x="64" y="64" width="8" height="8" rx="1" />
        <rect x="80" y="64" width="8" height="8" rx="1" />
        <rect x="96" y="64" width="8" height="8" rx="1" />
        <rect x="112" y="64" width="8" height="8" rx="1" />
        <rect x="64" y="80" width="8" height="8" rx="1" />
        <rect x="96" y="80" width="8" height="8" rx="1" />
        <rect x="16" y="80" width="8" height="8" rx="1" />
        <rect x="16" y="96" width="8" height="8" rx="1" />
        <rect x="32" y="80" width="8" height="8" rx="1" />
        <rect x="48" y="80" width="8" height="8" rx="1" />
        <rect x="32" y="96" width="8" height="8" rx="1" />
        <rect x="48" y="96" width="8" height="8" rx="1" />
        <rect x="64" y="96" width="8" height="8" rx="1" />
        <rect x="80" y="96" width="8" height="8" rx="1" />
        <rect x="112" y="80" width="8" height="8" rx="1" />
        <rect x="128" y="80" width="8" height="8" rx="1" />
        <rect x="112" y="96" width="8" height="8" rx="1" />
        <rect x="128" y="96" width="8" height="8" rx="1" />
        <rect x="144" y="96" width="8" height="8" rx="1" />
        <rect x="112" y="112" width="8" height="8" rx="1" />
        <rect x="128" y="112" width="8" height="8" rx="1" />
        <rect x="144" y="112" width="8" height="8" rx="1" />
        <rect x="112" y="128" width="8" height="8" rx="1" />
        <rect x="128" y="128" width="8" height="8" rx="1" />
        <rect x="144" y="128" width="8" height="8" rx="1" />
        <rect x="112" y="144" width="8" height="8" rx="1" />
        <rect x="144" y="144" width="8" height="8" rx="1" />
        <rect x="80" y="112" width="8" height="8" rx="1" />
        <rect x="80" y="144" width="8" height="8" rx="1" />
        <rect x="96" y="112" width="8" height="8" rx="1" />
        <rect x="96" y="128" width="8" height="8" rx="1" />
        <rect x="96" y="144" width="8" height="8" rx="1" />
        <rect x="64" y="112" width="8" height="8" rx="1" />
        <rect x="64" y="128" width="8" height="8" rx="1" />
        <rect x="64" y="144" width="8" height="8" rx="1" />
        <rect x="32" y="112" width="8" height="8" rx="1" />
        <rect x="48" y="112" width="8" height="8" rx="1" />
        <rect x="32" y="128" width="8" height="8" rx="1" />
        <rect x="48" y="128" width="8" height="8" rx="1" />
        <rect x="32" y="144" width="8" height="8" rx="1" />
        <rect x="48" y="144" width="8" height="8" rx="1" />
        <rect x="80" y="80" width="8" height="8" rx="1" />
        <rect x="16" y="64" width="8" height="8" rx="1" />
        <rect x="80" y="32" width="8" height="8" rx="1" />
        <rect x="80" y="48" width="8" height="8" rx="1" />
        <rect x="96" y="32" width="8" height="8" rx="1" />
        <rect x="96" y="48" width="8" height="8" rx="1" />
      </g>
    </svg>
  );
}

function StepperIcon({ step }: { step: number }) {
  const icons: Record<number, React.JSX.Element> = {
    1: (
      <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12m-3-2.818l.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v1" />
      </svg>
    ),
    2: (
      <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
        <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 18.75a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h6m-9 0H3.375a1.125 1.125 0 01-1.125-1.125V14.25m17.25 4.5a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0H18.375c-.621 0-1.125-.504-1.125-1.125v-1.5c0-.621.504-1.125 1.125-1.125h.375" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 7.5l.375-.375A2.25 2.25 0 017.5 6h9a2.25 2.25 0 011.725.75L20.25 7.5" />
      </svg>
    ),
    3: (
      <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
  };
  return icons[step] || null;
}

// ─── Empty State ───

function EmptyState({ lang }: { lang: Language }) {
  const content = t[lang];
  return (
    <div className="flex flex-col items-center justify-center py-20 px-6">
      <div className="w-16 h-16 rounded-full bg-surface-container-high flex items-center justify-center mb-6">
        <svg className="w-8 h-8 text-tertiary" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
          <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 7.5l-.625 10.632a2.25 2.25 0 01-2.247 2.118H6.622a2.25 2.25 0 01-2.247-2.118L3.75 7.5M10 11.25h4M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125z" />
        </svg>
      </div>
      <h2 className="font-headline-sm text-xl font-semibold text-on-surface mb-2">
        {content.noEscrowTitle}
      </h2>
      <p className="font-body-md text-secondary text-center max-w-sm mb-6">
        {content.noEscrowDesc}
      </p>
      <a
        href="/"
        className="inline-flex items-center gap-2 rounded-xl bg-primary px-6 py-3 font-label-md text-on-primary transition-colors hover:opacity-90"
      >
        <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
        </svg>
        {content.emptyStateAction}
      </a>
    </div>
  );
}

// ─── Main Component ───

export default function VistaComprador() {
  const [lang, setLang] = useState<Language>('es');
  const [activeTab, setActiveTab] = useState<PaymentTab>('card');
  const [escrow, setEscrow] = useState<OnChainEscrow | null>(null);
  const [escrowLoading, setEscrowLoading] = useState(true);
  const [fundStatus, setFundStatus] = useState<FundStatus>('idle');
  const [fundError, setFundError] = useState<string | null>(null);

  const wallet = useStellarWallet();
  const content = t[lang];

  // Fetch escrow on mount
  const loadEscrow = useCallback(async () => {
    setEscrowLoading(true);
    try {
      const data = await fetchEscrow();
      setEscrow(data);
    } catch {
      // Error handled by empty escrow state
    } finally {
      setEscrowLoading(false);
    }
  }, []);

  useEffect(() => {
    loadEscrow();
  }, [loadEscrow]);

  // Fund escrow handler
  const handleFund = async () => {
    if (!wallet.connected || !wallet.signTransaction) return;

    setFundStatus('loading');
    setFundError(null);

    try {
      const result = await fundEscrowOnChain(wallet.signTransaction);
      if (result.success) {
        setFundStatus('success');
        // Re-fetch escrow to update state
        await loadEscrow();
      } else {
        setFundStatus('error');
        setFundError(result.error ?? 'Transaction failed');
      }
    } catch (err) {
      setFundStatus('error');
      setFundError(err instanceof Error ? err.message : 'Unexpected error');
    }
  };

  // Tabs config
  const tabs: { id: PaymentTab; label: string }[] = [
    { id: 'card', label: content.tabCard },
    { id: 'crypto', label: content.tabCrypto },
    { id: 'wallet', label: content.tabWallet },
  ];

  const trustPoints = [
    content.trustPoint1,
    content.trustPoint2,
    content.trustPoint3,
    content.trustPoint4,
  ];

  const securityBadges = [
    content.securityBadge1,
    content.securityBadge2,
    content.securityBadge3,
  ];

  const canFund = escrow?.state === 'Created' && wallet.connected;
  const isFunded = escrow?.state !== 'Created';

  // ─── Loading state ───
  if (escrowLoading) {
    return (
      <div className="min-h-screen bg-surface-container-lowest text-on-surface font-body-md flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <svg className="w-8 h-8 animate-spin text-primary" viewBox="0 0 24 24" fill="none">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
          <span className="font-label-md text-secondary">Cargando escrow...</span>
        </div>
      </div>
    );
  }

  // ─── No escrow state ───
  if (!escrow) {
    return (
      <div className="min-h-screen bg-surface-container-lowest text-on-surface font-body-md">
        {/* Guarantee Strip */}
        <div className="w-full bg-tertiary text-on-tertiary-container px-4 py-2">
          <div className="max-w-7xl mx-auto flex items-center justify-between">
            <div className="flex items-center gap-2">
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
              </svg>
              <span className="font-label-sm">{content.guaranteeStrip}</span>
            </div>
            <span className="font-code-md text-xs opacity-80 hidden sm:inline">{content.contractId}</span>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-4 py-6 lg:py-10">
          {/* Top bar */}
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-2">
              <svg className="w-6 h-6 text-primary" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 21v-7.5a.75.75 0 01.75-.75h3a.75.75 0 01.75.75V21m-4.5 0H2.36m11.14 0H18m0 0h3.64m-1.39 0V9.349m-16.5 11.65V9.35m0 0a3.001 3.001 0 003.75-.615A2.993 2.993 0 009.75 9.75c.896 0 1.7-.393 2.25-1.016a2.993 2.993 0 002.25 1.016c.896 0 1.7-.393 2.25-1.016a3.001 3.001 0 003.75.614m-16.5 0a3.004 3.004 0 01-.621-4.72L4.318 3.44A1.5 1.5 0 015.378 3h13.243a1.5 1.5 0 011.06.44l1.19 1.189a3 3 0 01-.621 4.72m-13.5 8.65h3.75a.75.75 0 00.75-.75V13.5a.75.75 0 00-.75-.75H6.75a.75.75 0 00-.75.75v3.75c0 .415.336.75.75.75z" />
              </svg>
              <span className="font-headline-sm text-primary font-semibold">Breadline</span>
            </div>
            <button
              type="button"
              onClick={() => setLang(lang === 'es' ? 'en' : 'es')}
              className="inline-flex items-center gap-1.5 rounded-full bg-surface-container-high px-3 py-1.5 text-sm font-label-sm text-secondary transition-colors hover:bg-surface-container"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 21a9.004 9.004 0 008.716-6.747M12 21a9.004 9.004 0 01-8.716-6.747M12 21c2.485 0 4.5-4.03 4.5-9S14.485 3 12 3m0 18c-2.485 0-4.5-4.03-4.5-9S9.515 3 12 3m0 0a8.997 8.997 0 017.843 4.582M12 3a8.997 8.997 0 00-7.843 4.582m15.686 0A11.953 11.953 0 0112 10.5c-2.998 0-5.74-1.1-7.843-2.918m15.686 0A8.959 8.959 0 0121 12c0 .778-.099 1.533-.284 2.253m0 0A17.919 17.919 0 0112 16.5c-3.162 0-6.133-.815-8.716-2.247m0 0A9.015 9.015 0 013 12c0-1.605.42-3.113 1.157-4.418" />
              </svg>
              {lang === 'es' ? 'EN' : 'ES'}
            </button>
          </div>

          <EmptyState lang={lang} />
        </div>
      </div>
    );
  }

  // ─── Escrow loaded ───

  return (
    <div className="min-h-screen bg-surface-container-lowest text-on-surface font-body-md">
      {/* Guarantee Strip */}
      <div className="w-full bg-tertiary text-on-tertiary-container px-4 py-2">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
            </svg>
            <span className="font-label-sm">{content.guaranteeStrip}</span>
          </div>
          <span className="font-code-md text-xs opacity-80 hidden sm:inline">{content.contractId}</span>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-6 lg:py-10">
        {/* Top bar */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-2">
            <svg className="w-6 h-6 text-primary" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 21v-7.5a.75.75 0 01.75-.75h3a.75.75 0 01.75.75V21m-4.5 0H2.36m11.14 0H18m0 0h3.64m-1.39 0V9.349m-16.5 11.65V9.35m0 0a3.001 3.001 0 003.75-.615A2.993 2.993 0 009.75 9.75c.896 0 1.7-.393 2.25-1.016a2.993 2.993 0 002.25 1.016c.896 0 1.7-.393 2.25-1.016a3.001 3.001 0 003.75.614m-16.5 0a3.004 3.004 0 01-.621-4.72L4.318 3.44A1.5 1.5 0 015.378 3h13.243a1.5 1.5 0 011.06.44l1.19 1.189a3 3 0 01-.621 4.72m-13.5 8.65h3.75a.75.75 0 00.75-.75V13.5a.75.75 0 00-.75-.75H6.75a.75.75 0 00-.75.75v3.75c0 .415.336.75.75.75z" />
            </svg>
            <span className="font-headline-sm text-primary font-semibold">Breadline</span>
          </div>
          <button
            type="button"
            onClick={() => setLang(lang === 'es' ? 'en' : 'es')}
            className="inline-flex items-center gap-1.5 rounded-full bg-surface-container-high px-3 py-1.5 text-sm font-label-sm text-secondary transition-colors hover:bg-surface-container"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 21a9.004 9.004 0 008.716-6.747M12 21a9.004 9.004 0 01-8.716-6.747M12 21c2.485 0 4.5-4.03 4.5-9S14.485 3 12 3m0 18c-2.485 0-4.5-4.03-4.5-9S9.515 3 12 3m0 0a8.997 8.997 0 017.843 4.582M12 3a8.997 8.997 0 00-7.843 4.582m15.686 0A11.953 11.953 0 0112 10.5c-2.998 0-5.74-1.1-7.843-2.918m15.686 0A8.959 8.959 0 0121 12c0 .778-.099 1.533-.284 2.253m0 0A17.919 17.919 0 0112 16.5c-3.162 0-6.133-.815-8.716-2.247m0 0A9.015 9.015 0 013 12c0-1.605.42-3.113 1.157-4.418" />
            </svg>
            {lang === 'es' ? 'EN' : 'ES'}
          </button>
        </div>

        <div className="flex flex-col lg:flex-row gap-8">
          {/* Main Content */}
          <div className="flex-1 min-w-0">
            {/* Hero */}
            <section className="mb-10">
              <div className="flex items-center gap-3 mb-3">
                <h1 className="font-headline-sm text-3xl font-bold text-on-surface">
                  {content.heroTitle}
                </h1>
                <span className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-label-sm ${stateColor(escrow.state)}`}>
                  {content[stateLabelKey(escrow.state) as keyof typeof content]}
                </span>
              </div>
              <p className="font-body-lg text-secondary max-w-2xl">
                {content.heroDescription}
              </p>
            </section>

            {/* On-chain data card */}
            <section className="mb-10">
              <div className="bg-surface-container-low rounded-xl p-6 border border-surface-container">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <p className="font-label-sm text-secondary mb-1">{content.buyerLabel}</p>
                    <p className="font-code-md text-sm text-on-surface break-all">{escrow.buyer}</p>
                  </div>
                  <div>
                    <p className="font-label-sm text-secondary mb-1">{content.sellerLabel}</p>
                    <p className="font-code-md text-sm text-on-surface break-all">{escrow.seller}</p>
                  </div>
                  <div>
                    <p className="font-label-sm text-secondary mb-1">{content.amountLabel}</p>
                    <p className="font-headline-sm text-xl font-bold text-primary">{formatScAmount(escrow.amount)}</p>
                  </div>
                  <div>
                    <p className="font-label-sm text-secondary mb-1">{content.deadlineLabel}</p>
                    <p className="font-body-md text-on-surface">{formatDeadline(escrow.deadline)}</p>
                  </div>
                  {escrow.service_description && (
                    <div className="sm:col-span-2">
                      <p className="font-label-sm text-secondary mb-1">{content.descriptionLabel}</p>
                      <p className="font-body-md text-on-surface">{escrow.service_description}</p>
                    </div>
                  )}
                </div>
              </div>
            </section>

            {/* 3-Step Pipeline */}
            <section className="mb-10">
              <div className="flex flex-col sm:flex-row gap-4">
                {[
                  { step: 1, label: content.step1Label, desc: content.step1Desc },
                  { step: 2, label: content.step2Label, desc: content.step2Desc },
                  { step: 3, label: content.step3Label, desc: content.step3Desc },
                ].map(({ step, label, desc }, idx) => (
                  <React.Fragment key={step}>
                    <div className="flex-1 flex items-start gap-3 bg-surface-container-low rounded-xl p-4 border border-surface-container">
                      <div className="flex-shrink-0 w-10 h-10 rounded-full bg-primary-container text-on-primary-container flex items-center justify-center">
                        <StepperIcon step={step} />
                      </div>
                      <div>
                        <p className="font-label-md text-on-surface">{label}</p>
                        <p className="font-body-sm text-secondary mt-0.5">{desc}</p>
                      </div>
                    </div>
                    {idx < 2 && (
                      <div className="hidden sm:flex items-center justify-center flex-shrink-0">
                        <svg className="w-5 h-5 text-tertiary" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
                        </svg>
                      </div>
                    )}
                  </React.Fragment>
                ))}
              </div>
            </section>

            {/* Payment Tabs */}
            <section className="mb-10">
              <div className="flex gap-1 bg-surface-container rounded-full p-1 mb-6">
                {tabs.map((tab) => (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setActiveTab(tab.id)}
                    className={`flex-1 py-2 px-4 rounded-full font-label-sm transition-all ${
                      activeTab === tab.id
                        ? 'bg-primary text-on-primary shadow-sm'
                        : 'text-secondary hover:text-on-surface hover:bg-surface-container-low'
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>

              {/* Card Tab */}
              {activeTab === 'card' && (
                <div className="bg-surface-container-low rounded-xl p-6 border border-surface-container">
                  <div className="flex items-center gap-2 mb-6">
                    <svg className="w-5 h-5 text-secondary" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 8.25h19.5M2.25 9h19.5m-16.5 5.25h6m-6 2.25h3m-3.75 3h15a2.25 2.25 0 002.25-2.25V6.75A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25v10.5A2.25 2.25 0 004.5 19.5z" />
                    </svg>
                    <span className="font-label-md text-on-surface">{content.tabCard}</span>
                  </div>
                  <div className="space-y-4">
                    <div>
                      <label className="block font-label-sm text-secondary mb-1.5">{content.cardNumber}</label>
                      <div className="w-full rounded-lg border border-surface-container bg-surface-container-lowest px-4 py-3 font-code-md text-on-surface flex items-center justify-between">
                        <span>{content.cardPlaceholder}</span>
                        <svg className="w-5 h-5 text-tertiary" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
                        </svg>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block font-label-sm text-secondary mb-1.5">{content.cardExpiry}</label>
                        <div className="w-full rounded-lg border border-surface-container bg-surface-container-lowest px-4 py-3 font-code-md text-on-surface">
                          {content.expiryPlaceholder}
                        </div>
                      </div>
                      <div>
                        <label className="block font-label-sm text-secondary mb-1.5">{content.cardCVC}</label>
                        <div className="w-full rounded-lg border border-surface-container bg-surface-container-lowest px-4 py-3 font-code-md text-on-surface">
                          {content.cvcPlaceholder}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Crypto Tab */}
              {activeTab === 'crypto' && (
                <div className="bg-surface-container-low rounded-xl p-6 border border-surface-container">
                  <p className="font-label-md text-on-surface mb-6">{content.cryptoTitle}</p>
                  <div className="flex flex-col items-center gap-6">
                    <div className="bg-white rounded-xl p-4 shadow-sm">
                      <QRCodeSVG />
                    </div>
                    <div className="w-full space-y-3">
                      <div>
                        <p className="font-label-sm text-secondary mb-1">{content.depositAddress}</p>
                        <div className="flex items-center gap-2 bg-surface-container-lowest rounded-lg border border-surface-container px-4 py-3">
                          <span className="font-code-md text-sm text-on-surface break-all flex-1">
                            {truncateAddress(ESCROW_CONTRACT_ID, 8)}
                          </span>
                          <CopyButton text={ESCROW_CONTRACT_ID} label={content.copyAddress} />
                        </div>
                      </div>
                      <div className="flex items-center gap-3 text-xs text-tertiary">
                        <span className="font-label-sm">{content.stellarNetwork}</span>
                        <span className="inline-block w-2 h-2 rounded-full bg-tertiary"></span>
                        <span className="font-label-sm">{content.networkValue}</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Wallet Tab */}
              {activeTab === 'wallet' && (
                <div className="bg-surface-container-low rounded-xl p-6 border border-surface-container space-y-4">
                  {/* Freighter wallet */}
                  <div className="w-full flex items-center gap-4 rounded-xl bg-surface-container-lowest border border-surface-container px-5 py-4">
                    <div className="flex-shrink-0 w-10 h-10 rounded-full bg-secondary-container text-on-secondary-container flex items-center justify-center">
                      <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 6.375c0 2.278-3.694 4.125-8.25 4.125S3.75 8.653 3.75 6.375m16.5 0c0-2.278-3.694-4.125-8.25-4.125S3.75 4.097 3.75 6.375m16.5 0v11.25c0 2.278-3.694 4.125-8.25 4.125s-8.25-1.847-8.25-4.125V6.375m16.5 0v3.75m-16.5-3.75v3.75m16.5 0v3.75C20.25 16.153 16.556 18 12 18s-8.25-1.847-8.25-4.125v-3.75m16.5 0c0 2.278-3.694 4.125-8.25 4.125s-8.25-1.847-8.25-4.125" />
                      </svg>
                    </div>
                    <div className="text-left flex-1">
                      <p className="font-label-md text-on-surface">{content.walletFreighter}</p>
                      <p className="font-body-sm text-secondary">{content.walletFreighterDesc}</p>
                    </div>
                    {wallet.connected ? (
                      <div className="flex items-center gap-2">
                        <span className="font-code-md text-xs text-primary">{shortenAddress(wallet.address)}</span>
                        <button
                          type="button"
                          onClick={wallet.disconnect}
                          className="text-xs font-label-sm text-secondary hover:text-on-surface transition-colors"
                        >
                          {content.disconnectWallet}
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={wallet.connect}
                        disabled={wallet.loading}
                        className="rounded-lg bg-primary px-4 py-2 font-label-sm text-on-primary transition-colors hover:opacity-90 disabled:opacity-50"
                      >
                        {wallet.loading ? '...' : content.connectWallet}
                      </button>
                    )}
                  </div>

                  {/* Wallet status */}
                  {wallet.connected && (
                    <div className="flex items-center gap-2 rounded-lg bg-tertiary-container/30 px-4 py-2">
                      <svg className="w-4 h-4 text-tertiary" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <span className="font-label-sm text-on-tertiary-container">{content.walletConnected}</span>
                    </div>
                  )}

                  {wallet.error && (
                    <div className="flex items-center gap-2 rounded-lg bg-error/10 px-4 py-2">
                      <svg className="w-4 h-4 text-error" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126z" />
                      </svg>
                      <span className="font-label-sm text-error">{wallet.error}</span>
                    </div>
                  )}
                </div>
              )}
            </section>

            {/* CTA Button */}
            <section className="mb-10">
              <button
                type="button"
                onClick={handleFund}
                disabled={!canFund || fundStatus === 'loading'}
                className={`w-full py-4 rounded-xl font-label-lg transition-all ${
                  fundStatus === 'success'
                    ? 'bg-tertiary text-on-tertiary-container'
                    : isFunded
                    ? 'bg-surface-container-high text-secondary cursor-not-allowed'
                    : canFund
                    ? 'bg-primary text-on-primary hover:opacity-90'
                    : 'bg-surface-container-high text-secondary cursor-not-allowed'
                } ${fundStatus === 'loading' ? 'opacity-70 cursor-not-allowed' : ''}`}
              >
                {fundStatus === 'idle' && !wallet.connected && content.ctaConnectWallet}
                {fundStatus === 'idle' && wallet.connected && !isFunded && content.ctaLabel}
                {fundStatus === 'idle' && isFunded && content[stateLabelKey(escrow.state) as keyof typeof content]}
                {fundStatus === 'loading' && (
                  <span className="inline-flex items-center gap-2">
                    <svg className="w-5 h-5 animate-spin" viewBox="0 0 24 24" fill="none">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    {content.ctaLoading}
                  </span>
                )}
                {fundStatus === 'success' && (
                  <span className="inline-flex items-center gap-2">
                    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                    {content.ctaSuccess}
                  </span>
                )}
                {fundStatus === 'error' && (
                  <span className="inline-flex items-center gap-2">
                    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
                    </svg>
                    {content.fundError}
                  </span>
                )}
              </button>

              {/* Fund error detail */}
              {fundStatus === 'error' && fundError && (
                <div className="mt-3 flex items-center gap-2 rounded-lg bg-error/10 px-4 py-2">
                  <span className="font-body-sm text-error">{fundError}</span>
                  <button
                    type="button"
                    onClick={() => { setFundStatus('idle'); setFundError(null); }}
                    className="ml-auto font-label-sm text-primary hover:opacity-80"
                  >
                    {content.fundRetry}
                  </button>
                </div>
              )}
            </section>

            {/* Trust / Security Section */}
            <section className="mb-10">
              <div className="bg-surface-container-low rounded-xl p-6 border border-surface-container">
                <div className="flex items-center gap-2 mb-4">
                  <svg className="w-5 h-5 text-tertiary" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
                  </svg>
                  <h2 className="font-headline-sm text-xl font-semibold text-on-surface">{content.trustTitle}</h2>
                </div>
                <ul className="space-y-3">
                  {trustPoints.map((point, idx) => (
                    <li key={idx} className="flex items-start gap-3">
                      <svg className="w-5 h-5 text-tertiary flex-shrink-0 mt-0.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                      </svg>
                      <span className="font-body-sm text-secondary">{point}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </section>
          </div>

          {/* Right Sidebar */}
          <aside className="w-full lg:w-80 flex-shrink-0 space-y-6">
            {/* Seller Profile */}
            <div className="bg-surface-container-low rounded-xl p-5 border border-surface-container">
              <p className="font-label-sm text-secondary mb-3">{content.sidebarSeller}</p>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-primary-container text-on-primary-container flex items-center justify-center font-label-md">
                  {escrow.seller ? escrow.seller.slice(0, 2).toUpperCase() : '??'}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-code-md text-sm text-on-surface break-all">{shortenAddress(escrow.seller)}</p>
                </div>
              </div>
              <div className="mt-3">
                <p className="font-label-sm text-secondary mb-1">{content.sidebarSellerAddress}</p>
                <p className="font-code-md text-xs text-on-surface break-all">{escrow.seller}</p>
              </div>
            </div>

            {/* Order Details */}
            <div className="bg-surface-container-low rounded-xl p-5 border border-surface-container">
              <p className="font-label-sm text-secondary mb-3">{content.sidebarOrder}</p>
              <p className="font-body-md text-on-surface">
                {escrow.service_description || content.sidebarService}
              </p>
              <div className="flex items-center gap-2 mt-3 text-xs text-tertiary">
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" />
                </svg>
                <span className="font-label-sm">{content.sidebarDeadline}</span>
                <span className="font-label-sm text-on-surface">{formatDeadline(escrow.deadline)}</span>
              </div>
            </div>

            {/* Financial Breakdown */}
            <div className="bg-surface-container-low rounded-xl p-5 border border-surface-container">
              <p className="font-label-sm text-secondary mb-3">{content.sidebarBreakdown}</p>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="font-body-sm text-secondary">{content.amountLabel}</span>
                  <span className="font-body-sm text-on-surface font-medium">{formatScAmount(escrow.amount)}</span>
                </div>
                <div className="border-t border-surface-container my-2 pt-2">
                  <p className="font-label-sm text-secondary">{content.sidebarTotal}</p>
                  <p className="font-headline-sm text-xl font-bold text-primary mt-1">{formatScAmount(escrow.amount)}</p>
                </div>
              </div>
            </div>

            {/* Security Badges */}
            <div className="bg-surface-container-low rounded-xl p-5 border border-surface-container">
              <p className="font-label-sm text-secondary mb-3">{content.sidebarSecurity}</p>
              <div className="space-y-2.5">
                {securityBadges.map((badge, idx) => (
                  <div key={idx} className="flex items-center gap-2">
                    <svg className="w-4 h-4 text-tertiary flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12c0 1.268-.63 2.39-1.593 3.068a3.745 3.745 0 01-1.043 3.296 3.745 3.745 0 01-3.296 1.043A3.745 3.745 0 0112 21c-1.268 0-2.39-.63-3.068-1.593a3.746 3.746 0 01-3.296-1.043 3.745 3.745 0 01-1.043-3.296A3.745 3.745 0 013 12c0-1.268.63-2.39 1.593-3.068a3.745 3.745 0 011.043-3.296 3.746 3.746 0 013.296-1.043A3.746 3.746 0 0112 3c1.268 0 2.39.63 3.068 1.593a3.746 3.746 0 013.296 1.043 3.746 3.746 0 011.043 3.296A3.745 3.745 0 0121 12z" />
                    </svg>
                    <span className="font-body-sm text-secondary">{badge}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Powered By */}
            <p className="text-center text-xs text-tertiary font-label-sm">{content.poweredBy}</p>
          </aside>
        </div>
      </div>
    </div>
  );
}
