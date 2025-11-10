use anchor_lang::prelude::*;
use anchor_spl::{
    associated_token::AssociatedToken,
    token::{self, Token, Transfer},
};

declare_id!("48dhjY4ZmBeJqx1cGpoZhH6wCCboM4PkzEiKVEBFHjBK");

#[program]
pub mod anchor_nftpawn {


    use super::*;

    pub fn initialize(ctx: Context<Initialize>, loan_amount: u64) -> Result<()> {
        let config = &mut ctx.accounts.config;
        config.admin = ctx.accounts.admin.key();
        config.bump = ctx.bumps.config;
        config.loan_amount = loan_amount;
        config.bps_fee = 30;
        Ok(())
    }

    pub fn deposite(ctx: Context<Deposite>) -> Result<()> {
        let loan = &mut ctx.accounts.loan;
        require!(!loan.active, CustomError::LoanIsActive);

        // Transfer 1 NFT from user to escrow
        token::transfer(
            CpiContext::new(
                ctx.accounts.token_program.to_account_info(),
                Transfer {
                    from: ctx.accounts.user_ata.to_account_info(),
                    to: ctx.accounts.escrow_ata.to_account_info(),
                    authority: ctx.accounts.user.to_account_info(),
                },
            ),
            1, // Transfer 1 NFT
        )?;
        loan.borrower = ctx.accounts.user.key();
        loan.nft_mint = ctx.accounts.nft_mint.key();
        loan.amount = ctx.accounts.config.loan_amount;
        loan.active = true;
        loan.bump = ctx.bumps.loan;
        loan.loan_details = Vec::new();

        Ok(())
    }

    pub fn lend_borrower(ctx: Context<LendBorrower>) -> Result<()> {
        let loan = &mut ctx.accounts.loan;
        require!(
            loan.borrower != Pubkey::default(),
            CustomError::BorrowerNotFound
        );
        
        // Transfer SOL from lender to borrower using system program
        let transfer_instruction = anchor_lang::solana_program::system_instruction::transfer(
            &ctx.accounts.user.key(),
            &ctx.accounts.escrow_ata.key(),
            loan.amount
        );
        
        anchor_lang::solana_program::program::invoke(
            &transfer_instruction,
            &[
                ctx.accounts.user.to_account_info(),
                ctx.accounts.escrow_ata.to_account_info(),
            ],
        )?;
        
        let clock = Clock::get()?;
        
        let details = LoanDetails {
            loan_id: clock.unix_timestamp as u64,
            loan_timestamp: clock.unix_timestamp,
            lender_pubkey: ctx.accounts.user.key(),
            borrower_pubkey: loan.borrower,
            loan_amount: loan.amount,
            loan_status: LoanStatus::ACTIVE,
        };
        
        if loan.loan_details.is_empty() {
            loan.loan_details = Vec::new();
        }
        loan.loan_details.push(details);
        Ok(())
    }
    pub fn repay_borrower(ctx: Context<RepayBorrower>) -> Result<()> {
        let loan = &mut ctx.accounts.loan;
        let fee = calc_fee(loan.amount, ctx.accounts.config.bps_fee)?;
        let total_repay_amount = loan
            .amount
            .checked_add(fee)
            .ok_or(CustomError::MathOverflow)?;
        require!(loan.active, CustomError::LoanIsNotActive);

        // Transfer SOL from borrower to escrow using system program
        let transfer_instruction = anchor_lang::solana_program::system_instruction::transfer(
            &ctx.accounts.user.key(),
            &ctx.accounts.escrow_sol_ata.key(),
            total_repay_amount
        );
        
        anchor_lang::solana_program::program::invoke(
            &transfer_instruction,
            &[
                ctx.accounts.user.to_account_info(),
                ctx.accounts.escrow_sol_ata.to_account_info(),
            ],
        )?;

        let escrow_seeds = &[
            b"escrow",
            loan.to_account_info().key.as_ref(),
            &[ctx.bumps.escrow_authority],
        ];
        let escrow_signer = &[&escrow_seeds[..]];

        token::transfer(
            CpiContext::new_with_signer(
                ctx.accounts.token_program.to_account_info(),
                Transfer {
                    from: ctx.accounts.escrow_nft_ata.to_account_info(),
                    to: ctx.accounts.user_nft_ata.to_account_info(),
                    authority: ctx.accounts.escrow_authority.to_account_info(),
                },
                escrow_signer,
            ),
            1, // Transfer 1 NFT
        )?;
        
        // Update loan status to CLOSED in loan_details
        if let Some(last_loan_detail) = loan.loan_details.last_mut() {
            last_loan_detail.loan_status = LoanStatus::CLOSED;
        }
        
        loan.active = false;
        Ok(())
    }
}

#[account]
pub struct Config {
    pub admin: Pubkey,
    pub loan_amount: u64,
    pub bps_fee: u64,
    pub bump: u8,
}

impl Config {
    pub const SIZE: usize = 32 + 8 + 8 + 1; // admin + loan_amount + bps_fee + bump
}

#[account]
pub struct Loan {
    pub nft_mint: Pubkey,
    pub borrower: Pubkey,
    pub amount: u64,
    pub active: bool,
    pub loan_details: Vec<LoanDetails>,
    pub bump: u8,
}
impl Loan {
    pub const SIZE: usize = 32 + 32 + 8 + 1 + 4 + (10 * 32 + 32 + 8 + 1 + 8) + 1;
}

#[derive(AnchorDeserialize, AnchorSerialize, Clone, Debug, PartialEq)]
pub struct LoanDetails {
    pub loan_id: u64,
    pub borrower_pubkey: Pubkey,
    pub lender_pubkey: Pubkey,
    pub loan_amount: u64,
    pub loan_status: LoanStatus,
    pub loan_timestamp: i64,
}

#[account]
pub struct Escrow {
    pub owner: Pubkey,
    pub bump: u8,
}
impl Escrow {
    pub const SIZE: usize = 32 + 1;
}

#[derive(Accounts)]
pub struct Initialize<'info> {
    #[account(
        init,
        seeds = [b"config",admin.key().as_ref()],
        payer = admin,
        space = 8 + Config::SIZE,   
        bump,
    )]
    pub config: Account<'info, Config>,
    #[account(mut)]
    pub admin: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct Deposite<'info> {
    #[account(
        init,
        seeds = [b"loan", user.key().as_ref(), nft_mint.key().as_ref()],
        payer = user,
        space = 8 + Loan::SIZE,
        bump
    )]
    pub loan: Account<'info, Loan>,

    /// CHECK: PDA token account for escrow
    #[account(mut)]
    pub escrow_ata: AccountInfo<'info>,

    #[account(
        seeds = [b"escrow", loan.key().as_ref()],
        bump
    )]
    /// CHECK: PDA authority for escrow ATA
    pub escrow_authority: UncheckedAccount<'info>,

    #[account(mut)]
    pub config: Account<'info, Config>,

    /// CHECK: User's token account containing the NFT
    #[account(mut)]
    pub user_ata: AccountInfo<'info>,

    /// CHECK: NFT mint
    #[account(mut)]
    pub nft_mint: AccountInfo<'info>,

    #[account(mut)]
    pub user: Signer<'info>,

    pub token_program: Program<'info, Token>,
    pub associated_token_program: Program<'info, AssociatedToken>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct LendBorrower<'info> {
    #[account(mut)]
    pub loan: Account<'info, Loan>,
    #[account(
        init,
        seeds = [b"escrow",loan.key().as_ref()],
        payer = user,
        space = 8 + Escrow::SIZE,
        bump
    )]
    /// CHECK: PDA authority for escrow ATA
    pub escrow_authority: Account<'info, Escrow>,
    /// CHECK: Escrow SOL account (system account)
    #[account(mut)]
    pub escrow_ata: AccountInfo<'info>,
    /// CHECK: User's SOL account (system account)
    #[account(mut)]
    pub user_ata: AccountInfo<'info>,
    #[account(mut)]
    pub config: Account<'info, Config>,
    #[account(mut)]
    pub user: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct RepayBorrower<'info> {
    #[account(mut)]
    pub loan: Account<'info, Loan>,
    #[account(
        mut,
        seeds = [b"escrow",loan.key().as_ref()],
        bump
    )]
    /// CHECK: PDA authority for escrow ATA
    pub escrow_authority: Account<'info, Escrow>,
    /// CHECK: Escrow NFT token account
    #[account(mut)]
    pub escrow_nft_ata: AccountInfo<'info>,
    /// CHECK: User's NFT token account
    #[account(mut)]
    pub user_nft_ata: AccountInfo<'info>,
    /// CHECK: Escrow SOL account (system account)
    #[account(mut)]
    pub escrow_sol_ata: AccountInfo<'info>,
    /// CHECK: User's SOL account (system account)
    #[account(mut)]
    pub user_sol_ata: AccountInfo<'info>,
    #[account(mut)]
    pub config: Account<'info, Config>,
    #[account(mut)]
    pub user: Signer<'info>,
    pub token_program: Program<'info, Token>,
    pub system_program: Program<'info, System>,
}

#[error_code]
pub enum CustomError {
    #[msg("Loan is active somewhere..")]
    LoanIsActive,
    #[msg("Borrower not found or not provided..")]
    BorrowerNotFound,
    #[msg("Loan is not active..")]
    LoanIsNotActive,
    #[msg("Math overflow")]
    MathOverflow,
}

#[derive(AnchorDeserialize, AnchorSerialize, Clone, Copy, PartialEq, Eq, Debug)]
pub enum LoanStatus {
    ACTIVE,
    CLOSED,
}

fn calc_fee(amount: u64, fee_bps: u64) -> Result<u64> {
    let fee = amount
        .checked_mul(fee_bps as u64)
        .ok_or(CustomError::MathOverflow)?
        .checked_div(10000)
        .ok_or(CustomError::MathOverflow)?;
    Ok(fee)
}
