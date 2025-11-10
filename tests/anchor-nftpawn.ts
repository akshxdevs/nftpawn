import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { AnchorNftpawn } from "../target/types/anchor_nftpawn";
import { Keypair, PublicKey, SystemProgram } from "@solana/web3.js";
import {
  createMint,
  getOrCreateAssociatedTokenAccount,
  mintTo,
  TOKEN_PROGRAM_ID,
} from "@solana/spl-token";
import { ASSOCIATED_PROGRAM_ID } from "@coral-xyz/anchor/dist/cjs/utils/token";

describe("anchor-nftpawn", () => {
  // Configure the client to use the local cluster.
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);

  const program = anchor.workspace.anchorNftpawn as Program<AnchorNftpawn>;
  const user = provider.wallet as anchor.Wallet;
  let amount = new anchor.BN(1_000_000_000);
  let userAta: anchor.web3.PublicKey;
  let config: anchor.web3.PublicKey;
  let escrowAuthority: anchor.web3.PublicKey;
  let escrowAta: anchor.web3.PublicKey;
  let loan: anchor.web3.PublicKey;
  let mint: anchor.web3.PublicKey;

  it("Is initialized!", async () => {
    [config] = await PublicKey.findProgramAddress(
      [Buffer.from("config"), user.publicKey.toBuffer()],
      program.programId
    );

    const tx = await program.methods
      .initialize(amount)
      .accounts({
        config: config,
        admin: user.publicKey,
        systemProgram: SystemProgram.programId,
      })
      .rpc();
    console.log("Your transaction signature", tx);
  });

  it("Deposite from the user / Lend to the borrower", async () => {
    [config] = await PublicKey.findProgramAddress(
      [Buffer.from("config"), user.publicKey.toBuffer()],
      program.programId
    );

    mint = await createMint(
      provider.connection,
      user.payer,
      user.publicKey,
      null,
      0
    );

    [loan] = await PublicKey.findProgramAddress(
      [Buffer.from("loan"), user.publicKey.toBuffer(), mint.toBuffer()],
      program.programId
    );

    [escrowAuthority] = await PublicKey.findProgramAddress(
      [Buffer.from("escrow"), loan.toBuffer()],
      program.programId
    );

    escrowAta = (
      await getOrCreateAssociatedTokenAccount(
        provider.connection,
        user.payer,
        mint,
        escrowAuthority,
        true
      )
    ).address;

    userAta = (
      await getOrCreateAssociatedTokenAccount(
        provider.connection,
        user.payer,
        mint,
        user.publicKey
      )
    ).address;

    await mintTo(
      provider.connection,
      user.payer,
      mint,
      userAta,
      user.payer,
      2_000_000_000 // Mint 1 NFT
    );
    const userBalanceBefore = await provider.connection.getTokenAccountBalance(
      userAta
    );
    console.log("User balance before", userBalanceBefore.value.amount);
    const escrowBalanceBefore =
      await provider.connection.getTokenAccountBalance(escrowAta);
    console.log("Escrow balance before", escrowBalanceBefore.value.amount);
    const tx = await program.methods
      .deposite()
      .accounts({
        loan: loan,
        escrowAta: escrowAta,
        escrowAuthority: escrowAuthority,
        config: config,
        userAta: userAta,
        nftMint: mint,
        user: user.publicKey,
        tokenProgram: TOKEN_PROGRAM_ID,
        associatedTokenProgram: ASSOCIATED_PROGRAM_ID,
        systemProgram: SystemProgram.programId,
      })
      .rpc();
    console.log("Your transaction signature", tx);
    const userBalanceAfter = await provider.connection.getTokenAccountBalance(
      userAta
    );
    const escrowBalanceAfter = await provider.connection.getTokenAccountBalance(
      escrowAta
    );
    console.log(
      "Deposit Results - User NFT:",
      userBalanceAfter.value.amount,
      "Escrow NFT:",
      escrowBalanceAfter.value.amount
    );
  });

  it("Lend to borrower", async () => {
    const escrowNftBalance = await provider.connection.getTokenAccountBalance(
      escrowAta
    );

    const userSolBalanceBefore = await provider.connection.getBalance(user.publicKey);
    console.log(
      "Lend Setup - Escrow NFT:",
      escrowNftBalance.value.amount,
      "User SOL:",
      userSolBalanceBefore / 1_000_000_000 + " SOL"
    );

    const tx = await program.methods
      .lendBorrower()
      .accounts({
        loan: loan,
        config: config,
        escrowAuthority: escrowAuthority,
        escrowAta: user.publicKey, // Using user's SOL account
        userAta: user.publicKey,   // Using user's SOL account
        user: user.publicKey,
        systemProgram: SystemProgram.programId,
      })
      .rpc();
    console.log("Lend transaction signature", tx);

    const userSolBalanceAfter = await provider.connection.getBalance(user.publicKey);
    console.log(
      "Lend Results - User SOL:",
      userSolBalanceAfter / 1_000_000_000 + " SOL"
    );

    const loan_details = (await program.account.loan.fetch(loan)).loanDetails;
    console.log("Loan Details: ", loan_details);
  });

  it("Repay to the lender", async () => {
    const userSolBalanceBefore = await provider.connection.getBalance(user.publicKey);
    const escrowNftBalanceBefore =
      await provider.connection.getTokenAccountBalance(escrowAta);
    const userNftBalanceBefore =
      await provider.connection.getTokenAccountBalance(userAta);
    console.log(
      "Repay Setup - User SOL:",
      userSolBalanceBefore / 1_000_000_000 +
        " SOL, Escrow NFT:",
      escrowNftBalanceBefore.value.amount,
      "User NFT:",
      userNftBalanceBefore.value.amount
    );

    const tx = await program.methods
      .repayBorrower()
      .accounts({
        loan: loan,
        escrowAuthority: escrowAuthority,
        escrowNftAta: escrowAta,
        userNftAta: userAta,
        escrowSolAta: user.publicKey, // Using user's SOL account
        userSolAta: user.publicKey,   // Using user's SOL account
        config: config,
        user: user.publicKey,
        tokenProgram: TOKEN_PROGRAM_ID,
        systemProgram: SystemProgram.programId,
      })
      .rpc();
    console.log("Repay transaction signature", tx);

    const userSolBalanceAfter = await provider.connection.getBalance(user.publicKey);
    const escrowNftBalanceAfter =
      await provider.connection.getTokenAccountBalance(escrowAta);
    const userNftBalanceAfter =
      await provider.connection.getTokenAccountBalance(userAta);
    console.log(
      "Repay Results - User SOL:",
      userSolBalanceAfter / 1_000_000_000 +
        " SOL, Escrow NFT:",
      escrowNftBalanceAfter.value.amount,
      "User NFT:",
      userNftBalanceAfter.value.amount
    );

    const loan_details = (await program.account.loan.fetch(loan)).loanDetails;
    console.log("Loan Details: ", loan_details);
  });
});
