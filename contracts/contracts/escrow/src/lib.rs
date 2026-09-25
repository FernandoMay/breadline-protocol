#![no_std]
use soroban_sdk::{
    contract, contracterror, contractimpl, contracttype, symbol_short, Address, Env, MuxedAddress,
    String, Symbol,
};

const ESCROW_KEY: Symbol = symbol_short!("ESCROW");
const INITIALIZED: Symbol = symbol_short!("INIT");

#[contracterror]
#[derive(Debug)]
pub enum EscrowError {
    NotInitialized = 1,
    AlreadyInitialized = 2,
    InvalidAmount = 3,
    InvalidState = 4,
    Unauthorized = 5,
    /// The deadline has not been reached yet: the caller is too early.
    DeadlineNotPassed = 6,
    /// Buyer and seller are the same account. An escrow needs two distinct
    /// counterparties, otherwise it has no settlement meaning.
    SameParties = 7,
    /// The supplied deadline is not strictly in the future.
    InvalidDeadline = 8,
    /// The deadline has been reached: funding or release are no longer allowed.
    /// Past the deadline the only settlement path is `auto_refund_if_expired`.
    DeadlinePassed = 9,
}

#[contracttype]
#[derive(Debug)]
pub enum EscrowState {
    Created,
    Funded,
    Released,
    Refunded,
    Disputed,
}

#[contracttype]
#[derive(Debug)]
pub struct Escrow {
    pub buyer: Address,
    pub seller: Address,
    pub token: Address,
    pub amount: i128,
    pub state: EscrowState,
    pub created_at: u64,
    pub deadline: u64,
    pub service_description: String,
}

#[contract]
pub struct BreadlineEscrow;

#[contractimpl]
impl BreadlineEscrow {
    /// Create a new escrow agreement
    /// MVP: one escrow per contract instance. Factory/multi-escrow is roadmap.
    ///
    /// Deliberate rules enforced here:
    /// - `buyer` and `seller` must be distinct accounts (`SameParties`).
    /// - `deadline` must be strictly in the future (`InvalidDeadline`).
    ///   The deadline is the single settlement cutoff: before it, the buyer may
    ///   release or refund; from it onward, only `auto_refund_if_expired` applies.
    pub fn create_escrow(
        env: Env,
        buyer: Address,
        seller: Address,
        token: Address,
        amount: i128,
        deadline: u64,
        service_description: String,
    ) -> Result<Escrow, EscrowError> {
        buyer.require_auth();

        if env.storage().instance().has(&INITIALIZED) {
            return Err(EscrowError::AlreadyInitialized);
        }

        if amount <= 0 {
            return Err(EscrowError::InvalidAmount);
        }

        if buyer == seller {
            return Err(EscrowError::SameParties);
        }

        if deadline <= env.ledger().timestamp() {
            return Err(EscrowError::InvalidDeadline);
        }

        let escrow = Escrow {
            buyer: buyer.clone(),
            seller: seller.clone(),
            token: token.clone(),
            amount,
            state: EscrowState::Created,
            created_at: env.ledger().timestamp(),
            deadline,
            service_description,
        };

        env.storage().instance().set(&ESCROW_KEY, &escrow);
        env.storage().instance().set(&INITIALIZED, &true);

        Ok(escrow)
    }

    /// Get current escrow state
    pub fn get_escrow(env: Env) -> Result<Escrow, EscrowError> {
        env.storage()
            .instance()
            .get(&ESCROW_KEY)
            .ok_or(EscrowError::NotInitialized)
    }

    /// Fund the escrow (buyer deposits) — transfers USDC from buyer to contract
    ///
    /// Rejects funding once the deadline has been reached: accepting a deposit
    /// that can no longer be released to the seller would be a trap for the buyer.
    pub fn fund_escrow(env: Env) -> Result<Escrow, EscrowError> {
        let mut escrow: Escrow = env
            .storage()
            .instance()
            .get(&ESCROW_KEY)
            .ok_or(EscrowError::NotInitialized)?;

        escrow.buyer.require_auth();

        if !matches!(escrow.state, EscrowState::Created) {
            return Err(EscrowError::InvalidState);
        }

        if env.ledger().timestamp() >= escrow.deadline {
            return Err(EscrowError::DeadlinePassed);
        }

        // Real token custody: transfer from buyer to this contract
        let token_client = soroban_sdk::token::TokenClient::new(&env, &escrow.token);
        let contract_address = env.current_contract_address();
        let contract_muxed = MuxedAddress::from(&contract_address);
        token_client.transfer(&escrow.buyer, &contract_muxed, &escrow.amount);

        escrow.state = EscrowState::Funded;
        env.storage().instance().set(&ESCROW_KEY, &escrow);

        Ok(escrow)
    }

    /// Release funds to seller (buyer approves delivery) — transfers USDC to seller
    ///
    /// Deadline rule (deliberate): a funded escrow can only be released to the
    /// seller while the deadline has not been reached. From the deadline onward
    /// `release_funds` is rejected with `DeadlinePassed` and the only remaining
    /// settlement path is `auto_refund_if_expired`, which returns the funds to
    /// the buyer. This keeps a single, permissionless settlement path after
    /// expiry and guarantees the funds are never stranded.
    pub fn release_funds(env: Env) -> Result<Escrow, EscrowError> {
        let mut escrow: Escrow = env
            .storage()
            .instance()
            .get(&ESCROW_KEY)
            .ok_or(EscrowError::NotInitialized)?;

        escrow.buyer.require_auth();

        if !matches!(escrow.state, EscrowState::Funded) {
            return Err(EscrowError::InvalidState);
        }

        if env.ledger().timestamp() >= escrow.deadline {
            return Err(EscrowError::DeadlinePassed);
        }

        let token_client = soroban_sdk::token::TokenClient::new(&env, &escrow.token);
        let contract_address = env.current_contract_address();
        let seller_muxed = MuxedAddress::from(&escrow.seller);
        token_client.transfer(&contract_address, &seller_muxed, &escrow.amount);

        escrow.state = EscrowState::Released;
        env.storage().instance().set(&ESCROW_KEY, &escrow);

        Ok(escrow)
    }

    /// Refund buyer (seller or buyer authorizes the refund) — transfers USDC back to buyer
    pub fn refund_buyer(env: Env, caller: Address) -> Result<Escrow, EscrowError> {
        caller.require_auth();

        let mut escrow: Escrow = env
            .storage()
            .instance()
            .get(&ESCROW_KEY)
            .ok_or(EscrowError::NotInitialized)?;

        if caller != escrow.buyer && caller != escrow.seller {
            return Err(EscrowError::Unauthorized);
        }

        if !matches!(escrow.state, EscrowState::Funded) {
            return Err(EscrowError::InvalidState);
        }

        let token_client = soroban_sdk::token::TokenClient::new(&env, &escrow.token);
        let contract_address = env.current_contract_address();
        let buyer_muxed = MuxedAddress::from(&escrow.buyer);
        token_client.transfer(&contract_address, &buyer_muxed, &escrow.amount);

        escrow.state = EscrowState::Refunded;
        env.storage().instance().set(&ESCROW_KEY, &escrow);

        Ok(escrow)
    }

    /// Raise a dispute (buyer or seller authorizes)
    pub fn raise_dispute(env: Env, caller: Address) -> Result<Escrow, EscrowError> {
        caller.require_auth();

        let mut escrow: Escrow = env
            .storage()
            .instance()
            .get(&ESCROW_KEY)
            .ok_or(EscrowError::NotInitialized)?;

        if caller != escrow.buyer && caller != escrow.seller {
            return Err(EscrowError::Unauthorized);
        }

        if !matches!(escrow.state, EscrowState::Funded) {
            return Err(EscrowError::InvalidState);
        }

        escrow.state = EscrowState::Disputed;
        env.storage().instance().set(&ESCROW_KEY, &escrow);

        Ok(escrow)
    }

    /// Check if deadline has passed
    pub fn is_expired(env: Env) -> Result<bool, EscrowError> {
        let escrow: Escrow = env
            .storage()
            .instance()
            .get(&ESCROW_KEY)
            .ok_or(EscrowError::NotInitialized)?;

        Ok(env.ledger().timestamp() >= escrow.deadline)
    }

    /// Auto-refund if the deadline has passed and the escrow is still unsettled.
    /// No auth required — anyone can trigger this safety mechanism.
    ///
    /// Deliberate rule (P0 safety valve): a dispute FREEZES settlement, it does not
    /// trap funds. `Funded` and `Disputed` are both accepted, so once the deadline
    /// is reached a disputed escrow resolves to `Refunded` and the buyer recovers
    /// the tokens. Permissionless, so the funds can never be locked forever.
    ///
    /// Dispute resolution BEFORE the deadline (arbitration: an arbitrator or a
    /// multisig deciding who gets the funds) is NOT implemented and is roadmap.
    /// Until it exists, `Disputed` escrows can only settle via this expiry refund.
    pub fn auto_refund_if_expired(env: Env) -> Result<Escrow, EscrowError> {
        let mut escrow: Escrow = env
            .storage()
            .instance()
            .get(&ESCROW_KEY)
            .ok_or(EscrowError::NotInitialized)?;

        if !matches!(escrow.state, EscrowState::Funded | EscrowState::Disputed) {
            return Err(EscrowError::InvalidState);
        }

        if env.ledger().timestamp() < escrow.deadline {
            return Err(EscrowError::DeadlineNotPassed);
        }

        let token_client = soroban_sdk::token::TokenClient::new(&env, &escrow.token);
        let contract_address = env.current_contract_address();
        let buyer_muxed = MuxedAddress::from(&escrow.buyer);
        token_client.transfer(&contract_address, &buyer_muxed, &escrow.amount);

        escrow.state = EscrowState::Refunded;
        env.storage().instance().set(&ESCROW_KEY, &escrow);

        Ok(escrow)
    }
}

#[cfg(test)]
mod tests;
