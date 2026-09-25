# Breadline Protocol

**Micro-escrow protocol for cross-border services built on Stellar (Soroban smart contracts).**

Breadline lets freelancers and agencies in LATAM receive guaranteed payments from international clients. Funds are locked in a Soroban smart contract on Stellar Testnet, settled in USDC, and released instantly upon delivery confirmation.

## Live Deployment

| Component | URL |
|-----------|-----|
| **Landing Page** | [breadlineprotocol.netlify.app](https://breadlineprotocol.netlify.app/) |
| **App (Dashboard)** | [breadlineprotocol.netlify.app/app](https://breadlineprotocol.netlify.app/app/dashboard) |
| **Smart Contract** | [StellarExpert — CCFNKL...YBIGM (v3)](https://stellar.expert/explorer/testnet/contract/CCFNKL6YCRHPYCQ7M4SQXY2N3GACAMFJDVHPJO7AZPH3T46GHMIYBIGM) |
| **GitHub** | [github.com/FernandoMay/breadline-protocol](https://github.com/FernandoMay/breadline-protocol) |

## Protocol Proof — Verificable on-chain (Stellar Testnet)

| Field | Value |
|-------|-------|
| **Network** | Stellar Testnet |
| **Contract** | `CCFNKL6YCRHPYCQ7M4SQXY2N3GACAMFJDVHPJO7AZPH3T46GHMIYBIGM` (breadline-v3 — real USDC custody) · prev `CARLT3ENKBA5KTWE4R4PSHX6YAI6P6FFU6ZHNKNTSUINRG6FM554YCU5` deprecated |
| **Asset** | USDC (Testnet) — Token SAC `CBIELTK6YBZJU5UP2WWQEUCYKLPU6AUNZ2BQ4WWFEIE3USCIHMXQDAMA` |
| **Explorer** | [stellar.expert — Testnet contract v3](https://stellar.expert/explorer/testnet/contract/CCFNKL6YCRHPYCQ7M4SQXY2N3GACAMFJDVHPJO7AZPH3T46GHMIYBIGM) · [Deploy Tx v3](https://stellar.expert/explorer/testnet/tx/f1dcb55844b59706ca4626c7a9922ef76cd1ad34a512bd5e8b29fc5ba52d86ad) · [WASM Tx](https://stellar.expert/explorer/testnet/tx/72392a45d2b50883dd2885c5da861ec84f366298549bfc3b2d83d8f2f6ed035f) |
| **GitHub** | [github.com/FernandoMay/breadline-protocol](https://github.com/FernandoMay/breadline-protocol) |
| **Version** | `v0.5.0-breadline-v3 (Testnet)` — Real USDC custody · Stellar Testnet · Soroban (no mainnet) |
| **Status** | Implementado: Stellar/Soroban + USDC escrow + Testnet settlement + TokenClient/MuxedAddress custody \u00b7 Prototype: payment link/wallet/disputas \u00b7 Planned: SEP-24/SPEI/PIX/CBU (partner integration) |

> Demo escrow ESC-9482 (2,500 USDC) es **Transacción demo — fondos no reales · Testnet**.

## Smart Contract

**Contract ID (Testnet):**
```
CCFNKL6YCRHPYCQ7M4SQXY2N3GACAMFJDVHPJO7AZPH3T46GHMIYBIGM  (breadline-v3, alias breadline-v3)
Prev: CARLT3ENKBA5KTWE4R4PSHX6YAI6P6FFU6ZHNKNTSUINRG6FM554YCU5  (deprecated, state-only)
Interim (old WASM, deprecated): CD4KEZOSCS6KQCPT4XJPRV4P37PPBXAM7LYM2ALZP2KURG5SFS4MHPVI
```

**WASM:** `contracts/target/wasm32v1-none/release/escrow.wasm` (21,166 bytes, protocol 26, SDK 26.1.1) — built with `cargo build --target wasm32v1-none --release`. This currently succeeds natively on Windows; WSL remains the fallback if a future toolchain trips Windows App Control again. Verify with `stellar contract inspect --wasm <path>` (or `stellar contract info` on CLI 27+).

**Token (Testnet):** USDC SAC `CBIELTK6YBZJU5UP2WWQEUCYKLPU6AUNZ2BQ4WWFEIE3USCIHMXQDAMA` — documented placeholder from Stellar Docs/Circle; all custody functions use `soroban_sdk::token::TokenClient` (SDK 26) with `MuxedAddress` for transfers. Frontend `contract.ts` `USDC_TOKEN_ADDRESS` and `stellar.ts` `USDC_TOKEN_ADDRESS_STELLAR` both default to this address; `createEscrow` now requires `token: Address`.

**Functions:**
- `create_escrow(buyer, seller, token, amount, deadline, service_description: String)` — Initialize escrow; stores token address (String, not Symbol). Rejects `buyer == seller` and any deadline that is not in the future.
- `fund_escrow()` — Buyer deposits: `TokenClient.transfer(buyer -> contract, amount)` then state = Funded. Rejected once the deadline has passed.
- `release_funds()` — Buyer approves: `TokenClient.transfer(contract -> seller, amount)` then Released. Only allowed while the deadline has not passed.
- `refund_buyer(caller)` — Buyer or seller: `TokenClient.transfer(contract -> buyer, amount)` then Refunded
- `auto_refund_if_expired()` — Anyone, no auth, once the deadline has passed and state is `Funded` **or** `Disputed`: `TokenClient.transfer(contract -> buyer, amount)` then Refunded
- `raise_dispute(caller)` — Either party opens a dispute (state only, no transfer)
- `get_escrow()` — Read current escrow state
- `is_expired()` — Check if deadline has passed

> **MVP: one escrow per contract instance. Factory/multi-escrow is roadmap.** See comment in `contracts/contracts/escrow/src/lib.rs`. Each deployment holds a single `ESCROW_KEY`; deploying a factory that maps `escrow_id -> Escrow` is deferred to keep audit scope small.

### Settlement Rules (deliberate, not accidental)

| Rule | Why it exists |
|------|---------------|
| `buyer != seller` is enforced on-chain (`SameParties = 7`) | An escrow with one counterparty has no settlement meaning. The UI validates this before signing, but the contract is the authority. |
| `deadline` must be strictly in the future (`InvalidDeadline = 8`) | An already-expired escrow could never be funded or released. |
| `fund_escrow` rejects at/after the deadline (`DeadlinePassed = 9`) | Accepting a deposit that can no longer be released would trap the buyer's funds. |
| `release_funds` rejects at/after the deadline (`DeadlinePassed = 9`) | Past the deadline the only settlement path is the permissionless auto-refund, so funds are never stranded. |
| A dispute **freezes** settlement, it does not trap funds | `auto_refund_if_expired` accepts `Disputed` as well as `Funded`. A disputed escrow can always be resolved to a buyer refund at the deadline. |

**What is NOT implemented (roadmap):** pre-deadline dispute resolution. There is no
arbitrator, no jury and no multi-sig signature set in the contract. `raise_dispute`
only records a flag that blocks `release_funds` and `refund_buyer`. Until arbitration
ships, a disputed escrow resolves through the expiry safety valve (refund to buyer),
which is the deliberate MVP trade-off: guaranteed exit over contested settlement.

### Audit Fix — Real USDC Custody (2026-09)

| Check | Status | Notes |
|-------|--------|-------|
| **Real USDC custody** | ✅ Implemented (Testnet) | `fund_escrow` / `release_funds` / `refund_buyer` / `auto_refund_if_expired` now execute `TokenClient::transfer` against the stored `token` address. Verified by 18 `cargo test` cases using `StellarAssetClient` mint + balance assertions (buyer decrease, contract custody, seller increase, refund). |
| **Single-escrow per instance** | ✅ MVP documented | `// MVP: one escrow per contract instance. Factory/multi-escrow is roadmap.` retained in `lib.rs`; README documents roadmap. |
| **`service_description: Symbol` -> `String`** | ✅ Fixed | `soroban_sdk::String` now; frontend `contract.ts` uses `nativeToScVal(description, {type:'string'})`. |
| **Certificate SHA-256** | ✅ Real | `Certificados.tsx` uses `crypto.subtle.digest('SHA-256', new TextEncoder().encode(certContent))` instead of `setTimeout 1.2s` fake. |
| **Frontend token param** | ✅ Fixed | `createEscrowOnChain` now passes `tokenAddress` (defaults to `CBIELTK6YBZJU5UP2WWQEUCYKLPU6AUNZ2BQ4WWFEIE3USCIHMXQDAMA` placeholder) as `ScVal address`. |

**Authorization:**
- `release_funds` — only the **buyer** can execute
- `refund_buyer` — buyer **or** seller can execute
- `raise_dispute` — buyer **or** seller can execute

## Local Development

### Prerequisites

- [Node.js](https://nodejs.org/) v20+
- npm
- [Freighter](https://freighter.app/) browser wallet extension

### Setup

```bash
# Clone the repository
git clone https://github.com/FernandoMay/breadline-protocol.git
cd breadline-protocol

# Install dependencies
npm install

# Copy environment variables
cp .env.example .env

# Start development server
npm run dev
```

The app will be available at `http://localhost:5173/app/dashboard`.

### Environment Variables

Create a `.env` file with:

```
VITE_ESCROW_CONTRACT_ID=CCFNKL6YCRHPYCQ7M4SQXY2N3GACAMFJDVHPJO7AZPH3T46GHMIYBIGM
# Token (optional, defaults to CBIELTK6YBZJU5UP2WWQEUCYKLPU6AUNZ2BQ4WWFEIE3USCIHMXQDAMA)
```

### Build & Deploy

```bash
npm run build    # Output in dist/
npm run preview  # Preview production build locally
```

## Architecture

```
breadline/
├── contracts/              # Soroban smart contract (Rust)
│   └── contracts/escrow/
│       └── src/lib.rs      # Escrow contract — 8 functions, 18 tests
├── public/
│   ├── landing.html        # Landing page (raw HTML, served at /)
│   └── favicon.svg         # Branded favicon
├── src/
│   ├── components/         # Header, Layout, Toast
│   ├── hooks/              # useStellarWallet (Freighter integration)
│   ├── lib/
│   │   ├── contract.ts     # Soroban contract interaction layer
│   │   └── stellar.ts      # Stellar SDK setup + utilities
│   ├── pages/
│   │   ├── Dashboard.tsx           # Real on-chain escrow data
│   │   ├── CrearEscrow.tsx         # Create escrow with Freighter signing
│   │   ├── VistaComprador.tsx      # Buyer view — fund escrow
│   │   ├── SalaEntrega.tsx         # Delivery room — release/refund/dispute
│   │   ├── DisputasArbitraje.tsx   # Dispute arbitration flow
│   │   └── Certificados.tsx        # PDF-style institutional certificate
│   ├── App.tsx             # React Router (basename="/app")
│   └── main.tsx            # Entry point
├── netlify.toml            # Netlify config (SPA rewrite, security headers)
└── vite.config.ts          # Vite config (landing-as-root plugin)
```

## Tech Stack

- **Frontend:** React 19, TypeScript, Tailwind CSS v4, Vite 8
- **Blockchain:** Stellar (Soroban smart contracts), Stellar SDK v17
- **Wallet:** Freighter (browser extension)
- **Token:** USDC on Stellar — amounts are token **base units**, not stroops (a stroop is the 1e-7 XLM base unit). The code assumes a 7-decimal scale, i.e. `10,000,000` base units = 1 USDC; confirm it against the deployed SAC's `decimals()` before any mainnet use.
- **Deploy:** Netlify (auto-deploy from GitHub)
- **Contract:** Rust, Soroban SDK v26, Stellar CLI v27

## Protocol Flow

1. **Seller creates escrow** — specifies buyer, seller, amount, deadline, description
2. **Buyer funds escrow** — deposits USDC via Freighter wallet
3. **Seller delivers work** — uploads deliverable, communicates via in-app channel
4. **Buyer reviews** — approves delivery or opens dispute
5. **Funds released** — buyer confirms, USDC sent to seller on-chain
6. **Certificate issued** — cryptographic proof of settlement

## Fee Structure

- **Breadline protocol fee:** 0.8% of escrow amount
- **Stellar network fee:** ~$0.00001 per transaction
- **Comparison:** PayPal/SWIFT charges 3.5%–10% + hidden spread

## Validation Documentation

### Smart Contract Tests

```bash
cd contracts
cargo test
```

18 tests covering:
- Escrow creation and initialization
- Rejection of `buyer == seller` (`SameParties`)
- Rejection of a deadline that is not in the future (`InvalidDeadline`)
- Fund deposit flow, including rejection after the deadline
- Release funds (buyer authorization), including rejection after the deadline
- Refund (buyer/seller authorization)
- Dispute raising, and `Disputed -> auto_refund` at the deadline with balance assertions
- Deadline expiration check

### On-Chain Verification

Every transaction is verifiable on StellarTestnet:
1. Connect Freighter wallet to Testnet
2. Perform any action (create, fund, release)
3. Copy the transaction hash from the confirmation
4. View on [StellarExpert](https://stellar.expert/explorer/testnet)

### Security Model

- **Programmable escrow (smart-contract, non-custodial):** Breadline never holds funds — the Soroban contract does. This is NOT regulated custody, 100% insured vault, or fideicomiso bancario.
- **Immutable:** Once deposited, funds cannot be moved without proper authorization
- **Multi-party:** Buyer and seller both have explicit roles and authorization gates
- **Dispute resolution:** Either party can flag a dispute, which freezes settlement. On-chain arbitration before the deadline is roadmap; until then the expiry safety valve refunds the buyer.

## Argentina Builder Challenge (BAF × Stellar)

This project is submitted to the [Argentina Builder Challenge](https://www.baf.uy/) on the Stellar track.

**Key metrics (simulated projections — Testnet prototype):**
- Target volume: $18.4M+ Volumen objetivo (simulado)* — proyección simulada, no representa fondos custodiados reales
- Settlement time: < 3.5 seconds median testnet settlement (Soroban)* — no incluye rampa bancaria
- Network fee: ~$0.00001 per transaction (Stellar Testnet)
- Chargebacks: 0 (cryptographic finality on Testnet demo)

> * Ejemplo ilustrativo · Los costos reales varían por banco/corredor. Fuente placeholder: estimación interna. Todos los escrows demo son transacciones no reales en Testnet.

## License

MIT

## Contact

- **Contact** — [contact@breadline.lat](mailto:contact@breadline.lat) · [fmayf130@gmail.com](mailto:fmayf130@gmail.com) (Contacto directo fundador) — Respuesta en <24h \u00b7 tambi\u00e9n v\u00eda [GitHub Discussions](https://github.com/FernandoMay/breadline-protocol/discussions)
- **Fernando May** — [@FernandoMay](https://github.com/FernandoMay)
- **GitHub:** [@FernandoMay](https://github.com/FernandoMay)
