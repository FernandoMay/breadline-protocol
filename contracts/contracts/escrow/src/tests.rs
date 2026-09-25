#![cfg(test)]

use super::*;
use soroban_sdk::{
    testutils::{Address as _, Ledger},
    token::{StellarAssetClient, TokenClient},
    Address, Env, String,
};

fn setup_token(env: &Env) -> (Address, StellarAssetClient<'_>) {
    let admin = Address::generate(env);
    let sac = env.register_stellar_asset_contract_v2(admin.clone());
    let token_address = sac.address();
    let client = StellarAssetClient::new(env, &token_address);
    (token_address, client)
}

fn create_test_escrow(env: &Env, contract_id: &Address, buyer: &Address, seller: &Address, token: &Address, amount: i128, deadline: u64, desc: &str) {
    env.as_contract(contract_id, || {
        BreadlineEscrow::create_escrow(
            env.clone(),
            buyer.clone(),
            seller.clone(),
            token.clone(),
            amount,
            deadline,
            String::from_str(env, desc),
        )
    })
    .unwrap();
}

#[test]
fn test_create_escrow() {
    let env = Env::default();
    let contract_id = env.register(BreadlineEscrow, ());
    let buyer = Address::generate(&env);
    let seller = Address::generate(&env);
    let (token, _) = setup_token(&env);

    env.mock_all_auths();

    let result = env.as_contract(&contract_id, || {
        BreadlineEscrow::create_escrow(
            env.clone(),
            buyer.clone(),
            seller.clone(),
            token.clone(),
            1000,
            1000000,
            String::from_str(&env, "test"),
        )
    });

    assert!(result.is_ok());
    let escrow = result.unwrap();
    assert_eq!(escrow.amount, 1000);
    assert!(matches!(escrow.state, EscrowState::Created));
    assert_eq!(escrow.token, token);
}

#[test]
fn test_fund_escrow_with_token_transfer() {
    let env = Env::default();
    let contract_id = env.register(BreadlineEscrow, ());
    let buyer = Address::generate(&env);
    let seller = Address::generate(&env);
    let (token, sac_client) = setup_token(&env);

    env.mock_all_auths();
    // Mint to buyer
    sac_client.mint(&buyer, &10000);

    create_test_escrow(&env, &contract_id, &buyer, &seller, &token, 1000, 1000000, "test");

    let token_client = TokenClient::new(&env, &token);
    assert_eq!(token_client.balance(&buyer), 10000);
    assert_eq!(token_client.balance(&contract_id), 0);

    let result = env.as_contract(&contract_id, || BreadlineEscrow::fund_escrow(env.clone()));
    assert!(result.is_ok());
    assert!(matches!(result.unwrap().state, EscrowState::Funded));

    // After fund, contract should custody amount, buyer decreased
    assert_eq!(token_client.balance(&buyer), 9000);
    assert_eq!(token_client.balance(&contract_id), 1000);
}

#[test]
fn test_fund_escrow() {
    let env = Env::default();
    let contract_id = env.register(BreadlineEscrow, ());
    let buyer = Address::generate(&env);
    let seller = Address::generate(&env);
    let (token, sac_client) = setup_token(&env);

    env.mock_all_auths();
    sac_client.mint(&buyer, &5000);

    env.as_contract(&contract_id, || {
        BreadlineEscrow::create_escrow(
            env.clone(),
            buyer.clone(),
            seller.clone(),
            token.clone(),
            1000,
            1000000,
            String::from_str(&env, "test"),
        )
    })
    .unwrap();

    let result = env.as_contract(&contract_id, || BreadlineEscrow::fund_escrow(env.clone()));
    assert!(result.is_ok());
    assert!(matches!(result.unwrap().state, EscrowState::Funded));
}

#[test]
fn test_release_funds_with_token_transfer() {
    let env = Env::default();
    let contract_id = env.register(BreadlineEscrow, ());
    let buyer = Address::generate(&env);
    let seller = Address::generate(&env);
    let (token, sac_client) = setup_token(&env);

    env.mock_all_auths();
    sac_client.mint(&buyer, &10000);
    create_test_escrow(&env, &contract_id, &buyer, &seller, &token, 1000, 1000000, "test");
    env.as_contract(&contract_id, || BreadlineEscrow::fund_escrow(env.clone())).unwrap();

    let token_client = TokenClient::new(&env, &token);
    assert_eq!(token_client.balance(&seller), 0);
    assert_eq!(token_client.balance(&contract_id), 1000);

    let result = env.as_contract(&contract_id, || BreadlineEscrow::release_funds(env.clone()));
    assert!(result.is_ok());
    assert!(matches!(result.unwrap().state, EscrowState::Released));

    // Seller should now have funds, contract empty
    assert_eq!(token_client.balance(&seller), 1000);
    assert_eq!(token_client.balance(&contract_id), 0);
    assert_eq!(token_client.balance(&buyer), 9000);
}

#[test]
fn test_release_funds() {
    let env = Env::default();
    let contract_id = env.register(BreadlineEscrow, ());
    let buyer = Address::generate(&env);
    let seller = Address::generate(&env);
    let (token, sac_client) = setup_token(&env);

    env.mock_all_auths();
    sac_client.mint(&buyer, &5000);

    env.as_contract(&contract_id, || {
        BreadlineEscrow::create_escrow(
            env.clone(),
            buyer.clone(),
            seller.clone(),
            token.clone(),
            1000,
            1000000,
            String::from_str(&env, "test"),
        )
    })
    .unwrap();
    env.as_contract(&contract_id, || BreadlineEscrow::fund_escrow(env.clone())).unwrap();

    let result = env.as_contract(&contract_id, || BreadlineEscrow::release_funds(env.clone()));
    assert!(result.is_ok());
    assert!(matches!(result.unwrap().state, EscrowState::Released));
}

#[test]
fn test_refund_buyer_with_token_transfer() {
    let env = Env::default();
    let contract_id = env.register(BreadlineEscrow, ());
    let buyer = Address::generate(&env);
    let seller = Address::generate(&env);
    let (token, sac_client) = setup_token(&env);

    env.mock_all_auths();
    sac_client.mint(&buyer, &10000);
    create_test_escrow(&env, &contract_id, &buyer, &seller, &token, 2500, 1000000, "service");
    env.as_contract(&contract_id, || BreadlineEscrow::fund_escrow(env.clone())).unwrap();

    let token_client = TokenClient::new(&env, &token);
    assert_eq!(token_client.balance(&contract_id), 2500);

    let result = env.as_contract(&contract_id, || {
        BreadlineEscrow::refund_buyer(env.clone(), buyer.clone())
    });
    assert!(result.is_ok());
    assert!(matches!(result.unwrap().state, EscrowState::Refunded));

    // Buyer refunded, contract empty
    assert_eq!(token_client.balance(&buyer), 10000);
    assert_eq!(token_client.balance(&contract_id), 0);
}

#[test]
fn test_refund_buyer() {
    let env = Env::default();
    let contract_id = env.register(BreadlineEscrow, ());
    let buyer = Address::generate(&env);
    let seller = Address::generate(&env);
    let (token, sac_client) = setup_token(&env);

    env.mock_all_auths();
    sac_client.mint(&buyer, &5000);

    env.as_contract(&contract_id, || {
        BreadlineEscrow::create_escrow(
            env.clone(),
            buyer.clone(),
            seller.clone(),
            token.clone(),
            1000,
            1000000,
            String::from_str(&env, "test"),
        )
    })
    .unwrap();
    env.as_contract(&contract_id, || BreadlineEscrow::fund_escrow(env.clone())).unwrap();

    let result = env.as_contract(&contract_id, || {
        BreadlineEscrow::refund_buyer(env.clone(), buyer.clone())
    });
    assert!(result.is_ok());
    assert!(matches!(result.unwrap().state, EscrowState::Refunded));
}

#[test]
fn test_raise_dispute() {
    let env = Env::default();
    let contract_id = env.register(BreadlineEscrow, ());
    let buyer = Address::generate(&env);
    let seller = Address::generate(&env);
    let (token, sac_client) = setup_token(&env);

    env.mock_all_auths();
    sac_client.mint(&buyer, &5000);

    env.as_contract(&contract_id, || {
        BreadlineEscrow::create_escrow(
            env.clone(),
            buyer.clone(),
            seller.clone(),
            token.clone(),
            1000,
            1000000,
            String::from_str(&env, "test"),
        )
    })
    .unwrap();
    env.as_contract(&contract_id, || BreadlineEscrow::fund_escrow(env.clone())).unwrap();

    let result = env.as_contract(&contract_id, || {
        BreadlineEscrow::raise_dispute(env.clone(), seller.clone())
    });
    assert!(result.is_ok());
    assert!(matches!(result.unwrap().state, EscrowState::Disputed));
}

#[test]
fn test_unauthorized_refund() {
    let env = Env::default();
    let contract_id = env.register(BreadlineEscrow, ());
    let buyer = Address::generate(&env);
    let seller = Address::generate(&env);
    let (token, sac_client) = setup_token(&env);

    env.mock_all_auths();
    sac_client.mint(&buyer, &5000);

    env.as_contract(&contract_id, || {
        BreadlineEscrow::create_escrow(
            env.clone(),
            buyer.clone(),
            seller.clone(),
            token.clone(),
            1000,
            1000000,
            String::from_str(&env, "test"),
        )
    })
    .unwrap();
    env.as_contract(&contract_id, || BreadlineEscrow::fund_escrow(env.clone())).unwrap();

    let unauthorized = Address::generate(&env);
    let result = env.as_contract(&contract_id, || {
        BreadlineEscrow::refund_buyer(env.clone(), unauthorized)
    });
    assert!(result.is_err());
}

#[test]
fn test_auto_refund_if_expired_with_token() {
    let env = Env::default();
    let contract_id = env.register(BreadlineEscrow, ());
    let buyer = Address::generate(&env);
    let seller = Address::generate(&env);
    let (token, sac_client) = setup_token(&env);

    env.mock_all_auths();
    sac_client.mint(&buyer, &10000);

    // Create escrow with deadline at timestamp 100
    env.as_contract(&contract_id, || {
        BreadlineEscrow::create_escrow(
            env.clone(),
            buyer.clone(),
            seller.clone(),
            token.clone(),
            5000,
            100,
            String::from_str(&env, "service"),
        )
    })
    .unwrap();

    // Fund it
    env.as_contract(&contract_id, || BreadlineEscrow::fund_escrow(env.clone())).unwrap();

    let token_client = TokenClient::new(&env, &token);
    assert_eq!(token_client.balance(&contract_id), 5000);
    assert_eq!(token_client.balance(&buyer), 5000);

    // Advance ledger time past deadline
    env.ledger().set_timestamp(200);

    // Auto-refund should succeed and return funds to buyer
    let result = env.as_contract(&contract_id, || {
        BreadlineEscrow::auto_refund_if_expired(env.clone())
    });
    assert!(result.is_ok());
    assert!(matches!(result.unwrap().state, EscrowState::Refunded));
    assert_eq!(token_client.balance(&buyer), 10000);
    assert_eq!(token_client.balance(&contract_id), 0);
}

#[test]
fn test_auto_refund_if_expired() {
    let env = Env::default();
    let contract_id = env.register(BreadlineEscrow, ());
    let buyer = Address::generate(&env);
    let seller = Address::generate(&env);
    let (token, sac_client) = setup_token(&env);

    env.mock_all_auths();

    sac_client.mint(&buyer, &10000);
    // Create escrow with deadline at timestamp 100
    env.as_contract(&contract_id, || {
        BreadlineEscrow::create_escrow(
            env.clone(),
            buyer.clone(),
            seller.clone(),
            token.clone(),
            5000,
            100,
            String::from_str(&env, "service"),
        )
    })
    .unwrap();

    // Fund it
    env.as_contract(&contract_id, || BreadlineEscrow::fund_escrow(env.clone())).unwrap();

    // Advance ledger time past deadline
    env.ledger().set_timestamp(200);

    // Auto-refund should succeed
    let result = env.as_contract(&contract_id, || {
        BreadlineEscrow::auto_refund_if_expired(env.clone())
    });
    assert!(result.is_ok());
    assert!(matches!(result.unwrap().state, EscrowState::Refunded));
}

#[test]
fn test_auto_refund_fails_before_deadline() {
    let env = Env::default();
    let contract_id = env.register(BreadlineEscrow, ());
    let buyer = Address::generate(&env);
    let seller = Address::generate(&env);
    let (token, sac_client) = setup_token(&env);

    env.mock_all_auths();
    sac_client.mint(&buyer, &5000);

    // Create escrow with deadline far in the future
    env.as_contract(&contract_id, || {
        BreadlineEscrow::create_escrow(
            env.clone(),
            buyer.clone(),
            seller.clone(),
            token.clone(),
            5000,
            999999,
            String::from_str(&env, "service"),
        )
    })
    .unwrap();

    env.as_contract(&contract_id, || BreadlineEscrow::fund_escrow(env.clone())).unwrap();

    // Auto-refund should fail — deadline not passed
    let result = env.as_contract(&contract_id, || {
        BreadlineEscrow::auto_refund_if_expired(env.clone())
    });
    assert!(result.is_err());
    assert!(matches!(result.unwrap_err(), EscrowError::DeadlineNotPassed));
}

#[test]
fn test_create_escrow_rejects_same_parties() {
    let env = Env::default();
    let contract_id = env.register(BreadlineEscrow, ());
    let buyer = Address::generate(&env);
    let (token, _) = setup_token(&env);

    env.mock_all_auths();

    // Buyer and seller must be distinct counterparties.
    let result = env.as_contract(&contract_id, || {
        BreadlineEscrow::create_escrow(
            env.clone(),
            buyer.clone(),
            buyer.clone(),
            token.clone(),
            1000,
            1000000,
            String::from_str(&env, "test"),
        )
    });

    assert!(matches!(result.unwrap_err(), EscrowError::SameParties));
}

#[test]
fn test_create_escrow_rejects_deadline_in_past() {
    let env = Env::default();
    let contract_id = env.register(BreadlineEscrow, ());
    let buyer = Address::generate(&env);
    let seller = Address::generate(&env);
    let (token, _) = setup_token(&env);

    env.mock_all_auths();
    env.ledger().set_timestamp(500);

    // Deadline equal to "now" is not strictly in the future.
    let result = env.as_contract(&contract_id, || {
        BreadlineEscrow::create_escrow(
            env.clone(),
            buyer.clone(),
            seller.clone(),
            token.clone(),
            1000,
            500,
            String::from_str(&env, "test"),
        )
    });
    assert!(matches!(result.unwrap_err(), EscrowError::InvalidDeadline));

    // Deadline before "now" is also rejected.
    let result = env.as_contract(&contract_id, || {
        BreadlineEscrow::create_escrow(
            env.clone(),
            buyer.clone(),
            seller.clone(),
            token.clone(),
            1000,
            499,
            String::from_str(&env, "test"),
        )
    });
    assert!(matches!(result.unwrap_err(), EscrowError::InvalidDeadline));

    // One second in the future is accepted.
    let result = env.as_contract(&contract_id, || {
        BreadlineEscrow::create_escrow(
            env.clone(),
            buyer.clone(),
            seller.clone(),
            token.clone(),
            1000,
            501,
            String::from_str(&env, "test"),
        )
    });
    assert!(result.is_ok());
}

#[test]
fn test_fund_escrow_rejected_after_deadline() {
    let env = Env::default();
    let contract_id = env.register(BreadlineEscrow, ());
    let buyer = Address::generate(&env);
    let seller = Address::generate(&env);
    let (token, sac_client) = setup_token(&env);

    env.mock_all_auths();
    sac_client.mint(&buyer, &10000);

    create_test_escrow(&env, &contract_id, &buyer, &seller, &token, 1000, 100, "test");

    // Buyer waits past the deadline before funding: the deposit is refused.
    env.ledger().set_timestamp(100);
    let result = env.as_contract(&contract_id, || BreadlineEscrow::fund_escrow(env.clone()));

    assert!(matches!(result.unwrap_err(), EscrowError::DeadlinePassed));

    // No tokens moved.
    let token_client = TokenClient::new(&env, &token);
    assert_eq!(token_client.balance(&buyer), 10000);
    assert_eq!(token_client.balance(&contract_id), 0);
}

#[test]
fn test_release_funds_rejected_after_deadline() {
    let env = Env::default();
    let contract_id = env.register(BreadlineEscrow, ());
    let buyer = Address::generate(&env);
    let seller = Address::generate(&env);
    let (token, sac_client) = setup_token(&env);

    env.mock_all_auths();
    sac_client.mint(&buyer, &10000);

    create_test_escrow(&env, &contract_id, &buyer, &seller, &token, 1000, 100, "test");
    env.as_contract(&contract_id, || BreadlineEscrow::fund_escrow(env.clone())).unwrap();

    // Past the deadline the seller can no longer be paid; only auto-refund remains.
    env.ledger().set_timestamp(100);
    let result = env.as_contract(&contract_id, || BreadlineEscrow::release_funds(env.clone()));

    assert!(matches!(result.unwrap_err(), EscrowError::DeadlinePassed));

    // The escrow is still Funded and the tokens are still in custody.
    let token_client = TokenClient::new(&env, &token);
    assert_eq!(token_client.balance(&seller), 0);
    assert_eq!(token_client.balance(&contract_id), 1000);
    let escrow = env.as_contract(&contract_id, || BreadlineEscrow::get_escrow(env.clone())).unwrap();
    assert!(matches!(escrow.state, EscrowState::Funded));
}

#[test]
fn test_disputed_auto_refund_on_expiry() {
    let env = Env::default();
    let contract_id = env.register(BreadlineEscrow, ());
    let buyer = Address::generate(&env);
    let seller = Address::generate(&env);
    let (token, sac_client) = setup_token(&env);

    env.mock_all_auths();
    sac_client.mint(&buyer, &10000);

    create_test_escrow(&env, &contract_id, &buyer, &seller, &token, 4000, 100, "service");
    env.as_contract(&contract_id, || BreadlineEscrow::fund_escrow(env.clone())).unwrap();

    let token_client = TokenClient::new(&env, &token);
    assert_eq!(token_client.balance(&buyer), 6000);
    assert_eq!(token_client.balance(&contract_id), 4000);

    // Dispute freezes settlement: release and refund are both refused.
    env.as_contract(&contract_id, || BreadlineEscrow::raise_dispute(env.clone(), seller.clone()))
        .unwrap();
    let escrow = env.as_contract(&contract_id, || BreadlineEscrow::get_escrow(env.clone())).unwrap();
    assert!(matches!(escrow.state, EscrowState::Disputed));
    assert!(env.as_contract(&contract_id, || BreadlineEscrow::release_funds(env.clone())).is_err());
    assert!(
        env.as_contract(&contract_id, || BreadlineEscrow::refund_buyer(env.clone(), buyer.clone()))
            .is_err()
    );

    // Before the deadline the safety valve stays closed.
    let result = env.as_contract(&contract_id, || BreadlineEscrow::auto_refund_if_expired(env.clone()));
    assert!(matches!(result.unwrap_err(), EscrowError::DeadlineNotPassed));
    assert_eq!(token_client.balance(&contract_id), 4000);

    // Once the deadline passes, a disputed escrow refunds the buyer: funds are
    // never trapped. Permissionless — triggered without buyer auth here.
    env.ledger().set_timestamp(100);
    let result = env.as_contract(&contract_id, || BreadlineEscrow::auto_refund_if_expired(env.clone()));

    assert!(result.is_ok());
    assert!(matches!(result.unwrap().state, EscrowState::Refunded));
    assert_eq!(token_client.balance(&contract_id), 0);
    assert_eq!(token_client.balance(&buyer), 10000);
    assert_eq!(token_client.balance(&seller), 0);
}

#[test]
fn test_full_custody_lifecycle() {
    let env = Env::default();
    let contract_id = env.register(BreadlineEscrow, ());
    let buyer = Address::generate(&env);
    let seller = Address::generate(&env);
    let (token, sac_client) = setup_token(&env);

    env.mock_all_auths();
    sac_client.mint(&buyer, &10000);
    let token_client = TokenClient::new(&env, &token);

    // Create
    env.as_contract(&contract_id, || {
        BreadlineEscrow::create_escrow(
            env.clone(),
            buyer.clone(),
            seller.clone(),
            token.clone(),
            3000,
            1000000,
            String::from_str(&env, "full lifecycle test"),
        )
    })
    .unwrap();
    assert_eq!(token_client.balance(&buyer), 10000);
    assert_eq!(token_client.balance(&contract_id), 0);

    // Fund: buyer -> contract
    env.as_contract(&contract_id, || BreadlineEscrow::fund_escrow(env.clone())).unwrap();
    assert_eq!(token_client.balance(&buyer), 7000);
    assert_eq!(token_client.balance(&contract_id), 3000);

    // Release: contract -> seller
    env.as_contract(&contract_id, || BreadlineEscrow::release_funds(env.clone())).unwrap();
    assert_eq!(token_client.balance(&seller), 3000);
    assert_eq!(token_client.balance(&contract_id), 0);
    assert_eq!(token_client.balance(&buyer), 7000);

    // Verify escrow state
    let escrow = env.as_contract(&contract_id, || BreadlineEscrow::get_escrow(env.clone())).unwrap();
    assert!(matches!(escrow.state, EscrowState::Released));
}
