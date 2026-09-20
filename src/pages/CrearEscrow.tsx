import { useState } from 'react';
import { COUNTRIES, calculateFee, calculateNet, formatUSDC, generateEscrowId } from '../lib/stellar';

export default function CrearEscrow() {
  const [form, setForm] = useState({
    clientName: '',
    clientEmail: '',
    clientCountry: '🇺🇸 Estados Unidos (US)',
    serviceTitle: '',
    acceptanceCriteria: '',
    briefUrl: '',
    amount: '',
    deliveryDays: '15',
    reviewDays: '3',
    paymentMode: 'single' as 'single' | 'milestones',
    arbitration: 'breadline',
  });

  const [copied, setCopied] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [generated, setGenerated] = useState(false);

  const amount = parseFloat(form.amount) || 0;
  const fee = calculateFee(amount);
  const net = calculateNet(amount);
  const orderId = generateEscrowId();
  const slug = form.clientName.toLowerCase().replace(/[^a-z0-9]+/g, '-').slice(0, 14) || 'client';

  const handleCopy = () => {
    navigator.clipboard.writeText(`https://breadline.fi/escrow/order-${orderId}-${slug}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2800);
  };

  const handleGenerate = () => {
    setGenerating(true);
    setTimeout(() => {
      setGenerating(false);
      setGenerated(true);
    }, 2000);
  };

  return (
    <div className="flex flex-col w-full pb-16">
      {/* Top Header */}
      <div className="w-full flex flex-col md:flex-row md:items-center justify-between gap-4 py-6 mb-4">
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full bg-surface-container-high text-primary text-xs uppercase tracking-wider font-semibold">Generador de Pagos Seguros</span>
            <span className="text-secondary">•</span>
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
                <h2 className="text-lg text-on-surface font-semibold">Parámetros de Pago & Custodia</h2>
              </div>
              <div className="flex items-center gap-1 text-tertiary text-xs font-semibold">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
                <span>Fondos Inmutables</span>
              </div>
            </div>

            {/* Payment Mode Tabs */}
            <div className="grid grid-cols-2 gap-2 p-1 bg-surface-container-low rounded-xl mt-1">
              <button
                className={`py-2 px-4 rounded-lg text-xs text-center transition-all flex items-center justify-center gap-2 ${form.paymentMode === 'single' ? 'bg-surface-container-lowest text-primary font-bold shadow-sm' : 'text-secondary hover:text-on-surface'}`}
                onClick={() => setForm({ ...form, paymentMode: 'single' })}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" /></svg>
                <span>Pago Único (Recomendado)</span>
              </button>
              <button
                className={`py-2 px-4 rounded-lg text-xs text-center transition-all flex items-center justify-center gap-2 ${form.paymentMode === 'milestones' ? 'bg-surface-container-lowest text-primary font-bold shadow-sm' : 'text-secondary hover:text-on-surface'}`}
                onClick={() => setForm({ ...form, paymentMode: 'milestones' })}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" /></svg>
                <span>Por Hitos (30% / 70%)</span>
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
                <label className="text-xs text-on-surface font-semibold">Ventana de revisión del cliente</label>
                <select
                  className="w-full px-4 py-2.5 rounded-lg bg-surface-container-low text-on-surface text-sm focus:bg-surface-container-lowest focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all appearance-none cursor-pointer"
                  value={form.reviewDays}
                  onChange={(e) => setForm({ ...form, reviewDays: e.target.value })}
                >
                  <option value="3">3 días hábiles (Auto-liberación)</option>
                  <option value="5">5 días hábiles</option>
                  <option value="7">7 días corridos</option>
                </select>
              </div>
            </div>

            <div className="p-3 bg-surface-container-low rounded-lg flex items-start gap-3">
              <svg className="w-5 h-5 text-primary shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" /></svg>
              <p className="text-xs text-on-surface-variant">
                <strong>Garantía de Auto-Liberación:</strong> Si subes la entrega final y el cliente no pide ajustes formales ni aprueba en el plazo asignado, el contrato de Soroban transferirá automáticamente los fondos a tu balance.
              </p>
            </div>
          </section>

          {/* Step 4: Arbitration */}
          <section className="bg-surface-container-lowest p-6 rounded-xl shadow-sm flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-7 h-7 rounded-full bg-primary-container text-on-primary flex items-center justify-center text-xs font-bold">4</span>
                <h2 className="text-lg text-on-surface font-semibold">Arbitraje & Mediación</h2>
              </div>
              <span className="text-xs text-tertiary font-semibold flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-tertiary"></span> Activo
              </span>
            </div>
            <div className="flex flex-col gap-3 pt-1">
              <label className="flex items-start gap-3 p-3.5 rounded-xl bg-surface-container-low/60 hover:bg-surface-container-low cursor-pointer transition-all">
                <input
                  type="radio"
                  name="arbitrator"
                  value="breadline"
                  checked={form.arbitration === 'breadline'}
                  onChange={() => setForm({ ...form, arbitration: 'breadline' })}
                  className="mt-1 text-primary focus:ring-primary"
                />
                <div className="flex flex-col">
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-on-surface font-semibold">Breadline Sovereign Mediation Desk</span>
                    <span className="px-2 py-0.5 rounded text-[10px] bg-tertiary-container text-on-tertiary-container font-semibold">Recomendado</span>
                  </div>
                  <p className="text-xs text-secondary mt-0.5">
                    Comité de resolución comercial neutral multilingüe (EN/ES/PT). Dictamen imparcial vinculante en menos de 72 horas laborales en caso de controversia.
                  </p>
                </div>
              </label>
              <label className="flex items-start gap-3 p-3.5 rounded-xl bg-surface-container-low/60 hover:bg-surface-container-low cursor-pointer transition-all">
                <input
                  type="radio"
                  name="arbitrator"
                  value="trustless"
                  checked={form.arbitration === 'trustless'}
                  onChange={() => setForm({ ...form, arbitration: 'trustless' })}
                  className="mt-1 text-primary focus:ring-primary"
                />
                <div className="flex flex-col">
                  <span className="text-sm text-on-surface font-semibold">Árbitro On-chain Trustless Work Protocol</span>
                  <p className="text-xs text-secondary mt-0.5">
                    Mecanismo descentralizado de firmas multipartitas (multi-sig 2-de-3) con jurados criptográficos verificados en Stellar.
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
                  <span>¡Enlace Listo & Blindado!</span>
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
                <span className="w-2.5 h-2.5 rounded-full bg-tertiary animate-pulse"></span>
                <span className="text-xs text-tertiary font-bold tracking-wider uppercase">Orden Lista Para Despacho</span>
              </div>
              <span className="font-code-md text-[11px] text-secondary bg-surface-container-low px-2 py-0.5 rounded">ID: #{orderId}</span>
            </div>

            {/* Link Preview */}
            <div className="bg-surface-container-low p-3.5 rounded-xl flex flex-col gap-2">
              <span className="text-xs text-secondary uppercase font-semibold">Enlace público de pago para el cliente</span>
              <div className="flex items-center gap-2 bg-surface-container-lowest p-2 rounded-lg">
                <svg className="w-5 h-5 text-primary shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" /></svg>
                <span className="font-code-md text-xs text-on-surface truncate select-all flex-1">breadline.fi/escrow/order-{orderId}-{slug}</span>
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
    </div>
  );
}
