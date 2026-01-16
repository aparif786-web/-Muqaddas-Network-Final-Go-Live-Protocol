import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  TextInput,
  Modal,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import api from '../../src/services/api';

interface Wallet {
  coins_balance: number;
  stars_balance: number;
  bonus_balance: number;
  withdrawable_balance: number;
  total_deposited: number;
  total_withdrawn: number;
}

interface Transaction {
  transaction_id: string;
  transaction_type: string;
  amount: number;
  currency_type: string;
  status: string;
  description: string;
  created_at: string;
}

export default function WalletScreen() {
  const [wallet, setWallet] = useState<Wallet | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [depositModalVisible, setDepositModalVisible] = useState(false);
  const [depositAmount, setDepositAmount] = useState('');
  const [loading, setLoading] = useState(false);

  const fetchData = async () => {
    try {
      const [walletRes, transRes] = await Promise.all([
        api.get('/wallet'),
        api.get('/wallet/transactions?limit=20'),
      ]);
      
      setWallet(walletRes.data);
      setTransactions(transRes.data.transactions);
    } catch (error) {
      console.error('Error fetching wallet data:', error);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchData();
    setRefreshing(false);
  };

  const handleDeposit = async () => {
    const amount = parseFloat(depositAmount);
    if (isNaN(amount) || amount <= 0) {
      Alert.alert('Error', 'Please enter a valid amount');
      return;
    }

    setLoading(true);
    try {
      await api.post('/wallet/deposit', { amount });
      setDepositModalVisible(false);
      setDepositAmount('');
      await fetchData();
      Alert.alert('Success', `${amount} coins have been added to your wallet!`);
    } catch (error: any) {
      Alert.alert('Error', error.response?.data?.detail || 'Failed to deposit');
    } finally {
      setLoading(false);
    }
  };

  const getTransactionIcon = (type: string) => {
    switch (type) {
      case 'deposit':
        return { name: 'arrow-down', color: '#4CAF50' };
      case 'withdrawal':
        return { name: 'arrow-up', color: '#FF5252' };
      case 'vip_subscription':
      case 'vip_renewal':
        return { name: 'diamond', color: '#FFD700' };
      case 'bonus':
        return { name: 'gift', color: '#FF69B4' };
      case 'game_bet':
        return { name: 'game-controller', color: '#9C27B0' };
      case 'game_win':
        return { name: 'trophy', color: '#4CAF50' };
      default:
        return { name: 'swap-horizontal', color: '#808080' };
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const quickDepositAmounts = [100, 500, 1000, 5000, 10000];

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={['#1A1A2E', '#16213E', '#0F3460']}
        style={styles.gradient}
      >
        <SafeAreaView style={styles.safeArea}>
          <ScrollView
            style={styles.scrollView}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={onRefresh}
                tintColor="#FFD700"
              />
            }
            showsVerticalScrollIndicator={false}
          >
            {/* Header */}
            <View style={styles.header}>
              <Text style={styles.headerTitle}>My Wallet</Text>
            </View>

            {/* Balance Card */}
            <LinearGradient
              colors={['#2A2A4E', '#1A1A3E']}
              style={styles.balanceCard}
            >
              <Text style={styles.balanceLabel}>Available Balance</Text>
              <Text style={styles.balanceAmount}>
                {wallet?.coins_balance?.toLocaleString() || '0'}
              </Text>
              <Text style={styles.balanceCurrency}>Coins</Text>

              <View style={styles.balanceDetails}>
                <View style={styles.balanceDetailItem}>
                  <Ionicons name="gift" size={18} color="#FF69B4" />
                  <Text style={styles.balanceDetailLabel}>Bonus</Text>
                  <Text style={styles.balanceDetailValue}>
                    {wallet?.bonus_balance?.toLocaleString() || '0'}
                  </Text>
                </View>
                <View style={styles.balanceDetailItem}>
                  <Ionicons name="star" size={18} color="#00CED1" />
                  <Text style={styles.balanceDetailLabel}>Stars</Text>
                  <Text style={styles.balanceDetailValue}>
                    {wallet?.stars_balance?.toLocaleString() || '0'}
                  </Text>
                </View>
                <View style={styles.balanceDetailItem}>
                  <Ionicons name="cash" size={18} color="#4CAF50" />
                  <Text style={styles.balanceDetailLabel}>Withdrawable</Text>
                  <Text style={styles.balanceDetailValue}>
                    {wallet?.withdrawable_balance?.toLocaleString() || '0'}
                  </Text>
                </View>
              </View>
            </LinearGradient>

            {/* Action Buttons */}
            <View style={styles.actionButtons}>
              <TouchableOpacity
                style={[styles.actionButton, styles.depositButton]}
                onPress={() => setDepositModalVisible(true)}
              >
                <Ionicons name="add-circle" size={24} color="#FFFFFF" />
                <Text style={styles.actionButtonText}>Deposit</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.actionButton, styles.withdrawButton]}
                onPress={() => Alert.alert('Coming Soon', 'Withdrawal feature will be available soon!')}
              >
                <Ionicons name="arrow-up-circle" size={24} color="#FFFFFF" />
                <Text style={styles.actionButtonText}>Withdraw</Text>
              </TouchableOpacity>
            </View>

            {/* Stats */}
            <View style={styles.statsRow}>
              <View style={styles.statCard}>
                <Ionicons name="trending-up" size={24} color="#4CAF50" />
                <Text style={styles.statValue}>
                  {wallet?.total_deposited?.toLocaleString() || '0'}
                </Text>
                <Text style={styles.statLabel}>Total Deposited</Text>
              </View>
              <View style={styles.statCard}>
                <Ionicons name="trending-down" size={24} color="#FF5252" />
                <Text style={styles.statValue}>
                  {wallet?.total_withdrawn?.toLocaleString() || '0'}
                </Text>
                <Text style={styles.statLabel}>Total Withdrawn</Text>
              </View>
            </View>

            {/* Transactions */}
            <View style={styles.transactionsSection}>
              <Text style={styles.sectionTitle}>Recent Transactions</Text>
              {transactions.length === 0 ? (
                <View style={styles.emptyState}>
                  <Ionicons name="receipt-outline" size={48} color="#404040" />
                  <Text style={styles.emptyStateText}>No transactions yet</Text>
                </View>
              ) : (
                transactions.map((tx) => {
                  const icon = getTransactionIcon(tx.transaction_type);
                  return (
                    <View key={tx.transaction_id} style={styles.transactionItem}>
                      <View style={[styles.transactionIcon, { backgroundColor: `${icon.color}20` }]}>
                        <Ionicons name={icon.name as any} size={20} color={icon.color} />
                      </View>
                      <View style={styles.transactionInfo}>
                        <Text style={styles.transactionDescription}>
                          {tx.description || tx.transaction_type.replace('_', ' ')}
                        </Text>
                        <Text style={styles.transactionDate}>{formatDate(tx.created_at)}</Text>
                      </View>
                      <Text
                        style={[
                          styles.transactionAmount,
                          { color: tx.amount >= 0 ? '#4CAF50' : '#FF5252' },
                        ]}
                      >
                        {tx.amount >= 0 ? '+' : ''}{tx.amount.toLocaleString()}
                      </Text>
                    </View>
                  );
                })
              )}
            </View>

            <View style={{ height: 20 }} />
          </ScrollView>
        </SafeAreaView>
      </LinearGradient>

      {/* Deposit Modal */}
      <Modal
        visible={depositModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setDepositModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Deposit Coins</Text>
              <TouchableOpacity
                onPress={() => setDepositModalVisible(false)}
                style={styles.modalCloseButton}
              >
                <Ionicons name="close" size={24} color="#FFFFFF" />
              </TouchableOpacity>
            </View>

            <Text style={styles.modalSubtitle}>
              Add coins to your wallet (Mock - No real payment)
            </Text>

            <View style={styles.inputContainer}>
              <Ionicons name="wallet" size={20} color="#FFD700" />
              <TextInput
                style={styles.input}
                placeholder="Enter amount"
                placeholderTextColor="#808080"
                keyboardType="numeric"
                value={depositAmount}
                onChangeText={setDepositAmount}
              />
            </View>

            <View style={styles.quickAmounts}>
              {quickDepositAmounts.map((amount) => (
                <TouchableOpacity
                  key={amount}
                  style={styles.quickAmountButton}
                  onPress={() => setDepositAmount(amount.toString())}
                >
                  <Text style={styles.quickAmountText}>{amount}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <TouchableOpacity
              style={styles.depositSubmitButton}
              onPress={handleDeposit}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#1A1A2E" />
              ) : (
                <>
                  <Ionicons name="add-circle" size={20} color="#1A1A2E" />
                  <Text style={styles.depositSubmitText}>Add Coins</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0A0A0F',
  },
  gradient: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
    paddingHorizontal: 16,
  },
  header: {
    marginTop: 16,
    marginBottom: 24,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  balanceCard: {
    borderRadius: 20,
    padding: 24,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 215, 0, 0.2)',
  },
  balanceLabel: {
    fontSize: 14,
    color: '#A0A0A0',
    marginBottom: 8,
  },
  balanceAmount: {
    fontSize: 48,
    fontWeight: 'bold',
    color: '#FFD700',
  },
  balanceCurrency: {
    fontSize: 16,
    color: '#808080',
    marginBottom: 24,
  },
  balanceDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  balanceDetailItem: {
    alignItems: 'center',
    flex: 1,
  },
  balanceDetailLabel: {
    fontSize: 12,
    color: '#808080',
    marginTop: 4,
  },
  balanceDetailValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
    marginTop: 2,
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 20,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 12,
    gap: 8,
  },
  depositButton: {
    backgroundColor: '#4CAF50',
  },
  withdrawButton: {
    backgroundColor: '#2196F3',
  },
  actionButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  statsRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 24,
  },
  statCard: {
    flex: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginTop: 8,
  },
  statLabel: {
    fontSize: 12,
    color: '#808080',
    marginTop: 4,
  },
  transactionsSection: {
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 16,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyStateText: {
    fontSize: 14,
    color: '#808080',
    marginTop: 12,
  },
  transactionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 12,
    padding: 16,
    marginBottom: 8,
  },
  transactionIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  transactionInfo: {
    flex: 1,
  },
  transactionDescription: {
    fontSize: 14,
    fontWeight: '500',
    color: '#FFFFFF',
    textTransform: 'capitalize',
  },
  transactionDate: {
    fontSize: 12,
    color: '#808080',
    marginTop: 2,
  },
  transactionAmount: {
    fontSize: 16,
    fontWeight: '600',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#1A1A2E',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    paddingBottom: 40,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  modalCloseButton: {
    padding: 4,
  },
  modalSubtitle: {
    fontSize: 14,
    color: '#808080',
    marginBottom: 24,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 12,
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  input: {
    flex: 1,
    paddingVertical: 16,
    paddingHorizontal: 12,
    fontSize: 18,
    color: '#FFFFFF',
  },
  quickAmounts: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 24,
  },
  quickAmountButton: {
    backgroundColor: 'rgba(255, 215, 0, 0.1)',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 215, 0, 0.3)',
  },
  quickAmountText: {
    color: '#FFD700',
    fontWeight: '600',
  },
  depositSubmitButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFD700',
    paddingVertical: 16,
    borderRadius: 12,
    gap: 8,
  },
  depositSubmitText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1A1A2E',
  },
});
