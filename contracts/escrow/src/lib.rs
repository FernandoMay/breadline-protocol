#![no_std]
use soroban_sdk::{contract, contractimpl, contracttype, symbol_short, Address, Env, Symbol};

const ESCROW: Symbol = symbol_short!("ESCROW");
const INITIALIZED: Symbol = symbol_short!("INIT");

#[contracttype]
pub enum EscrowState {
    Created,
    Funded,
    Released,
    Refunded,
    Disputed,
}

#[contracttype]
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
    ) -> Escrow {
        buyer.require_auth();

        if amount <= 0 {
            panic!("Amount must be positive");
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

        env.storage()
            .instance()
            .set(&ESCROW, &escrow);
        env.storage()
            .instance()
            .set(&INITIALIZED, &true);

        escrow
    }

    /// Get current escrow state
    pub fn get_escrow(env: Env) -> Escrow {
        env.storage()
            .instance()
            .get(&ESCROW)
            .expect("Escrow not initialized")
    }

    /// Fund the escrow (buyer deposits)
    pub fn fund_escrow(env: Env) -> Escrow {
        let mut escrow: Escrow = env
            .storage()
            .instance()
            .get(&ESCROW)
            .expect("Escrow not initialized");

        escrow.buyer.require_auth();

        if !matches!(escrow.state, EscrowState::Created) {
            panic!("Escrow is not in Created state");
        }

        escrow.state = EscrowState::Funded;
        env.storage()
            .instance()
            .set(&ESCROW, &escrow);

        escrow
    }

    /// Release funds to seller (buyer approves delivery)
    pub fn release_funds(env: Env) -> Escrow {
        let mut escrow: Escrow = env
            .storage()
            .instance()
            .get(&ESCROW)
            .expect("Escrow not initialized");

        escrow.buyer.require_auth();

        if !matches!(escrow.state, EscrowState::Funded) {
            panic!("Escrow is not in Funded state");
        }

        escrow.state = EscrowState::Released;
        env.storage()
            .instance()
            .set(&ESCROW, &escrow);

        escrow
    }

    /// Refund buyer (seller agrees or deadline passed)
    pub fn refund_buyer(env: Env) -> Escrow {
        let mut escrow: Escrow = env
            .storage()
            .instance()
            .get(&ESCROW)
            .expect("Escrow not initialized");

        let caller = envinvoker().authorized_address();
        if caller != escrow.buyer && caller != escrow.seller {
            panic!("Only buyer or seller can request refund");
        }

        if !matches!(escrow.state, EscrowState::Funded) {
            panic!("Escrow is not in Funded state");
        }

        escrow.state = EscrowState::Refunded;
        env.storage()
            .instance()
            .set(&ESCROW, &escrow);

        escrow
    }

    /// Raise a dispute
    pub fn raise_dispute(env: Env) -> Escrow {
        let mut escrow: Escrow = env
            .storage()
            .instance()
            .get(&ESCROW)
            .expect("Escrow not initialized");

        let caller = env.invoker().authorized_address();
        if caller != escrow.buyer && caller != escrow.seller {
            panic!("Only buyer or seller can raise dispute");
        }

        if !matches!(escrow.state, EscrowState::Funded) {
            panic!("Escrow is not in Funded state");
        }

        escrow.state = EscrowState::Disputed;
        env.storage()
            .instance()
            .set(&ESCROW, &escrow);

        escrow
    }

    /// Check if deadline has passed
    pub fn is_expired(env: Env) -> bool {
        let escrow: Escrow = env
            .storage()
            .instance()
            .get(&ESCROW)
            .expect("Escrow not initialized");

        env.ledger().timestamp() >= escrow.deadline
    }
}
