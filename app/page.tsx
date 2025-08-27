'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  Wallet, 
  Coins, 
  Shield, 
  TrendingUp, 
  Users, 
  ArrowRight,
  CheckCircle,
  Clock,
} from 'lucide-react';
import toast from 'react-hot-toast';
import WalletConnect from '../components/WalletConnect';
import { AnchorClient } from '../lib/anchor';
import { useWallet } from '@solana/wallet-adapter-react';

export default function Home() {
  const { publicKey, connected, wallet } = useWallet();
  const [anchorClient, setAnchorClient] = useState<AnchorClient | null>(null);
  const [activeTab, setActiveTab] = useState('borrow');
  const [loanAmount, setLoanAmount] = useState('');
  const [nftMint, setNftMint] = useState('');
  const [loading, setLoading] = useState(false);
  const [refreshingLoans, setRefreshingLoans] = useState(false);
  const [availableLoans, setAvailableLoans] = useState<any[]>([]);
  const [userLoans, setUserLoans] = useState<any[]>([]);
  const [userBalance, setUserBalance] = useState<number>(0);

  // Initialize anchor client when wallet connects
  useEffect(() => {
    if (connected && publicKey) {
      try {
        const client = new AnchorClient({ publicKey, connected, wallet } as any);
        setAnchorClient(client);
        console.log('Anchor client initialized');
      } catch (error) {
        console.error('Failed to initialize anchor client:', error);
        toast.error('Failed to initialize wallet connection');
      }
    } else {
      setAnchorClient(null);
    }
  }, [connected, publicKey, wallet]);

  // Fetch available loans and user balance
  useEffect(() => {
    if (anchorClient) {
      fetchAvailableLoans();
      fetchUserLoans();
      fetchUserBalance();
    }
  }, [anchorClient, publicKey]);

  const fetchAvailableLoans = async () => {
    if (!anchorClient || !publicKey) return;
    try {
      const loans = await anchorClient.getAllLoans();
      const available = loans.filter((loan: any) => 
        loan.account.active && 
        loan.account.borrower.toString() !== publicKey.toString()
      );
      setAvailableLoans(available);
      console.log('Available loans:', available);
    } catch (error) {
      console.error('Error fetching loans:', error);
    }
  };

  const fetchUserLoans = async () => {
    if (!anchorClient || !publicKey) return;
    try {
      const loans = await anchorClient.getAllLoans();
      const userLoans = loans.filter((loan: any) => 
        loan.account.borrower.toString() === publicKey.toString() &&
        loan.account.active === true
      );
      setUserLoans(userLoans);
      console.log('User loans:', userLoans);
    } catch (error) {
      console.error('Error fetching user loans:', error);
    }
  };

  const fetchUserBalance = async () => {
    if (!anchorClient || !publicKey) return;
    try {
      const balance = await anchorClient.getBalance();
      setUserBalance(balance);
    } catch (error) {
      console.error('Error fetching user balance:', error);
    }
  };

  const handleBorrow = async () => {
    if (!anchorClient || !publicKey) {
      toast.error('Please connect your wallet first');
      return;
    }

    if (!loanAmount || !nftMint) {
      toast.error('Please fill in all fields');
      return;
    }
    
    setLoading(true);
    try {
      const tx = await anchorClient.deposit(nftMint);
      toast.success(`Loan request submitted successfully! Transaction: ${tx}`);
      setLoanAmount('');
      setNftMint('');
      await fetchUserLoans();
    } catch (error: any) {
      console.error('Borrow error:', error);
      toast.error(error.message || 'Transaction failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleLend = async (loanAddress: string) => {
    if (!anchorClient || !publicKey) {
      toast.error('Please connect your wallet first');
      return;
    }

    setLoading(true);
    try {
      toast.loading('Processing lending transaction...', { id: 'lend' });
      const tx = await anchorClient.lendBorrower(loanAddress);
      toast.success(`Lending transaction completed! Transaction: ${tx.slice(0, 8)}...`, { id: 'lend' });
      
      // Remove the loan from available loans after successful lending
      setAvailableLoans(prev => prev.filter(loan => loan.publicKey.toString() !== loanAddress));
      
      // Refresh the available loans list
      setTimeout(async () => {
        await fetchAvailableLoans();
      }, 1000);
    } catch (error: any) {
      console.error('Lend error:', error);
      toast.error(error.message || 'Transaction failed. Please try again.', { id: 'lend' });
    } finally {
      setLoading(false);
    }
  };

  const handleRepay = async (loanAddress: string, nftMint: string) => {
    if (!anchorClient || !publicKey) {
      toast.error('Please connect your wallet first');
      return;
    }

    setLoading(true);
    try {
      const tx = await anchorClient.repayBorrower(loanAddress, nftMint);
      toast.success(`Repayment completed successfully! Transaction: ${tx}. The loan will disappear from the list shortly.`);
      
      // Add a small delay to ensure blockchain state is updated
      setTimeout(async () => {
        setRefreshingLoans(true);
        await fetchUserLoans();
        setRefreshingLoans(false);
      }, 2000);
    } catch (error: any) {
      console.error('Repay error:', error);
      toast.error(error.message || 'Transaction failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-dark-50 via-primary-50 to-purple-50 dark:from-dark-900 dark:via-dark-800 dark:to-purple-900">
      {/* Header */}
      <header className="relative z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              className="flex items-center space-x-3"
            >
              <div className="w-10 h-10 bg-gradient-to-r from-primary-600 to-purple-600 rounded-lg flex items-center justify-center">
                <Coins className="w-6 h-6 text-white" />
              </div>
              <h1 className="text-2xl font-bold text-gradient">NFT Pawn</h1>
            </motion.div>
            
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              className="flex items-center space-x-4"
            >
              {connected && userBalance > 0 && (
                <div className="bg-white dark:bg-dark-800 px-3 py-2 rounded-lg shadow-sm">
                  <p className="text-sm text-dark-600 dark:text-dark-300">
                    Balance: <span className="font-semibold text-primary-600">{(userBalance / 1000000000).toFixed(4)} SOL</span>
                  </p>
                </div>
              )}
              <WalletConnect onConnect={(address) => console.log('Connected:', address)} />
            </motion.div>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="text-center"
          >
            <h2 className="text-5xl md:text-6xl font-bold text-gradient mb-6">
              Decentralized NFT Pawn
            </h2>
            <p className="text-xl text-dark-600 dark:text-dark-300 mb-8 max-w-3xl mx-auto">
              Secure, transparent, and instant NFT-backed loans on Solana. 
              Borrow against your NFTs or earn by lending to others.
            </p>
            
            <div className="flex flex-wrap justify-center gap-4 mb-12">
              <motion.div
                whileHover={{ scale: 1.05 }}
                className="flex items-center space-x-2 bg-white dark:bg-dark-800 px-4 py-2 rounded-full shadow-lg"
              >
                <Shield className="w-5 h-5 text-primary-600" />
                <span className="text-dark-700 dark:text-dark-300">Secure</span>
              </motion.div>
              <motion.div
                whileHover={{ scale: 1.05 }}
                className="flex items-center space-x-2 bg-white dark:bg-dark-800 px-4 py-2 rounded-full shadow-lg"
              >
                <TrendingUp className="w-5 h-5 text-green-600" />
                <span className="text-dark-700 dark:text-dark-300">Instant</span>
              </motion.div>
              <motion.div
                whileHover={{ scale: 1.05 }}
                className="flex items-center space-x-2 bg-white dark:bg-dark-800 px-4 py-2 rounded-full shadow-lg"
              >
                <Users className="w-5 h-5 text-purple-600" />
                <span className="text-dark-700 dark:text-dark-300">Transparent</span>
              </motion.div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Main Content */}
      <section className="relative py-16">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Tab Navigation */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex justify-center mb-8"
          >
            <div className="bg-white dark:bg-dark-800 rounded-xl p-1 shadow-lg">
              <div className="flex space-x-1">
                {[
                  { id: 'borrow', label: 'Borrow', icon: Wallet },
                  { id: 'lend', label: 'Lend', icon: Coins },
                  { id: 'repay', label: 'Repay', icon: CheckCircle },
                ].map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`flex items-center space-x-2 px-6 py-3 rounded-lg transition-all duration-200 ${
                      activeTab === tab.id
                        ? 'bg-primary-600 text-white shadow-lg'
                        : 'text-dark-600 dark:text-dark-300 hover:text-primary-600'
                    }`}
                  >
                    <tab.icon className="w-5 h-5" />
                    <span className="font-medium">{tab.label}</span>
                  </button>
                ))}
              </div>
            </div>
          </motion.div>

          {/* Tab Content */}
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className="max-w-2xl mx-auto"
          >
            <div className="card">
              {activeTab === 'borrow' && (
                <div className="space-y-6">
                  <div className="text-center">
                    <h3 className="text-2xl font-bold text-dark-900 dark:text-white mb-2">
                      Borrow Against Your NFT
                    </h3>
                    <p className="text-dark-600 dark:text-dark-300">
                      Deposit your NFT and get instant liquidity
                    </p>
                  </div>
                  
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-dark-700 dark:text-dark-300 mb-2">
                        NFT Mint Address
                      </label>
                      <input
                        type="text"
                        value={nftMint}
                        onChange={(e) => setNftMint(e.target.value)}
                        placeholder="Enter NFT mint address"
                        className="input-field"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-dark-700 dark:text-dark-300 mb-2">
                        Loan Amount (SOL)
                      </label>
                      <input
                        type="number"
                        value={loanAmount}
                        onChange={(e) => setLoanAmount(e.target.value)}
                        placeholder="Enter loan amount"
                        className="input-field"
                      />
                    </div>
                  </div>
                  
                  <button
                    onClick={handleBorrow}
                    disabled={loading || !connected}
                    className="btn-primary w-full flex items-center justify-center space-x-2"
                  >
                    {loading ? (
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                    ) : (
                      <>
                        <span>{connected ? 'Borrow Now' : 'Connect Wallet to Borrow'}</span>
                        <ArrowRight className="w-5 h-5" />
                      </>
                    )}
                  </button>
                </div>
              )}

              {activeTab === 'lend' && (
                <div className="space-y-6">
                  <div className="text-center">
                    <h3 className="text-2xl font-bold text-dark-900 dark:text-white mb-2">
                      Lend to Borrowers
                    </h3>
                    <p className="text-dark-600 dark:text-dark-300">
                      Earn interest by lending to NFT-backed loans
                    </p>
                  </div>
                  
                  <div className="bg-gradient-to-r from-green-50 to-blue-50 dark:from-green-900/20 dark:to-blue-900/20 p-6 rounded-lg">
                    <div className="flex items-center space-x-3 mb-4">
                      <TrendingUp className="w-6 h-6 text-green-600" />
                      <h4 className="text-lg font-semibold text-dark-900 dark:text-white">
                        Available Loans
                      </h4>
                    </div>
                    {availableLoans.length > 0 ? (
                      <div className="space-y-3">
                        {availableLoans.map((loan, index) => (
                          <div key={index} className="bg-white dark:bg-dark-700 p-3 rounded-lg">
                            <div className="flex justify-between items-center">
                              <div>
                                <p className="text-sm text-dark-600 dark:text-dark-300">
                                  NFT: {loan.account.nftMint.toString().slice(0, 8)}...
                                </p>
                                <p className="text-sm font-medium">
                                  Amount: {(loan.account.amount / 1000000000).toFixed(2)} SOL
                                </p>
                                <p className="text-xs text-dark-500 dark:text-dark-400">
                                  Borrower: {loan.account.borrower.toString().slice(0, 8)}...
                                </p>
                              </div>
                              <button
                                onClick={() => handleLend(loan.publicKey.toString())}
                                disabled={loading}
                                className="btn-primary px-4 py-2 text-sm"
                              >
                                {loading ? 'Processing...' : 'Lend'}
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-dark-600 dark:text-dark-300 mb-4">
                        Currently there are no active loan requests. Check back later!
                      </p>
                    )}
                  </div>
                  
                  <button
                    onClick={fetchAvailableLoans}
                    disabled={loading}
                    className="btn-primary w-full flex items-center justify-center space-x-2"
                  >
                    {loading ? (
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                    ) : (
                      <>
                        <span>Refresh Loans</span>
                        <ArrowRight className="w-5 h-5" />
                      </>
                    )}
                  </button>
                </div>
              )}

              {activeTab === 'repay' && (
                <div className="space-y-6">
                  <div className="text-center">
                    <h3 className="text-2xl font-bold text-dark-900 dark:text-white mb-2">
                      Repay Your Loan
                    </h3>
                    <p className="text-dark-600 dark:text-dark-300">
                      Repay your loan and get your NFT back
                    </p>
                  </div>
                  
                  <div className="bg-gradient-to-r from-yellow-50 to-orange-50 dark:from-yellow-900/20 dark:to-orange-900/20 p-6 rounded-lg">
                    <div className="flex items-center space-x-3 mb-4">
                      <Clock className="w-6 h-6 text-yellow-600" />
                      <h4 className="text-lg font-semibold text-dark-900 dark:text-white">
                        Active Loans
                      </h4>
                    </div>
                    {userLoans.length > 0 ? (
                      <div className="space-y-3">
                        {userLoans.map((loan, index) => (
                          <div key={index} className="bg-white dark:bg-dark-700 p-3 rounded-lg">
                            <div className="flex justify-between items-center">
                              <div>
                                <p className="text-sm text-dark-600 dark:text-dark-300">
                                  NFT: {loan.account.nftMint.toString().slice(0, 8)}...
                                </p>
                                <p className="text-sm font-medium">
                                  Amount: {(loan.account.amount / 1000000000).toFixed(2)} SOL
                                </p>
                              </div>
                              <button
                                onClick={() => handleRepay(loan.publicKey.toString(), loan.account.nftMint.toString())}
                                disabled={loading}
                                className="btn-primary px-4 py-2 text-sm"
                              >
                                {loading ? 'Processing...' : 'Repay'}
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-dark-600 dark:text-dark-300 mb-4">
                        You don't have any active loans to repay.
                      </p>
                    )}
                  </div>
                  
                  <button
                    onClick={fetchUserLoans}
                    disabled={loading}
                    className="btn-primary w-full flex items-center justify-center space-x-2"
                  >
                    {loading ? (
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                    ) : (
                      <>
                        <span>Refresh Loans</span>
                        <ArrowRight className="w-5 h-5" />
                      </>
                    )}
                  </button>
                </div>
              )}
            </div>
          </motion.div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-16 bg-white dark:bg-dark-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="grid grid-cols-1 md:grid-cols-3 gap-8"
          >
            <div className="text-center">
              <div className="text-4xl font-bold text-gradient mb-2">$2.5M+</div>
              <div className="text-dark-600 dark:text-dark-300">Total Value Locked</div>
            </div>
            <div className="text-center">
              <div className="text-4xl font-bold text-gradient mb-2">1,250+</div>
              <div className="text-dark-600 dark:text-dark-300">Loans Processed</div>
            </div>
            <div className="text-center">
              <div className="text-4xl font-bold text-gradient mb-2">8.5%</div>
              <div className="text-dark-600 dark:text-dark-300">Average APR</div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-dark-900 text-white py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <div className="flex items-center justify-center space-x-3 mb-4">
              <div className="w-8 h-8 bg-gradient-to-r from-primary-600 to-purple-600 rounded-lg flex items-center justify-center">
                <Coins className="w-5 h-5 text-white" />
              </div>
              <h3 className="text-xl font-bold">NFT Pawn</h3>
            </div>
            <p className="text-dark-300 mb-4">
              Decentralized NFT-backed lending on Solana
            </p>
            <div className="text-dark-400 text-sm">
              © 2024 NFT Pawn. All rights reserved.
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
} 