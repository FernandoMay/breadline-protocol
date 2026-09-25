# Breadline E2E Escrow Lifecycle — On-Chain Proof

Real end-to-end execution of the `breadline-v4` escrow contract on **Stellar Testnet**.
Every transaction hash below was returned by a submitted transaction and independently
re-verified against the Horizon testnet REST API (`successful: true`).

No mocks, no simulated hashes, no placeholders.

---

## 1. Environment

| Field | Value |
|---|---|
| Network | Test SDF Network ; September 2015 (`--network testnet`) |
| Horizon | `https://horizon-testnet.stellar.org` |
| Date of run | 2026-09-25 |
| Stellar CLI | `stellar 27.0.0 (5a7c5fe76530bf4248477ac812fc757146b98cc4)` |
| Contract source | `contracts/contracts/escrow/src/lib.rs` (soroban-sdk 26) |

### Escrow contract under test

| Field | Value |
|---|---|
| CLI alias | `breadline-v4` |
| Contract ID | `CB7I2GURQDV4Q7YAT2PZAG3ZNFQJ37GI6MWZ4P3W7SUCJZPSHP2G6L6J` |
| P0 fixes present | rejects `buyer == seller`, rejects `deadline <= now`, rejects fund/release after deadline, `auto_refund_if_expired` accepts `Funded` **and** `Disputed` |

Pre-flight check: `get_escrow` returned `HostError: Error(Contract, #1)` = `NotInitialized`,
confirming the instance was unused and clean before this run.

### Token (real on-chain SAC, self-issued)

| Field | Value |
|---|---|
| Asset code | `BREAD` |
| Issuer / SAC admin | `GAQJHFJGAH6QUCRIWCBPVL5A7EGKZCQURG5LJRB2KEBODGE2SIP4EGVF` |
| SAC (token) contract ID | `CA5O5QYEM5VUZOP6S4AALWXMSOG23OSZPRXFHEVMWZXREJJYDEEYZV2Q` |
| SAC `name()` | `BREAD:GAQJHFJGAH6QUCRIWCBPVL5A7EGKZCQURG5LJRB2KEBODGE2SIP4EGVF` |
| SAC `symbol()` | `BREAD` |
| SAC `admin()` | `GAQJHFJGAH6QUCRIWCBPVL5A7EGKZCQURG5LJRB2KEBODGE2SIP4EGVF` |
| **Observed `decimals()`** | **`7`** — queried live, not assumed |
| Asset type | `credit_alphanum12` (real classic Stellar asset + Stellar Asset Contract) |

Because `decimals() == 7`, one human unit = `10^7` = `10,000,000` base units.

### Parties

| Role | Account |
|---|---|
| Buyer | `GCDU7LJT5NVHVILLMRZV67ATXWQDR5NDLPSPJ4Y2RUGDNGRSHGQ6ZSVX` |
| Seller | `GDEUOXWSSY3M2KVGAQTOI3IGMLMTU73ZUC74TJSKGFJHFHM4UUUZWR7P` |

### Escrow parameters

| Field | Value |
|---|---|
| Amount (base units) | `200000000` |
| Amount (human units) | `20.0000000` BREAD |
| `created_at` (ledger ts) | `1790369647` |
| `deadline` (ledger ts) | `1790373239` (created_at + 3600) |
| `service_description` | `Auditoria E2E Breadline v4` |

---

## 2. Setup transactions (real, verified)

| # | Action | Tx hash | Ledger | Fee (stroops) | `successful` |
|---|---|---|---|---|---|
| S1 | Deploy classic asset `BREAD` **and** its SAC | [`0d71faef9fa78ffdde097754a1b1012dc01021c3dc6657f9183da047cf0283c0`](https://stellar.expert/explorer/testnet/tx/0d71faef9fa78ffdde097754a1b1012dc01021c3dc6657f9183da047cf0283c0) | 4869181 | 183215 | `true` |
| S2 | Buyer `trust` SAC (`changeTrust` to contract address) | [`d4e08901d53fe2b23c3a9943a7a55246b079233df461245c3b3597afe60c7763`](https://stellar.expert/explorer/testnet/tx/d4e08901d53fe2b23c3a9943a7a55246b079233df461245c3b3597afe60c7763) | 4869189 | 14202 | `true` |
| S3 | Seller `trust` SAC | [`1df02ebf8b29d145305534f498f889f9fcea1ea1939a6e62308c73be92291ec1`](https://stellar.expert/explorer/testnet/tx/1df02ebf8b29d145305534f498f889f9fcea1ea1939a6e62308c73be92291ec1) | 4869192 | 14202 | `true` |
| S4 | `mint` 1,000,000,000 base units (100 BREAD) to buyer | [`3552b304a104e7ede5b4f9ee50b7ce362ae9f52a541b6ac80b2ab678528bff71`](https://stellar.expert/explorer/testnet/tx/3552b304a104e7ede5b4f9ee50b7ce362ae9f52a541b6ac80b2ab678528bff71) | 4869199 | 9140 | `true` |

Trustlines confirmed on Horizon for both parties (`limit=922337203685.4775807`).
Mint confirmed by on-chain event `MintWithAmountOnly, to: GCDU7LJT…, amount: "1000000000"`.

The escrow contract itself required **no** trustline: a pre-flight dry run
(`--send=no` transfer of `200000000` buyer → escrow contract) succeeded, proving SAC
contract-side balances are created on transfer. This was verified *before* `create_escrow`
so that the single-shot escrow instance was not consumed by a preventable failure.

---

## 3. The lifecycle — 3 signed invocations

All three are `InvokeHostFunction` transactions against
`CB7I2GURQDV4Q7YAT2PZAG3ZNFQJ37GI6MWZ4P3W7SUCJZPSHP2G6L6J`, each submitted, included in a
ledger, and confirmed `successful: true` on Horizon.

| Step | Function | Tx hash | Stellar Expert | Ledger | Fee | Resulting state |
|---|---|---|---|---|---|---|
| 1 | `create_escrow` | `d5052d1fe391dd4065b929497c2cafb8baa409e90835116bdd5c9d395465cb53` | [link](https://stellar.expert/explorer/testnet/tx/d5052d1fe391dd4065b929497c2cafb8baa409e90835116bdd5c9d395465cb53) | 4869212 | 164691 | **`Created`** |
| 2 | `fund_escrow` | `6ea066f3af4c62e3d8391366b6852070c9f565ff2e5875e8139d2518c7e3e8f3` | [link](https://stellar.expert/explorer/testnet/tx/6ea066f3af4c62e3d8391366b6852070c9f565ff2e5875e8139d2518c7e3e8f3) | 4869217 | 366938 | **`Funded`** |
| 3 | `release_funds` | `111754d2998ee051e123e3c97afabd12b8decc9400f232f1c38304648eab48a1` | [link](https://stellar.expert/explorer/testnet/tx/111754d2998ee051e123e3c97afabd12b8decc9400f232f1c38304648eab48a1) | 4869223 | 17791 | **`Released`** |

State transitions were read back independently with `get_escrow` after each step:
`Created` → `Funded` → `Released`.

### Buyer signature proof

Each envelope was decoded from Horizon XDR and confirms the buyer authorized it:

| Step | `source_account` | `auth` credentials | Signatures in envelope |
|---|---|---|---|
| `create_escrow` | buyer `GCDU7LJT…` | `source_account` (root invocation) | 1 ed25519 |
| `fund_escrow` | buyer `GCDU7LJT…` | `source_account` (root invocation) | 1 ed25519 |
| `release_funds` | buyer `GCDU7LJT…` | `source_account` (root invocation) | 1 ed25519 |

Because the contract calls `buyer.require_auth()` on every state transition, the observed
`Created → Funded → Released` progression is itself proof the buyer's authorization was
present and valid.

### Token movement events (on-chain)

- `fund_escrow` (TX2) emitted SAC event:
  `transfer` from `GCDU7LJT…` (buyer) to `CB7I2GUR…` (escrow contract) = `200000000`
- `release_funds` (TX3) emitted SAC event:
  `transfer` from `CB7I2GUR…` (escrow contract) to `GDEUOXWS…` (seller) = `200000000`

---

## 4. Balances — before and after

Read from the SAC itself (`balance`) and cross-checked against Horizon.

| Party | BEFORE | AFTER fund | AFTER release |
|---|---|---|---|
| Buyer `GCDU7LJT…` | `1000000000` (100.0000000) | `800000000` (80.0000000) | `800000000` (80.0000000) |
| Escrow contract `CB7I2GUR…` | `0` (0.0000000) | `200000000` (20.0000000) | `0` (0.0000000) |
| Seller `GDEUOXWS…` | `0` (0.0000000) | `0` (0.0000000) | `200000000` (20.0000000) |

Horizon cross-check after release:

```
BUYER   HORIZON BREAD balance = 80.0000000   (ledger 4869217)
SELLER  HORIZON BREAD balance = 20.0000000   (ledger 4869223)
```

Amount under test: **20.0000000 BREAD = 200,000,000 base units** (`20 × 10^7`).

---

## 5. Explicit confirmations

- ✅ **Contract balance == amount after fund:** contract held `200000000` base units, escrow amount is `200000000`. Exact match.
- ✅ **Contract balance == 0 after release:** contract balance is `0` base units.
- ✅ **Seller balance increased by amount:** seller went `0` → `200000000` base units, delta `+200000000` = exactly the escrow amount.
- ✅ **Buyer balance decreased by amount:** buyer went `1000000000` → `800000000` base units, delta `-200000000` = exactly the escrow amount.
- ✅ **State machine proven:** `Created` → `Funded` → `Released`, each read back via `get_escrow`.
- ✅ **Value conservation:** `800000000 + 0 + 200000000 = 1000000000` (total minted). No token created, destroyed, or stranded.
- ✅ **Real custody:** the contract address `CB7I2GUR…` demonstrably held 20 BREAD on-chain between TX2 and TX3.
- ✅ **All 7 transactions** independently report `successful: true` from the Horizon testnet API.
- ✅ **No fabricated data:** every hash in this document was returned by a submitted transaction and re-verified; every balance was read from the SAC and Horizon.

---

## 6. Deviations from the original request (disclosed)

The buyer and seller accounts named in the request — buyer
`GCYE36ES77UR3ELV3ZXAG46KXEJ6YHQ5SDDGEHTJLWCJSTYWFXNYIGO5` and seller
`GCLW6OYUYJ4AREAPF6QPQUUUTTQ7ITCB4GDW6XV6S3AXR5KKKGS62IN6` — were **not present in the local
`stellar` CLI keyring** (`stellar keys ls` returned only `breadline-deployer`, `niko_deployer`,
`proofdrop-payer`, `proofdrop-recipient`, `savia-deployer`, none matching those public keys).
Their secret keys are stored in the repo `.env`, which is not readable under current tool
permissions.

Both accounts were confirmed to exist on-chain with ~9,999 XLM each, but without the private
keys it is impossible to produce a valid signature for them, so the lifecycle could not be
signed by those specific accounts.

Two fresh accounts were therefore generated (`stellar keys generate e2e-buyer` /
`e2e-seller`) and funded via testnet friendbot (`stellar keys fund`). The request explicitly
authorized creating additional keys. This does not weaken the audit claim: the proof concerns
the **contract's custody behaviour**, not the identity of the parties. Every custody invariant
holds with arbitrary counterparty accounts.
