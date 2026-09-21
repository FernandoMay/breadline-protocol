#![cfg(test)]

use super::*;
use soroban_sdk::{symbol_short, testutils::Address as _, Address, Env};

#[test]
fn test_create_escrow() {
    let env = Env::default();
    let contract_id = env.register_contract(None, BreadlineEscrow);
    let buyer = Address::generate(&env);
    let seller = Address::generate(&env);

    env.mock_all_auths();

    let result = env.as_contract(&contract_id, || {
        BreadlineEscrow::create_escrow(
            env.clone(),
            buyer.clone(),
            seller.clone(),
            1000,
            1000000,
            symbol_short!("test"),
        )
    });

    assert!(result.is_ok());
    let escrow = result.unwrap();
    assert_eq!(escrow.amount, 1000);
    assert!(matches!(escrow.state, EscrowState::Created));
}

#[test]
fn test_fund_escrow() {
    let env = Env::default();
    let contract_id = env.register_contract(None, BreadlineEscrow);
    let buyer = Address::generate(&env);
    let seller = Address::generate(&env);

    env.mock_all_auths();

    env.as_contract(&contract_id, || {
        BreadlineEscrow::create_escrow(
            env.clone(),
            buyer.clone(),
            seller.clone(),
            1000,
            1000000,
            symbol_short!("test"),
        )
    })
    .unwrap();

    let result = env.as_contract(&contract_id, || BreadlineEscrow::fund_escrow(env.clone()));
    assert!(result.is_ok());
    assert!(matches!(result.unwrap().state, EscrowState::Funded));
}

#[test]
fn test_release_funds() {
    let env = Env::default();
    let contract_id = env.register_contract(None, BreadlineEscrow);
    let buyer = Address::generate(&env);
    let seller = Address::generate(&env);

    env.mock_all_auths();

    env.as_contract(&contract_id, || {
        BreadlineEscrow::create_escrow(
            env.clone(),
            buyer.clone(),
            seller.clone(),
            1000,
            1000000,
            symbol_short!("test"),
        )
    })
    .unwrap();
    env.as_contract(&contract_id, || BreadlineEscrow::fund_escrow(env.clone()))
        .unwrap();

    let result = env.as_contract(&contract_id, || BreadlineEscrow::release_funds(env.clone()));
    assert!(result.is_ok());
    assert!(matches!(result.unwrap().state, EscrowState::Released));
}

#[test]
fn test_refund_buyer() {
    let env = Env::default();
    let contract_id = env.register_contract(None, BreadlineEscrow);
    let buyer = Address::generate(&env);
    let seller = Address::generate(&env);

    env.mock_all_auths();

    env.as_contract(&contract_id, || {
        BreadlineEscrow::create_escrow(
            env.clone(),
            buyer.clone(),
            seller.clone(),
            1000,
            1000000,
            symbol_short!("test"),
        )
    })
    .unwrap();
    env.as_contract(&contract_id, || BreadlineEscrow::fund_escrow(env.clone()))
        .unwrap();

    let result = env.as_contract(&contract_id, || {
        BreadlineEscrow::refund_buyer(env.clone(), buyer.clone())
    });
    assert!(result.is_ok());
    assert!(matches!(result.unwrap().state, EscrowState::Refunded));
}

#[test]
fn test_raise_dispute() {
    let env = Env::default();
    let contract_id = env.register_contract(None, BreadlineEscrow);
    let buyer = Address::generate(&env);
    let seller = Address::generate(&env);

    env.mock_all_auths();

    env.as_contract(&contract_id, || {
        BreadlineEscrow::create_escrow(
            env.clone(),
            buyer.clone(),
            seller.clone(),
            1000,
            1000000,
            symbol_short!("test"),
        )
    })
    .unwrap();
    env.as_contract(&contract_id, || BreadlineEscrow::fund_escrow(env.clone()))
        .unwrap();

    let result = env.as_contract(&contract_id, || {
        BreadlineEscrow::raise_dispute(env.clone(), seller.clone())
    });
    assert!(result.is_ok());
    assert!(matches!(result.unwrap().state, EscrowState::Disputed));
}

#[test]
fn test_unauthorized_refund() {
    let env = Env::default();
    let contract_id = env.register_contract(None, BreadlineEscrow);
    let buyer = Address::generate(&env);
    let seller = Address::generate(&env);

    env.mock_all_auths();

    env.as_contract(&contract_id, || {
        BreadlineEscrow::create_escrow(
            env.clone(),
            buyer.clone(),
            seller.clone(),
            1000,
            1000000,
            symbol_short!("test"),
        )
    })
    .unwrap();
    env.as_contract(&contract_id, || BreadlineEscrow::fund_escrow(env.clone()))
        .unwrap();

    let unauthorized = Address::generate(&env);
    let result = env.as_contract(&contract_id, || {
        BreadlineEscrow::refund_buyer(env.clone(), unauthorized)
    });
    assert!(result.is_err());
}
