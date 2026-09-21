#![no_std]
use soroban_sdk::{contract, contracterror, contractimpl, contracttype, symbol_short, Address, Env, Symbol};

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
    DeadlineNotPassed = 6,
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
    pub amount: i128,
    pub state: EscrowState,
    pub created_at: u64,
    pub deadline: u64,
    pub service_description: Symbol,
}

#[contract]
pub struct BreadlineEscrow;

#[contractimpl]
impl BreadlineEscrow {
    /// Create a new escrow agreement
    pub fn create_escrow(
        env: Env,
        buyer: Address,
        seller: Address,
        amount: i128,
        deadline: u64,
        service_description: Symbol,
    ) -> Result<Escrow, EscrowError> {
        buyer.require_auth();

        if env.storage().instance().has(&INITIALIZED) {
            return Err(EscrowError::AlreadyInitialized);
        }

        if amount <= 0 {
            return Err(EscrowError::InvalidAmount);
        }

        let escrow = Escrow {
            buyer: buyer.clone(),
            seller: seller.clone(),
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

    /// Fund the escrow (buyer deposits)
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

        escrow.state = EscrowState::Funded;
        env.storage().instance().set(&ESCROW_KEY, &escrow);

        Ok(escrow)
    }

    /// Release funds to seller (buyer approves delivery)
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

        escrow.state = EscrowState::Released;
        env.storage().instance().set(&ESCROW_KEY, &escrow);

        Ok(escrow)
    }

    /// Refund buyer (seller authorizes the refund)
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

    /// Auto-refund if deadline has passed and escrow is still Funded.
    /// No auth required — anyone can trigger this safety mechanism.
    pub fn auto_refund_if_expired(env: Env) -> Result<Escrow, EscrowError> {
        let mut escrow: Escrow = env
            .storage()
            .instance()
            .get(&ESCROW_KEY)
            .ok_or(EscrowError::NotInitialized)?;

        if !matches!(escrow.state, EscrowState::Funded) {
            return Err(EscrowError::InvalidState);
        }

        if env.ledger().timestamp() < escrow.deadline {
            return Err(EscrowError::DeadlineNotPassed);
        }

        escrow.state = EscrowState::Refunded;
        env.storage().instance().set(&ESCROW_KEY, &escrow);

        Ok(escrow)
    }
}

#[cfg(test)]
mod tests;
