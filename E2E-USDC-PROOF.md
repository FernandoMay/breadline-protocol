# Breadline E2E — USDC real de Circle en Stellar Testnet

Ejecución real, firmado con claves Ed25519 de testnet. **Cero mocks.** Todas las
transacciones fueron verificadas independientemente contra la API REST de Horizon
(`successful: true`) y los balances se leyeron desde Horizon y desde el RPC de Soroban.

## Red y contrato

| Campo | Valor |
|---|---|
| Red | Stellar Testnet (`Test SDF Network ; September 2015`) |
| Horizon / Explorer | `https://stellar.expert/explorer/testnet` |
| Contrato escrow | `CBY6UC4IMSIA6AGRNXOIPENIYNNOL2LJG4O5QLRLKNWACAEZ2DIUYAWL` (alias `breadline-v5`) |
| Tipo de contrato | Soroban, protocolo 26, SDK 26.1.1 |
| WASM | `b911f9074b8caf8f44d137071d0d3b5800742a1437eeb2d4eabd11ea8857109b` (21,166 bytes) |

## Activo — USDC auténtico de Circle

| Campo | Valor |
|---|---|
| Activo | `USDC:GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5` |
| Emisor | **Circle** (issuer real, no un asset autemitido) |
| SAC (contrato del token) | `CBIELTK6YBZJU5UP2WWQEUCYKLPU6AUNZ2BQ4WWFEIE3USCIHMXQDAMA` |
| Decimals | 7 → 1 USDC = 10,000,000 unidades base |
| Origen del saldo | Faucet de Circle, enviado a la cuenta buyer |

## Partes

| Rol | Dirección |
|---|---|
| Buyer | `GCYE36ES77UR3ELV3ZXAG46KXEJ6YHQ5SDDGEHTJLWCJSTYWFXNYIGO5` |
| Seller | `GCLW6OYUYJ4AREAPF6QPQUUUTTQ7ITCB4GDW6XV6S3AXR5KKKGS62IN6` |

`buyer != seller`, validado también on-chain por el guard `SameParties`.

## Transacciones

| # | Paso | Tx hash | Ledger | Estado resultante |
|---|---|---|---|---|
| 1 | `create_escrow` | [`a566d825…63b596d`](https://stellar.expert/explorer/testnet/tx/a566d82562a38acc49b4be0529a0ade540ebdcd44a4d44c5f8b4c87d563b596d) | 4872165 | `Created` |
| 2 | `fund_escrow` | [`8cf1a6a7…52a2cdfc`](https://stellar.expert/explorer/testnet/tx/8cf1a6a7746b5a9b5660379f8ada94eb9dd50c63e651b20d7001f58452a2cdfc) | 4872166 | `Funded` |
| 3 | `release_funds` | [`36b0fe75…304117f`](https://stellar.expert/explorer/testnet/tx/36b0fe7524004fa3ea8f35ea8344ff8aa18d532c3dc23e43e326ede51304117f) | 4872168 | `Released` |

Las tres con `successful: true` confirmado por consulta independiente a Horizon.

## Montante y balances

Monto del escrow: **5 USDC** (`50,000,000` unidades base).

| Parte | Antes | Después de fund | Después de release |
|---|---|---|---|
| Buyer | 5.3124000 | 0.3124000 | 0.3124000 |
| Contrato escrow | 0.0000000 | *(custodia)* | 0.0000000 |
| Seller | 0.0000000 | 0.0000000 | **5.0000000** |

## Verificaciones

- El buyer pagó exactamente **5.0000000 USDC**: `5.3124000 − 0.3124000 = 5.0000000`
- El seller recibió exactamente **5.0000000 USDC**
- El contrato quedó en **0**: los USDC entraron por `TokenClient::transfer` y salieron
  por `TokenClient::transfer`, sin quedar retenidos
- Conservación: `0.3124000 + 5.0000000 + 0 = 5.3124000` = saldo inicial
- Estados on-chain leídos vía `get_escrow`: `Created → Funded → Released`

## Qué demuestra

Custodia real de USDC en un smart contract de Soroban: los tokens se transfieren
desde la wallet del comprador al contrato y del contrato a la del vendedor, con
balances verificables de forma independiente por cualquier tercero. No es una
máquina de estados ni una simulación: son movimientos de saldo de un activo emitido
por Circle.
