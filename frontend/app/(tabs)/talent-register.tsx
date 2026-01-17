import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import api from '../../src/services/api';

interface TalentType {
  type: string;
  name: string;
  icon: string;
}

export default function TalentRegistrationScreen() {
  const router = useRouter();
  const [talentTypes, setTalentTypes] = useState<TalentType[]>([]);
  const [selectedType, setSelectedType] = useState<string>('');
  const [registrationFee, setRegistrationFee] = useState<number>(1);
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState(1);
  
  // Form fields
  const [formData, setFormData] = useState({
    professionTitle: '',
    bio: '',
    qualifications: '',
    experienceYears: '',
    languages: 'Hindi, English',
    specializations: '',
    hourlyRate: '',
  });

  useEffect(() => {
    fetchTalentTypes();
  }, []);

  const fetchTalentTypes = async () => {
    try {
      const response = await api.get('/talents/types');
      setTalentTypes(response.data.talent_types);
      setRegistrationFee(response.data.registration_fee);
    } catch (error) {
      console.error('Error fetching talent types:', error);
    }
  };

  const handleRegister = async () => {
    if (!selectedType) {
      Alert.alert('Error', 'Kripya apna profession select karein');
      return;
    }
    if (!formData.professionTitle.trim()) {
      Alert.alert('Error', 'Kripya apna profession title daalein');
      return;
    }
    if (!formData.bio.trim()) {
      Alert.alert('Error', 'Kripya apne baare mein likhein');
      return;
    }

    setLoading(true);
    try {
      const response = await api.post('/talents/register', {
        talent_type: selectedType,
        profession_title: formData.professionTitle,
        bio: formData.bio,
        qualifications: formData.qualifications.split(',').map(q => q.trim()).filter(Boolean),
        experience_years: parseInt(formData.experienceYears) || 0,
        languages: formData.languages.split(',').map(l => l.trim()).filter(Boolean),
        specializations: formData.specializations.split(',').map(s => s.trim()).filter(Boolean),
        hourly_rate: parseFloat(formData.hourlyRate) || 0,
      });

      if (response.data.success) {
        Alert.alert(
          '🎉 Registration Successful!',
          `Aapka registration ho gaya hai!\n\nRegistration Fee: ₹${registrationFee}\n\nPayment karke apna profile activate karein.`,
          [
            {
              text: 'Pay Now',
              onPress: () => handlePayment(response.data.talent_id),
            },
            {
              text: 'Later',
              style: 'cancel',
            },
          ]
        );
      } else {
        Alert.alert('Info', response.data.message);
      }
    } catch (error: any) {
      Alert.alert('Error', error.response?.data?.detail || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  const handlePayment = async (talentId: string) => {
    try {
      const response = await api.post(`/talents/${talentId}/pay-registration`);
      if (response.data.success) {
        Alert.alert('✅ Payment Successful!', 'Aapka profile ab active hai! Ab aap kaam shuru kar sakte hain.');
        router.back();
      }
    } catch (error: any) {
      Alert.alert('Payment Failed', error.response?.data?.detail || 'Insufficient balance');
    }
  };

  const renderStep1 = () => (
    <View style={styles.stepContainer}>
      <Text style={styles.stepTitle}>Step 1: Select Your Profession</Text>
      <Text style={styles.stepSubtitle}>Aap kya karte hain?</Text>
      
      <View style={styles.typeGrid}>
        {talentTypes.map((type) => (
          <TouchableOpacity
            key={type.type}
            style={[
              styles.typeCard,
              selectedType === type.type && styles.typeCardSelected,
            ]}
            onPress={() => setSelectedType(type.type)}
          >
            <Text style={styles.typeIcon}>{type.icon}</Text>
            <Text style={[
              styles.typeName,
              selectedType === type.type && styles.typeNameSelected,
            ]}>
              {type.name.split('(')[0].trim()}
            </Text>
            {selectedType === type.type && (
              <View style={styles.checkmark}>
                <Ionicons name="checkmark" size={16} color="#1A1A2E" />
              </View>
            )}
          </TouchableOpacity>
        ))}
      </View>

      <TouchableOpacity
        style={[styles.nextButton, !selectedType && styles.buttonDisabled]}
        onPress={() => selectedType && setStep(2)}
        disabled={!selectedType}
      >
        <LinearGradient
          colors={selectedType ? ['#FFD700', '#FFA500'] : ['#404040', '#303030']}
          style={styles.buttonGradient}
        >
          <Text style={[styles.buttonText, !selectedType && styles.buttonTextDisabled]}>
            Next →
          </Text>
        </LinearGradient>
      </TouchableOpacity>
    </View>
  );

  const renderStep2 = () => (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <View style={styles.stepContainer}>
        <Text style={styles.stepTitle}>Step 2: Professional Details</Text>
        <Text style={styles.stepSubtitle}>Apni details bharein</Text>

        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>Profession Title *</Text>
          <TextInput
            style={styles.textInput}
            placeholder="e.g., Senior Mathematics Teacher"
            placeholderTextColor="#808080"
            value={formData.professionTitle}
            onChangeText={(text) => setFormData({ ...formData, professionTitle: text })}
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>About You (Bio) *</Text>
          <TextInput
            style={[styles.textInput, styles.textArea]}
            placeholder="Apne baare mein likhein..."
            placeholderTextColor="#808080"
            value={formData.bio}
            onChangeText={(text) => setFormData({ ...formData, bio: text })}
            multiline
            numberOfLines={4}
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>Qualifications (comma separated)</Text>
          <TextInput
            style={styles.textInput}
            placeholder="e.g., B.Ed, M.Sc Mathematics, PhD"
            placeholderTextColor="#808080"
            value={formData.qualifications}
            onChangeText={(text) => setFormData({ ...formData, qualifications: text })}
          />
        </View>

        <View style={styles.row}>
          <View style={[styles.inputGroup, { flex: 1, marginRight: 8 }]}>
            <Text style={styles.inputLabel}>Experience (Years)</Text>
            <TextInput
              style={styles.textInput}
              placeholder="e.g., 5"
              placeholderTextColor="#808080"
              value={formData.experienceYears}
              onChangeText={(text) => setFormData({ ...formData, experienceYears: text })}
              keyboardType="numeric"
            />
          </View>
          <View style={[styles.inputGroup, { flex: 1, marginLeft: 8 }]}>
            <Text style={styles.inputLabel}>Hourly Rate (₹)</Text>
            <TextInput
              style={styles.textInput}
              placeholder="e.g., 500"
              placeholderTextColor="#808080"
              value={formData.hourlyRate}
              onChangeText={(text) => setFormData({ ...formData, hourlyRate: text })}
              keyboardType="numeric"
            />
          </View>
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>Languages</Text>
          <TextInput
            style={styles.textInput}
            placeholder="e.g., Hindi, English, Bengali"
            placeholderTextColor="#808080"
            value={formData.languages}
            onChangeText={(text) => setFormData({ ...formData, languages: text })}
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>Specializations</Text>
          <TextInput
            style={styles.textInput}
            placeholder="e.g., Algebra, Calculus, Statistics"
            placeholderTextColor="#808080"
            value={formData.specializations}
            onChangeText={(text) => setFormData({ ...formData, specializations: text })}
          />
        </View>

        <View style={styles.buttonRow}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => setStep(1)}
          >
            <Text style={styles.backButtonText}>← Back</Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[styles.nextButton, { flex: 1, marginLeft: 12 }]}
            onPress={() => setStep(3)}
          >
            <LinearGradient
              colors={['#FFD700', '#FFA500']}
              style={styles.buttonGradient}
            >
              <Text style={styles.buttonText}>Review →</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </View>
    </KeyboardAvoidingView>
  );

  const renderStep3 = () => (
    <View style={styles.stepContainer}>
      <Text style={styles.stepTitle}>Step 3: Review & Submit</Text>
      <Text style={styles.stepSubtitle}>Apni details verify karein</Text>

      <View style={styles.reviewCard}>
        <View style={styles.reviewItem}>
          <Text style={styles.reviewLabel}>Profession</Text>
          <Text style={styles.reviewValue}>
            {talentTypes.find(t => t.type === selectedType)?.name || selectedType}
          </Text>
        </View>
        <View style={styles.reviewItem}>
          <Text style={styles.reviewLabel}>Title</Text>
          <Text style={styles.reviewValue}>{formData.professionTitle || '-'}</Text>
        </View>
        <View style={styles.reviewItem}>
          <Text style={styles.reviewLabel}>Experience</Text>
          <Text style={styles.reviewValue}>{formData.experienceYears || '0'} years</Text>
        </View>
        <View style={styles.reviewItem}>
          <Text style={styles.reviewLabel}>Hourly Rate</Text>
          <Text style={styles.reviewValue}>₹{formData.hourlyRate || '0'}</Text>
        </View>
        <View style={styles.reviewItem}>
          <Text style={styles.reviewLabel}>Languages</Text>
          <Text style={styles.reviewValue}>{formData.languages || '-'}</Text>
        </View>
      </View>

      <View style={styles.feeCard}>
        <LinearGradient
          colors={['#4CAF50', '#2E7D32']}
          style={styles.feeCardGradient}
        >
          <View style={styles.feeRow}>
            <Text style={styles.feeLabel}>Registration Fee</Text>
            <Text style={styles.feeValue}>₹{registrationFee}</Text>
          </View>
          <Text style={styles.feeNote}>
            Sirf ₹1 mein apna career shuru karein!
          </Text>
        </LinearGradient>
      </View>

      <View style={styles.buttonRow}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => setStep(2)}
        >
          <Text style={styles.backButtonText}>← Back</Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[styles.nextButton, { flex: 1, marginLeft: 12 }]}
          onPress={handleRegister}
          disabled={loading}
        >
          <LinearGradient
            colors={['#4CAF50', '#2E7D32']}
            style={styles.buttonGradient}
          >
            {loading ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={[styles.buttonText, { color: '#FFFFFF' }]}>
                Register Now 🚀
              </Text>
            )}
          </LinearGradient>
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={['#1A1A2E', '#16213E', '#0F3460']}
        style={styles.gradient}
      >
        <SafeAreaView style={styles.safeArea}>
          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity onPress={() => router.back()}>
              <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Become a Talent</Text>
            <View style={{ width: 24 }} />
          </View>

          {/* Progress Bar */}
          <View style={styles.progressContainer}>
            {[1, 2, 3].map((s) => (
              <View key={s} style={styles.progressStep}>
                <View style={[
                  styles.progressDot,
                  step >= s && styles.progressDotActive,
                ]}>
                  {step > s ? (
                    <Ionicons name="checkmark" size={14} color="#1A1A2E" />
                  ) : (
                    <Text style={[
                      styles.progressDotText,
                      step >= s && styles.progressDotTextActive,
                    ]}>{s}</Text>
                  )}
                </View>
                {s < 3 && (
                  <View style={[
                    styles.progressLine,
                    step > s && styles.progressLineActive,
                  ]} />
                )}
              </View>
            ))}
          </View>

          <ScrollView 
            style={styles.scrollView}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            {step === 1 && renderStep1()}
            {step === 2 && renderStep2()}
            {step === 3 && renderStep3()}
            
            <View style={{ height: 40 }} />
          </ScrollView>
        </SafeAreaView>
      </LinearGradient>
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  progressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 40,
    paddingVertical: 16,
  },
  progressStep: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  progressDot: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  progressDotActive: {
    backgroundColor: '#FFD700',
  },
  progressDotText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#808080',
  },
  progressDotTextActive: {
    color: '#1A1A2E',
  },
  progressLine: {
    width: 60,
    height: 3,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    marginHorizontal: 8,
  },
  progressLineActive: {
    backgroundColor: '#FFD700',
  },
  scrollView: {
    flex: 1,
    paddingHorizontal: 16,
  },
  stepContainer: {
    paddingTop: 16,
  },
  stepTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  stepSubtitle: {
    fontSize: 14,
    color: '#808080',
    marginBottom: 24,
  },
  typeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 24,
  },
  typeCard: {
    width: '47%',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  typeCardSelected: {
    borderColor: '#FFD700',
    backgroundColor: 'rgba(255, 215, 0, 0.1)',
  },
  typeIcon: {
    fontSize: 32,
    marginBottom: 8,
  },
  typeName: {
    fontSize: 12,
    color: '#A0A0A0',
    textAlign: 'center',
  },
  typeNameSelected: {
    color: '#FFD700',
    fontWeight: '600',
  },
  checkmark: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#FFD700',
    justifyContent: 'center',
    alignItems: 'center',
  },
  inputGroup: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 14,
    color: '#A0A0A0',
    marginBottom: 8,
  },
  textInput: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    color: '#FFFFFF',
    fontSize: 14,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  textArea: {
    height: 100,
    textAlignVertical: 'top',
  },
  row: {
    flexDirection: 'row',
  },
  buttonRow: {
    flexDirection: 'row',
    marginTop: 24,
  },
  nextButton: {
    borderRadius: 12,
    overflow: 'hidden',
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  buttonGradient: {
    paddingVertical: 16,
    alignItems: 'center',
  },
  buttonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1A1A2E',
  },
  buttonTextDisabled: {
    color: '#808080',
  },
  backButton: {
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  backButtonText: {
    fontSize: 14,
    color: '#A0A0A0',
  },
  reviewCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
  },
  reviewItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.05)',
  },
  reviewLabel: {
    fontSize: 14,
    color: '#808080',
  },
  reviewValue: {
    fontSize: 14,
    color: '#FFFFFF',
    fontWeight: '600',
    maxWidth: '60%',
    textAlign: 'right',
  },
  feeCard: {
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: 16,
  },
  feeCardGradient: {
    padding: 20,
  },
  feeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  feeLabel: {
    fontSize: 16,
    color: '#FFFFFF',
  },
  feeValue: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  feeNote: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.8)',
  },
});
