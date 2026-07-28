use solana_program::program_error::ProgramError;

use crate::{
    constants::{
        CURVE_MAX, POOL_EFFECTIVE_NUMERATOR, POOL_FEE_DENOMINATOR, POOL_SEED, TERMINAL_QUOTE,
        TOTAL_SUPPLY,
    },
    error::HakkyErrorV1,
};

fn arithmetic_overflow() -> ProgramError {
    HakkyErrorV1::ArithmeticOverflow.into()
}

fn zero_quote() -> ProgramError {
    HakkyErrorV1::ZeroQuote.into()
}

fn checked_product(left: u64, right: u64) -> Result<u128, ProgramError> {
    (left as u128)
        .checked_mul(right as u128)
        .ok_or_else(arithmetic_overflow)
}

fn validate_pool_reserves(base: u64, quote: u64) -> Result<u128, ProgramError> {
    if base == 0 || base > TOTAL_SUPPLY || quote == 0 {
        return Err(HakkyErrorV1::ReserveInvariant.into());
    }
    let product = checked_product(base, quote)?;
    let minimum_product = checked_product(POOL_SEED, TERMINAL_QUOTE)?;
    if product < minimum_product {
        return Err(HakkyErrorV1::ReserveInvariant.into());
    }
    Ok(product)
}

fn validate_pool_postconditions(
    base_after: u64,
    quote_after: u64,
    product_before: u128,
) -> Result<(), ProgramError> {
    if base_after == 0 || base_after > TOTAL_SUPPLY || quote_after == 0 {
        return Err(HakkyErrorV1::ReserveInvariant.into());
    }
    let product_after = checked_product(base_after, quote_after)?;
    let minimum_product = checked_product(POOL_SEED, TERMINAL_QUOTE)?;
    if product_after < product_before || product_after < minimum_product {
        return Err(HakkyErrorV1::ReserveInvariant.into());
    }
    Ok(())
}

pub fn ceil_div(numerator: u128, denominator: u128) -> Result<u128, ProgramError> {
    if denominator == 0 {
        return Err(arithmetic_overflow());
    }
    let quotient = numerator
        .checked_div(denominator)
        .ok_or_else(arithmetic_overflow)?;
    let remainder = numerator
        .checked_rem(denominator)
        .ok_or_else(arithmetic_overflow)?;
    quotient
        .checked_add(u128::from(remainder != 0))
        .ok_or_else(arithmetic_overflow)
}

pub fn curve_reserve(sold: u64) -> Result<u64, ProgramError> {
    if sold > CURVE_MAX {
        return Err(HakkyErrorV1::CurveDomain.into());
    }
    let numerator = (TERMINAL_QUOTE as u128)
        .checked_mul(sold as u128)
        .ok_or_else(arithmetic_overflow)?;
    let triple_sold = (sold as u128)
        .checked_mul(3)
        .ok_or_else(arithmetic_overflow)?;
    let denominator = (CURVE_MAX as u128)
        .checked_mul(4)
        .and_then(|value| value.checked_sub(triple_sold))
        .ok_or_else(arithmetic_overflow)?;
    let reserve = numerator
        .checked_div(denominator)
        .ok_or_else(arithmetic_overflow)?;
    u64::try_from(reserve).map_err(|_| arithmetic_overflow())
}

pub fn quote_curve_buy_exact_out(sold: u64, base_out: u64) -> Result<u64, ProgramError> {
    if base_out == 0 {
        return Err(HakkyErrorV1::ZeroAmount.into());
    }
    if sold > CURVE_MAX {
        return Err(HakkyErrorV1::CurveDomain.into());
    }
    let available = CURVE_MAX
        .checked_sub(sold)
        .ok_or(HakkyErrorV1::CurveDomain)?;
    if base_out > available {
        return Err(HakkyErrorV1::InsufficientCurveLiquidity.into());
    }
    let sold_after = sold.checked_add(base_out).ok_or_else(arithmetic_overflow)?;
    let quote_in = curve_reserve(sold_after)?
        .checked_sub(curve_reserve(sold)?)
        .ok_or_else(arithmetic_overflow)?;
    if quote_in == 0 {
        return Err(zero_quote());
    }
    Ok(quote_in)
}

pub fn quote_curve_sell_exact_in(sold: u64, base_in: u64) -> Result<u64, ProgramError> {
    if base_in == 0 {
        return Err(HakkyErrorV1::ZeroAmount.into());
    }
    if sold > CURVE_MAX {
        return Err(HakkyErrorV1::CurveDomain.into());
    }
    if base_in > sold {
        return Err(HakkyErrorV1::InsufficientCurveLiquidity.into());
    }
    let sold_after = sold
        .checked_sub(base_in)
        .ok_or(HakkyErrorV1::InsufficientCurveLiquidity)?;
    let quote_out = curve_reserve(sold)?
        .checked_sub(curve_reserve(sold_after)?)
        .ok_or_else(arithmetic_overflow)?;
    if quote_out == 0 {
        return Err(zero_quote());
    }
    Ok(quote_out)
}

pub fn quote_pool_buy_exact_out(
    base_reserve: u64,
    quote_reserve: u64,
    base_out: u64,
) -> Result<u64, ProgramError> {
    if base_out == 0 {
        return Err(HakkyErrorV1::ZeroAmount.into());
    }
    let product_before = validate_pool_reserves(base_reserve, quote_reserve)?;
    if base_out >= base_reserve {
        return Err(HakkyErrorV1::InsufficientCurveLiquidity.into());
    }

    let base_after = base_reserve
        .checked_sub(base_out)
        .ok_or(HakkyErrorV1::InsufficientCurveLiquidity)?;
    let effective_numerator = (quote_reserve as u128)
        .checked_mul(base_out as u128)
        .ok_or_else(arithmetic_overflow)?;
    let effective_quote = ceil_div(effective_numerator, base_after as u128)?;
    let gross_numerator = effective_quote
        .checked_mul(POOL_FEE_DENOMINATOR as u128)
        .ok_or_else(arithmetic_overflow)?;
    let gross_quote_u128 = ceil_div(gross_numerator, POOL_EFFECTIVE_NUMERATOR as u128)?;
    let gross_quote = u64::try_from(gross_quote_u128).map_err(|_| arithmetic_overflow())?;
    if gross_quote == 0 {
        return Err(zero_quote());
    }
    let quote_after = quote_reserve
        .checked_add(gross_quote)
        .ok_or_else(arithmetic_overflow)?;
    validate_pool_postconditions(base_after, quote_after, product_before)?;
    Ok(gross_quote)
}

pub fn quote_pool_sell_exact_in(
    base_reserve: u64,
    quote_reserve: u64,
    gross_base_in: u64,
) -> Result<u64, ProgramError> {
    if gross_base_in == 0 {
        return Err(HakkyErrorV1::ZeroAmount.into());
    }
    let product_before = validate_pool_reserves(base_reserve, quote_reserve)?;
    let base_after = base_reserve
        .checked_add(gross_base_in)
        .ok_or_else(arithmetic_overflow)?;
    if base_after > TOTAL_SUPPLY {
        return Err(HakkyErrorV1::ReserveInvariant.into());
    }

    let effective_numerator = (gross_base_in as u128)
        .checked_mul(POOL_EFFECTIVE_NUMERATOR as u128)
        .ok_or_else(arithmetic_overflow)?;
    let effective_base = effective_numerator
        .checked_div(POOL_FEE_DENOMINATOR as u128)
        .ok_or_else(arithmetic_overflow)?;
    if effective_base == 0 {
        return Err(zero_quote());
    }
    let quote_numerator = (quote_reserve as u128)
        .checked_mul(effective_base)
        .ok_or_else(arithmetic_overflow)?;
    let quote_denominator = (base_reserve as u128)
        .checked_add(effective_base)
        .ok_or_else(arithmetic_overflow)?;
    let quote_out_u128 = quote_numerator
        .checked_div(quote_denominator)
        .ok_or_else(arithmetic_overflow)?;
    let quote_out = u64::try_from(quote_out_u128).map_err(|_| arithmetic_overflow())?;
    if quote_out == 0 {
        return Err(zero_quote());
    }
    let quote_after = quote_reserve
        .checked_sub(quote_out)
        .ok_or_else(arithmetic_overflow)?;
    validate_pool_postconditions(base_after, quote_after, product_before)?;
    Ok(quote_out)
}
