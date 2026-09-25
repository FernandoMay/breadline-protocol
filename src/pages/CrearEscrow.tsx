import { useState } from 'react';
import * as StellarSdk from '@stellar/stellar-sdk';
import { COUNTRIES, calculateFee, calculateNet, formatUSDC, ESCROW_CONTRACT_ID } from '../lib/stellar';
import { createEscrowOnChain, USDC_TOKEN_ADDRESS } from '../lib/contract';
import { useStellarWallet } from '../hooks/useStellarWallet';
import Toast from '../components/Toast';

// ---------------------------------------------------------------------------
// Seller (counterparty) validation
// ---------------------------------------------------------------------------

/** Byte-wise account comparison, so formatting differences cannot hide a match. */
function isSameStellarAccount(a: string, b: string): boolean {
  if (a === b) return true;
  if (!b || !StellarSdk.StrKey.isValidEd25519PublicKey(b)) return false;
  const da = StellarSdk.StrKey.decodeEd25519PublicKey(a);
  const db = StellarSdk.StrKey.decodeEd25519PublicKey(b);
  if (da.length !== db.length) return false;
  for (let i = 0; i < da.length; i += 1) {
    if (da[i] !== db[i]) return false;
  }
  return true;
}

const SELLER_REQUIRED = 'Ingresa la direccion Stellar de la contraparte (empieza por G).';
const SELLER_INVALID = 'Direccion invalida: la clave publica de Stellar empieza por G y tiene 56 caracteres.';
const SELLER_SAME_AS_BUYER = 'La contraparte no puede ser tu propia wallet. Ingresa otra direccion.';

type SellerValidation = { error: string; address: string | null };

/**
 * The seller is a counterparty, never the connected wallet. The contract rejects
 * buyer == seller on-chain, so this is the client-side half of the same rule.
 */
function validateSeller(raw: string, buyerAddress: string): SellerValidation {
  const seller = raw.trim();
  if (!seller) return { error: SELLER_REQUIRED, address: null };
  if (!StellarSdk.StrKey.isValidEd25519PublicKey(seller)) {
    return { error: SELLER_INVALID, address: null };
  }
  if (isSameStellarAccount(seller, buyerAddress)) {
    return { error: SELLER_SAME_AS_BUYER, address: null };
  }
  return { error: '', address: seller };
}

export default function CrearEscrow() {
  const [form, setForm] = useState({
    clientName: '',
    clientEmail: '',
    clientCountry: '🇺🇸 Estados Unidos (US)',
    serviceTitle: '',
    acceptanceCriteria: '',
    briefUrl: '',
    amount: '',
    // Deliberately empty: pre-filling the connected wallet here is what made the
    // escrow a buyer-to-itself transfer.
    sellerAddress: '',
    deliveryDays: '15',
    reviewDays: '3',
    paymentMode: 'single' as 'single' | 'milestones',
  });

  const [copied, setCopied] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [generated, setGenerated] = useState(false);
  const [txHash, setTxHash] = useState<string | null>(null);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);

  const wallet = useStellarWallet();

  const amount = parseFloat(form.amount) || 0;
  const fee = calculateFee(amount);
  const net = calculateNet(amount);
  // Only surfaced as an inline error once the field has content, so an untouched
  // form is not shouting at the user before they have typed anything.
  const sellerCheck = validateSeller(form.sellerAddress, wallet.address);
  const sellerError = form.sellerAddress.trim() ? sellerCheck.error : '';
  const shareLinkSeller = sellerCheck.address ?? '';

  const handleCopy = () => {
    const link = wallet.connected
      ? `https://breadline.fi/escrow/${ESCROW_CONTRACT_ID}?seller=${shareLinkSeller || 'PENDIENTE'}`
      : `https://breadline.fi/escrow/${ESCROW_CONTRACT_ID}`;
    navigator.clipboard.writeText(link);
    setCopied(true);
    setTimeout(() => setCopied(false), 2800);
  };

  const handleGenerate = async () => {
    if (!wallet.connected) {
      setToast({ message: 'Connect your Freighter wallet first to create an escrow', type: 'error' });
      return;
    }

    if (!form.clientName || !form.serviceTitle || !form.amount) {
      setToast({ message: 'Fill in all required fields before generating', type: 'error' });
      return;
    }

    const seller = validateSeller(form.sellerAddress, wallet.address);
    if (!seller.address) {
      setToast({ message: seller.error, type: 'error' });
      return;
    }

    setGenerating(true);

    try {
      const result = await createEscrowOnChain(
        wallet.address,
        seller.address,
        parseFloat(form.amount),
        Math.floor(Date.now() / 1000) + parseInt(form.deliveryDays) * 86400,
        form.serviceTitle,
        wallet.signTransaction,
        USDC_TOKEN_ADDRESS,
      );

      if (result.success && result.hash) {
        setTxHash(result.hash);
        setGenerated(true);
        setToast({ message: `Escrow created on-chain! Tx: ${result.hash.slice(0, 12)}...`, type: 'success' });
      } else {
        setToast({ message: result.error || 'Transaction failed. Please try again.', type: 'error' });
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Unexpected error';
      setToast({ message: `Failed to create escrow: ${msg}`, type: 'error' });
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div className="flex flex-col w-full pb-16">
      {/* Top Header */}
      <div className="w-full flex flex-col md:flex-row md:items-center justify-between gap-4 py-6 mb-4">
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full bg-surface-container-high text-primary text-xs uppercase tracking-wider font-semibold">Generador de Pagos Seguros</span>
            <span className="text-secondary">&bull;</span>
            <span className="font-code-md text-xs text-secondary">Stellar Soroban Micro-Contract</span>
          </div>
          <h1 className="text-3xl text-on-surface tracking-tight font-bold">Nueva Orden de Custodia Comercial</h1>
          <p className="text-sm text-on-surface-variant max-w-2xl">
            Crea un enlace blindado con garantía digital en USDC. Tu cliente internacional fondea el contrato de antemano; tú trabajas con la tranquilidad absoluta de cobro sin comisiones abusivas.
          </p>
        </div>
        <div className="flex items-center gap-3 shrink-0 self-start md:self-auto bg-surface-container-lowest p-2 rounded-xl shadow-sm">
          <div className="px-3 py-1.5 rounded-lg bg-surface-container-low flex flex-col">
            <span className="text-xs text-secondary uppercase">Tiempo de creación</span>
            <span className="text-lg text-on-surface font-bold">&lt; 60 seg</span>
          </div>
          <div className="px-3 py-1.5 rounded-lg bg-surface-container-low flex flex-col">
            <span className="text-xs text-secondary uppercase">Costo de Bloqueo</span>
            <span className="text-lg text-tertiary font-bold">$0.0001</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-start">
        {/* Left Column: Form */}
        <div className="lg:col-span-7 flex flex-col gap-6">
          {/* Step 1: Client Info */}
          <section className="bg-surface-container-lowest p-6 rounded-xl shadow-sm flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-7 h-7 rounded-full bg-primary-container text-on-primary flex items-center justify-center text-xs font-bold">1</span>
                <h2 className="text-lg text-on-surface font-semibold">Información del Cliente Exterior</h2>
              </div>
              <span className="text-xs text-secondary font-medium uppercase">Receptor del Link</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
              <div className="flex flex-col gap-1.5 sm:col-span-2">
                <label className="text-xs text-on-surface font-semibold flex items-center justify-between">
                  <span>Direccion Stellar de la contraparte</span>
                  <span className="text-secondary font-normal text-[11px]">Receptor del deposito (vendedor)</span>
                </label>
                <input
                  className={`w-full px-4 py-2.5 rounded-lg text-on-surface text-sm font-code-md focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all placeholder:text-outline ${sellerError ? 'bg-error/5 ring-1 ring-error' : 'bg-surface-container-low focus:bg-surface-container-lowest'}`}
                  placeholder="G... (public key de tu cliente)"
                  value={form.sellerAddress}
                  onChange={(e) => setForm({ ...form, sellerAddress: e.target.value })}
                />
                {sellerError ? (
                  <span className="text-xs text-error">{sellerError}</span>
                ) : (
                  <span className="text-xs text-secondary">
                    Quien recibe los fondos al liberarlos. No puede ser tu propia wallet.
                  </span>
                )}
              </div>
              <div className="flex flex-col gap-1.5 sm:col-span-2">
                <label className="text-xs text-on-surface font-semibold flex items-center justify-between">
                  <span>Nombre comercial o Empresa cliente</span>
                  <span className="text-secondary font-normal text-[11px]">Visible en el contrato</span>
                </label>
                <input
                  className="w-full pl-10 pr-4 py-2.5 rounded-lg bg-surface-container-low text-on-surface text-sm focus:bg-surface-container-lowest focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all placeholder:text-outline"
                  placeholder="Ej. Acme Corp, Apex Studios..."
                  value={form.clientName}
                  onChange={(e) => setForm({ ...form, clientName: e.target.value })}
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-xs text-on-surface font-semibold">Correo de notificación</label>
                <input
                  className="w-full px-4 py-2.5 rounded-lg bg-surface-container-low text-on-surface text-sm focus:bg-surface-container-lowest focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all placeholder:text-outline"
                  placeholder="cliente@compania.com"
                  type="email"
                  value={form.clientEmail}
                  onChange={(e) => setForm({ ...form, clientEmail: e.target.value })}
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-xs text-on-surface font-semibold">País de radicación</label>
                <select
                  className="w-full px-4 py-2.5 rounded-lg bg-surface-container-low text-on-surface text-sm focus:bg-surface-container-lowest focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all appearance-none cursor-pointer"
                  value={form.clientCountry}
                  onChange={(e) => setForm({ ...form, clientCountry: e.target.value })}
                >
                  {COUNTRIES.map((c) => (
                    <option key={c.code} value={`${c.flag} ${c.name} (${c.code})`}>{c.flag} {c.name} ({c.code})</option>
                  ))}
                </select>
              </div>
            </div>
          </section>

          {/* Step 2: Scope */}
          <section className="bg-surface-container-lowest p-6 rounded-xl shadow-sm flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-7 h-7 rounded-full bg-primary-container text-on-primary flex items-center justify-center text-xs font-bold">2</span>
                <h2 className="text-lg text-on-surface font-semibold">Definición del Entregable</h2>
              </div>
              <span className="text-xs text-secondary font-medium uppercase">Scope of Work</span>
            </div>
            <div className="flex flex-col gap-4 pt-2">
              <div className="flex flex-col gap-1.5">
                <label className="text-xs text-on-surface font-semibold">Título del entregable o servicio</label>
                <input
                  className="w-full px-4 py-2.5 rounded-lg bg-surface-container-low text-on-surface text-sm focus:bg-surface-container-lowest focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all placeholder:text-outline"
                  placeholder="Ej. Desarrollo Frontend React + API"
                  value={form.serviceTitle}
                  onChange={(e) => setForm({ ...form, serviceTitle: e.target.value })}
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs text-on-surface font-semibold">Criterios de Aceptación (Requisitos para liberar el depósito)</label>
                  <button
                    className="text-xs text-primary font-medium cursor-pointer hover:underline"
                    onClick={() => setForm({ ...form, acceptanceCriteria: "1. Entrega de componentes y maquetas finales en formato digital.\n2. Manual de implementación y guía técnica detallada.\n3. Acompañamiento de 48h hábiles para solventar dudas de adopción." })}
                  >
                    Cargar plantilla estándar
                  </button>
                </div>
                <textarea
                  className="w-full px-4 py-2.5 rounded-lg bg-surface-container-low text-on-surface text-sm focus:bg-surface-container-lowest focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all placeholder:text-outline leading-relaxed"
                  placeholder="Detalla exactamente qué debe estar completo para la aprobación..."
                  rows={3}
                  value={form.acceptanceCriteria}
                  onChange={(e) => setForm({ ...form, acceptanceCriteria: e.target.value })}
                />
                <span className="text-xs text-secondary">
                  Sé específico: el mediador utilizará este texto en caso de existir una disputa sobre el entregable.
                </span>
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-xs text-on-surface font-semibold flex items-center gap-2">
                  <span>Enlace a brief, Notion o repositorio</span>
                  <span className="px-2 py-0.5 rounded text-[10px] bg-surface-container-high text-secondary">Opcional</span>
                </label>
                <input
                  className="w-full px-4 py-2.5 rounded-lg bg-surface-container-low text-on-surface text-sm focus:bg-surface-container-lowest focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all font-code-md placeholder:text-outline"
                  placeholder="https://drive.google.com/... o notion.so/..."
                  type="url"
                  value={form.briefUrl}
                  onChange={(e) => setForm({ ...form, briefUrl: e.target.value })}
                />
              </div>
            </div>
          </section>

          {/* Step 3: Payment Parameters */}
          <section className="bg-surface-container-lowest p-6 rounded-xl shadow-sm flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-7 h-7 rounded-full bg-primary-container text-on-primary flex items-center justify-center text-xs font-bold">3</span>
                <h2 className="text-lg text-on-surface font-semibold">Parámetros de Pago &amp; Custodia</h2>
              </div>
              <div className="flex items-center gap-1 text-tertiary text-xs font-semibold">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
                <span>Fondos Inmutables</span>
              </div>
            </div>

            {/* Payment Mode Tabs */}
            <div className="grid grid-cols-2 gap-2 p-1 bg-surface-container-low rounded-xl mt-1">
              <button
                type="button"
                className={`py-2 px-4 rounded-lg text-xs text-center transition-all flex items-center justify-center gap-2 ${form.paymentMode === 'single' ? 'bg-surface-container-lowest text-primary font-bold shadow-sm' : 'text-secondary hover:text-on-surface'}`}
                onClick={() => setForm({ ...form, paymentMode: 'single' })}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" /></svg>
                <span>Pago Unico (Recomendado)</span>
              </button>
              <button
                type="button"
                disabled
                title="El contrato maneja un unico monto y un unico deposito. Los hitos multiples no estan implementados."
                className="py-2 px-4 rounded-lg text-xs text-center flex items-center justify-center gap-2 text-secondary/60 bg-surface-container-low cursor-not-allowed"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" /></svg>
                <span>Por hitos - no disponible en el MVP</span>
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
              <div className="flex flex-col gap-1.5 sm:col-span-2">
                <label className="text-xs text-on-surface font-semibold flex items-center justify-between">
                  <span>Monto Total a Custodiar</span>
                  <span className="text-tertiary font-medium text-[11px]">1 USDC = 1 USD (Circle Dollar)</span>
                </label>
                <div className="relative flex items-center">
                  <span className="absolute left-4 text-xl text-on-surface font-bold pointer-events-none">$</span>
                  <input
                    className="w-full pl-9 pr-24 py-3 rounded-lg bg-surface-container-low text-on-surface text-xl font-bold focus:bg-surface-container-lowest focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
                    step="50"
                    type="number"
                    value={form.amount}
                    onChange={(e) => setForm({ ...form, amount: e.target.value })}
                  />
                  <div className="absolute right-3 flex items-center gap-1.5 px-3 py-1 bg-surface-container-high rounded-md text-primary font-bold font-code-md text-[13px]">
                    <span>USDC</span>
                  </div>
                </div>
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-xs text-on-surface font-semibold">Plazo de entrega prometido</label>
                <select
                  className="w-full px-4 py-2.5 rounded-lg bg-surface-container-low text-on-surface text-sm focus:bg-surface-container-lowest focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all appearance-none cursor-pointer"
                  value={form.deliveryDays}
                  onChange={(e) => setForm({ ...form, deliveryDays: e.target.value })}
                >
                  <option value="7">7 días calendario (Rápido)</option>
                  <option value="15">15 días calendario (Estándar)</option>
                  <option value="30">30 días calendario (Proyecto mediano)</option>
                  <option value="45">45 días calendario (Extenso)</option>
                </select>
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-xs text-on-surface font-semibold flex items-center gap-2">
                  <span>Ventana de revision del cliente</span>
                  <span className="px-2 py-0.5 rounded text-[10px] bg-surface-container-high text-secondary">Roadmap</span>
                </label>
                <select
                  className="w-full px-4 py-2.5 rounded-lg bg-surface-container-low text-secondary text-sm focus:outline-none appearance-none cursor-not-allowed"
                  value={form.reviewDays}
                  disabled
                  onChange={(e) => setForm({ ...form, reviewDays: e.target.value })}
                >
                  <option value="3">Sin ventana de revision en el MVP</option>
                  <option value="5">Sin ventana de revision en el MVP</option>
                  <option value="7">Sin ventana de revision en el MVP</option>
                </select>
                <span className="text-xs text-secondary">
                  El contrato solo conoce una fecha limite. No hay auto-liberacion on-chain.
                </span>
              </div>
            </div>

            <div className="p-3 bg-surface-container-low rounded-lg flex items-start gap-3">
              <svg className="w-5 h-5 text-primary shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" /></svg>
              <p className="text-xs text-on-surface-variant">
                <strong>Como funciona hoy:</strong> los fondos quedan bloqueados en el smart contract hasta que el comprador los libere al proveedor o solicite el reembolso. Si el comprador no hace nada, al cumplirse la fecha limite cualquier persona puede ejecutar el reembolso automatico y el dinero vuelve al comprador. El contrato <em>no</em> libera los fondos al proveedor por su cuenta.
              </p>
            </div>
          </section>

          {/* Step 4: Arbitration */}
          <section className="bg-surface-container-lowest p-6 rounded-xl shadow-sm flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-7 h-7 rounded-full bg-primary-container text-on-primary flex items-center justify-center text-xs font-bold">4</span>
                <h2 className="text-lg text-on-surface font-semibold">Arbitraje &amp; Mediación</h2>
              </div>
              <div className="flex items-center gap-1 text-tertiary text-xs font-semibold">
                <span className="px-2 py-0.5 rounded text-[10px] bg-surface-container-high text-secondary">Solo marca de disputa · Roadmap</span>
              </div>
            </div>
            <div className="flex flex-col gap-3 pt-1">
              <label className="flex items-start gap-3 p-3.5 rounded-xl bg-surface-container-low/60 cursor-default">
                <input
                  type="radio"
                  name="arbitrator"
                  checked
                  readOnly
                  className="mt-1 text-primary focus:ring-primary"
                />
                <div className="flex flex-col">
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-on-surface font-semibold">Solo se marca la disputa (sin arbitraje)</span>
                  </div>
                  <p className="text-xs text-secondary mt-0.5">
                    El unico efecto on-chain es <code className="font-code-md">raise_dispute</code>: congela la liquidacion. No hay arbitro, ni jurado, ni multi-sig 2-de-3 todavia. Antes de la fecha limite no existe resolucion: al vencerse, cualquier persona puede ejecutar el reembolso automatico al comprador.
                  </p>
                </div>
              </label>
              <label className="flex items-start gap-3 p-3.5 rounded-xl bg-surface-container-low/40 cursor-not-allowed opacity-60">
                <input
                  type="radio"
                  name="arbitrator"
                  disabled
                  className="mt-1 text-primary focus:ring-primary"
                />
                <div className="flex flex-col">
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-on-surface font-semibold">Árbitro On-chain Trustless Work Protocol</span>
                    <span className="px-2 py-0.5 rounded text-[10px] bg-surface-container-high text-secondary">Roadmap</span>
                  </div>
                  <p className="text-xs text-secondary mt-0.5">
                    No implementado. El mecanismo multi-sig 2-de-3 no existe en el contrato actual.
                  </p>
                </div>
              </label>
            </div>
          </section>

          {/* Generate Button */}
          <div className="flex flex-col gap-2 pt-2">
            <button
              className="w-full py-4 px-6 rounded-xl bg-primary hover:bg-primary-container text-on-primary text-lg font-bold shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-3 group cursor-pointer active:scale-[0.99]"
              onClick={handleGenerate}
              disabled={generating}
            >
              {generating ? (
                <>
                  <svg className="w-6 h-6 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
                  <span>Registrando en Soroban Stellar...</span>
                </>
              ) : generated ? (
                <>
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                  <span>¡Enlace Listo &amp; Blindado!</span>
                </>
              ) : (
                <>
                  <svg className="w-6 h-6 group-hover:rotate-12 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
                  <span>Generar Enlace de Custodia Segura</span>
                  <svg className="w-5 h-5 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" /></svg>
                </>
              )}
            </button>
            <p className="text-center text-xs text-secondary">
              No requiere saldo previo en wallet para crearlo. Tu cliente pagará el depósito en su moneda o en USDC.
            </p>
          </div>
        </div>

        {/* Right Column: Preview */}
        <div className="lg:col-span-5 flex flex-col gap-6 lg:sticky lg:top-24">
          <div className="bg-surface-container-lowest rounded-2xl p-6 shadow-md flex flex-col gap-4 relative overflow-hidden">
            {/* Status */}
            <div className="flex items-center justify-between pb-3">
              <div className="flex items-center gap-2">
                <span className={`w-2.5 h-2.5 rounded-full ${generated ? 'bg-tertiary' : 'bg-secondary animate-pulse'}`}></span>
                <span className="text-xs text-tertiary font-bold tracking-wider uppercase">
                  {generated ? 'Contrato Creado On-Chain' : 'Orden Lista Para Despacho'}
                </span>
              </div>
              {txHash && (
                <span className="font-code-md text-[11px] text-secondary bg-surface-container-low px-2 py-0.5 rounded">
                  Tx: {txHash.slice(0, 8)}...{txHash.slice(-4)}
                </span>
              )}
            </div>

            {/* Link Preview */}
            <div className="bg-surface-container-low p-3.5 rounded-xl flex flex-col gap-2">
              <span className="text-xs text-secondary uppercase font-semibold">
                {generated ? 'Contrato Soroban Desplegado' : 'Enlace público de pago para el cliente'}
              </span>
              <div className="flex items-center gap-2 bg-surface-container-lowest p-2 rounded-lg">
                <svg className="w-5 h-5 text-primary shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" /></svg>
                <span className="font-code-md text-xs text-on-surface truncate select-all flex-1">
                  {generated && txHash
                    ? txHash
                    : wallet.connected
                      ? `breadline.fi/escrow/${ESCROW_CONTRACT_ID}?seller=${shareLinkSeller ? shareLinkSeller.slice(0, 8) : 'PENDIENTE'}`
                      : `breadline.fi/escrow/${ESCROW_CONTRACT_ID}`}
                </span>
                <button
                  className={`px-3 py-1 rounded font-label-sm text-xs font-semibold transition-all flex items-center gap-1 shrink-0 ${copied ? 'bg-tertiary text-on-tertiary' : 'bg-surface-container text-primary hover:bg-primary hover:text-on-primary'}`}
                  onClick={handleCopy}
                >
                  {copied ? (
                    <>
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                      Copiado
                    </>
                  ) : (
                    <>
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>
                      Copiar
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* QR Code */}
            <div className="flex items-center gap-4 p-4 bg-surface-container-low/50 rounded-xl">
              <div className="w-20 h-20 bg-surface-container-lowest p-1.5 rounded-lg shrink-0 shadow-sm flex items-center justify-center">
                <svg className="w-full h-full text-on-surface" fill="currentColor" viewBox="0 0 100 100">
                  <rect fill="#0b1c30" height="30" rx="3" width="30" x="5" y="5"/>
                  <rect fill="#ffffff" height="18" rx="2" width="18" x="11" y="11"/>
                  <rect fill="#0050cb" height="10" rx="1" width="10" x="15" y="15"/>
                  <rect fill="#0b1c30" height="30" rx="3" width="30" x="65" y="5"/>
                  <rect fill="#ffffff" height="18" rx="2" width="18" x="71" y="11"/>
                  <rect fill="#0050cb" height="10" rx="1" width="10" x="75" y="15"/>
                  <rect fill="#0b1c30" height="30" rx="3" width="30" x="5" y="65"/>
                  <rect fill="#ffffff" height="18" rx="2" width="18" x="11" y="71"/>
                  <rect fill="#0050cb" height="10" rx="1" width="10" x="15" y="75"/>
                  <rect fill="#0b1c30" height="6" width="6" x="42" y="8"/>
                  <rect fill="#0b1c30" height="6" width="6" x="52" y="8"/>
                  <rect fill="#0050cb" height="6" width="16" x="42" y="20"/>
                  <rect fill="#0b1c30" height="12" width="8" x="8" y="44"/>
                  <rect fill="#0b1c30" height="6" width="12" x="22" y="44"/>
                  <rect fill="#0066ff" height="16" rx="2" width="16" x="42" y="42"/>
                  <rect fill="#0b1c30" height="6" width="12" x="65" y="45"/>
                  <rect fill="#0b1c30" height="14" width="8" x="85" y="45"/>
                  <rect fill="#0b1c30" height="10" width="8" x="45" y="68"/>
                  <rect fill="#0b1c30" height="6" width="14" x="65" y="68"/>
                  <rect fill="#0050cb" height="24" width="8" x="85" y="68"/>
                  <rect fill="#0b1c30" height="8" width="32" x="45" y="84"/>
                </svg>
              </div>
              <div className="flex flex-col">
                <span className="text-xs text-on-surface font-semibold">QR de Pago Directo</span>
                <span className="text-xs text-secondary mt-0.5">Tu cliente puede escanear con Lobstr, Freighter o transferir USD vía Circle Cross-Border.</span>
              </div>
            </div>

            {/* Contract Summary */}
            <div className="flex flex-col gap-2 pt-2">
              <span className="text-xs text-secondary uppercase font-semibold">Resumen de Contrato de Cobro</span>
              <div className="bg-surface-container-low p-4 rounded-xl flex flex-col gap-3">
                <div className="flex items-start justify-between">
                  <div>
                    <span className="text-lg text-on-surface font-bold">{form.clientName || 'Nombre del Cliente'}</span>
                    <p className="text-xs text-secondary">{form.clientCountry}</p>
                  </div>
                  <span className="px-2.5 py-1 rounded-full bg-secondary-container text-on-secondary-container text-xs font-semibold">B2B Service</span>
                </div>
                <div className="p-3 bg-surface-container-lowest rounded-lg">
                  <span className="text-xs text-secondary block">Servicio Pactado</span>
                  <span className="text-sm text-on-surface font-semibold line-clamp-1">{form.serviceTitle || 'Título del servicio'}</span>
                </div>
                <div className="grid grid-cols-2 gap-2 text-center">
                  <div className="bg-surface-container-lowest p-2.5 rounded-lg">
                    <span className="text-xs text-secondary block">Plazo de entrega</span>
                    <span className="text-lg text-on-surface font-bold">{form.deliveryDays} días</span>
                  </div>
                  <div className="bg-surface-container-lowest p-2.5 rounded-lg">
                    <span className="text-xs text-secondary block">Ventana revisión</span>
                    <span className="text-lg text-primary font-bold">{form.reviewDays} días</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Financial Breakdown */}
            <div className="bg-surface-container-low p-4 rounded-xl flex flex-col gap-2.5">
              <div className="flex items-center justify-between text-secondary text-xs">
                <span>Monto acordado (USDC):</span>
                <span className="font-code-md text-on-surface font-semibold">{formatUSDC(amount)}</span>
              </div>
              <div className="flex items-center justify-between text-secondary text-xs">
                <span>Tarifa de red Stellar</span>
                <span className="font-code-md text-tertiary font-semibold">$0.0001 USDC</span>
              </div>
              <div className="flex items-center justify-between text-secondary text-xs">
                <span>Comisión de protocolo Breadline (0.8%):</span>
                <span className="font-code-md text-secondary font-medium">-{formatUSDC(fee)}</span>
              </div>
              <div className="h-px bg-outline-variant/30 my-1"></div>
              <div className="flex items-center justify-between">
                <div className="flex flex-col">
                  <span className="text-lg text-on-surface font-bold">Neto a percibir:</span>
                  <span className="text-xs text-secondary">Acreditación directa en tu cuenta</span>
                </div>
                <div className="flex flex-col text-right">
                  <span className="text-3xl text-tertiary font-extrabold font-code-md leading-none">{formatUSDC(net)}</span>
                  <span className="text-xs text-secondary mt-1">USDC Garantizados</span>
                </div>
              </div>
            </div>

            {/* Safety Banner */}
            <div className="p-3.5 bg-tertiary-container/20 rounded-xl flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-tertiary text-on-tertiary flex items-center justify-center shrink-0">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" /></svg>
              </div>
              <p className="text-xs text-on-surface leading-tight">
                <strong>Protección Anti-Impago:</strong> El cliente deposita los fondos en el smart contract de Stellar <em>antes</em> de que comiences a trabajar. Cero riesgo de impago internacional.
              </p>
            </div>
          </div>
        </div>
      </div>
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  );
}
