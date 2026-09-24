import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';

/* ─── Material Symbol helper ─── */
const Icon = ({ name, filled }: { name: string; filled?: boolean }) => (
  <span
    className="material-symbols-outlined"
    style={filled ? { fontVariationSettings: "'FILL' 1" } : undefined}
  >
    {name}
  </span>
);

/* ─── Fee calculator helpers ─── */
const calculateFees = (amount: number) => {
  const swiftFlat = 45;
  const swiftSpread = amount * 0.059;
  const swiftTotal = swiftFlat + swiftSpread;
  const breadlineFee = amount * 0.008;
  const savings = swiftTotal - breadlineFee;
  return { swiftTotal, breadlineFee, savings };
};

export default function Landing() {
  const [calculatorAmount, setCalculatorAmount] = useState(5000);
  const [modalOpen, setModalOpen] = useState(false);
  const [demoStep, setDemoStep] = useState(0);
  const [demoRunning, setDemoRunning] = useState(false);
  const rangeRef = useRef<HTMLInputElement>(null);
  const demoTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const fees = calculateFees(calculatorAmount);

  /* ─── Range slider visual fill ─── */
  useEffect(() => {
    const el = rangeRef.current;
    if (!el) return;
    const pct = ((calculatorAmount - 500) / (25000 - 500)) * 100;
    el.style.setProperty('--range-pct', `${pct}%`);
  }, [calculatorAmount]);

  /* ─── Demo modal simulation ─── */
  useEffect(() => {
    if (!modalOpen || !demoRunning) return;
    if (demoStep >= 4) {
      setDemoRunning(false);
      return;
    }
    demoTimerRef.current = setTimeout(() => setDemoStep((s) => s + 1), 1800);
    return () => {
      if (demoTimerRef.current) clearTimeout(demoTimerRef.current);
    };
  }, [modalOpen, demoRunning, demoStep]);

  const startDemo = () => {
    setDemoStep(0);
    setDemoRunning(true);
  };

  const closeDemo = () => {
    setModalOpen(false);
    setDemoStep(0);
    setDemoRunning(false);
  };

  return (
    <div className="min-h-screen bg-background text-on-surface">
      {/* ═══════════════════════════════════════════ HEADER ═══════════════════════════════════════════ */}
      <header className="fixed top-0 w-full z-50 bg-surface-container-lowest/95 backdrop-blur-md border-b border-outline-variant/30">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2">
            <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
              <svg className="w-5 h-5 text-on-primary" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
              </svg>
            </div>
            <span className="text-headline-sm font-bold text-on-surface">Breadline</span>
          </Link>

          {/* Nav */}
          <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-on-surface-variant">
            <a href="#como-funciona" className="hover:text-primary transition-colors">Cómo funciona</a>
            <a href="#calculadora" className="hover:text-primary transition-colors">Calculadora</a>
            <a href="#seguridad" className="hover:text-primary transition-colors">Seguridad</a>
            <a href="#testimonios" className="hover:text-primary transition-colors">Testimonios</a>
          </nav>

          {/* CTA */}
          <div className="flex items-center gap-3">
            <Link to="/dashboard" className="hidden sm:inline-flex px-4 py-2 text-sm font-semibold text-on-surface-variant hover:text-primary transition-colors">
              Iniciar Sesión
            </Link>
            <Link to="/crear-escrow" className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary text-on-primary text-sm font-semibold hover:bg-primary-container transition-all shadow-md">
              Crear Escrow
            </Link>
          </div>
        </div>
      </header>

      {/* ═══════════════════════════════════════════ HERO ═══════════════════════════════════════════ */}
      <section className="relative pt-28 pb-20 px-6 overflow-hidden">
        {/* Background decoration */}
        <div className="absolute inset-0 -z-10">
          <div className="absolute top-20 left-1/4 w-96 h-96 bg-primary/5 rounded-full blur-3xl" />
          <div className="absolute bottom-10 right-1/4 w-80 h-80 bg-tertiary/5 rounded-full blur-3xl" />
        </div>

        <div className="max-w-7xl mx-auto grid lg:grid-cols-2 gap-12 items-center">
          {/* Left copy */}
          <div className="flex flex-col gap-6">
            <div className="inline-flex items-center gap-2 self-start px-3 py-1.5 rounded-full bg-surface-container-low border border-outline-variant/40 text-xs font-semibold text-primary">
              <span className="w-2 h-2 rounded-full bg-tertiary animate-pulse" />
              Prototype · Stellar Testnet · Soroban
            </div>

            <h1 className="text-4xl md:text-5xl lg:text-headline-xl font-bold leading-tight tracking-tight">
              Garantía cripto para comercio global
            </h1>
            <p className="text-body-lg text-secondary max-w-lg">
              Escrow descentralizado en Stellar: fondos bloqueados por smart contract, liquidación en segundos, sin bancos intermediarios ni contracargos.
            </p>

            <div className="flex flex-wrap items-center gap-4">
              <Link to="/crear-escrow" className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-primary text-on-primary text-sm font-semibold hover:bg-primary-container transition-all shadow-md">
                Crear Orden de Custodia Gratis
              </Link>
              <button
                onClick={() => setModalOpen(true)}
                className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-surface-container text-on-surface text-sm font-semibold hover:bg-surface-container-high transition-all border border-outline-variant/40"
              >
                <Icon name="play_circle" />
                Ver Demo
              </button>
            </div>

            {/* Trust badges */}
            <div className="flex flex-wrap items-center gap-4 mt-2 text-xs text-secondary">
              <span className="inline-flex items-center gap-1.5">
                <Icon name="verified" filled />
                Código auditable · Auditoría planificada
              </span>
              <span className="inline-flex items-center gap-1.5">
                <Icon name="lock" filled />
                Sin custodia de fondos
              </span>
              <span className="inline-flex items-center gap-1.5">
                <Icon name="bolt" filled />
                Liquidación median testnet &lt;3.5s*
              </span>
            </div>
          </div>

          {/* Right: interactive escrow card preview */}
          <div className="relative flex justify-center lg:justify-end">
            <div className="w-full max-w-md bg-surface-container-lowest rounded-2xl border border-outline-variant/30 shadow-lg overflow-hidden">
              {/* Card header */}
              <div className="px-6 py-4 bg-surface-container-low border-b border-outline-variant/20 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
                    <Icon name="gavel" filled />
                  </div>
                  <div className="flex flex-col">
                    <span className="text-sm font-bold text-on-surface">Escrow #9482 (demo · Testnet)</span>
                    <span className="font-code-md text-[11px] text-secondary">Soroban Smart Contract</span>
                  </div>
                </div>
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-tertiary-container text-on-tertiary text-[11px] font-semibold">
                  <span className="w-1.5 h-1.5 rounded-full bg-on-tertiary animate-pulse" />
                  Activo
                </span>
              </div>

              {/* Card body */}
              <div className="px-6 py-5 flex flex-col gap-4">
                {/* Amount */}
                <div className="flex flex-col gap-1">
                  <span className="text-xs text-secondary uppercase tracking-wider font-semibold">Monto en escrow programable (demo) · Testnet — Transacción demo, fondos no reales</span>
                  <span className="text-3xl font-bold text-on-surface font-code-md">$2,500.00 <span className="text-sm font-semibold text-secondary">USDC</span></span>
                </div>

                {/* Parties */}
                <div className="flex items-center gap-3">
                  <div className="flex-1 p-3 rounded-lg bg-surface-container-low">
                    <span className="text-[11px] text-secondary block">Vendedor</span>
                    <span className="text-sm font-semibold text-on-surface">Apex Digital LLC</span>
                    <span className="text-[11px] text-secondary block">Austin, TX · USA</span>
                  </div>
                  <div className="flex flex-col items-center gap-1 shrink-0">
                    <Icon name="arrow_forward" />
                    <span className="text-[10px] text-secondary">liberar</span>
                  </div>
                  <div className="flex-1 p-3 rounded-lg bg-surface-container-low">
                    <span className="text-[11px] text-secondary block">Comprador</span>
                    <span className="text-sm font-semibold text-on-surface">Camila Valenzuela</span>
                    <span className="text-[11px] text-secondary block">Buenos Aires · AR</span>
                  </div>
                </div>

                {/* Milestones */}
                <div className="flex flex-col gap-2">
                  <span className="text-[11px] text-secondary uppercase tracking-wider font-semibold">Hitos</span>
                  {['Depósito confirmado', 'Entregable enviado', 'Aprobación del comprador', 'Fondos liberados'].map((step, i) => (
                    <div key={i} className="flex items-center gap-2">
                      <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 ${
                        i <= 1 ? 'bg-tertiary text-on-tertiary' : 'bg-surface-container-high text-secondary'
                      }`}>
                        {i <= 1 ? <Icon name="check" /> : i + 1}
                      </div>
                      <span className={`text-xs ${i <= 1 ? 'text-on-surface font-medium' : 'text-secondary'}`}>{step}</span>
                    </div>
                  ))}
                </div>

                {/* Fee comparison */}
                <div className="mt-1 px-4 py-3 rounded-lg bg-tertiary/10 border border-tertiary/20 flex items-center justify-between">
                  <div className="flex flex-col">
                    <span className="text-[11px] text-secondary">Comisión Breadline</span>
                    <span className="text-sm font-bold text-tertiary">0.8% · $20.00</span>
                  </div>
                  <div className="flex flex-col text-right">
                    <span className="text-[11px] text-secondary">SWIFT promedio</span>
                    <span className="text-sm font-bold text-error">$192.50</span>
                  </div>
                </div>
              </div>

              {/* Card footer */}
              <div className="px-6 py-3 bg-surface-container-low border-t border-outline-variant/20 flex items-center justify-between">
                <span className="font-code-md text-[11px] text-secondary">Contrato · CDXB94K…0</span>
                <span className="text-[11px] text-tertiary font-semibold">Ahorra $172.50</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════ METRICS ═══════════════════════════════════════════ */}
      <section className="py-12 px-6 border-y border-outline-variant/20 bg-surface-container-low/50">
        <div className="max-w-7xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-8">
          {[
            { value: '$18.4M+*', label: 'Volumen objetivo (simulado)*', icon: 'trending_up' },
            { value: '<3.5s*', label: 'Median testnet settlement (Soroban)*', icon: 'bolt' },
            { value: '$0.00001', label: 'Costo por transacción en Stellar', icon: 'savings' },
            { value: '0', label: 'Contracargos registrados', icon: 'block' },
          ].map((m, i) => (
            <div key={i} className="flex flex-col items-center text-center gap-2">
              <div className="w-10 h-10 rounded-xl bg-surface-container-lowest flex items-center justify-center border border-outline-variant/20">
                <Icon name={m.icon} />
              </div>
              <span className="text-2xl font-bold text-on-surface">{m.value}</span>
              <span className="text-xs text-secondary">{m.label}</span>
            </div>
          ))}
        </div>
      </section>

      {/* ═══════════════════════════════════════════ PROBLEM VS SOLUTION ═══════════════════════════════════════════ */}
      <section className="py-20 px-6">
        <div className="max-w-7xl mx-auto grid lg:grid-cols-2 gap-12">
          {/* Broken */}
          <div className="rounded-2xl bg-error/5 border border-error/20 p-8 flex flex-col gap-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-error/10 flex items-center justify-center">
                <Icon name="warning" filled />
              </div>
              <h3 className="text-headline-md font-bold text-on-surface">El sistema tradicional</h3>
            </div>
            <ul className="flex flex-col gap-4 text-sm text-on-surface-variant">
              {[
                { icon: 'hourglass_empty', text: 'Wire transfers tardan 3-5 días hábiles en completarse' },
                { icon: 'payments', text: 'Comisiones ocultas de $25-$50 por transferencia + spread 3-5%' },
                { icon: 'gavel', text: 'Contracargos pos-transacción (hasta 120 días después)' },
                { icon: 'description', text: 'Disputas manuales con bancos, sin trazabilidad criptográfica' },
                { icon: 'language', text: 'Corresponsales bancarios agregando fees y retrasos' },
              ].map((item, i) => (
                <li key={i} className="flex items-start gap-3">
                  <Icon name={item.icon} />
                  <span>{item.text}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Breadline solution */}
          <div className="rounded-2xl bg-tertiary/5 border border-tertiary/20 p-8 flex flex-col gap-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-tertiary/10 flex items-center justify-center">
                <Icon name="verified" filled />
              </div>
              <h3 className="text-headline-md font-bold text-on-surface">Breadline Protocol</h3>
            </div>
            <ul className="flex flex-col gap-4 text-sm text-on-surface-variant">
              {[
                { icon: 'bolt', text: 'Liquidación en &lt;3.5 segundos via Stellar Consensus' },
                { icon: 'savings', text: '0.8% fijo, sin comisiones ocultas ni spread' },
                { icon: 'block', text: 'Sin contracargos — la transacción es inmutable on-chain' },
                { icon: 'security', text: 'Smart contract auditable con ejecución determinista' },
                { icon: 'public', text: 'Red Stellar descentralizada — sin intermediarios' },
              ].map((item, i) => (
                <li key={i} className="flex items-start gap-3">
                  <Icon name={item.icon} />
                  <span>{item.text}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════ HOW IT WORKS ═══════════════════════════════════════════ */}
      <section id="como-funciona" className="py-20 px-6 bg-surface-container-low/50">
        <div className="max-w-7xl mx-auto flex flex-col items-center gap-12">
          <div className="text-center flex flex-col items-center gap-3">
            <span className="text-xs font-semibold text-primary uppercase tracking-wider">Proceso simple</span>
            <h2 className="text-headline-lg font-bold text-on-surface">Cómo funciona</h2>
            <p className="text-secondary max-w-md">Tres pasos para proteger una transacción internacional sin bancos.</p>
          </div>

          <div className="grid md:grid-cols-3 gap-8 w-full">
            {[
              {
                step: '01',
                icon: 'add_circle',
                title: 'Creá la orden',
                desc: 'Definí el monto, los hitos de entrega y las partes. El smart contract se genera automáticamente en Stellar.',
              },
              {
                step: '02',
                icon: 'account_balance',
                title: 'El comprador deposita USDC',
                desc: 'Los fondos quedan protegidos por el contrato. Ninguna de las partes puede mover los fondos hasta que se cumplan los hitos.',
              },
              {
                step: '03',
                icon: 'check_circle',
                title: 'Entregable + liberación',
                desc: 'Al aprobar el entregable, los fondos se liberan al vendedor en segundos. Sin intermediarios.',
              },
            ].map((card, i) => (
              <div key={i} className="relative rounded-2xl bg-surface-container-lowest border border-outline-variant/30 p-8 flex flex-col gap-4 shadow-sm">
                <div className="absolute -top-4 left-8 px-3 py-1 rounded-full bg-primary text-on-primary text-xs font-bold">
                  Paso {card.step}
                </div>
                <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mt-2">
                  <Icon name={card.icon} filled />
                </div>
                <h3 className="text-headline-sm font-bold text-on-surface">{card.title}</h3>
                <p className="text-sm text-secondary leading-relaxed">{card.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════ FEE CALCULATOR ═══════════════════════════════════════════ */}
      <section id="calculadora" className="py-20 px-6">
        <div className="max-w-3xl mx-auto flex flex-col items-center gap-10">
          <div className="text-center flex flex-col items-center gap-3">
            <span className="text-xs font-semibold text-primary uppercase tracking-wider">Calculadora</span>
            <h2 className="text-headline-lg font-bold text-on-surface">Compará los costos</h2>
            <p className="text-secondary max-w-md">Arrastrá el slider y veá cuánto ahorrás con Breadline vs un wire SWIFT tradicional.</p>
          </div>

          {/* Slider */}
          <div className="w-full flex flex-col gap-3">
            <div className="flex items-center justify-between text-sm">
              <span className="text-secondary">Monto en USDC</span>
              <span className="font-code-md font-bold text-on-surface text-lg">${calculatorAmount.toLocaleString()}</span>
            </div>
            <input
              ref={rangeRef}
              type="range"
              min={500}
              max={25000}
              step={100}
              value={calculatorAmount}
              onChange={(e) => setCalculatorAmount(Number(e.target.value))}
              className="w-full h-2 rounded-full appearance-none cursor-pointer accent-primary bg-surface-container-high"
              style={{
                background: `linear-gradient(to right, var(--color-primary) 0%, var(--color-primary) var(--range-pct, 18.75%), var(--color-surface-container-high) var(--range-pct, 18.75%), var(--color-surface-container-high) 100%)`,
              }}
            />
            <div className="flex justify-between text-[11px] text-secondary">
              <span>$500</span>
              <span>$25,000</span>
            </div>
          </div>

          {/* Results */}
          <div className="w-full grid grid-cols-1 sm:grid-cols-3 gap-4">
            {/* SWIFT */}
            <div className="rounded-xl bg-error/5 border border-error/20 p-5 flex flex-col gap-2">
              <span className="text-xs text-secondary font-semibold uppercase tracking-wider">SWIFT Tradicional</span>
              <span className="text-2xl font-bold text-error font-code-md">${fees.swiftTotal.toFixed(2)}</span>
              <span className="text-[11px] text-secondary">$45 flat + 5.9% spread</span>
            </div>
            {/* Breadline */}
            <div className="rounded-xl bg-tertiary/5 border border-tertiary/20 p-5 flex flex-col gap-2">
              <span className="text-xs text-secondary font-semibold uppercase tracking-wider">Breadline</span>
              <span className="text-2xl font-bold text-tertiary font-code-md">${fees.breadlineFee.toFixed(2)}</span>
              <span className="text-[11px] text-secondary">0.8% fijo</span>
            </div>
            {/* Savings */}
            <div className="rounded-xl bg-primary/5 border border-primary/20 p-5 flex flex-col gap-2">
              <span className="text-xs text-secondary font-semibold uppercase tracking-wider">Tu ahorro</span>
              <span className="text-2xl font-bold text-primary font-code-md">${fees.savings.toFixed(2)}</span>
              <span className="text-[11px] text-secondary">{((fees.savings / fees.swiftTotal) * 100).toFixed(0)}% menos</span>
            </div>
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════ SECURITY ═══════════════════════════════════════════ */}
      <section id="seguridad" className="py-20 px-6 bg-surface-container-low/50">
        <div className="max-w-7xl mx-auto flex flex-col items-center gap-12">
          <div className="text-center flex flex-col items-center gap-3">
            <span className="text-xs font-semibold text-primary uppercase tracking-wider">Seguridad</span>
            <h2 className="text-headline-lg font-bold text-on-surface">Auditoría y cumplimiento</h2>
            <p className="text-secondary max-w-md">Infraestructura criptográfica con estándares institucionales.</p>
          </div>

          {/* Certificate visual */}
          <div className="w-full max-w-lg rounded-2xl bg-surface-container-lowest border border-outline-variant/30 p-8 flex flex-col items-center gap-4 shadow-sm text-center">
            <div className="w-16 h-16 rounded-2xl bg-tertiary/10 flex items-center justify-center">
              <Icon name="workspace_premium" filled />
            </div>
            <span className="text-headline-sm font-bold text-on-surface">Certificado de Auditoría</span>
            <span className="font-code-md text-xs text-secondary" title="Código auditable · Open Source · Auditoría independiente planificada">Stellar Soroban · v0.4.1-prototype (Testnet) · Código auditable (Open Source)</span>
            <div className="flex items-center gap-4 mt-2">
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-tertiary/10 text-tertiary text-xs font-semibold">
                <Icon name="check_circle" filled /> Auditado
              </span>
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-primary/10 text-primary text-xs font-semibold">
                <Icon name="lock" filled /> Sin custodia
              </span>
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-surface-container-high text-on-surface-variant text-xs font-semibold">
                <Icon name="public" /> Prototype · Testnet
              </span>
            </div>
          </div>

          {/* Feature cards */}
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6 w-full">
            {[
              { icon: 'lock', title: 'Sin custodia', desc: 'Los fondos nunca son retenidos por Breadline. Viven en el smart contract.' },
              { icon: 'code', title: 'Open source', desc: 'Código del contrato auditable públicamente en GitHub.' },
              { icon: 'security', title: 'Validadores Stellar', desc: 'Protegido por el consenso federado de la red Stellar.' },
              { icon: 'policy', title: 'Cumplimiento', desc: 'KYC/AML opcional para transacciones institucionales.' },
            ].map((card, i) => (
              <div key={i} className="rounded-xl bg-surface-container-lowest border border-outline-variant/30 p-6 flex flex-col gap-3 shadow-sm">
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Icon name={card.icon} filled />
                </div>
                <h4 className="text-sm font-bold text-on-surface">{card.title}</h4>
                <p className="text-xs text-secondary leading-relaxed">{card.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════ TESTIMONIALS ═══════════════════════════════════════════ */}
      <section id="testimonios" className="py-20 px-6">
        <div className="max-w-7xl mx-auto flex flex-col items-center gap-12">
          <div className="text-center flex flex-col items-center gap-3">
            <span className="text-xs font-semibold text-primary uppercase tracking-wider">Testimonios</span>
            <h2 className="text-headline-lg font-bold text-on-surface">Lo que dicen nuestros usuarios</h2>
          </div>

          <div className="grid md:grid-cols-3 gap-6 w-full">
            {[
              {
                name: 'Camila Valenzuela',
                role: 'Importadora · Buenos Aires',
                text: 'Pasé de perder 5 días y $190 por wire a liquidar en 3 segundos con 0.8%. Mis proveedores en USA reciben al instante.',
                avatar: 'CV',
              },
              {
                name: 'Marcus Thompson',
                role: 'SaaS Founder · Austin, TX',
                text: 'Nuestros clientes LATAM pagan en USDC, los fondos están garantizados hasta que entregamos. Cero contracargos en 8 meses.',
                avatar: 'MT',
              },
              {
                name: 'Lucía Fernández',
                role: 'Fintech Ops · São Paulo',
                text: 'El smart contract elimina la fricción de cobrar internacionalmente. Nuestro equipo de compliance ama la trazabilidad on-chain.',
                avatar: 'LF',
              },
            ].map((t, i) => (
              <div key={i} className="rounded-2xl bg-surface-container-lowest border border-outline-variant/30 p-6 flex flex-col gap-4 shadow-sm">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary text-sm font-bold">
                    {t.avatar}
                  </div>
                  <div className="flex flex-col">
                    <span className="text-sm font-semibold text-on-surface">{t.name}</span>
                    <span className="text-[11px] text-secondary">{t.role}</span>
                  </div>
                </div>
                <p className="text-sm text-on-surface-variant leading-relaxed">{t.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════ CTA ═══════════════════════════════════════════ */}
      <section className="py-20 px-6">
        <div className="max-w-3xl mx-auto rounded-2xl bg-primary p-10 md:p-14 flex flex-col items-center gap-6 text-center">
          <h2 className="text-headline-lg font-bold text-on-primary">Protegé tu próxima transacción internacional</h2>
          <p className="text-on-primary/80 max-w-md">
            Creá una orden de custodia en menos de 2 minutos. Sin KYC obligatorio para órdenes menores a $10,000 USDC.
          </p>
          <Link to="/crear-escrow" className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-surface-container-lowest text-primary text-sm font-semibold hover:bg-surface-container-low transition-all shadow-md">
            Crear Enlace Seguro
          </Link>
        </div>
      </section>

      {/* ═══════════════════════════════════════════ FOOTER ═══════════════════════════════════════════ */}
      <footer className="py-12 px-6 border-t border-outline-variant/20 bg-surface-container-low/50">
        <div className="max-w-7xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-8">
          <div className="flex flex-col gap-3 col-span-2 md:col-span-1">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 bg-primary rounded-lg flex items-center justify-center">
                <svg className="w-4 h-4 text-on-primary" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
                </svg>
              </div>
              <span className="text-sm font-bold text-on-surface">Breadline</span>
            </div>
            <p className="text-xs text-secondary leading-relaxed">Garantía cripto para comercio global. Construido sobre Stellar.</p>
          </div>

          {[
            {
              title: 'Producto',
              links: ['Cómo funciona', 'Calculadora', 'Seguridad', 'Testimonios'],
            },
            {
              title: 'Legal',
              links: ['Términos de uso', 'Política de privacidad', 'Descargo de responsabilidad'],
            },
            {
              title: 'Desarrolladores',
              links: ['Documentación', 'GitHub', 'Contrato inteligente', 'API'],
            },
          ].map((col, i) => (
            <div key={i} className="flex flex-col gap-3">
              <span className="text-xs font-bold text-on-surface uppercase tracking-wider">{col.title}</span>
              {col.links.map((link, j) => {
                const hrefMap: Record<string,string> = {
                  'Cómo funciona': '#como-funciona',
                  'Calculadora': '#calculadora',
                  'Seguridad': '#seguridad',
                  'Testimonios': '#testimonios',
                  'Términos de uso': 'https://github.com/FernandoMay/breadline-protocol',
                  'Política de privacidad': 'https://github.com/FernandoMay/breadline-protocol',
                  'Descargo de responsabilidad': 'https://github.com/FernandoMay/breadline-protocol',
                  'Documentación': 'https://github.com/FernandoMay/breadline-protocol',
                  'GitHub': 'https://github.com/FernandoMay/breadline-protocol',
                  'Contrato inteligente': 'https://stellar.expert/explorer/testnet/contract/CARLT3ENKBA5KTWE4R4PSHX6YAI6P6FFU6ZHNKNTSUINRG6FM554YCU5',
                  'API': 'https://github.com/FernandoMay/breadline-protocol',
                };
                const href = hrefMap[link] || 'https://github.com/FernandoMay/breadline-protocol';
                const isExternal = href.startsWith('http');
                return <a key={j} href={href} target={isExternal ? '_blank' : undefined} rel={isExternal ? 'noopener' : undefined} className="text-xs text-secondary hover:text-primary transition-colors">{link}</a>;
              })}
            </div>
          ))}
        </div>

        <div className="max-w-7xl mx-auto mt-10 pt-6 border-t border-outline-variant/20 flex flex-col sm:flex-row items-center justify-between gap-4 text-[11px] text-secondary">
          <span>© 2026 Breadline Protocol. Todos los derechos reservados.</span>
          <span className="font-code-md">Prototype · Stellar Testnet · Soroban · v0.4.1-prototype (Testnet)</span>
        </div>
      </footer>

      {/* ═══════════════════════════════════════════ DEMO MODAL ═══════════════════════════════════════════ */}
      {modalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
          {/* Backdrop */}
          <div className="absolute inset-0 bg-inverse-surface/60 backdrop-blur-sm" onClick={closeDemo} />

          {/* Modal */}
          <div className="relative w-full max-w-lg bg-surface-container-lowest rounded-2xl border border-outline-variant/30 shadow-xl overflow-hidden">
            {/* Header */}
            <div className="px-6 py-4 border-b border-outline-variant/20 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Icon name="play_circle" filled />
                <span className="text-sm font-bold text-on-surface">Demo Interactiva</span>
              </div>
              <button onClick={closeDemo} className="w-8 h-8 rounded-lg hover:bg-surface-container flex items-center justify-center transition-colors">
                <Icon name="close" />
              </button>
            </div>

            {/* Body */}
            <div className="px-6 py-8 flex flex-col items-center gap-6">
              {!demoRunning && demoStep === 0 && (
                <div className="flex flex-col items-center gap-4 text-center">
                  <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center">
                    <Icon name="smart_toy" filled />
                  </div>
                  <p className="text-sm text-secondary max-w-xs">
                    Simulá el flujo completo de una orden de escrow en 4 pasos automáticos.
                  </p>
                  <button onClick={startDemo} className="px-6 py-2.5 rounded-xl bg-primary text-on-primary text-sm font-semibold hover:bg-primary-container transition-all shadow-md">
                    Iniciar Demo
                  </button>
                </div>
              )}

              {demoRunning && (
                <div className="w-full flex flex-col gap-5">
                  {/* Progress */}
                  <div className="flex items-center gap-2">
                    {['Crear', 'Depositar', 'Entregar', 'Liberar'].map((label, i) => (
                      <div key={i} className="flex-1 flex flex-col items-center gap-1">
                        <div className={`w-full h-1 rounded-full transition-colors ${i <= demoStep ? 'bg-primary' : 'bg-surface-container-high'}`} />
                        <span className={`text-[10px] font-semibold ${i <= demoStep ? 'text-primary' : 'text-secondary'}`}>{label}</span>
                      </div>
                    ))}
                  </div>

                  {/* Step content */}
                  <div className="rounded-xl bg-surface-container-low p-6 flex flex-col items-center gap-3 text-center min-h-[120px] justify-center">
                    {demoStep === 0 && (
                      <>
                        <Icon name="add_circle" filled />
                        <span className="text-sm font-semibold text-on-surface">Creando orden de escrow...</span>
                        <span className="text-xs text-secondary">Generando smart contract en Soroban</span>
                      </>
                    )}
                    {demoStep === 1 && (
                      <>
                        <Icon name="account_balance" filled />
                        <span className="text-sm font-semibold text-on-surface">Depositando 2,500 USDC...</span>
                        <span className="text-xs text-secondary">Fondos bloqueados en el contrato</span>
                      </>
                    )}
                    {demoStep === 2 && (
                      <>
                        <Icon name="upload_file" filled />
                        <span className="text-sm font-semibold text-on-surface">Entregable enviado...</span>
                        <span className="text-xs text-secondary">El comprador fue notificado</span>
                      </>
                    )}
                    {demoStep === 3 && (
                      <>
                        <Icon name="check_circle" filled />
                        <span className="text-sm font-semibold text-on-surface">¡Fondos liberados!</span>
                        <span className="text-xs text-secondary">2,500 USDC transferidos al vendedor en 3.2s</span>
                      </>
                    )}
                  </div>

                  {demoStep >= 4 && (
                    <button onClick={closeDemo} className="px-6 py-2.5 rounded-xl bg-primary text-on-primary text-sm font-semibold hover:bg-primary-container transition-all shadow-md">
                      Cerrar Demo
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
