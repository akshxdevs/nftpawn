// Migrations are an early feature. Currently, they're nothing more than this
// single deploy script that's invoked from the CLI, injecting a provider
// configured from the workspace's Anchor.toml.

import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { PublicKey } from "@solana/web3.js";

module.exports = async function (provider: anchor.AnchorProvider) {
  // Configure client to use the provider.
  anchor.setProvider(provider);

  const program = anchor.workspace.anchorNftpawn as anchor.Program;

  try {
    // Initialize the config with a loan amount of 1 SOL (1_000_000_000 lamports)
    const [config] = PublicKey.findProgramAddressSync(
      [Buffer.from('config'), provider.wallet.publicKey.toBuffer()],
      program.programId
    );

    console.log('Initializing config...');
    const tx = await program.methods
      .initialize(new anchor.BN(1_000_000_000)) // 1 SOL
      .accounts({
        config,
        admin: provider.wallet.publicKey,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .rpc();
    
    console.log('Config initialized successfully!');
    console.log('Transaction signature:', tx);
    console.log('Config address:', config.toString());
  } catch (error) {
    console.error('Error during deployment:', error);
    throw error;
  }
};
