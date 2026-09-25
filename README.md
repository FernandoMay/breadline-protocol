# Breadline Protocol

**Micro-escrow protocol for cross-border services built on Stellar (Soroban smart contracts).**

Breadline lets freelancers and agencies in LATAM receive guaranteed payments from international clients. Funds are locked in a Soroban smart contract on Stellar Testnet, settled in USDC, and released instantly upon delivery confirmation.

## Live Deployment

| Component | URL |
|-----------|-----|
| **Landing Page** | [breadlineprotocol.netlify.app](https://breadlineprotocol.netlify.app/) |
| **App (Dashboard)** | [breadlineprotocol.netlify.app/app](https://breadlineprotocol.netlify.app/app/dashboard) |
| **Smart Contract** | [StellarExpert — CB7I2G...6L6J (v4)](https://stellar.expert/explorer/testnet/contract/CBY6UC4IMSIA6AGRNXOIPENIYNNOL2LJG4O5QLRLKNWACAEZ2DIUYAWL) |
| **GitHub** | [github.com/FernandoMay/breadline-protocol](https://github.com/FernandoMay/breadline-protocol) |

## Protocol Proof — Verificable on-chain (Stellar Testnet)

| Field | Value |
|-------|-------|
| **Network** | Stellar Testnet |
| **Contract** | `CBY6UC4IMSIA6AGRNXOIPENIYNNOL2LJG4O5QLRLKNWACAEZ2DIUYAWL` (breadline-v3 — real USDC custody) · prev `CARLT3ENKBA5KTWE4R4PSHX6YAI6P6FFU6ZHNKNTSUINRG6FM554YCU5` deprecated |
| **Asset** | USDC (Testnet) — Token SAC `CBIELTK6YBZJU5UP2WWQEUCYKLPU6AUNZ2BQ4WWFEIE3USCIHMXQDAMA` |
| **Explorer** | [stellar.expert — Testnet contract v3](https://stellar.expert/explorer/testnet/contract/CBY6UC4IMSIA6AGRNXOIPENIYNNOL2LJG4O5QLRLKNWACAEZ2DIUYAWL) · [Deploy Tx v3](https://stellar.expert/explorer/testnet/tx/f1dcb55844b59706ca4626c7a9922ef76cd1ad34a512bd5e8b29fc5ba52d86ad) · [WASM Tx](https://stellar.expert/explorer/testnet/tx/72392a45d2b50883dd2885c5da861ec84f366298549bfc3b2d83d8f2f6ed035f) |
| **GitHub** | [github.com/FernandoMay/breadline-protocol](https://github.com/FernandoMay/breadline-protocol) |
| **Version** | `v0.6.0-breadline-v4 (Testnet)` — Real USDC custody · Stellar Testnet · Soroban (no mainnet) |
| **Status** | Implementado: Stellar/Soroban + USDC escrow + Testnet settlement + TokenClient/MuxedAddress custody \u00b7 Prototype: payment link/wallet/disputas \u00b7 Planned: SEP-24/SPEI/PIX/CBU (partner integration) |

> Demo escrow ESC-9482 (2,500 USDC) es **Transacción demo — fondos no reales · Testnet**.

## Smart Contract

**Contract ID (Testnet):**
```
CBY6UC4IMSIA6AGRNXOIPENIYNNOL2LJG4O5QLRLKNWACAEZ2DIUYAWL  (breadline-v4, alias breadline-v4) - Deploy tx: https://stellar.expert/explorer/testnet/tx/20f5439407171648b54a529a8efa2a6a9d2a69a6174756a2d40ea220451ad50b - WASM: b911f9074b8caf8f44d137071d0d3b5800742a1437eeb2d4eabd11ea8857109b (21,166 bytes)
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

## Per-User Contract Instances

**The contract is single-use, so a single shared contract id can only ever serve one escrow — for the entire network.** `create_escrow` sets an `INITIALIZED` instance flag; every later call against that same instance fails with `AlreadyInitialized` forever. There is no reset and no factory.

Breadline therefore resolves the contract id **per wallet** instead of hardcoding one:

| | Seed instance | User-deployed instance |
|---|---|---|
| Contract id | `VITE_ESCROW_CONTRACT_ID` (`CBY6UC4I…AWL`) | new `C…` id, one per wallet per escrow |
| Stored in | `src/lib/stellar.ts` (`ESCROW_CONTRACT_ID`) | `localStorage["breadline.activeEscrow.<G-address>"]` |
| Who deployed it | the Breadline team, once | the connected wallet, on demand |
| Uses left | **one**, for the whole network | one, then replaced |
| Label in the UI | `Instancia compartida (semilla)` | `Instancia propia` |

**Resolution rule** (`src/lib/activeEscrow.ts`): the stored id for the connected wallet if there is one and it is a valid contract id, otherwise the seed. `useActiveEscrowId(address)` exposes it to React; every page passes it to `fetchEscrow` / `fund` / `release` / `refund` / `dispute` / `auto_refund`, so no read or write can drift onto the seed once a real instance exists.

**What happens on a second escrow:** `CrearEscrow` probes the stored instance with `get_escrow`. While the instance is unused the call returns `NotInitialized` and it is reused; once it holds an escrow, or the probe cannot prove the instance is usable, the app deploys a fresh instance and stores the new id. The **Nuevo escrow** button does the same on demand, clearing the stored id first.

**Honest caveats:**

- The seed id in `VITE_ESCROW_CONTRACT_ID` is **not a reliable fallback** once anyone has used it. It is a bootstrap instance, not a shared service. With per-user deploys it is only what a first-time visitor sees before their first escrow.
- `localStorage` is per browser, not per chain. Clearing site data, or switching browser, loses the id — the next page load falls back to the seed and the app will deploy a new instance on the next escrow. The previously deployed instance still exists on-chain and its history is not reachable from the UI without the id.
- Instances deployed by a wallet are **not** discoverable from the app. There is no on-chain registry, which is the same gap a factory contract would close.
- Every deploy costs the user two signatures (WASM upload + contract creation) and two transactions of fees.

### How the deploy works

`deployEscrowContract()` in `src/lib/contract.ts` fetches the shipped `public/escrow.wasm` and runs **two transactions**:

1. `Operation.uploadContractWasm({ wasm })`
2. `Operation.createCustomContract({ address: <deployer>, wasmHash, salt })`

**Why not one transaction with two operations:** a Soroban transaction may contain at most **one** operation. A two-operation envelope is rejected by the network with `Transaction contains more than one operation` (verified against `soroban-testnet.stellar.org`). The two-transaction flow is therefore required, not a convenience.

**Why `Contract.deploy` is not used:** `@stellar/stellar-sdk` 17.1.0 exposes no `Contract.deploy` and no `AssembledTransaction` from its main entry point, and the available `Operation.createCustomContract` requires a real deployer `Address` rather than the legacy `ScVal::Void` placeholder. The flow uses `TransactionBuilder` + `Operation.uploadContractWasm` / `Operation.createCustomContract` directly.

**Why `wasmHash` is just `sha256(wasm)`:** `createContract` is keyed by `ContractCode.hash`, which is the SHA-256 of the WASM bytes — *not* the hash of the `ContractCodeEntry` XDR. Both were tried against testnet: the entry-XDR hash fails with `Wasm does not exist`, the plain SHA-256 succeeds. The local `escrow.wasm` is byte-identical to the on-chain v4 WASM (`b911f9074b8caf8f44d137071d0d3b5800742a1437eeb2d4eabd11ea8857109b`, 21,166 bytes), and the deploy re-checks the locally computed hash against the value the upload transaction returned before declaring success.

**Where the new contract id comes from:** the `createContract` simulation returns it as an `ScVal::Address`, so the app knows the id before the transaction is even submitted. It is read from `simulation.result.retval` and then verified by polling both transactions until they are in a ledger.

The salt is a random 32 bytes generated once per deploy and held fixed across a sequence-stale retry, so a rebuild cannot silently produce a different contract id than the one shown to the user.

> **Not verified end-to-end.** The deploy path was validated by simulation against Testnet (operation shape, wasm hash, salt, id derivation, `prepareTransaction`) and by building against the installed SDK's own types. A **real** deploy requires a wallet signature, so it has not been executed. See the manual verification steps below.

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
VITE_ESCROW_CONTRACT_ID=CBY6UC4IMSIA6AGRNXOIPENIYNNOL2LJG4O5QLRLKNWACAEZ2DIUYAWL
# Token (optional, defaults to CBIELTK6YBZJU5UP2WWQEUCYKLPU6AUNZ2BQ4WWFEIE3USCIHMXQDAMA)
```

> `VITE_ESCROW_CONTRACT_ID` is the **seed** instance only, used until the connected wallet deploys its own. It is single-use: once anyone runs `create_escrow` on it, it is spent for everyone. It is not a fallback that keeps working — see [Per-User Contract Instances](#per-user-contract-instances).

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
│   ├── escrow.wasm         # Contract WASM, shipped so the browser can deploy instances
│   └── favicon.svg         # Branded favicon
├── src/
│   ├── components/         # Header, Layout, Toast
│   ├── hooks/              # useStellarWallet (Freighter integration)
│   ├── lib/
│   │   ├── contract.ts     # Soroban contract interaction layer + per-user deploy
│   │   ├── activeEscrow.ts # Which contract id this wallet is talking to (localStorage)
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

0. **A fresh instance is deployed for this wallet** (once per escrow) — the contract is single-use, so it cannot be shared. See [Per-User Contract Instances](#per-user-contract-instances).
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

### Manual Verification — Per-User Deploy (NOT yet run)

The per-user deploy path is implemented and simulation-verified, but no real deploy
has been executed because it needs a wallet signature. Someone with Freighter must
run this once against Testnet:

1. `npm run dev`, open `http://localhost:5173/app/crear-escrow`, connect Freighter on **Testnet**, and make sure the account has XLM (`fundTestnetXlm`).
2. Fill the form with a **different** `G…` address as the counterparty, then submit.
3. **Expect two Freighter prompts** (WASM upload, then contract creation). The panel should show `Descargando…` → `Subiendo el contrato a Stellar (1 de 2 firmas)` → `Creando tu instancia en la red (2 de 2 firmas)` → `Esperando confirmacion`.
4. **Expect the label to flip** from `Instancia compartida (semilla)` to `Instancia propia`, showing a new `C…` id that is **not** `CBY6UC4I…AWL`.
5. Confirm in DevTools → Application → Local Storage that `breadline.activeEscrow.<your G address>` is set to that id.
6. Check [StellarExpert](https://stellar.expert/explorer/testnet) that the two txs are `successful: true` and that the new contract instance exists.
7. Run `stellar contract info <new-id> --network testnet` and confirm the exported functions match the seed's.
8. Create a **second** escrow from the same wallet. **Expect a fresh deploy** (two more prompts, a different `C…` id) rather than `AlreadyInitialized`.
9. Click **Nuevo escrow** and confirm it deploys on demand and resets the label/id.
10. Open `/app/dashboard`, `/app/sala-de-entrega`, `/app/disputas-y-arbitraje` and `/app/certificados` and confirm each shows the **new** active id, not the seed.
11. Reload the page and confirm the active id survives (it is read from `localStorage`).
12. Negative check: confirm the seed instance was left untouched and still reports `NotInitialized` for `get_escrow`.

A failure mode worth watching for on step 3: if Freighter is set to a non-Testnet
network the wallet hook refuses to sign, and the deploy aborts before any
transaction is submitted.

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
