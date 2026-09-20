import { Link } from 'react-router-dom';
import { MOCK_ORDERS, MOCK_USER, formatUSDC, getStatusLabel, getStatusColor, truncateHash } from '../lib/stellar';
import type { Milestone } from '../types';

export default function Dashboard() {
  const totalCustody = MOCK_ORDERS.filter(o => o.status === 'in_progress').reduce((sum, o) => sum + o.amount, 0);
  const available = MOCK_ORDERS.filter(o => o.status === 'completed').reduce((sum, o) => sum + o.netAmount, 0);
  const monthlyCollections = MOCK_ORDERS.reduce((sum, o) => sum + o.amount, 0);
  const savings = monthlyCollections * 0.068;

  return (
    <div className="flex flex-col w-full pb-16 space-y-8">
      {/* Hero Section */}
      <section className="relative overflow-hidden rounded-xl bg-surface-container-lowest p-8 shadow-sm">
        <div className="absolute -right-24 -top-24 w-96 h-96 rounded-full bg-surface-container-high/40 blur-3xl pointer-events-none"></div>
        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="flex flex-col gap-2 max-w-2xl">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-surface-container-low text-primary text-xs font-semibold">
                <svg className="w-4 h-4 text-tertiary" fill="currentColor" viewBox="0 0 24 24"><path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
                Estudio Verificado Tier-1 • LATAM Anchor Ready
              </span>
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-surface-container-low text-secondary font-code-md text-xs">ID: EST-ALFA-9482</span>
            </div>
            <h1 className="text-3xl md:text-4xl text-on-surface tracking-tight font-bold">
              Hola Camila, tienes <span className="text-primary font-bold">3 órdenes de custodia</span> activas
            </h1>
            <p className="text-sm text-secondary">
              Estudio Alfa tiene una reputación de {MOCK_USER.reputation}% con liquidaciones automáticas en Stellar Network bajo el protocolo Soroban v20.1.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3 shrink-0">
            <Link to="/vista-comprador" className="inline-flex items-center gap-2 px-5 py-3 rounded-lg bg-surface-container text-on-surface text-sm font-semibold hover:bg-surface-container-high transition-all shadow-sm">
              <svg className="w-5 h-5 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" /></svg>
              Retirar a Banco Local
            </Link>
            <Link to="/crear-escrow" className="inline-flex items-center gap-2 px-5 py-3 rounded-lg bg-primary-container text-on-primary text-sm font-semibold hover:bg-primary transition-all shadow-md">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" /></svg>
              + Crear Orden de Escrow
            </Link>
          </div>
        </div>
      </section>

      {/* Stats Cards */}
      <section className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-5">
        <StatCard
          title="Total en Custodia"
          value={formatUSDC(totalCustody)}
          subtitle="Fondos bloqueados por clientes extranjeros, 100% asegurados en Soroban."
          icon="lock"
          iconColor="text-primary"
          footer={`${MOCK_ORDERS.filter(o => o.status === 'in_progress').length} contratos inmutables activos`}
          footerColor="text-tertiary"
        />
        <StatCard
          title="Disponible para Retiro"
          value={formatUSDC(available)}
          subtitle="Listo para transferir vía Stellar anchor o rampa local en ARS, BRL, MXN y COP."
          icon="wallet"
          iconColor="text-tertiary"
          footer="Liquidación < 5 mins"
          footerColor="text-primary"
        />
        <StatCard
          title="Cobros este mes"
          value={formatUSDC(monthlyCollections)}
          subtitle="Promedio de liberación de fondos: 4 horas post-aprobación del entregable."
          icon="check"
          iconColor="bg-primary-container"
          footer="+28% vs mes anterior"
          footerColor="text-secondary"
        />
        <StatCard
          title="Ahorro en Comisiones"
          value={`$${savings.toFixed(0)}`}
          subtitle="Ahorrado vs SWIFT / Wire tradicional (Comisión Breadline 0.8% vs bancos 6-8%)."
          icon="savings"
          iconColor="text-tertiary"
          footer="0 intermediarios SWIFT"
          footerColor="text-tertiary"
          valueSuffix="USD"
        />
      </section>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Orders Table */}
        <div className="lg:col-span-8 flex flex-col space-y-6">
          <div className="rounded-xl bg-surface-container-lowest p-6 shadow-sm flex flex-col gap-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h2 className="text-lg text-on-surface font-semibold">Órdenes de Custodia en Curso</h2>
                <p className="text-xs text-secondary">Monitoreo determinista de depósitos, entregas y confirmaciones multi-firma</p>
              </div>
              <div className="relative">
                <svg className="absolute inset-y-0 left-0 pl-3 w-4 h-4 text-secondary pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                <input
                  className="pl-9 pr-4 py-1.5 text-xs rounded-lg bg-surface-container-low text-on-surface placeholder:text-secondary focus:outline-none focus:bg-surface-container transition-all w-64"
                  placeholder="Buscar por cliente o contrato..."
                  type="text"
                />
              </div>
            </div>

            {/* Filter Tabs */}
            <div className="flex items-center gap-2 overflow-x-auto pb-1 text-xs font-medium">
              <button className="px-3.5 py-1.5 rounded-full bg-primary text-on-primary font-semibold shrink-0">Todos ({MOCK_ORDERS.length})</button>
              <button className="px-3.5 py-1.5 rounded-full bg-surface-container-low text-secondary hover:text-on-surface hover:bg-surface-container shrink-0 transition-colors">En Custodia ({MOCK_ORDERS.filter(o => ['in_progress', 'funded'].includes(o.status)).length})</button>
              <button className="px-3.5 py-1.5 rounded-full bg-surface-container-low text-secondary hover:text-on-surface hover:bg-surface-container shrink-0 transition-colors">Por Liberar ({MOCK_ORDERS.filter(o => o.status === 'delivered').length})</button>
              <button className="px-3.5 py-1.5 rounded-full bg-surface-container-low text-secondary hover:text-on-surface hover:bg-surface-container shrink-0 transition-colors">Pendiente de Depósito ({MOCK_ORDERS.filter(o => o.status === 'pending_deposit').length})</button>
              <button className="px-3.5 py-1.5 rounded-full bg-surface-container-low text-secondary hover:text-on-surface hover:bg-surface-container shrink-0 transition-colors">Completados (12)</button>
            </div>

            {/* Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-surface-container-low/60 rounded-lg text-secondary text-xs uppercase tracking-wider">
                    <th className="py-3 px-4 rounded-l-lg">Cliente & Concepto</th>
                    <th className="py-3 px-4">Monto (USDC)</th>
                    <th className="py-3 px-4">Estado del Contrato</th>
                    <th className="py-3 px-4">Hito Actual</th>
                    <th className="py-3 px-4">Vencimiento</th>
                    <th className="py-3 px-4 text-right rounded-r-lg">Acción Rápida</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-surface-container-low text-xs">
                  {MOCK_ORDERS.map((order) => (
                    <tr key={order.id} className="hover:bg-surface-container-low/40 transition-colors">
                      <td className="py-4 px-4">
                        <div className="flex flex-col">
                          <span className="font-semibold text-on-surface flex items-center gap-1.5">
                            {order.clientName}
                            <span className="font-code-md text-[11px] text-secondary font-normal">({order.clientCountry})</span>
                          </span>
                          <span className="text-secondary text-[13px]">{order.serviceTitle}</span>
                        </div>
                      </td>
                      <td className="py-4 px-4 font-code-md font-bold text-on-surface">
                        {formatUSDC(order.amount)}
                      </td>
                      <td className="py-4 px-4">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${getStatusColor(order.status)}`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${order.status === 'in_progress' ? 'bg-tertiary' : order.status === 'delivered' ? 'bg-primary animate-pulse' : 'bg-secondary'}`}></span>
                          {getStatusLabel(order.status)}
                        </span>
                      </td>
                      <td className="py-4 px-4">
                        <div className="flex flex-col gap-1">
                          {order.milestones ? (
                            <>
                              <span className="text-on-surface font-medium text-[12px]">
                                Hito {order.milestones.filter((m: Milestone) => m.status === 'approved').length + 1}/{order.milestones.length}: {order.milestones.find((m: Milestone) => m.status === 'in_progress')?.label || 'Completado'}
                              </span>
                              <div className="w-24 h-1.5 bg-surface-container-low rounded-full overflow-hidden">
                                <div className="bg-primary h-full" style={{ width: `${(order.milestones.filter((m: Milestone) => m.status === 'approved').length / order.milestones.length) * 100}%` }}></div>
                              </div>
                            </>
                          ) : (
                            <span className="text-secondary text-[12px]">—</span>
                          )}
                        </div>
                      </td>
                      <td className="py-4 px-4 font-code-md text-secondary text-[12px]">
                        {new Date(order.deadline).toLocaleDateString('es-AR', { day: '2-digit', month: 'short', year: 'numeric' })}
                      </td>
                      <td className="py-4 px-4 text-right">
                        <Link
                          to="/sala-de-entrega"
                          className="px-2.5 py-1.5 rounded-lg bg-surface-container text-primary text-xs font-semibold hover:bg-surface-container-high transition-colors inline-flex items-center gap-1"
                        >
                          <span>{order.status === 'delivered' ? 'Revisar Entrega' : 'Sala de Entrega'}</span>
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Bottom Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div className="rounded-xl bg-surface-container-lowest p-6 shadow-sm flex flex-col justify-between">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <svg className="w-5 h-5 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" /></svg>
                  <span className="text-lg text-on-surface font-semibold">Auditoría Criptográfica</span>
                </div>
                <span className="font-code-md text-[11px] px-2 py-0.5 rounded bg-surface-container-low text-secondary">Soroban Testnet</span>
              </div>
              <p className="text-xs text-secondary mb-4">
                Cada depósito de escrow genera una cuenta inteligente sin custodia (Trustless Work) asegurada por el consenso de validadores de Stellar.
              </p>
              <div className="bg-surface-container-low rounded-lg p-3.5 flex items-center justify-between">
                <div className="flex flex-col">
                  <span className="font-code-md text-[11px] text-secondary">Último Contrato Ejecutado</span>
                  <span className="font-code-md text-xs text-on-surface font-bold">{truncateHash('CDB94K91F2B8A3E7D6C0')}(0.00001 XLM gas)</span>
                </div>
                <svg className="w-5 h-5 text-tertiary" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
              </div>
            </div>
            <div className="rounded-xl bg-surface-container-lowest p-6 shadow-sm flex flex-col justify-between">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <svg className="w-5 h-5 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" /></svg>
                  <span className="text-lg text-on-surface font-semibold">Términos Comerciales</span>
                </div>
                <span className="text-xs text-tertiary font-semibold">Protección 100%</span>
              </div>
              <p className="text-xs text-secondary mb-4">
                Los clientes bloquean el capital antes de que comiences a trabajar. La liberación es irrevocable una vez verificado el entregable pactado.
              </p>
              <div className="flex items-center gap-4 text-secondary text-xs">
                <div className="flex items-center gap-1">
                  <svg className="w-4 h-4 text-tertiary" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                  <span>Sin contracargos</span>
                </div>
                <div className="flex items-center gap-1">
                  <svg className="w-4 h-4 text-tertiary" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                  <span>Soporte Arbitraje LATAM</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Sidebar */}
        <div className="lg:col-span-4 flex flex-col space-y-6">
          {/* Local Ramp */}
          <div className="rounded-xl bg-surface-container-lowest p-6 shadow-sm flex flex-col gap-5">
            <div className="flex items-center justify-between">
              <span className="text-lg text-on-surface font-semibold">Rampa Local Instantánea</span>
              <span className="px-2 py-0.5 rounded bg-surface-container text-primary font-code-md text-[11px] font-semibold">Anchor SEP-24</span>
            </div>
            <p className="text-xs text-secondary">
              Retira tus USDC directo a tu banco en moneda local (ARS, BRL, MXN, COP) en cuestión de minutos y con comisiones casi nulas.
            </p>
            <div className="space-y-3">
              {[
                { code: 'AR', name: 'Transferencia ARS (CVU/CBU)', sub: 'Acreditación instantánea 24/7', color: 'text-primary' },
                { code: 'BR', name: 'PIX Brasil (BRL)', sub: 'Liquidación en < 30 segundos', color: 'text-tertiary' },
                { code: 'MX', name: 'SPEI México (MXN)', sub: 'Tipo de cambio institucional mayorista', color: 'bg-primary-container' },
              ].map((item) => (
                <div key={item.code} className="flex items-center justify-between p-3 rounded-lg bg-surface-container-low hover:bg-surface-container transition-colors cursor-pointer">
                  <div className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-full bg-surface-container-lowest flex items-center justify-center font-bold text-xs ${item.color}`}>
                      {item.code}
                    </div>
                    <div className="flex flex-col">
                      <span className="text-sm text-on-surface font-semibold">{item.name}</span>
                      <span className="text-[12px] text-secondary">{item.sub}</span>
                    </div>
                  </div>
                  <svg className="w-4 h-4 text-secondary" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                </div>
              ))}
            </div>
            <button className="w-full py-2.5 rounded-lg bg-surface-container text-primary text-xs font-semibold hover:bg-surface-container-high transition-colors text-center">
              Configurar Cuentas Bancarias
            </button>
          </div>

          {/* Activity Feed */}
          <div className="rounded-xl bg-surface-container-lowest p-6 shadow-sm flex flex-col gap-4">
            <span className="text-xs text-secondary uppercase tracking-wider font-semibold">Actividad en Tiempo Real</span>
            <div className="flex flex-col space-y-4">
              {[
                { color: 'bg-tertiary', title: 'Depósito confirmado (2,850 USDC)', sub: 'Austin Tech Partners bloqueó fondos en Soroban', time: 'Hace 23 minutos' },
                { color: 'bg-primary', title: 'Entregable enviado para revisión', sub: 'Nordic Dev Studio fue notificado vía webhook', time: 'Hace 3 horas' },
                { color: 'bg-secondary', title: 'Retiro completado (1,500 USDC)', sub: 'Acreditado en Banco Santander (ARS)', time: 'Ayer, 16:42' },
              ].map((item, i) => (
                <div key={i} className="flex items-start gap-3">
                  <div className={`w-2 h-2 mt-2 rounded-full ${item.color} shrink-0`}></div>
                  <div className="flex flex-col">
                    <span className="text-xs text-on-surface font-medium">{item.title}</span>
                    <span className="text-[12px] text-secondary">{item.sub}</span>
                    <span className="font-code-md text-[10px] text-outline mt-0.5">{item.time}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function StatCard({ title, value, subtitle, icon, iconColor, footer, footerColor, valueSuffix }: {
  title: string;
  value: string;
  subtitle: string;
  icon: string;
  iconColor: string;
  footer: string;
  footerColor: string;
  valueSuffix?: string;
}) {
  const iconPaths: Record<string, string> = {
    lock: 'M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z',
    wallet: 'M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z',
    check: 'M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z',
    savings: 'M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z',
  };

  return (
    <div className="relative overflow-hidden rounded-xl bg-surface-container-lowest p-6 shadow-sm flex flex-col justify-between">
      <div className="flex items-center justify-between mb-4">
        <span className="text-xs text-secondary uppercase tracking-wider">{title}</span>
        <div className="w-8 h-8 rounded-lg bg-surface-container-low flex items-center justify-center">
          <svg className={`w-5 h-5 ${iconColor}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={iconPaths[icon]} /></svg>
        </div>
      </div>
      <div>
        <div className="flex items-baseline gap-2">
          <span className="text-3xl text-on-surface font-bold">{value}</span>
          {valueSuffix && <span className="text-xs text-secondary font-semibold">{valueSuffix}</span>}
        </div>
        <p className="text-xs text-secondary mt-1">{subtitle}</p>
      </div>
      <div className="mt-4 pt-3 flex items-center gap-2 text-xs">
        <span className="w-1.5 h-1.5 rounded-full bg-current" style={{ color: footerColor === 'text-tertiary' ? '#006645' : footerColor === 'text-primary' ? '#0050cb' : '#565d79' }}></span>
        <span className={footerColor}>{footer}</span>
      </div>
    </div>
  );
}
