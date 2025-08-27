import { Connection, PublicKey, clusterApiUrl, Transaction, SystemProgram, Keypair } from '@solana/web3.js';
import { TOKEN_PROGRAM_ID, ASSOCIATED_TOKEN_PROGRAM_ID, getAssociatedTokenAddress } from '@solana/spl-token';
import { IDL } from '../anchor/idl';
import { WalletContextState } from '@solana/wallet-adapter-react';


const PROGRAM_ID = new PublicKey('GPCJ1xf8hidp64X5xRGUEdq171bgXoRVvBdLM7VNidoU');

export interface LoanDetails {
  loanId: number;
  borrowerPubkey: PublicKey;
  lenderPubkey: PublicKey;
  loanAmount: number;
  loanStatus: { active: {} } | { closed: {} };
  loanTimestamp: number;
}

export interface Loan {
  nftMint: PublicKey;
  borrower: PublicKey;
  amount: number;
  active: boolean;
  loanDetails: LoanDetails[];
  bump: number;
}

export interface Config {
  admin: PublicKey;
  loanAmount: number;
  bpsFee: number;
  bump: number;
}

export class AnchorClient {
  private connection: Connection;
  private wallet: WalletContextState;

  constructor(wallet: WalletContextState) {
    this.connection = new Connection(clusterApiUrl('devnet'), 'confirmed');
    this.wallet = wallet;
  }

  async initialize(loanAmount: number) {
    try {
      if (!this.wallet.publicKey) throw new Error('Wallet not connected');
      
      const [config] = PublicKey.findProgramAddressSync(
        [Buffer.from('config'), this.wallet.publicKey.toBuffer()],
        PROGRAM_ID
      );

      // For now, just return a mock transaction signature
      // In a real implementation, you would create and send the actual transaction
      console.log('Initialize transaction would be sent to:', config.toString());
      return 'mock_transaction_signature';
    } catch (error) {
      console.error('Initialize error:', error);
      throw error;
    }
  }

  async deposit(nftMint: string) {
    try {
      if (!this.wallet.publicKey) throw new Error('Wallet not connected');
      
      const nftMintPubkey = new PublicKey(nftMint);
      
      // Get user's NFT token account
      const userAta = await getAssociatedTokenAddress(
        nftMintPubkey,
        this.wallet.publicKey
      );

      const [loan] = PublicKey.findProgramAddressSync(
        [
          Buffer.from('loan'),
          this.wallet.publicKey.toBuffer(),
          nftMintPubkey.toBuffer(),
        ],
        PROGRAM_ID
      );

      console.log('Deposit transaction would be sent to:', loan.toString());
      return 'mock_deposit_transaction_signature';
    } catch (error) {
      console.error('Deposit error:', error);
      throw error;
    }
  }

  async lendBorrower(loanAddress: string) {
    try {
      if (!this.wallet.publicKey || !this.wallet.signTransaction) {
        throw new Error('Wallet not connected or cannot sign transactions');
      }
      
      const loanPubkey = new PublicKey(loanAddress);
      
      // Get the loan account to find the borrower and amount
      const loanAccount = await this.getLoan(loanPubkey);
      if (!loanAccount.active) {
        throw new Error('This loan is not active');
      }
      
      // Check if user has enough SOL balance
      const balance = await this.connection.getBalance(this.wallet.publicKey);
      if (balance < loanAccount.amount) {
        throw new Error(`Insufficient balance. You need ${(loanAccount.amount / 1000000000).toFixed(2)} SOL but have ${(balance / 1000000000).toFixed(2)} SOL`);
      }
      
      // Create a transaction to transfer SOL to the borrower
      const transaction = new Transaction();
      
      // Add transfer instruction
      const transferInstruction = SystemProgram.transfer({
        fromPubkey: this.wallet.publicKey,
        toPubkey: loanAccount.borrower,
        lamports: loanAccount.amount,
      });
      
      transaction.add(transferInstruction);
      
      // Get recent blockhash
      const { blockhash } = await this.connection.getLatestBlockhash();
      transaction.recentBlockhash = blockhash;
      transaction.feePayer = this.wallet.publicKey;
      
      // Sign and send transaction
      const signedTx = await this.wallet.signTransaction(transaction);
      const signature = await this.connection.sendRawTransaction(signedTx.serialize());
      
      // Wait for confirmation
      await this.connection.confirmTransaction(signature, 'confirmed');
      
      console.log('Lend transaction completed:', signature);
      return signature;
    } catch (error) {
      console.error('Lend error:', error);
      throw error;
    }
  }

  async repayBorrower(loanAddress: string, nftMint: string) {
    try {
      if (!this.wallet.publicKey) throw new Error('Wallet not connected');
      
      const loanPubkey = new PublicKey(loanAddress);
      const nftMintPubkey = new PublicKey(nftMint);
      
      console.log('Repay transaction would be sent to:', loanPubkey.toString());
      return 'mock_repay_transaction_signature';
    } catch (error) {
      console.error('Repay error:', error);
      throw error;
    }
  }

  async getLoan(loanAddress: PublicKey): Promise<Loan> {
    try {
      // Mock loan data for now
      return {
        nftMint: new PublicKey('11111111111111111111111111111111'),
        borrower: this.wallet.publicKey!,
        amount: 1000000000,
        active: true,
        loanDetails: [],
        bump: 0,
      };
    } catch (error) {
      console.error('Get loan error:', error);
      throw error;
    }
  }

  async getConfig(configAddress: PublicKey): Promise<Config> {
    try {
      // Mock config data for now
      return {
        admin: this.wallet.publicKey!,
        loanAmount: 1000000000,
        bpsFee: 30,
        bump: 0,
      };
    } catch (error) {
      console.error('Get config error:', error);
      throw error;
    }
  }

  async getAllLoans(): Promise<any[]> {
    try {
      // Create some mock loans for demonstration
      const mockLoans = [
        {
          publicKey: new PublicKey('11111111111111111111111111111111'),
          account: {
            nftMint: new PublicKey('22222222222222222222222222222222'),
            borrower: new PublicKey('33333333333333333333333333333333'), // Different borrower
            amount: 1000000000, // 1 SOL
            active: true,
            loanDetails: [],
            bump: 0,
          }
        },
        {
          publicKey: new PublicKey('44444444444444444444444444444444'),
          account: {
            nftMint: new PublicKey('55555555555555555555555555555555'),
            borrower: new PublicKey('66666666666666666666666666666666'), // Different borrower
            amount: 2000000000, // 2 SOL
            active: true,
            loanDetails: [],
            bump: 0,
          }
        }
      ];
      
      // If user is connected, add their own loans
      if (this.wallet.publicKey) {
        mockLoans.push({
          publicKey: new PublicKey('77777777777777777777777777777777'),
          account: {
            nftMint: new PublicKey('88888888888888888888888888888888'),
            borrower: this.wallet.publicKey,
            amount: 500000000, // 0.5 SOL
            active: true,
            loanDetails: [],
            bump: 0,
          }
        });
      }
      
      return mockLoans;
    } catch (error) {
      console.error('Get all loans error:', error);
      return [];
    }
  }

  async getBalance(): Promise<number> {
    try {
      if (!this.wallet.publicKey) {
        throw new Error('Wallet not connected');
      }
      
      const balance = await this.connection.getBalance(this.wallet.publicKey);
      return balance;
    } catch (error) {
      console.error('Get balance error:', error);
      throw error;
    }
  }
} 