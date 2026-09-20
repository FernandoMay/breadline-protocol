import { useState } from 'react';

const auditLog = [
  { tx: '7F3A...9E21', action: 'Deposito inicial del comprador', amount: '$2,500.00 USDC', time: '16 mar 09:14', status: 'confirmed' },
  { tx: 'B4C1...3D87', action: 'Fondos bloqueados en contrato', amount: '$2,500.00 USDC', time: '16 mar 09:14', status: 'confirmed' },
  { tx: 'A1D9...7F56', action: 'Vendedor acepto terminos', amount: '--', time: '16 mar 09:22', status: 'confirmed' },
  { tx: 'E8B2...1C43', action: 'Entregable subido por vendedor', amount: '--', time: '18 mar 14:07', status: 'confirmed' },
];

const chatMessages = [
  {
    sender: 'buyer' as const,
    name: 'Marcus Sterling',
    role: 'Apex Digital',
    message: 'The Figma prototype looks solid. Please confirm the design tokens are exported for the component library.',
    time: '18 mar, 11:42',
  },
  {
    sender: 'seller' as const,
    name: 'Camila Valenzuela',
    role: 'Vendedora LATAM',
    message: 'Confirmed. All design tokens are included in the Figma source. Check the Style Guide section for the exported JSON.',
    time: '18 mar, 12:08',
  },
  {
    sender: 'buyer' as const,
    name: 'Marcus Sterling',
    role: 'Apex Digital',
    message: 'Brand guidelines PDF is missing the dark mode variant section. Can you add that before I sign off?',
    time: '18 mar, 13:31',
  },
];

export default function SalaEntrega() {
  const [showReleaseModal, setShowReleaseModal] = useState(false);
  const [newComment, setNewComment] = useState('');
  const [chat, setChat] = useState(chatMessages);

  const handleSend = () => {
    if (!newComment.trim()) return;
    setChat([
      ...chat,
      {
        sender: 'seller' as const,
        name: 'Camila Valenzuela',
        role: 'Vendedora LATAM',
        message: newComment.trim(),
        time: new Date().toLocaleDateString('es-AR', { day: 'numeric', month: 'short' }) + ', ' + new Date().toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' }),
      },
    ]);
    setNewComment('');
  };

  return (
    <div className="flex flex-col w-full pb-16 space-y-8">
      {/* Status Banner */}
      <section className="relative overflow-hidden rounded-xl bg-surface-container-lowest p-6 shadow-sm">
        <div className="absolute -right-16 -top-16 w-64 h-64 rounded-full bg-primary/5 blur-3xl pointer-events-none"></div>
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex flex-col gap-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-tertiary-container/15 text-tertiary text-xs font-semibold">
                <span className="w-2 h-2 rounded-full bg-tertiary animate-pulse"></span>
                Activo en Soroban
              </span>
              <span className="font-code-md text-xs text-secondary bg-surface-container-low px-2 py-0.5 rounded">ID: #ESC-9482-BREAD</span>
            </div>
            <h1 className="text-2xl md:text-3xl text-on-surface tracking-tight font-bold mt-1">
              Sala de Entrega y Revision
            </h1>
            <p className="text-sm text-secondary max-w-xl">
              El comprador tiene un plazo definido para revisar los entregables y liberar los fondos. El contrato Soroban aplica auto-liberacion si no hay respuesta antes del vencimiento.
            </p>
          </div>
          <div className="flex items-center gap-3 shrink-0">
            <div className="px-4 py-3 rounded-xl bg-surface-container-low flex flex-col items-center">
              <span className="text-xs text-secondary uppercase font-semibold">Revision en</span>
              <span className="font-code-md text-2xl text-primary font-bold tracking-tight">02d 14h 38m</span>
            </div>
          </div>
        </div>
      </section>

      {/* Lifecycle Progress Bar */}
      <section className="rounded-xl bg-surface-container-lowest p-6 shadow-sm">
        <div className="flex items-center justify-between">
          {[
            { label: 'Orden Creada', status: 'completed' },
            { label: 'Fondos en Custodia', status: 'completed' },
            { label: 'En Revision', status: 'active' },
            { label: 'Liberacion', status: 'pending' },
          ].map((step, i) => (
            <div key={step.label} className="flex items-center flex-1 last:flex-none">
              <div className="flex flex-col items-center gap-2 relative">
                <div
                  className={`w-10 h-10 rounded-full flex items-center justify-center text-xs font-bold shrink-0 transition-all ${
                    step.status === 'completed'
                      ? 'bg-primary text-on-primary'
                      : step.status === 'active'
                      ? 'bg-primary/15 text-primary ring-4 ring-primary/10 animate-pulse'
                      : 'bg-surface-container-low text-secondary'
                  }`}
                >
                  {step.status === 'completed' ? (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                  ) : (
                    <span>{i + 1}</span>
                  )}
                </div>
                <span className={`text-xs font-semibold whitespace-nowrap ${step.status === 'active' ? 'text-primary' : step.status === 'completed' ? 'text-on-surface' : 'text-secondary'}`}>
                  {step.label}
                </span>
              </div>
              {i < 3 && (
                <div className={`flex-1 h-0.5 mx-3 mt-[-20px] ${step.status === 'completed' ? 'bg-primary' : 'bg-surface-container-low'}`}></div>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* Main Content: 2-column grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Panel (8 cols) */}
        <div className="lg:col-span-8 flex flex-col gap-6">
          {/* Seller Delivery Brief */}
          <section className="rounded-xl bg-surface-container-lowest p-6 shadow-sm flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg text-on-surface font-semibold flex items-center gap-2">
                <svg className="w-5 h-5 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
                Entregable del Vendedor
              </h2>
              <span className="px-2.5 py-0.5 rounded-full bg-tertiary/10 text-tertiary text-xs font-semibold flex items-center gap-1">
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" /></svg>
                SHA-256 Verificado
              </span>
            </div>

            {/* Seller Info */}
            <div className="flex items-center gap-3 p-3 bg-surface-container-low rounded-xl">
              <div className="w-10 h-10 rounded-full bg-primary-container text-on-primary flex items-center justify-center text-sm font-bold shrink-0">CV</div>
              <div className="flex flex-col">
                <span className="text-sm text-on-surface font-semibold">Camila Valenzuela</span>
                <span className="text-xs text-secondary">Vendedora LATAM -- Freelance Studio Lead -- 99.4% reputacion</span>
              </div>
            </div>

            {/* Handover Note */}
            <div className="p-4 bg-surface-container-low/60 rounded-xl border-l-4 border-primary">
              <p className="text-sm text-on-surface italic leading-relaxed">
                "Entrega completa del Design System y Brand Guidelines para Apex Digital. Todos los componentes estan documentados en Figma con tokens exportados. La guia de marca incluye especificaciones de color, tipografia y uso del logo en multiples formatos."
              </p>
              <span className="text-xs text-secondary mt-2 block font-code-md">-- Camila V., 18 mar 14:07</span>
            </div>
          </section>

          {/* Uploaded Assets */}
          <section className="rounded-xl bg-surface-container-lowest p-6 shadow-sm flex flex-col gap-4">
            <h2 className="text-lg text-on-surface font-semibold flex items-center gap-2">
              <svg className="w-5 h-5 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" /></svg>
              Archivos Subidos
            </h2>

            <div className="flex flex-col gap-3">
              {/* File 1: Figma */}
              <div className="flex items-center justify-between p-4 bg-surface-container-low rounded-xl hover:bg-surface-container transition-colors">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                    <svg className="w-5 h-5 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-sm text-on-surface font-semibold">Design_System_Breadline_v1.0.fig</span>
                    <div className="flex items-center gap-2 text-xs text-secondary">
                      <span>42.8 MB</span>
                      <span className="w-1 h-1 rounded-full bg-outline-variant"></span>
                      <span>Figma Source</span>
                      <span className="w-1 h-1 rounded-full bg-outline-variant"></span>
                      <span className="text-tertiary flex items-center gap-1">
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" /></svg>
                        SHA-256 verificado
                      </span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <button className="px-3 py-1.5 rounded-lg bg-surface-container text-primary text-xs font-semibold hover:bg-primary hover:text-on-primary transition-colors flex items-center gap-1.5">
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                    Ver
                  </button>
                  <button className="px-3 py-1.5 rounded-lg bg-surface-container-low text-secondary text-xs font-semibold hover:text-on-surface transition-colors flex items-center gap-1.5">
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                    Descargar
                  </button>
                </div>
              </div>

              {/* File 2: PDF */}
              <div className="flex items-center justify-between p-4 bg-surface-container-low rounded-xl hover:bg-surface-container transition-colors">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-tertiary/10 flex items-center justify-center shrink-0">
                    <svg className="w-5 h-5 text-tertiary" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-sm text-on-surface font-semibold">Brand_Guidelines_Apex_Digital.pdf</span>
                    <div className="flex items-center gap-2 text-xs text-secondary">
                      <span>8.4 MB</span>
                      <span className="w-1 h-1 rounded-full bg-outline-variant"></span>
                      <span>PDF Specification</span>
                      <span className="w-1 h-1 rounded-full bg-outline-variant"></span>
                      <span className="text-tertiary flex items-center gap-1">
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" /></svg>
                        SHA-256 verificado
                      </span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <button className="px-3 py-1.5 rounded-lg bg-surface-container text-primary text-xs font-semibold hover:bg-primary hover:text-on-primary transition-colors flex items-center gap-1.5">
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                    Ver
                  </button>
                  <button className="px-3 py-1.5 rounded-lg bg-surface-container-low text-secondary text-xs font-semibold hover:text-on-surface transition-colors flex items-center gap-1.5">
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                    Descargar
                  </button>
                </div>
              </div>
            </div>
          </section>

          {/* Figma Live Preview */}
          <section className="rounded-xl bg-surface-container-lowest p-6 shadow-sm flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg text-on-surface font-semibold flex items-center gap-2">
                <svg className="w-5 h-5 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                Vista Previa Interactiva -- Figma Embed
              </h2>
              <span className="font-code-md text-[11px] text-secondary bg-surface-container-low px-2 py-0.5 rounded">v1.0 -- 18 mar</span>
            </div>
            <div className="relative rounded-xl overflow-hidden bg-surface-container-low aspect-video flex items-center justify-center border border-outline-variant/30">
              {/* Mock preview image placeholder */}
              <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-surface-container-low to-tertiary/5"></div>
              <div className="relative z-10 flex flex-col items-center gap-4 p-8">
                <div className="w-full max-w-md bg-surface-container-lowest rounded-xl shadow-md p-6 flex flex-col gap-4 border border-outline-variant/20">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-error/40"></div>
                    <div className="w-3 h-3 rounded-full bg-yellow-400/40"></div>
                    <div className="w-3 h-3 rounded-full bg-tertiary/40"></div>
                    <span className="ml-auto font-code-md text-[10px] text-secondary">Figma -- Breadline Design System</span>
                  </div>
                  <div className="flex gap-3">
                    <div className="w-1/3 bg-primary/10 rounded-lg h-20"></div>
                    <div className="w-1/3 bg-tertiary/10 rounded-lg h-20"></div>
                    <div className="w-1/3 bg-surface-container-high rounded-lg h-20"></div>
                  </div>
                  <div className="flex gap-2">
                    <div className="h-2 bg-primary/20 rounded-full flex-1"></div>
                    <div className="h-2 bg-tertiary/20 rounded-full flex-[0.6]"></div>
                    <div className="h-2 bg-secondary/10 rounded-full flex-[0.3]"></div>
                  </div>
                  <div className="flex gap-2">
                    <div className="h-8 bg-primary rounded-lg flex-1"></div>
                    <div className="h-8 bg-surface-container-high rounded-lg flex-1"></div>
                    <div className="h-8 bg-surface-container rounded-lg flex-[0.5]"></div>
                  </div>
                </div>
                <span className="text-xs text-secondary">Click para abrir en Figma (requiere autenticacion)</span>
              </div>
              {/* Interactive overlay */}
              <div className="absolute inset-0 bg-transparent hover:bg-primary/5 transition-colors cursor-pointer flex items-center justify-center opacity-0 hover:opacity-100">
                <div className="bg-surface-container-lowest/90 px-4 py-2 rounded-lg shadow-md flex items-center gap-2 text-sm text-primary font-semibold">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" /></svg>
                  Abrir en Figma
                </div>
              </div>
            </div>
          </section>

          {/* Communication Channel */}
          <section className="rounded-xl bg-surface-container-lowest p-6 shadow-sm flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg text-on-surface font-semibold flex items-center gap-2">
                <svg className="w-5 h-5 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" /></svg>
                Canal de Comunicacion y Aprobacion
              </h2>
              <span className="px-2.5 py-0.5 rounded-full bg-primary/10 text-primary text-xs font-semibold flex items-center gap-1.5">
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
                Cifrado E2E
              </span>
            </div>

            {/* Chat Messages */}
            <div className="flex flex-col gap-4 max-h-80 overflow-y-auto p-4 bg-surface-container-low/40 rounded-xl">
              {chat.map((msg, i) => (
                <div key={i} className={`flex items-start gap-3 ${msg.sender === 'seller' ? 'flex-row-reverse' : ''}`}>
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${msg.sender === 'buyer' ? 'bg-secondary-container text-on-secondary-container' : 'bg-primary-container text-on-primary'}`}>
                    {msg.sender === 'buyer' ? 'MS' : 'CV'}
                  </div>
                  <div className={`flex flex-col max-w-xs ${msg.sender === 'seller' ? 'items-end' : ''}`}>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs text-on-surface font-semibold">{msg.name}</span>
                      <span className="text-[10px] text-secondary">{msg.role}</span>
                    </div>
                    <div className={`px-3.5 py-2.5 rounded-xl text-sm leading-relaxed ${msg.sender === 'buyer' ? 'bg-surface-container-lowest text-on-surface border border-outline-variant/30' : 'bg-primary text-on-primary'}`}>
                      {msg.message}
                    </div>
                    <span className="font-code-md text-[10px] text-outline mt-1">{msg.time}</span>
                  </div>
                </div>
              ))}
            </div>

            {/* Comment Input */}
            <div className="flex items-start gap-3 pt-2">
              <div className="w-8 h-8 rounded-full bg-primary-container text-on-primary flex items-center justify-center text-xs font-bold shrink-0">CV</div>
              <div className="flex-1 flex flex-col gap-2">
                <textarea
                  className="w-full px-4 py-2.5 rounded-lg bg-surface-container-low text-on-surface text-sm focus:bg-surface-container-lowest focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all placeholder:text-outline resize-none leading-relaxed"
                  placeholder="Escribe un comentario o instruccion para el comprador..."
                  rows={2}
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
                />
                <div className="flex items-center justify-between">
                  <span className="text-[11px] text-secondary flex items-center gap-1">
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
                    Mensajes cifrados, almacenados en IPFS
                  </span>
                  <button
                    className="px-4 py-1.5 rounded-lg bg-primary text-on-primary text-xs font-semibold hover:bg-primary-container transition-colors flex items-center gap-1.5 disabled:opacity-40 disabled:cursor-not-allowed"
                    onClick={handleSend}
                    disabled={!newComment.trim()}
                  >
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" /></svg>
                    Enviar
                  </button>
                </div>
              </div>
            </div>
          </section>
        </div>

        {/* Right Panel (4 cols, sticky) */}
        <div className="lg:col-span-4 flex flex-col gap-6 lg:sticky lg:top-24">
          {/* Buyer Decision Zone */}
          <section className="rounded-xl bg-surface-container-lowest p-6 shadow-sm flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg text-on-surface font-semibold flex items-center gap-2">
                <svg className="w-5 h-5 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" /></svg>
                Decision del Comprador
              </h2>
            </div>

            <div className="p-4 bg-tertiary/5 rounded-xl border border-tertiary/15 flex flex-col gap-3">
              <span className="text-xs text-secondary uppercase font-semibold">Liberacion de Fondos en Custodia</span>
              <div className="flex items-baseline gap-2">
                <span className="text-3xl text-on-surface font-bold font-code-md">$2,500.00</span>
                <span className="text-sm text-secondary font-semibold">USDC</span>
              </div>
              <div className="h-px bg-outline-variant/30"></div>
              <div className="flex items-center justify-between text-xs text-secondary">
                <span>Comision Breadline (0.8%):</span>
                <span className="font-code-md text-on-surface font-medium">-$20.00</span>
              </div>
              <div className="flex items-center justify-between text-xs text-secondary">
                <span>Neto al vendedor:</span>
                <span className="font-code-md text-tertiary font-bold">$2,480.00</span>
              </div>
            </div>

            <button
              className="w-full py-3 px-4 rounded-xl bg-primary hover:bg-primary-container text-on-primary text-sm font-bold shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2 active:scale-[0.99]"
              onClick={() => setShowReleaseModal(true)}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" /></svg>
              Aprobar Entrega y Liberar Fondos
            </button>

            <button className="w-full py-2.5 px-4 rounded-xl bg-surface-container text-on-surface text-xs font-semibold hover:bg-surface-container-high transition-colors flex items-center justify-center gap-2 border border-outline-variant/30">
              <svg className="w-4 h-4 text-secondary" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
              Solicitar Revisiones o Ajustes
            </button>

            <div className="flex items-center justify-center pt-1">
              <button className="text-xs text-secondary hover:text-error transition-colors flex items-center gap-1 underline underline-offset-2">
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 6l3 1m0 0l-3 9a5.002 5.002 0 006.001 0M6 7l3 9M6 7l6-2m6 2l3-1m-3 1l3 9a5.002 5.002 0 006.001 0M18 7l3 9m-3-9l-6-2m0-2v2m0 16V5m0 16H9m3 0h3" /></svg>
                Iniciar Arbitraje
              </button>
            </div>
          </section>

          {/* Cryptographic Vault Panel */}
          <section className="rounded-xl bg-surface-container-lowest p-6 shadow-sm flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <h2 className="text-sm text-on-surface font-semibold flex items-center gap-2">
                <svg className="w-4 h-4 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
                Panel Criptografico
              </h2>
              <span className="font-code-md text-[10px] px-2 py-0.5 rounded bg-surface-container-low text-secondary">Soroban Testnet</span>
            </div>

            {/* Contract Address */}
            <div className="p-3 bg-surface-container-low rounded-lg flex flex-col gap-1.5">
              <span className="text-[10px] text-secondary uppercase font-semibold">Direccion del Contrato</span>
              <div className="flex items-center gap-2">
                <span className="font-code-md text-[11px] text-on-surface font-medium truncate select-all flex-1">CC7A9B0284F1E93B92F2B48A10C892147D3A4B9F2B</span>
                <button className="shrink-0 p-1 rounded text-secondary hover:text-primary transition-colors">
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>
                </button>
              </div>
            </div>

            {/* Balance Breakdown */}
            <div className="flex flex-col gap-2">
              <span className="text-[10px] text-secondary uppercase font-semibold">Balance del Contrato</span>
              <div className="flex items-center justify-between p-2.5 bg-surface-container-low rounded-lg">
                <span className="text-xs text-secondary">Total depositado</span>
                <span className="font-code-md text-xs text-on-surface font-bold">$2,500.00 USDC</span>
              </div>
              <div className="flex items-center justify-between p-2.5 bg-surface-container-low rounded-lg">
                <span className="text-xs text-secondary">Garantia del contrato</span>
                <span className="font-code-md text-xs text-primary font-bold">$2,500.00 USDC</span>
              </div>
              <div className="flex items-center justify-between p-2.5 bg-surface-container-low rounded-lg">
                <span className="text-xs text-secondary">Gas Stellar acumulado</span>
                <span className="font-code-md text-xs text-secondary font-medium">0.00004 XLM</span>
              </div>
            </div>

            {/* Audit Log */}
            <div className="flex flex-col gap-2">
              <span className="text-[10px] text-secondary uppercase font-semibold">Registro de Auditoria</span>
              <div className="flex flex-col gap-1.5">
                {auditLog.map((entry, i) => (
                  <div key={i} className="flex items-start gap-2 p-2 bg-surface-container-low/60 rounded-lg">
                    <div className="w-1.5 h-1.5 rounded-full bg-tertiary mt-1.5 shrink-0"></div>
                    <div className="flex flex-col flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-[11px] text-on-surface font-medium truncate">{entry.action}</span>
                        <span className="font-code-md text-[10px] text-secondary shrink-0">{entry.time}</span>
                      </div>
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-code-md text-[10px] text-outline">{entry.tx}</span>
                        <span className="font-code-md text-[10px] text-secondary font-medium">{entry.amount}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </section>
        </div>
      </div>

      {/* Release Confirmation Modal */}
      {showReleaseModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-inverse-surface/60 backdrop-blur-sm" onClick={() => setShowReleaseModal(false)}></div>
          <div className="relative z-10 w-full max-w-md bg-surface-container-lowest rounded-2xl shadow-xl p-6 flex flex-col gap-5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-10 h-10 rounded-full bg-tertiary/15 flex items-center justify-center">
                  <svg className="w-5 h-5 text-tertiary" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" /></svg>
                </div>
                <h3 className="text-lg text-on-surface font-semibold">Confirmar Liberacion de Fondos</h3>
              </div>
              <button
                className="p-1.5 rounded-lg text-secondary hover:text-on-surface hover:bg-surface-container-low transition-colors"
                onClick={() => setShowReleaseModal(false)}
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>

            <p className="text-sm text-secondary leading-relaxed">
              Estas a punto de liberar los fondos en custodia al vendedor. Esta accion es <strong className="text-on-surface">irrevocable</strong> una vez ejecutada en el contrato de Soroban.
            </p>

            <div className="p-4 bg-surface-container-low rounded-xl flex flex-col gap-2.5">
              <div className="flex items-center justify-between text-sm">
                <span className="text-secondary">Monto a liberar:</span>
                <span className="font-code-md text-on-surface font-bold">$2,500.00 USDC</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-secondary">Destinatario:</span>
                <span className="text-on-surface font-semibold">Camila Valenzuela</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-secondary">Contrato:</span>
                <span className="font-code-md text-secondary text-xs">CC7A9B...4B9F2B</span>
              </div>
            </div>

            <div className="p-3 bg-tertiary/5 rounded-lg border border-tertiary/15">
              <p className="text-xs text-on-surface leading-relaxed flex items-start gap-2">
                <svg className="w-4 h-4 text-tertiary shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                La transaccion se ejecutara on-chain en Stellar Testnet con un fee de approx. 0.00001 XLM.
              </p>
            </div>

            <div className="flex items-center gap-3">
              <button
                className="flex-1 py-2.5 px-4 rounded-xl bg-surface-container text-on-surface text-xs font-semibold hover:bg-surface-container-high transition-colors border border-outline-variant/30"
                onClick={() => setShowReleaseModal(false)}
              >
                Cancelar
              </button>
              <button
                className="flex-1 py-2.5 px-4 rounded-xl bg-primary hover:bg-primary-container text-on-primary text-xs font-bold shadow-md transition-all flex items-center justify-center gap-2"
                onClick={() => setShowReleaseModal(false)}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                Confirmar Liberacion
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
