# Breadline Protocol

> Garantía de pago programable (Escrow) para comercio y servicios transfronterizos sobre Stellar.

## Stack

- **Frontend:** React 19 + TypeScript + Vite + Tailwind CSS v4
- **Blockchain:** Stellar Network (Testnet) + Soroban Smart Contracts
- **SDK:** @stellar/stellar-sdk
- **Design System:** Material Design 3 custom tokens

## Getting Started

```bash
# Install dependencies
npm install

# Start dev server
npm run dev

# Build for production
npm run build
```

## Smart Contract

The Soroban escrow contract is located in `contracts/escrow/`. It provides:

- `create_escrow` - Initialize a new escrow agreement
- `fund_escrow` - Buyer deposits funds
- `release_funds` - Buyer approves and releases funds to seller
- `refund_buyer` - Refund buyer if dispute or deadline
- `raise_dispute` - Either party can raise a dispute
- `is_expired` - Check if deadline has passed

## Environment Variables

Create a `.env` file:

```
VITE_ESCROW_CONTRACT_ID=your_deployed_contract_id
```

## Deployment

This project is configured for Netlify deployment. Push to main branch or connect your repository in Netlify dashboard.

## Network

Currently configured for **Stellar Testnet**. Change `NETWORK_PASSPHRASE` in `src/lib/stellar.ts` to switch to Mainnet.

## License

MIT
