# NFT Pawn

A Solana program which allows users to pawn their NFTs for SOL loans in a trustless manner. There will be a user (borrower) who initiates, deposits their NFT to the vault owned by our program in exchange for a loan amount of SOL. 

Now any user (lender) can take up their offer and deposit the SOL loan amount expected by the borrower and receive a pawn receipt or the right to claim the NFT later. 

So this is how we achieve a trustless NFT-backed loan.

---

## Let's walk through the architecture:

For this program, we will have one state account, the pawn account:

```rust

#[account]

#[derive(InitSpace)]

pub struct Pawn {

    pub seed: u64,

    pub borrower: Pubkey,

    pub nft_mint: Pubkey,

    pub loan_amount: u64,

    pub duration: i64,

    pub interest_rate: u16,

    pub bump: u8,

    pub created_at: i64,

}

```

The pawn account will hold the following data:

- `seed`: A random number used to generate the pawn account's address. This allows each user to create multiple pawn accounts.

- `borrower`: The account that created the pawn account.

- `nft_mint`: The mint of the NFT the borrower is pawning.

- `loan_amount`: The amount of SOL the borrower expects as loan.

- `duration`: The loan duration in seconds.

- `interest_rate`: The annual interest rate in basis points.

- `bump`: Since our Pawn account will be a PDA, we will store the bump of the account.

- `created_at`: Timestamp when the pawn was created.

---

## The user will be able to create a pawn account. For that, we create the following context:

![pawn workflow](pawn_imgs/pawn.png)

  ```rust

 #[derive(Accounts)]

#[instruction(seed: u64)]

pub struct Pawn<'info> {

    #[account(mut)]

    pub borrower: Signer<'info>,

    #[account(

        mint::token_program = token_program

    )]

    pub nft_mint: InterfaceAccount<'info, Mint>,

    #[account(

        mut,

        associated_token::mint = nft_mint,

        associated_token::authority = borrower,

    )]

    pub borrower_nft_ata: InterfaceAccount<'info, TokenAccount>,

    #[account(

        init,

        payer = borrower,

        space = 8 + Pawn::INIT_SPACE,

        seeds = [b"pawn", borrower.key().as_ref(), seed.to_le_bytes().as_ref()],

        bump

    )]

    pub pawn: Account<'info, Pawn>,

    #[account(

        init,

        payer = borrower,

        associated_token::mint = nft_mint,

        associated_token::authority = pawn,

    )]

    pub nft_vault: InterfaceAccount<'info, TokenAccount>,

    pub associated_token_program: Program<'info, AssociatedToken>,

    pub token_program: Interface<'info, TokenInterface>,

    pub system_program: Program<'info, System>,

    pub clock: Sysvar<'info, Clock>,

}

```

Let's have a closer look at the accounts that we are passing in this context:

- `borrower`: The account that is creating the pawn account.

- `nft_mint`: The mint of the NFT the borrower is pawning.

- `borrower_nft_ata`: The associated token account of the borrower for the NFT.

- `pawn`: Will be the state account that we will initialize and the borrower will be paying for the initialization of the account. We derive the Pawn PDA from the byte representation of the word "pawn", reference of the borrower publickey and reference of the little endian bytes format of seeds we got from instruction attribute. Anchor will calculate the canonical bump (the first bump that throws that address out of the ed25519 elliptic curve) and save it for us in a struct.

- `nft_vault`: The vault account that will hold the NFT until the loan is repaid or liquidated is initialised and borrower will be paying for also this. The pawn account will be the authority to this token account. 

- `associated_token_program`: The associated token program.

- `token_program`: The token program.

- `system_program`: The system program.

- `clock`: The clock sysvar for timestamps.

## We then implement some functionality for our Pawn context:

```rust

impl<'info> Pawn<'info> {

    pub fn save_pawn(&mut self, seed: u64, loan_amount: u64, duration: i64, interest_rate: u16, bumps: &PawnBumps, clock: &Clock) -> Result<()> {

        self.pawn.set_inner(Pawn {

            seed,

            borrower: self.borrower.key(),

            nft_mint: self.nft_mint.key(),

            loan_amount,

            duration,

            interest_rate,

            bump: bumps.pawn,

            created_at: clock.unix_timestamp,

        });

        Ok(())

    }

    pub fn deposit_nft(&mut self, amount: u64) -> Result<()> {

        let transfer_accounts = TransferChecked {

            from: self.borrower_nft_ata.to_account_info(),

            mint: self.nft_mint.to_account_info(),

            to: self.nft_vault.to_account_info(),

            authority: self.borrower.to_account_info(),

        };

        let cpi_ctx = CpiContext::new(self.token_program.to_account_info(), transfer_accounts);

        transfer_checked(cpi_ctx, amount, self.nft_mint.decimals)

    }

}

```

In the `save_pawn` function, we set the pawn account's data including timestamp. In the `deposit_nft` function, we transfer the NFT from the borrower's associated token account to the vault account.

---

## The borrower of a pawn can withdraw the NFT and close the pawn account if not funded. For that, we create the following context:

![pawn workflow](pawn_imgs/withdraw.png)

```rust

#[derive(Accounts)]

pub struct Withdraw<'info> {

    #[account(mut)]

    borrower: Signer<'info>,

    nft_mint: InterfaceAccount<'info, Mint>,

    #[account(

        mut,

        associated_token::mint = nft_mint,

        associated_token::authority = borrower,

    )]

    borrower_nft_ata: InterfaceAccount<'info, TokenAccount>,

    #[account(

        mut,

        close = borrower,

        has_one = nft_mint,

        has_one = borrower,

        seeds = [b"pawn", borrower.key().as_ref(), pawn.seed.to_le_bytes().as_ref()],

        bump = pawn.bump

    )]

    pawn: Account<'info, Pawn>,

    #[account(

        mut,

        associated_token::mint = nft_mint,

        associated_token::authority = pawn,

    )]

    pub nft_vault: InterfaceAccount<'info, TokenAccount>,

    associated_token_program: Program<'info, AssociatedToken>,

    token_program: Interface<'info, TokenInterface>,

    system_program: Program<'info, System>,

}

```

In this context, we are passing all the accounts that we need to withdraw the NFT and close the pawn account:

- `borrower`: The account that is withdrawing the NFT and closing the pawn account.

- `nft_mint`: The mint of the NFT the borrower is pawning.

- `borrower_nft_ata`: The associated token account of the borrower for the NFT.

- `pawn`: The pawn account that holds the pawn state.

- `nft_vault`: The vault account that holds the NFT until the loan is funded or withdrawn.

- `associated_token_program`: The associated token program.

- `token_program`: The token program.

- `system_program`: The system program.

## We then implement some functionality for our Withdraw context:

```rust

impl<'info> Withdraw<'info> {

    pub fn withdraw_and_close_vault(&mut self) -> Result<()> {

        let signer_seeds: [&[&[u8]]; 1] = [&[

            b"pawn",

            self.borrower.to_account_info().key.as_ref(),

            &self.pawn.seed.to_le_bytes()[..],

            &[self.pawn.bump],

        ]];

        let xfer_accounts = TransferChecked {

            from: self.nft_vault.to_account_info(),

            mint: self.nft_mint.to_account_info(),

            to: self.borrower_nft_ata.to_account_info(),

            authority: self.pawn.to_account_info(),

        };

        let ctx = CpiContext::new_with_signer(

            self.token_program.to_account_info(),

            xfer_accounts,

            &signer_seeds,

        );

        transfer_checked(ctx, self.nft_vault.amount, self.nft_mint.decimals)?;

        let close_accounts = CloseAccount {

            account: self.nft_vault.to_account_info(),

            destination: self.borrower.to_account_info(),

            authority: self.pawn.to_account_info(),

        };

        let ctx = CpiContext::new_with_signer(

            self.token_program.to_account_info(),

            close_accounts,

            &signer_seeds,

        );

        close_account(ctx)

    }

}

```

In the `withdraw_and_close_vault` function, we transfer the NFT from the vault account to the borrower's associated token account and then close the vault account and rent is claimed by the borrower.

Since the transfer occurs from a PDA, we need to pass the seeds while defining the context for the CPI.

---

## The lender of a pawn can fund the loan with SOL to the borrower and gain the right to claim the NFT later. For that, we create the following context:

![pawn workflow](pawn_imgs/fund.png)

```rust

#[derive(Accounts)]

pub struct Fund<'info> {

    #[account(mut)]

    pub lender: Signer<'info>,

    #[account(mut)]

    pub borrower: SystemAccount<'info>,

    pub nft_mint: InterfaceAccount<'info, Mint>,

    #[account(

        mut,

        seeds = [b"pawn", borrower.key().as_ref(), pawn.seed.to_le_bytes().as_ref()],

        bump = pawn.bump,

        has_one = nft_mint @ ErrorCode::InvalidPawn,

    )]

    pub pawn: Account<'info, Pawn>,

    #[account(

        mut,

        associated_token::mint = nft_mint,

        associated_token::authority = pawn,

    )]

    pub nft_vault: InterfaceAccount<'info, TokenAccount>,

    #[account(mut)]

    /// CHECK: This is the borrower's system account to receive SOL

    pub borrower_account: AccountInfo<'info>,

    pub system_program: Program<'info, System>,

    pub clock: Sysvar<'info, Clock>,

}

```

In this context, we are passing all the accounts that we need to fund the loan and transfer SOL to borrower:

- `lender`: The account that is funding the SOL loan and gaining claim rights.

- `borrower`: The account that created the pawn.

- `nft_mint`: The mint of the NFT.

- `pawn`: The pawn account that holds the state.

- `nft_vault`: The vault holding the NFT.

- `borrower_account`: The borrower's account to receive the SOL loan.

- `system_program`: The system program.

- `clock`: The clock sysvar.

## We then implement some functionality for our Fund context:

```rust

impl<'info> Fund<'info> {

    pub fn fund_loan(&mut self, clock: &Clock) -> Result<()> {

        // Transfer SOL from lender to borrower

        let ix = system_instruction::transfer(

            &self.lender.key(),

            &self.borrower_account.key(),

            self.pawn.loan_amount,

        );

        invoke(

            &ix,

            &[

                self.lender.to_account_info(),

                self.borrower_account.to_account_info(),

                self.system_program.to_account_info(),

            ],

        )?;

        // Update pawn state to funded

        self.pawn.funded_at = Some(clock.unix_timestamp);

        self.pawn.lender = Some(self.lender.key());

        Ok(())

    }

}

```

In the `fund_loan` function, we transfer SOL from the lender to the borrower's account using system transfer. We then update the pawn state to mark it as funded with timestamp and lender pubkey.

---

Note: For a full implementation, additional instructions for repay and liquidate would be needed, following similar patterns for transferring back the NFT upon repayment or to lender after duration.
