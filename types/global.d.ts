
interface Window {
  solana?: {
    isPhantom?: boolean;
    isSolflare?: boolean;
    isBackpack?: boolean;
    connect: () => Promise<{ publicKey: { toString: () => string } }>;
    disconnect: () => Promise<void>;
    signTransaction: (transaction: any) => Promise<any>;
    signAllTransactions: (transactions: any[]) => Promise<any[]>;
    publicKey?: { toString: () => string };
  };
}

declare global {
  interface ProcessEnv {
    NEXT_PUBLIC_SOLANA_RPC_URL?: string;
    NEXT_PUBLIC_PROGRAM_ID?: string;
    NEXT_PUBLIC_NETWORK?: 'devnet' | 'mainnet-beta' | 'testnet';
  }

  interface LoanData {
    publicKey: string;
    account: {
      nftMint: string;
      borrower: string;
      amount: number;
      active: boolean;
      loanDetails: any[];
      bump: number;
    };
  }

  interface UserProfile {
    publicKey: string;
    balance: number;
    loans: LoanData[];
  }
}

export {}; 