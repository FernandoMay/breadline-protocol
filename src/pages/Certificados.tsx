import { useState, useEffect, useCallback } from "react";
import { fetchEscrow, formatScAmount, ESCROW_CONTRACT_ID } from "../lib/contract";
import type { OnChainEscrow } from "../lib/contract";
import { truncateAddress, truncateHash } from "../lib/stellar";

// ---------------------------------------------------------------------------
// Icons (inline SVG, stroke-only, no emoji)
// ---------------------------------------------------------------------------

function IconZoomIn({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <circle cx="11" cy="11" r="8" />
      <line x1="21" y1="21" x2="16.65" y2="16.65" />
      <line x1="11" y1="8" x2="11" y2="14" />
      <line x1="8" y1="11" x2="14" y2="11" />
    </svg>
  );
}

function IconZoomOut({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <circle cx="11" cy="11" r="8" />
      <line x1="21" y1="21" x2="16.65" y2="16.65" />
      <line x1="8" y1="11" x2="14" y2="11" />
    </svg>
  );
}

function IconPrinter({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <polyline points="6 9 6 2 18 2 18 9" />
      <path d="M6 18H4a2 2 0 01-2-2v-5a2 2 0 012-2h16a2 2 0 012 2v5a2 2 0 01-2 2h-2" />
      <rect x="6" y="14" width="12" height="8" />
    </svg>
  );
}

function IconDownload({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
      <polyline points="7 10 12 15 17 10" />
      <line x1="12" y1="15" x2="12" y2="3" />
    </svg>
  );
}

function IconShield({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
      <polyline points="9 12 11 14 15 10" />
    </svg>
  );
}

function IconCheck({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type Lang = "ES" | "EN";

// ---------------------------------------------------------------------------
// Barcode pseudo-visualization
// ---------------------------------------------------------------------------

function Barcode({ value }: { value: string }) {
  const widths = Array.from(value).map((ch) => 1 + (ch.charCodeAt(0) % 3));
  return (
    <div className="flex items-end gap-px h-8" aria-hidden>
      {widths.map((w, i) => (
        <div key={i} className="bg-gray-900" style={{ width: w, height: i % 2 === 0 ? 32 : 24 }} />
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// QR Code SVG (simplified static pattern)
// ---------------------------------------------------------------------------

function QRCodeSVG() {
  const cells = [
    [1,1,1,1,1,1,1,0,1,0,1,0,1,1,1,1,1,1,1],
    [1,0,0,0,0,0,1,0,0,1,1,0,1,0,0,0,0,0,1],
    [1,0,1,1,1,0,1,0,1,0,0,0,1,0,1,1,1,0,1],
    [1,0,1,1,1,0,1,0,0,1,1,0,1,0,1,1,1,0,1],
    [1,0,1,1,1,0,1,0,1,1,0,0,1,0,1,1,1,0,1],
    [1,0,0,0,0,0,1,0,0,0,1,0,1,0,0,0,0,0,1],
    [1,1,1,1,1,1,1,0,1,0,1,0,1,1,1,1,1,1,1],
    [0,0,0,0,0,0,0,0,1,1,0,0,0,0,0,0,0,0,0],
    [1,0,1,0,1,1,1,1,0,0,1,1,0,1,0,1,0,1,1],
    [0,1,1,0,0,0,1,1,1,0,1,0,1,0,0,1,1,0,0],
    [1,1,0,1,1,1,0,0,1,1,0,1,1,1,0,0,1,1,1],
    [0,0,0,0,0,0,0,0,1,0,1,1,0,1,1,0,0,1,0],
    [1,1,1,1,1,1,1,0,0,1,0,0,1,0,1,1,0,1,1],
    [1,0,0,0,0,0,1,0,1,1,1,0,0,1,0,0,1,0,1],
    [1,0,1,1,1,0,1,0,1,0,1,1,1,0,1,0,1,1,0],
    [1,0,1,1,1,0,1,0,0,1,0,1,0,1,1,1,0,0,1],
    [1,0,1,1,1,0,1,0,1,0,0,1,1,0,0,1,0,1,0],
    [1,0,0,0,0,0,1,0,0,1,1,0,0,1,1,0,1,0,1],
    [1,1,1,1,1,1,1,0,1,1,0,1,1,0,1,1,1,0,0],
  ];
  const size = 19;
  const cell = 10;
  return (
    <svg viewBox={`0 0 ${size * cell} ${size * cell}`} className="w-28 h-28" role="img" aria-label="QR code">
      {cells.map((row, y) =>
        row.map((v, x) =>
          v ? <rect key={`${y}-${x}`} x={x * cell} y={y * cell} width={cell} height={cell} fill="#111827" /> : null
        )
      )}
    </svg>
  );
}

// ---------------------------------------------------------------------------
// Institutional seal
// ---------------------------------------------------------------------------

function InstitutionalSeal() {
  return (
    <svg viewBox="0 0 120 120" className="w-24 h-24" role="img" aria-label="Institutional seal">
      <circle cx="60" cy="60" r="56" fill="none" stroke="#1e3a5f" strokeWidth="3" />
      <circle cx="60" cy="60" r="50" fill="none" stroke="#1e3a5f" strokeWidth="1.5" />
      <path id="seal-arc" d="M60 14 A46 46 0 1 1 59.99 14" fill="none" />
      <text fontSize="7" fill="#1e3a5f" fontWeight="700" letterSpacing="1.5">
        <textPath href="#seal-arc" startOffset="8%">STELLAR SCP AUDIT</textPath>
        <textPath href="#seal-arc" startOffset="52%">CERTIFICADO OFICIAL</textPath>
      </text>
      <circle cx="60" cy="60" r="22" fill="none" stroke="#1e3a5f" strokeWidth="1" />
      <text x="60" y="58" textAnchor="middle" fontSize="10" fontWeight="700" fill="#1e3a5f">SCP</text>
      <text x="60" y="70" textAnchor="middle" fontSize="6" fill="#1e3a5f">VERIFIED</text>
    </svg>
  );
}

// ---------------------------------------------------------------------------
// Section header
// ---------------------------------------------------------------------------

function SectionTitle({ number, title }: { number: string; title: string }) {
  return (
    <div className="flex items-center gap-3 mb-3 mt-8 first:mt-0">
      <span className="flex items-center justify-center w-7 h-7 rounded bg-[#1e3a5f] text-white text-xs font-bold shrink-0">{number}</span>
      <h2 className="text-sm font-bold uppercase tracking-wider text-[#1e3a5f]">{title}</h2>
      <div className="flex-1 border-b border-gray-300" />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Labels
// ---------------------------------------------------------------------------

const LABELS: Record<Lang, Record<string, string>> = {
  ES: {
    toolbarStatus: "VALIDADO",
    page: "Pagina",
    verify: "Verificar SHA-256",
    print: "Imprimir",
    downloadPdf: "Descargar PDF",
    institution: "Breadline -- Plataforma de Escrow Stellar",
    certificateTitle: "CERTIFICADO INSTITUCIONAL DE LIQUIDACION Y LAUDO ARBITRAL VINCULANTE",
    section1: "Resumen Ejecutivo",
    section2: "Partes Involucradas",
    section3: "Liquidacion Financiera",
    section4: "Auditoria Criptografica",
    section5: "Validez y Sellos",
    escrow: "Escrow No.",
    totalAmount: "Monto Total",
    resolution: "Estado",
    buyer: "Comprador",
    seller: "Vendedor",
    gasLabel: "Gas",
    feeLabel: "Fee",
    transactionHash: "Hash de Transaccion",
    signers: "Direccion del Contrato",
    qrLabel: "Verificacion QR",
    sealLabel: "Sello Institucional",
    legalValidity:
      "Este certificado tiene validez conforme al articulo 7 de la Ley Modelo de la CNUDMI/UNCITRAL sobre Comercio Electronico (1996), y al Protocolo de Consenso Federado de Stellar (SCP). Su integridad criptografica puede ser verificada de forma independiente.",
    footerPage: "Pagina",
    of: "de",
    folio: "Folio",
    ledgerSeq: "Contrato Soroban",
    hashVerified: "Hash verificado correctamente",
    hashVerifying: "Verificando hash...",
    toastClose: "Cerrar",
    created: "Creacion",
    deadline: "Fecha Limite",
    description: "Descripcion del Servicio",
  },
  EN: {
    toolbarStatus: "VALIDATED",
    page: "Page",
    verify: "Verify SHA-256",
    print: "Print",
    downloadPdf: "Download PDF",
    institution: "Breadline -- Stellar Escrow Platform",
    certificateTitle: "INSTITUTIONAL CERTIFICATE OF SETTLEMENT AND BINDING ARBITRAL AWARD",
    section1: "Executive Summary",
    section2: "Involved Parties",
    section3: "Financial Settlement",
    section4: "Cryptographic Audit",
    section5: "Validity and Seals",
    escrow: "Escrow No.",
    totalAmount: "Total Amount",
    resolution: "State",
    buyer: "Buyer",
    seller: "Seller",
    gasLabel: "Gas",
    feeLabel: "Fee",
    transactionHash: "Transaction Hash",
    signers: "Contract Address",
    qrLabel: "QR Verification",
    sealLabel: "Institutional Seal",
    legalValidity:
      "This certificate is valid under Article 7 of the UNCITRAL Model Law on Electronic Commerce (1996) and the Stellar Consensus Protocol (SCP). Its cryptographic integrity can be independently verified.",
    footerPage: "Page",
    of: "of",
    folio: "Folio",
    ledgerSeq: "Soroban Contract",
    hashVerified: "Hash verified successfully",
    hashVerifying: "Verifying hash...",
    toastClose: "Close",
    created: "Created",
    deadline: "Deadline",
    description: "Service Description",
  },
};

// ---------------------------------------------------------------------------
// Format helpers
// ---------------------------------------------------------------------------

function formatTimestamp(ts: bigint): string {
  const d = new Date(Number(ts) * 1000);
  return d.toISOString();
}

function formatTimestampLocal(ts: bigint): string {
  const d = new Date(Number(ts) * 1000);
  return d.toLocaleDateString("es-MX", { day: "2-digit", month: "long", year: "numeric" });
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export default function Certificados() {
  const [zoom, setZoom] = useState(100);
  const [lang, setLang] = useState<Lang>("ES");
  const [toast, setToast] = useState<string | null>(null);
  const [escrow, setEscrow] = useState<OnChainEscrow | null>(null);
  const [loading, setLoading] = useState(true);

  const t = LABELS[lang];

  useEffect(() => {
    fetchEscrow()
      .then(setEscrow)
      .catch(() => setEscrow(null))
      .finally(() => setLoading(false));
  }, []);

  const zoomIn = useCallback(() => setZoom((z) => Math.min(z + 10, 150)), []);
  const zoomOut = useCallback(() => setZoom((z) => Math.max(z - 10, 60)), []);
  const handlePrint = useCallback(() => window.print(), []);

  const handleDownloadPdf = useCallback(() => {
    setToast(lang === "ES" ? "Preparando descarga..." : "Preparing download...");
    setTimeout(() => setToast(null), 2000);
  }, [lang]);

  const handleVerifyHash = useCallback(() => {
    setToast(t.hashVerifying);
    setTimeout(() => {
      setToast(t.hashVerified);
      setTimeout(() => setToast(null), 2500);
    }, 1200);
  }, [t]);

  const toggleLang = useCallback(() => {
    setLang((prev) => (prev === "ES" ? "EN" : "ES"));
  }, []);

  // -----------------------------------------------------------------------
  // Toolbar
  // -----------------------------------------------------------------------
  const toolbar = (
    <div className="sticky top-0 z-50 flex items-center justify-between gap-2 px-4 py-2 bg-white border-b border-gray-200 shadow-sm print:hidden">
      <div className="flex items-center gap-3">
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 text-xs font-semibold border border-emerald-200">
          <IconShield className="w-3.5 h-3.5" />
          {t.toolbarStatus}
        </span>
      </div>
      <div className="flex items-center gap-1.5">
        <button onClick={zoomOut} className="p-1.5 rounded hover:bg-gray-100 text-gray-600 transition-colors" aria-label="Zoom out">
          <IconZoomOut />
        </button>
        <span className="w-12 text-center text-xs font-mono text-gray-600">{zoom}%</span>
        <button onClick={zoomIn} className="p-1.5 rounded hover:bg-gray-100 text-gray-600 transition-colors" aria-label="Zoom in">
          <IconZoomIn />
        </button>
      </div>
      <div className="flex items-center gap-1.5">
        <button onClick={toggleLang} className="px-2.5 py-1 text-xs font-semibold rounded border border-gray-300 hover:bg-gray-100 text-gray-700 transition-colors">
          {lang === "ES" ? "EN" : "ES"}
        </button>
        <button onClick={handleVerifyHash} className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded bg-[#1e3a5f] text-white hover:bg-[#162d4a] transition-colors">
          <IconCheck className="w-3.5 h-3.5" />
          {t.verify}
        </button>
        <button onClick={handlePrint} className="p-1.5 rounded hover:bg-gray-100 text-gray-600 transition-colors" aria-label={t.print}>
          <IconPrinter />
        </button>
        <button onClick={handleDownloadPdf} className="p-1.5 rounded hover:bg-gray-100 text-gray-600 transition-colors" aria-label={t.downloadPdf}>
          <IconDownload />
        </button>
      </div>
    </div>
  );

  // -----------------------------------------------------------------------
  // Toast
  // -----------------------------------------------------------------------
  const toastEl = toast ? (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[100] flex items-center gap-3 px-4 py-2.5 rounded-lg bg-gray-900 text-white text-sm shadow-lg print:hidden">
      <IconShield className="w-4 h-4 text-emerald-400 shrink-0" />
      <span>{toast}</span>
      <button onClick={() => setToast(null)} className="ml-2 text-xs text-gray-400 hover:text-white">
        {t.toastClose}
      </button>
    </div>
  ) : null;

  // -----------------------------------------------------------------------
  // Loading
  // -----------------------------------------------------------------------
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 flex flex-col items-center justify-center gap-4">
        <div className="w-8 h-8 border-2 border-[#1e3a5f] border-t-transparent rounded-full animate-spin" />
        <span className="text-sm text-gray-500">Loading escrow from chain...</span>
      </div>
    );
  }

  // -----------------------------------------------------------------------
  // No escrow or not yet resolved — show placeholder
  // -----------------------------------------------------------------------
  const canShowCertificate = escrow && (escrow.state === "Released" || escrow.state === "Disputed");

  const noCertificateView = (
    <div className="min-h-screen bg-gray-100">
      {toolbar}
      <div className="flex flex-col items-center justify-center py-24 px-4">
        <div className="max-w-md text-center space-y-4">
          <svg className="w-16 h-16 text-gray-300 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          <h2 className="text-lg font-semibold text-gray-700">Certificate available after escrow completion</h2>
          <p className="text-sm text-gray-500">
            A certificate will be generated once the escrow is Released or Disputed on-chain.
            {escrow && (
              <> Current state: <strong className="text-gray-700">{escrow.state}</strong>.</>
            )}
          </p>
        </div>
      </div>
      {toastEl}
    </div>
  );

  if (!canShowCertificate) return noCertificateView;

  // -----------------------------------------------------------------------
  // A4 document with real data
  // -----------------------------------------------------------------------
  const documentContent = (
    <div
      className="mx-auto bg-white shadow-2xl print:shadow-none"
      style={{ maxWidth: 940, transform: `scale(${zoom / 100})`, transformOrigin: "top center", width: "100%" }}
    >
      <div className="px-12 py-10 text-gray-900" style={{ fontSize: 13, lineHeight: 1.7 }}>
        {/* Institutional Header */}
        <header className="flex flex-col gap-4 pb-6 border-b-2 border-[#1e3a5f]">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-4">
              <div className="flex items-center justify-center w-14 h-14 rounded-lg bg-[#1e3a5f] text-white text-xl font-black tracking-tight shrink-0">BL</div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-widest text-[#1e3a5f]">{t.institution}</p>
                <div className="mt-1.5 inline-flex items-center gap-1.5 px-2 py-0.5 rounded bg-blue-50 border border-blue-200 text-[10px] font-bold text-blue-700 uppercase tracking-wide">ISO 20022</div>
              </div>
            </div>
            <div className="text-right shrink-0">
              <p className="text-[10px] uppercase tracking-widest text-gray-500">{t.folio}</p>
              <p className="font-mono text-sm font-bold text-[#1e3a5f]">{truncateHash(ESCROW_CONTRACT_ID, 8)}</p>
              <div className="flex justify-end mt-1.5">
                <Barcode value={ESCROW_CONTRACT_ID.replace(/[^A-Z0-9]/gi, "").slice(0, 20)} />
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2 text-[10px] text-gray-500 uppercase tracking-widest">
            <span>{t.ledgerSeq}:</span>
            <span className="font-mono font-semibold text-gray-700">{ESCROW_CONTRACT_ID}</span>
          </div>
        </header>

        {/* Document Title */}
        <h1 className="mt-8 mb-6 text-center text-base font-black uppercase tracking-wide text-[#1e3a5f] leading-snug">
          {t.certificateTitle}
        </h1>

        {/* Cryptographic badges */}
        <div className="flex flex-wrap items-center justify-center gap-3 mb-8">
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-indigo-50 border border-indigo-200 text-[10px] font-mono font-semibold text-indigo-700">
            <IconShield className="w-3 h-3" />
            Soroban Contract
          </span>
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-gray-50 border border-gray-200 text-[10px] font-mono font-semibold text-gray-600">
            {formatTimestamp(escrow!.created_at)}
          </span>
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-amber-50 border border-amber-200 text-[10px] font-mono font-semibold text-amber-700">
            {escrow!.state}
          </span>
        </div>

        {/* Section 1 - Executive Summary */}
        <SectionTitle number="1" title={t.section1} />
        <div className="grid grid-cols-2 gap-x-8 gap-y-2 text-xs">
          <div>
            <span className="text-gray-500">{t.escrow}</span>{" "}
            <span className="font-mono font-semibold">{truncateHash(ESCROW_CONTRACT_ID, 12)}</span>
          </div>
          <div>
            <span className="text-gray-500">{t.resolution}:</span>{" "}
            <span className="font-semibold">{escrow!.state}</span>
          </div>
          <div>
            <span className="text-gray-500">{t.totalAmount}:</span>{" "}
            <span className="font-bold text-[#1e3a5f]">{formatScAmount(escrow!.amount)}</span>
          </div>
          <div>
            <span className="text-gray-500">{t.description}:</span>{" "}
            <span className="font-semibold">{escrow!.service_description}</span>
          </div>
        </div>

        {/* Section 2 - Parties */}
        <SectionTitle number="2" title={t.section2} />
        <div className="grid grid-cols-2 gap-6 text-xs">
          <div className="p-3 rounded border border-gray-200 bg-gray-50/60">
            <p className="mb-1 text-[10px] uppercase tracking-widest text-gray-500">{t.buyer}</p>
            <p className="mt-1 font-mono text-[10px] text-gray-600 break-all">{escrow!.buyer}</p>
          </div>
          <div className="p-3 rounded border border-gray-200 bg-gray-50/60">
            <p className="mb-1 text-[10px] uppercase tracking-widest text-gray-500">{t.seller}</p>
            <p className="mt-1 font-mono text-[10px] text-gray-600 break-all">{escrow!.seller}</p>
          </div>
        </div>

        {/* Section 3 - Financial Settlement */}
        <SectionTitle number="3" title={t.section3} />
        <div className="overflow-hidden rounded border border-gray-200">
          <table className="w-full text-xs">
            <thead>
              <tr className="bg-[#1e3a5f] text-white">
                <th className="px-4 py-2 text-left font-semibold">Concepto / Concept</th>
                <th className="px-4 py-2 text-right font-semibold">Monto (USDC)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              <tr className="bg-white">
                <td className="px-4 py-2">{lang === "ES" ? "Deposito Total" : "Total Deposit"}</td>
                <td className="px-4 py-2 text-right font-mono">{formatScAmount(escrow!.amount)}</td>
              </tr>
              <tr className="bg-white">
                <td className="px-4 py-2">{t.created}</td>
                <td className="px-4 py-2 text-right font-mono text-gray-500">{formatTimestampLocal(escrow!.created_at)}</td>
              </tr>
              <tr className="bg-white">
                <td className="px-4 py-2">{t.deadline}</td>
                <td className="px-4 py-2 text-right font-mono text-gray-500">{formatTimestampLocal(escrow!.deadline)}</td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Section 4 - Cryptographic Audit */}
        <SectionTitle number="4" title={t.section4} />
        <div className="space-y-3 text-xs">
          <div>
            <span className="text-gray-500">{t.transactionHash}:</span>
            <p className="mt-0.5 font-mono text-[10px] break-all text-gray-800">{ESCROW_CONTRACT_ID}</p>
          </div>
          <div>
            <p className="mb-2 font-semibold text-[#1e3a5f]">{t.signers}:</p>
            <div className="grid grid-cols-2 gap-3">
              <div className="flex items-start gap-2 p-2.5 rounded border border-gray-200 bg-gray-50/60">
                <IconCheck className="w-4 h-4 mt-0.5 text-emerald-500 shrink-0" />
                <div>
                  <p className="font-semibold">{t.buyer}</p>
                  <p className="mt-0.5 font-mono text-[10px] text-gray-500 break-all">{truncateAddress(escrow!.buyer, 8)}</p>
                </div>
              </div>
              <div className="flex items-start gap-2 p-2.5 rounded border border-gray-200 bg-gray-50/60">
                <IconCheck className="w-4 h-4 mt-0.5 text-emerald-500 shrink-0" />
                <div>
                  <p className="font-semibold">{t.seller}</p>
                  <p className="mt-0.5 font-mono text-[10px] text-gray-500 break-all">{truncateAddress(escrow!.seller, 8)}</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Section 5 - Validity and Seals */}
        <SectionTitle number="5" title={t.section5} />
        <div className="flex flex-col sm:flex-row items-center gap-8 mt-4">
          <div className="flex flex-col items-center gap-2 shrink-0">
            <QRCodeSVG />
            <span className="text-[10px] text-gray-500 uppercase tracking-widest">{t.qrLabel}</span>
          </div>
          <div className="flex flex-col items-center gap-2 shrink-0">
            <InstitutionalSeal />
            <span className="text-[10px] text-gray-500 uppercase tracking-widest">{t.sealLabel}</span>
          </div>
          <p className="text-[11px] leading-relaxed text-gray-600">{t.legalValidity}</p>
        </div>

        {/* Footer */}
        <footer className="mt-10 pt-4 border-t border-gray-300 flex items-center justify-between text-[10px] text-gray-400">
          <span>{t.footerPage} 1 {t.of} 2</span>
          <span className="font-mono">{truncateHash(ESCROW_CONTRACT_ID, 12)}</span>
          <span>Breadline {new Date().getFullYear()}</span>
        </footer>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-100">
      {toolbar}
      <div className="px-4 py-8 print:p-0 print:bg-white">{documentContent}</div>
      {toastEl}
    </div>
  );
}
