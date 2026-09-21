# Breadline Protocol

**Micro-escrow protocol for cross-border services built on Stellar (Soroban smart contracts).**

Breadline lets freelancers and agencies in LATAM receive guaranteed payments from international clients. Funds are locked in a Soroban smart contract on Stellar Testnet, settled in USDC, and released instantly upon delivery confirmation.

## Live Deployment

| Component | URL |
|-----------|-----|
| **Landing Page** | [breadlineprotocol.netlify.app](https://breadlineprotocol.netlify.app/) |
| **App (Dashboard)** | [breadlineprotocol.netlify.app/app](https://breadlineprotocol.netlify.app/app/dashboard) |
| **Smart Contract** | [StellarExpert — CATDRV...MT7G](https://stellar.expert/explorer/testnet/contract/CARLT3ENKBA5KTWE4R4PSHX6YAI6P6FFU6ZHNKNTSUINRG6FM554YCU5) |
| **GitHub** | [github.com/FernandoMay/breadline-protocol](https://github.com/FernandoMay/breadline-protocol) |

## Smart Contract

**Contract ID (Testnet):**
```
CARLT3ENKBA5KTWE4R4PSHX6YAI6P6FFU6ZHNKNTSUINRG6FM554YCU5
```

**Functions:**
- `create_escrow(buyer, seller, amount, deadline, description)` — Initialize an escrow agreement
- `fund_escrow()` — Buyer deposits and locks funds
- `release_funds()` — Buyer approves delivery, funds released to seller
- `refund_buyer(caller)` — Buyer or seller can refund if delivery fails
- `raise_dispute(caller)` — Either party opens dispute for arbitration
- `get_escrow()` — Read current escrow state
- `is_expired()` — Check if deadline has passed

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
VITE_ESCROW_CONTRACT_ID=CARLT3ENKBA5KTWE4R4PSHX6YAI6P6FFU6ZHNKNTSUINRG6FM554YCU5
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
│       └── src/lib.rs      # Escrow contract — 7 functions, 6 tests
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
- **Token:** USDC on Stellar (6 decimals, 10,000,000 stroops = 1 USDC)
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

6 tests covering:
- Escrow creation and initialization
- Fund deposit flow
- Release funds (buyer authorization)
- Refund (buyer/seller authorization)
- Dispute raising
- Deadline expiration check

### On-Chain Verification

Every transaction is verifiable on StellarTestnet:
1. Connect Freighter wallet to Testnet
2. Perform any action (create, fund, release)
3. Copy the transaction hash from the confirmation
4. View on [StellarExpert](https://stellar.expert/explorer/testnet)

### Security Model

- **Non-custodial:** Breadline never holds funds — the Soroban contract does
- **Immutable:** Once deposited, funds cannot be moved without proper authorization
- **Multi-party:** Buyer and seller both have explicit roles and authorization gates
- **Dispute resolution:** Either party can trigger arbitration

## Argentina Builder Challenge (BAF × Stellar)

This project is submitted to the [Argentina Builder Challenge](https://www.baf.uy/) on the Stellar track.

**Key metrics (projections):**
- Target volume: $18.4M+ custodied in contracts
- Settlement time: < 3.5 seconds (measured on Stellar Testnet)
- Network fee: ~$0.00001 per transaction
- Chargebacks: 0 (cryptographic finality)

## License

MIT

## Contact

- **Fernando May** — [fmayf130@gmail.com](mailto:fmayf130@gmail.com)
- **GitHub:** [@FernandoMay](https://github.com/FernandoMay)
