import { useState } from 'react';

// ---------------------------------------------------------------------------
// Mock data
// ---------------------------------------------------------------------------

const DISPUTE_ID = '#DISP-8492-BREAD';
const ESCROW_AMOUNT = 2500;

const BUYER = {
  entity: 'Apex Digital LLC',
  contact: 'Marcus Sterling',
  claim: 'Reembolso del 40% (1,000 USDC) por incumplimiento parcial del alcance contractual.',
  wallet: 'GAX7...9K3M',
  evidence: [
    { id: 'EVD-A1', label: 'Contrato original firmado', sha: 'a3f8c1...d7e2' },
    { id: 'EVD-A2', label: 'Correspondencia de reclamo', sha: '7b2d4e...1fa9' },
    { id: 'EVD-A3', label: 'Registro de entregables incompletos', sha: 'c0e5a8...63bd' },
  ],
};

const SELLER = {
  entity: 'Camila Valenzuela',
  alias: 'Estudio Alfa Design',
  defense: 'Liberacion total de los 2,500 USDC conforme al alcance entregado y aprobado.',
  wallet: 'GBX4...2LQP',
  evidence: [
    { id: 'EVD-B1', label: 'Evidencia de entrega completa', sha: 'f19ab3...4c87' },
    { id: 'EVD-B2', label: 'Aprobaciones del cliente por chat', sha: '2e7cf0...b5d1' },
    { id: 'EVD-B3', label: 'Log de commits del repositorio', sha: '8d4a6c...e2f0' },
  ],
};

const AWARD = {
  sellerShare: 1800,
  buyerShare: 700,
  sellerPct: 72,
  buyerPct: 28,
  txHash: '7A3E91F2B8A3E7D6C0E5F19AB3C84A6C2E7CF0B5D18D4A6CE2F063BD4C875D1F',
};

const JURORS = [
  {
    name: 'Dra. Elena Morales',
    role: 'Arbitro Legal Principal',
    status: 'Voto emitido' as const,
    votedFor: 'seller',
  },
  {
    name: 'Jurado Tecnico DAO',
    role: 'Validacion Tecnica On-Chain',
    status: 'Co-validado' as const,
    votedFor: 'seller',
  },
  {
    name: 'Breadline Neutral Custodian',
    role: 'Custodio del Quorum Multifirma',
    status: 'Quorum satisfecho' as const,
    votedFor: 'seller',
  },
];

const LEDGER_EVENTS = [
  {
    ts: '2026-09-14T09:00:12Z',
    event: 'Solicitud de arbitraje iniciada',
    actor: 'Apex Digital LLC',
    tx: '3F1A8B...D7E2',
  },
  {
    ts: '2026-09-16T14:32:45Z',
    event: 'Alegatos y evidencia presentados',
    actor: 'Ambas partes',
    tx: '9C4E2A...B5F0',
  },
  {
    ts: '2026-09-18T11:15:03Z',
    event: 'Laudo arbitral emitido (72/28)',
    actor: 'Panel de Jurados Soroban',
    tx: '5D7F3C...A8E1',
  },
  {
    ts: '2026-09-18T11:17:29Z',
    event: 'Liquidacion on-chain ejecutada',
    actor: 'Breadline Neutral Custodian',
    tx: '7A3E91...5D1F',
  },
];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatTx(hash: string) {
  return hash;
}

function formatDate(iso: string) {
  const d = new Date(iso);
  return d.toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' });
}

function formatTime(iso: string) {
  const d = new Date(iso);
  return d.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' });
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function ProgressTracker() {
  const steps = [
    { label: 'Solicitud Iniciada', sub: '14 Sep 2026', done: true },
    { label: 'Alegatos y Peritaje', sub: '16 Sep 2026', done: true },
    { label: 'Liquidacion On-Chain', sub: '18 Sep 2026', done: true },
  ];

  return (
    <div className="w-full flex flex-col gap-3">
      <div className="flex items-center w-full">
        {steps.map((step, i) => (
          <div key={step.label} className="flex items-center flex-1">
            <div className="flex flex-col items-center gap-1.5 flex-1">
              <div className="w-9 h-9 rounded-full bg-tertiary flex items-center justify-center shadow-sm">
                {step.done ? (
                  <svg className="w-5 h-5 text-on-tertiary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                  </svg>
                ) : (
                  <span className="text-on-tertiary text-sm font-bold">{i + 1}</span>
                )}
              </div>
              <span className="text-xs text-on-surface font-semibold text-center leading-tight">{step.label}</span>
              <span className="font-code-md text-[10px] text-secondary">{step.sub}</span>
            </div>
            {i < steps.length - 1 && (
              <div className="w-full h-0.5 bg-tertiary mx-1 mt-[-28px] rounded-full"></div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function EvidenceList({ items }: { items: typeof BUYER.evidence }) {
  return (
    <ul className="flex flex-col gap-2">
      {items.map((ev) => (
        <li key={ev.id} className="flex items-start gap-2.5 p-2.5 rounded-lg bg-surface-container-low/60">
          <svg className="w-4 h-4 text-primary shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          <div className="flex flex-col gap-0.5 min-w-0">
            <span className="text-xs text-on-surface font-medium">{ev.label}</span>
            <span className="font-code-md text-[10px] text-secondary truncate">SHA-256: {ev.sha}</span>
          </div>
          <span className="font-code-md text-[10px] text-outline ml-auto shrink-0">{ev.id}</span>
        </li>
      ))}
    </ul>
  );
}

function JurorCard({ juror }: { juror: (typeof JURORS)[number] }) {
  const statusColors: Record<string, string> = {
    'Voto emitido': 'bg-tertiary text-on-tertiary',
    'Co-validado': 'bg-primary-container text-on-primary',
    'Quorum satisfecho': 'bg-surface-container-high text-primary',
  };

  return (
    <div className="flex items-center gap-3 p-3.5 rounded-xl bg-surface-container-low/60">
      <div className="w-10 h-10 rounded-full bg-surface-container-high flex items-center justify-center shrink-0">
        <svg className="w-5 h-5 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 6l3 1m0 0l-3 9a5.002 5.002 0 006.001 0M6 7l3 9M6 7l6-2m6 2l3-1m-3 1l-3 9a5.002 5.002 0 006.001 0M18 7l3 9m-3-9l-6-2m0-2v2m0 16V5m0 16H9m3 0h3" />
        </svg>
      </div>
      <div className="flex flex-col min-w-0">
        <span className="text-sm text-on-surface font-semibold truncate">{juror.name}</span>
        <span className="text-[11px] text-secondary">{juror.role}</span>
      </div>
      <span className={`ml-auto px-2.5 py-1 rounded-full text-[10px] font-bold shrink-0 ${statusColors[juror.status]}`}>
        {juror.status}
      </span>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main page
// ---------------------------------------------------------------------------

export default function DisputasArbitraje() {
  const [expandedLog, setExpandedLog] = useState(true);

  return (
    <div className="flex flex-col w-full pb-16 space-y-8">
      {/* ------------------------------------------------------------------ */}
      {/* Resolved Banner                                                    */}
      {/* ------------------------------------------------------------------ */}
      <section className="relative overflow-hidden rounded-xl bg-tertiary-container/10 border border-tertiary/20 p-8 shadow-sm">
        <div className="absolute -right-20 -top-20 w-80 h-80 rounded-full bg-tertiary/10 blur-3xl pointer-events-none"></div>
        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="flex flex-col gap-2 max-w-2xl">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-tertiary text-on-tertiary text-xs font-semibold">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
                Arbitraje Resuelto &amp; Ejecutado
              </span>
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-surface-container-low text-secondary font-code-md text-xs">
                {DISPUTE_ID}
              </span>
            </div>
            <h1 className="text-3xl md:text-4xl text-on-surface tracking-tight font-bold">
              Laudo Definitivo
            </h1>
            <p className="text-sm text-secondary">
              Disputa resuelta por panel de jurados Soroban. Liquidacion ejecutada on-chain el 18 de septiembre de 2026. Saldo del vault: 0.00 USDC.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3 shrink-0">
            <span className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-tertiary/10 text-tertiary text-xs font-bold">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              Ejecutado On-Chain
            </span>
            <span className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-surface-container text-on-surface text-xs font-semibold">
              <svg className="w-4 h-4 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Cerrado hace 2 dias
            </span>
          </div>
        </div>
      </section>

      {/* ------------------------------------------------------------------ */}
      {/* Progress Tracker                                                    */}
      {/* ------------------------------------------------------------------ */}
      <section className="rounded-xl bg-surface-container-lowest p-6 shadow-sm">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg text-on-surface font-semibold">Proceso de Arbitraje</h2>
          <span className="font-code-md text-[11px] px-2.5 py-1 rounded-full bg-tertiary text-on-tertiary font-bold">
            3/3 Pasos Completados
          </span>
        </div>
        <ProgressTracker />
      </section>

      {/* ------------------------------------------------------------------ */}
      {/* Two-column: Buyer vs Seller positions                               */}
      {/* ------------------------------------------------------------------ */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
        {/* Buyer */}
        <section className="rounded-xl bg-surface-container-lowest p-6 shadow-sm flex flex-col gap-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-9 h-9 rounded-full bg-primary-container flex items-center justify-center shrink-0">
                <svg className="w-5 h-5 text-on-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 100 4 2 2 0 000-4z" />
                </svg>
              </div>
              <div className="flex flex-col">
                <span className="text-sm text-on-surface font-semibold">Posicion del Comprador</span>
                <span className="text-[11px] text-secondary">Reclamante</span>
              </div>
            </div>
            <span className="px-2 py-0.5 rounded-full bg-error-container text-on-error-container text-[10px] font-bold">
              Rechazado
            </span>
          </div>

          <div className="p-3.5 rounded-xl bg-surface-container-low/60 flex flex-col gap-1">
            <span className="text-xs text-on-surface font-bold">{BUYER.entity}</span>
            <span className="text-xs text-secondary">{BUYER.contact} - {BUYER.wallet}</span>
          </div>

          <div className="p-3.5 rounded-xl bg-surface-container-low/60">
            <span className="text-[11px] text-secondary uppercase font-semibold tracking-wider block mb-1.5">Reclamacion</span>
            <p className="text-sm text-on-surface leading-relaxed">{BUYER.claim}</p>
            <div className="mt-3 flex items-center gap-2">
              <span className="text-2xl text-on-surface font-bold font-code-md">1,000</span>
              <span className="text-xs text-secondary font-semibold">USDC (40%)</span>
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <span className="text-xs text-secondary uppercase font-semibold tracking-wider">Evidencia Presentada</span>
            <EvidenceList items={BUYER.evidence} />
          </div>
        </section>

        {/* Seller */}
        <section className="rounded-xl bg-surface-container-lowest p-6 shadow-sm flex flex-col gap-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-9 h-9 rounded-full bg-tertiary-container flex items-center justify-center shrink-0">
                <svg className="w-5 h-5 text-on-tertiary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
              </div>
              <div className="flex flex-col">
                <span className="text-sm text-on-surface font-semibold">Posicion del Vendedor</span>
                <span className="text-[11px] text-secondary">Demandado</span>
              </div>
            </div>
            <span className="px-2 py-0.5 rounded-full bg-tertiary text-on-tertiary text-[10px] font-bold">
              Acreditado
            </span>
          </div>

          <div className="p-3.5 rounded-xl bg-surface-container-low/60 flex flex-col gap-1">
            <span className="text-xs text-on-surface font-bold">{SELLER.entity}</span>
            <span className="text-xs text-secondary">{SELLER.alias} - {SELLER.wallet}</span>
          </div>

          <div className="p-3.5 rounded-xl bg-surface-container-low/60">
            <span className="text-[11px] text-secondary uppercase font-semibold tracking-wider block mb-1.5">Defensa</span>
            <p className="text-sm text-on-surface leading-relaxed">{SELLER.defense}</p>
            <div className="mt-3 flex items-center gap-2">
              <span className="text-2xl text-tertiary font-bold font-code-md">2,500</span>
              <span className="text-xs text-secondary font-semibold">USDC (100%)</span>
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <span className="text-xs text-secondary uppercase font-semibold tracking-wider">Evidencia Presentada</span>
            <EvidenceList items={SELLER.evidence} />
          </div>
        </section>
      </div>

      {/* ------------------------------------------------------------------ */}
      {/* Arbitral Award                                                      */}
      {/* ------------------------------------------------------------------ */}
      <section className="rounded-xl bg-surface-container-lowest p-6 shadow-sm flex flex-col gap-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-full bg-tertiary flex items-center justify-center shrink-0">
              <svg className="w-5 h-5 text-on-tertiary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 6l3 1m0 0l-3 9a5.002 5.002 0 006.001 0M6 7l3 9M6 7l6-2m6 2l3-1m-3 1l-3 9a5.002 5.002 0 006.001 0M18 7l3 9m-3-9l-6-2m0-2v2m0 16V5m0 16H9m3 0h3" />
              </svg>
            </div>
            <h2 className="text-lg text-on-surface font-semibold">Laudo Arbitral - Distribucion Final</h2>
          </div>
          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-tertiary text-on-tertiary text-xs font-bold">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
            </svg>
            Ejecutado On-Chain
          </span>
        </div>

        {/* Split visualization */}
        <div className="flex flex-col gap-4">
          <div className="w-full h-4 rounded-full bg-surface-container-low overflow-hidden flex">
            <div
              className="h-full bg-tertiary rounded-l-full"
              style={{ width: `${AWARD.sellerPct}%` }}
            ></div>
            <div
              className="h-full bg-primary-container rounded-r-full"
              style={{ width: `${AWARD.buyerPct}%` }}
            ></div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="p-4 rounded-xl bg-tertiary/10 border border-tertiary/20 flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <span className="text-xs text-secondary font-semibold">{SELLER.entity}</span>
                <span className="text-xs text-tertiary font-bold">{AWARD.sellerPct}%</span>
              </div>
              <div className="flex items-baseline gap-1.5">
                <span className="text-3xl text-tertiary font-extrabold font-code-md">{AWARD.sellerShare.toLocaleString()}</span>
                <span className="text-sm text-secondary font-semibold">USDC</span>
              </div>
              <div className="flex items-center gap-1.5 text-[11px] text-tertiary font-medium">
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                Transferido a GBX4...2LQP
              </div>
            </div>
            <div className="p-4 rounded-xl bg-primary-container/10 border border-primary-container/20 flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <span className="text-xs text-secondary font-semibold">{BUYER.entity}</span>
                <span className="text-xs text-primary font-bold">{AWARD.buyerPct}%</span>
              </div>
              <div className="flex items-baseline gap-1.5">
                <span className="text-3xl text-primary font-extrabold font-code-md">{AWARD.buyerShare.toLocaleString()}</span>
                <span className="text-sm text-secondary font-semibold">USDC</span>
              </div>
              <div className="flex items-center gap-1.5 text-[11px] text-primary font-medium">
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                Transferido a GAX7...9K3M
              </div>
            </div>
          </div>
        </div>

        <div className="p-3 rounded-lg bg-surface-container-low flex items-center gap-3">
          <svg className="w-4 h-4 text-secondary shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
          </svg>
          <span className="font-code-md text-[11px] text-secondary">
            TX Hash de Liquidacion: {AWARD.txHash}
          </span>
        </div>
      </section>

      {/* ------------------------------------------------------------------ */}
      {/* Soroban Jurors Panel                                                */}
      {/* ------------------------------------------------------------------ */}
      <section className="rounded-xl bg-surface-container-lowest p-6 shadow-sm flex flex-col gap-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-full bg-primary flex items-center justify-center shrink-0">
              <svg className="w-5 h-5 text-on-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </div>
            <h2 className="text-lg text-on-surface font-semibold">Panel de Jurados Soroban</h2>
          </div>
          <span className="font-code-md text-[11px] px-2.5 py-1 rounded-full bg-surface-container-high text-primary font-semibold">
            Quorum: 3/3
          </span>
        </div>

        <div className="flex flex-col gap-3">
          {JURORS.map((j) => (
            <JurorCard key={j.name} juror={j} />
          ))}
        </div>

        <div className="p-3 rounded-lg bg-tertiary/5 border border-tertiary/10 flex items-start gap-3">
          <svg className="w-4 h-4 text-tertiary shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
          </svg>
          <p className="text-xs text-on-surface leading-relaxed">
            El quorum multifirma (2-de-3) fue satisfecho on-chain. El contrato inteligente de Soroban ejecuto la liquidacion automaticamente tras la validacion del panel. Ninguna de las partes puede revertir la transferencia.
          </p>
        </div>
      </section>

      {/* ------------------------------------------------------------------ */}
      {/* Vault Liquidation Summary                                           */}
      {/* ------------------------------------------------------------------ */}
      <section className="rounded-xl bg-surface-container-lowest p-6 shadow-sm flex flex-col gap-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-full bg-surface-container-high flex items-center justify-center shrink-0">
              <svg className="w-5 h-5 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
            </div>
            <h2 className="text-lg text-on-surface font-semibold">Resumen de Liquidacion del Vault</h2>
          </div>
          <span className="font-code-md text-[11px] px-2.5 py-1 rounded-full bg-surface-container-high text-secondary font-semibold">
            Vault Cerrado
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="p-4 rounded-xl bg-surface-container-low flex flex-col gap-1">
            <span className="text-xs text-secondary uppercase tracking-wider font-semibold">Deposito Inicial</span>
            <span className="text-2xl text-on-surface font-bold font-code-md">{ESCROW_AMOUNT.toLocaleString()} USDC</span>
          </div>
          <div className="p-4 rounded-xl bg-surface-container-low flex flex-col gap-1">
            <span className="text-xs text-secondary uppercase tracking-wider font-semibold">Total Liquidado</span>
            <span className="text-2xl text-on-surface font-bold font-code-md">{ESCROW_AMOUNT.toLocaleString()} USDC</span>
          </div>
          <div className="p-4 rounded-xl bg-tertiary/10 border border-tertiary/20 flex flex-col gap-1">
            <span className="text-xs text-secondary uppercase tracking-wider font-semibold">Saldo Restante</span>
            <span className="text-2xl text-tertiary font-extrabold font-code-md">0.00 USDC</span>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-surface-container-low/60 rounded-lg text-secondary uppercase tracking-wider">
                <th className="py-3 px-4 rounded-l-lg">Destinatario</th>
                <th className="py-3 px-4">Monto</th>
                <th className="py-3 px-4">Direccion Stellar</th>
                <th className="py-3 px-4">Estado</th>
                <th className="py-3 px-4 text-right rounded-r-lg">TX Hash</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-container-low">
              <tr className="hover:bg-surface-container-low/40 transition-colors">
                <td className="py-3.5 px-4">
                  <div className="flex flex-col">
                    <span className="font-semibold text-on-surface">{SELLER.entity}</span>
                    <span className="text-secondary text-[11px]">{SELLER.alias}</span>
                  </div>
                </td>
                <td className="py-3.5 px-4 font-code-md font-bold text-on-surface">1,800 USDC</td>
                <td className="py-3.5 px-4 font-code-md text-secondary">{SELLER.wallet}</td>
                <td className="py-3.5 px-4">
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-tertiary text-on-tertiary text-[10px] font-bold">
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                    </svg>
                    Completado
                  </span>
                </td>
                <td className="py-3.5 px-4 text-right font-code-md text-secondary text-[11px]">9C4E2A...B5F0</td>
              </tr>
              <tr className="hover:bg-surface-container-low/40 transition-colors">
                <td className="py-3.5 px-4">
                  <div className="flex flex-col">
                    <span className="font-semibold text-on-surface">{BUYER.entity}</span>
                    <span className="text-secondary text-[11px]">{BUYER.contact}</span>
                  </div>
                </td>
                <td className="py-3.5 px-4 font-code-md font-bold text-on-surface">700 USDC</td>
                <td className="py-3.5 px-4 font-code-md text-secondary">{BUYER.wallet}</td>
                <td className="py-3.5 px-4">
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-tertiary text-on-tertiary text-[10px] font-bold">
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                    </svg>
                    Completado
                  </span>
                </td>
                <td className="py-3.5 px-4 text-right font-code-md text-secondary text-[11px]">5D7F3C...A8E1</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      {/* ------------------------------------------------------------------ */}
      {/* Audit Ledger Log                                                    */}
      {/* ------------------------------------------------------------------ */}
      <section className="rounded-xl bg-surface-container-lowest p-6 shadow-sm flex flex-col gap-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-full bg-surface-container-high flex items-center justify-center shrink-0">
              <svg className="w-5 h-5 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
              </svg>
            </div>
            <h2 className="text-lg text-on-surface font-semibold">Registro de Auditoria</h2>
          </div>
          <button
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-surface-container text-primary text-xs font-semibold hover:bg-surface-container-high transition-colors"
            onClick={() => setExpandedLog(!expandedLog)}
          >
            <svg className={`w-4 h-4 transition-transform ${expandedLog ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
            {expandedLog ? 'Colapsar' : 'Expandir'}
          </button>
        </div>

        {expandedLog && (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-surface-container-low/60 rounded-lg text-secondary uppercase tracking-wider">
                  <th className="py-3 px-4 rounded-l-lg">Fecha &amp; Hora</th>
                  <th className="py-3 px-4">Evento</th>
                  <th className="py-3 px-4">Actor</th>
                  <th className="py-3 px-4 text-right rounded-r-lg">TX Hash</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-container-low">
                {LEDGER_EVENTS.map((ev, i) => (
                  <tr key={i} className="hover:bg-surface-container-low/40 transition-colors">
                    <td className="py-3.5 px-4">
                      <div className="flex flex-col">
                        <span className="font-code-md text-on-surface font-medium">{formatDate(ev.ts)}</span>
                        <span className="font-code-md text-[10px] text-secondary">{formatTime(ev.ts)}</span>
                      </div>
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-2">
                        <span className={`w-2 h-2 rounded-full shrink-0 ${i === LEDGER_EVENTS.length - 1 ? 'bg-tertiary' : 'bg-primary'}`}></span>
                        <span className="text-on-surface font-medium">{ev.event}</span>
                      </div>
                    </td>
                    <td className="py-3.5 px-4 text-secondary">{ev.actor}</td>
                    <td className="py-3.5 px-4 text-right font-code-md text-secondary">
                      <div className="flex items-center justify-end gap-1.5">
                        <svg className="w-3.5 h-3.5 text-outline" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                        </svg>
                        {formatTx(ev.tx)}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
