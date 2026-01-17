import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  TextInput,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../src/contexts/AuthContext';
import api from '../../src/services/api';

const MINIMUM_WITHDRAWAL = 100000; // 100K stars minimum

export default function WithdrawalScreen() {
  const { user } = useAuth();
  const [wallet, setWallet] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [amount, setAmount] = useState('');
  const [bankDetails, setBankDetails] = useState({
    accountName: '',
    accountNumber: '',
    ifscCode: '',
    upiId: '',
  });
  const [submitting, setSubmitting] = useState(false);
  const [withdrawalHistory, setWithdrawalHistory] = useState<any[]>([]);

  const fetchData = async () => {
    try {
      const [walletRes, historyRes] = await Promise.all([
        api.get('/wallet'),
        api.get('/withdrawals/history').catch(() => ({ data: { withdrawals: [] } })),
      ]);
      setWallet(walletRes.data);
      setWithdrawalHistory(historyRes.data.withdrawals || []);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchData();
    setRefreshing(false);
  }, []);

  const handleWithdrawal = async () => {
    const withdrawAmount = parseInt(amount);
    
    if (!withdrawAmount || withdrawAmount < MINIMUM_WITHDRAWAL) {
      Alert.alert('Error', `Minimum withdrawal is ${MINIMUM_WITHDRAWAL.toLocaleString()} stars`);
      return;
    }

    if (withdrawAmount > (wallet?.stars_balance || 0)) {
      Alert.alert('Error', 'Insufficient stars balance');
      return;
    }

    if (!bankDetails.accountNumber && !bankDetails.upiId) {
      Alert.alert('Error', 'Please enter bank account or UPI details');
      return;
    }

    setSubmitting(true);
    try {
      await api.post('/withdrawals/request', {
        amount: withdrawAmount,
        bank_details: bankDetails,
      });
      Alert.alert('Success', 'Withdrawal request submitted! Processing time: 24-48 hours');
      setAmount('');
      await fetchData();
    } catch (error: any) {
      Alert.alert('Error', error.response?.data?.detail || 'Withdrawal failed');
    } finally {
      setSubmitting(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'completed': return '#4CAF50';
      case 'pending': return '#FF9800';
      case 'processing': return '#2196F3';
      case 'rejected': return '#F44336';
      default: return '#808080';
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <LinearGradient colors={['#1A1A2E', '#16213E', '#0F3460']} style={styles.gradient}>
          <ActivityIndicator size="large" color="#FFD700" />
          <Text style={styles.loadingText}>Loading...</Text>
        </LinearGradient>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <LinearGradient colors={['#1A1A2E', '#16213E', '#0F3460']} style={styles.gradient}>
        <SafeAreaView style={styles.safeArea}>
          <ScrollView
            style={styles.scrollView}
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#FFD700" />
            }
            showsVerticalScrollIndicator={false}
          >
            {/* Header */}
            <View style={styles.header}>
              <Text style={styles.headerTitle}>💰 Withdrawal</Text>
              <Text style={styles.headerSubtitle}>Convert stars to real money</Text>
            </View>

            {/* Balance Card */}
            <LinearGradient
              colors={['#2A2A4E', '#1A1A3E']}
              style={styles.balanceCard}
            >
              <View style={styles.balanceRow}>
                <View style={styles.balanceItem}>
                  <Text style={styles.balanceLabel}>Available Stars</Text>
                  <Text style={styles.balanceValue}>⭐ {wallet?.stars_balance?.toLocaleString() || 0}</Text>
                </View>
                <View style={styles.balanceDivider} />
                <View style={styles.balanceItem}>
                  <Text style={styles.balanceLabel}>Min. Withdrawal</Text>
                  <Text style={styles.minValue}>⭐ {MINIMUM_WITHDRAWAL.toLocaleString()}</Text>
                </View>
              </View>
              
              {wallet?.stars_balance < MINIMUM_WITHDRAWAL && (
                <View style={styles.warningBox}>
                  <Ionicons name="warning" size={16} color="#FF9800" />
                  <Text style={styles.warningText}>
                    Need {(MINIMUM_WITHDRAWAL - (wallet?.stars_balance || 0)).toLocaleString()} more stars
                  </Text>
                </View>
              )}
            </LinearGradient>

            {/* Withdrawal Form */}
            <View style={styles.formSection}>
              <Text style={styles.sectionTitle}>💳 Withdrawal Request</Text>
              
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Amount (Stars)</Text>
                <TextInput
                  style={styles.input}
                  value={amount}
                  onChangeText={setAmount}
                  placeholder="Enter amount"
                  placeholderTextColor="#808080"
                  keyboardType="numeric"
                />
              </View>

              <Text style={styles.subTitle}>Bank Details</Text>
              
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Account Holder Name</Text>
                <TextInput
                  style={styles.input}
                  value={bankDetails.accountName}
                  onChangeText={(text) => setBankDetails({ ...bankDetails, accountName: text })}
                  placeholder="Enter name"
                  placeholderTextColor="#808080"
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Account Number</Text>
                <TextInput
                  style={styles.input}
                  value={bankDetails.accountNumber}
                  onChangeText={(text) => setBankDetails({ ...bankDetails, accountNumber: text })}
                  placeholder="Enter account number"
                  placeholderTextColor="#808080"
                  keyboardType="numeric"
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>IFSC Code</Text>
                <TextInput
                  style={styles.input}
                  value={bankDetails.ifscCode}
                  onChangeText={(text) => setBankDetails({ ...bankDetails, ifscCode: text.toUpperCase() })}
                  placeholder="Enter IFSC code"
                  placeholderTextColor="#808080"
                  autoCapitalize="characters"
                />
              </View>

              <Text style={styles.orText}>— OR —</Text>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>UPI ID</Text>
                <TextInput
                  style={styles.input}
                  value={bankDetails.upiId}
                  onChangeText={(text) => setBankDetails({ ...bankDetails, upiId: text })}
                  placeholder="Enter UPI ID (e.g., name@paytm)"
                  placeholderTextColor="#808080"
                />
              </View>

              <TouchableOpacity
                style={[styles.withdrawButton, (wallet?.stars_balance < MINIMUM_WITHDRAWAL || submitting) && styles.disabledButton]}
                onPress={handleWithdrawal}
                disabled={wallet?.stars_balance < MINIMUM_WITHDRAWAL || submitting}
              >
                <LinearGradient
                  colors={wallet?.stars_balance >= MINIMUM_WITHDRAWAL ? ['#FFD700', '#FFA500'] : ['#404040', '#303030']}
                  style={styles.buttonGradient}
                >
                  {submitting ? (
                    <ActivityIndicator color="#1A1A2E" />
                  ) : (
                    <>
                      <Ionicons name="cash" size={20} color={wallet?.stars_balance >= MINIMUM_WITHDRAWAL ? '#1A1A2E' : '#808080'} />
                      <Text style={[styles.buttonText, wallet?.stars_balance < MINIMUM_WITHDRAWAL && styles.disabledText]}>
                        Request Withdrawal
                      </Text>
                    </>
                  )}
                </LinearGradient>
              </TouchableOpacity>
            </View>

            {/* Withdrawal History */}
            <View style={styles.historySection}>
              <Text style={styles.sectionTitle}>📜 Withdrawal History</Text>
              
              {withdrawalHistory.length === 0 ? (
                <View style={styles.emptyHistory}>
                  <Ionicons name="document-text-outline" size={48} color="#404040" />
                  <Text style={styles.emptyText}>No withdrawal history</Text>
                </View>
              ) : (
                withdrawalHistory.map((item, index) => (
                  <View key={index} style={styles.historyItem}>
                    <View style={styles.historyLeft}>
                      <Text style={styles.historyAmount}>⭐ {item.amount?.toLocaleString()}</Text>
                      <Text style={styles.historyDate}>{new Date(item.created_at).toLocaleDateString()}</Text>
                    </View>
                    <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.status) + '30' }]}>
                      <Text style={[styles.statusText, { color: getStatusColor(item.status) }]}>
                        {item.status}
                      </Text>
                    </View>
                  </View>
                ))
              )}
            </View>

            <View style={{ height: 100 }} />
          </ScrollView>
        </SafeAreaView>
      </LinearGradient>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0A0A0F' },
  loadingContainer: { flex: 1 },
  gradient: { flex: 1 },
  safeArea: { flex: 1 },
  scrollView: { flex: 1, paddingHorizontal: 16 },
  loadingText: { color: '#FFFFFF', marginTop: 16, fontSize: 16 },
  header: { marginTop: 16, marginBottom: 20 },
  headerTitle: { fontSize: 28, fontWeight: 'bold', color: '#FFFFFF' },
  headerSubtitle: { fontSize: 14, color: '#808080', marginTop: 4 },
  balanceCard: { borderRadius: 16, padding: 20, marginBottom: 20 },
  balanceRow: { flexDirection: 'row', justifyContent: 'space-around' },
  balanceItem: { alignItems: 'center' },
  balanceLabel: { fontSize: 12, color: '#808080', marginBottom: 8 },
  balanceValue: { fontSize: 24, fontWeight: 'bold', color: '#FFD700' },
  minValue: { fontSize: 18, fontWeight: '600', color: '#FFFFFF' },
  balanceDivider: { width: 1, backgroundColor: 'rgba(255,255,255,0.1)' },
  warningBox: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginTop: 16, padding: 10, backgroundColor: 'rgba(255,152,0,0.1)', borderRadius: 8 },
  warningText: { color: '#FF9800', marginLeft: 8, fontSize: 13 },
  formSection: { marginBottom: 20 },
  sectionTitle: { fontSize: 18, fontWeight: 'bold', color: '#FFFFFF', marginBottom: 16 },
  subTitle: { fontSize: 14, fontWeight: '600', color: '#A0A0A0', marginTop: 16, marginBottom: 12 },
  inputGroup: { marginBottom: 12 },
  inputLabel: { fontSize: 12, color: '#808080', marginBottom: 6 },
  input: { backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: 12, padding: 14, color: '#FFFFFF', fontSize: 16, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
  orText: { textAlign: 'center', color: '#808080', marginVertical: 16, fontSize: 12 },
  withdrawButton: { borderRadius: 16, overflow: 'hidden', marginTop: 16 },
  disabledButton: { opacity: 0.6 },
  buttonGradient: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 16 },
  buttonText: { fontSize: 16, fontWeight: 'bold', color: '#1A1A2E', marginLeft: 8 },
  disabledText: { color: '#808080' },
  historySection: { marginBottom: 20 },
  emptyHistory: { alignItems: 'center', padding: 40 },
  emptyText: { color: '#808080', marginTop: 12 },
  historyItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.05)', padding: 16, borderRadius: 12, marginBottom: 8 },
  historyLeft: {},
  historyAmount: { fontSize: 16, fontWeight: 'bold', color: '#FFFFFF' },
  historyDate: { fontSize: 12, color: '#808080', marginTop: 4 },
  statusBadge: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12 },
  statusText: { fontSize: 12, fontWeight: '600', textTransform: 'uppercase' },
});
