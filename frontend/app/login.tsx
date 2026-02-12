import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  Platform,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import * as WebBrowser from 'expo-web-browser';
import * as Linking from 'expo-linking';
import { useAuth } from '../src/contexts/AuthContext';

const BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL || '';

const { width } = Dimensions.get('window');

export default function LoginScreen() {
  const { processSessionId } = useAuth();

  const handleOpenLink = async (path: string) => {
    try {
      const url = `${BACKEND_URL}${path}`;
      await WebBrowser.openBrowserAsync(url);
    } catch (error) {
      console.error('Error opening link:', error);
    }
  };

  const handleGoogleLogin = async () => {
    try {
      const redirectUrl = Platform.OS === 'web'
        ? `${process.env.EXPO_PUBLIC_BACKEND_URL}/`
        : Linking.createURL('/');
      
      const authUrl = `https://auth.emergentagent.com/?redirect=${encodeURIComponent(redirectUrl)}`;
      
      if (Platform.OS === 'web') {
        window.location.href = authUrl;
      } else {
        const result = await WebBrowser.openAuthSessionAsync(authUrl, redirectUrl);
        
        if (result.type === 'success' && result.url) {
          const parsed = Linking.parse(result.url);
          const sessionId = parsed.queryParams?.session_id as string;
          if (sessionId) {
            await processSessionId(sessionId);
          }
        }
      }
    } catch (error) {
      console.error('Login error:', error);
    }
  };

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={['#FFF8E7', '#FFF5E1', '#FFFAF0']}
        style={styles.gradient}
      >
        <SafeAreaView style={styles.safeArea}>
          <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
            {/* Header with Logo */}
            <View style={styles.header}>
              {/* Green Heart Logo */}
              <View style={styles.logoContainer}>
                <LinearGradient
                  colors={['#4CAF50', '#2E7D32']}
                  style={styles.logoGradient}
                >
                  <Text style={styles.heartEmoji}>💚</Text>
                </LinearGradient>
              </View>
              
              <Text style={styles.title}>GYAN SULTANAT</Text>
              <Text style={styles.hindiTitle}>ज्ञान सल्तनत</Text>
              <Text style={styles.subtitle}>Gyaan se Aay, Apne Sapne Sajaye!</Text>
              
              {/* Free Badge */}
              <View style={styles.freeBadge}>
                <Text style={styles.freeBadgeText}>🎁 100% FREE</Text>
              </View>
            </View>

            {/* Features Grid */}
            <View style={styles.featuresGrid}>
              <TouchableOpacity style={styles.featureCard}>
                <LinearGradient colors={['#FF6B6B', '#FF8E53']} style={styles.featureGradient}>
                  <Ionicons name="videocam" size={28} color="#FFF" />
                  <Text style={styles.featureText}>Live</Text>
                  <Text style={styles.featureSubtext}>Streaming</Text>
                </LinearGradient>
              </TouchableOpacity>
              
              <TouchableOpacity style={styles.featureCard}>
                <LinearGradient colors={['#4ECDC4', '#44A08D']} style={styles.featureGradient}>
                  <Ionicons name="mic" size={28} color="#FFF" />
                  <Text style={styles.featureText}>Audio</Text>
                  <Text style={styles.featureSubtext}>Rooms</Text>
                </LinearGradient>
              </TouchableOpacity>
              
              <TouchableOpacity style={styles.featureCard}>
                <LinearGradient colors={['#A770EF', '#CF8BF3']} style={styles.featureGradient}>
                  <Ionicons name="gift" size={28} color="#FFF" />
                  <Text style={styles.featureText}>Gift</Text>
                  <Text style={styles.featureSubtext}>& Earn</Text>
                </LinearGradient>
              </TouchableOpacity>
              
              <TouchableOpacity style={styles.featureCard}>
                <LinearGradient colors={['#F7971E', '#FFD200']} style={styles.featureGradient}>
                  <Ionicons name="school" size={28} color="#FFF" />
                  <Text style={styles.featureText}>Gyan</Text>
                  <Text style={styles.featureSubtext}>Education</Text>
                </LinearGradient>
              </TouchableOpacity>
              
              <TouchableOpacity style={styles.featureCard}>
                <LinearGradient colors={['#11998E', '#38EF7D']} style={styles.featureGradient}>
                  <Ionicons name="trophy" size={28} color="#FFF" />
                  <Text style={styles.featureText}>Gyan</Text>
                  <Text style={styles.featureSubtext}>Yuddh</Text>
                </LinearGradient>
              </TouchableOpacity>
              
              <TouchableOpacity style={styles.featureCard}>
                <LinearGradient colors={['#FC466B', '#3F5EFB']} style={styles.featureGradient}>
                  <Ionicons name="people" size={28} color="#FFF" />
                  <Text style={styles.featureText}>Make</Text>
                  <Text style={styles.featureSubtext}>Friends</Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>

            {/* Login Section */}
            <View style={styles.loginSection}>
              <TouchableOpacity style={styles.googleButton} onPress={handleGoogleLogin}>
                <View style={styles.googleIconContainer}>
                  <Text style={styles.googleIcon}>G</Text>
                </View>
                <Text style={styles.googleButtonText}>Continue with Google</Text>
              </TouchableOpacity>

              <Text style={styles.orText}>─────  or  ─────</Text>

              <TouchableOpacity style={styles.phoneButton}>
                <Ionicons name="call" size={20} color="#4CAF50" />
                <Text style={styles.phoneButtonText}>Continue with Phone</Text>
              </TouchableOpacity>
            </View>

            {/* Terms */}
            <View style={styles.termsContainer}>
              <Text style={styles.termsText}>By continuing, you agree to our </Text>
              <TouchableOpacity onPress={() => handleOpenLink('/api/legal/terms')}>
                <Text style={styles.termsLink}>Terms of Service</Text>
              </TouchableOpacity>
              <Text style={styles.termsText}> & </Text>
              <TouchableOpacity onPress={() => handleOpenLink('/api/legal/privacy-policy')}>
                <Text style={styles.termsLink}>Privacy Policy</Text>
              </TouchableOpacity>
            </View>

            {/* Company Info */}
            <View style={styles.companyInfo}>
              <Text style={styles.companyText}>💚 Muqaddas Technology</Text>
              <Text style={styles.companySubtext}>Powered by Aayushka Designing</Text>
            </View>
          </ScrollView>
        </SafeAreaView>
      </LinearGradient>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  gradient: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 20,
    paddingBottom: 30,
  },
  header: {
    alignItems: 'center',
    marginTop: 20,
    marginBottom: 30,
  },
  logoContainer: {
    marginBottom: 15,
  },
  logoGradient: {
    width: 100,
    height: 100,
    borderRadius: 50,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#4CAF50',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  heartEmoji: {
    fontSize: 50,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#2E7D32',
    letterSpacing: 2,
  },
  hindiTitle: {
    fontSize: 18,
    color: '#4CAF50',
    marginTop: 2,
  },
  subtitle: {
    fontSize: 14,
    color: '#666',
    marginTop: 8,
    fontStyle: 'italic',
  },
  freeBadge: {
    backgroundColor: '#4CAF50',
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 20,
    marginTop: 15,
  },
  freeBadgeText: {
    color: '#FFF',
    fontWeight: 'bold',
    fontSize: 14,
  },
  featuresGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 30,
  },
  featureCard: {
    width: (width - 60) / 3,
    marginBottom: 15,
  },
  featureGradient: {
    padding: 15,
    borderRadius: 15,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  featureText: {
    color: '#FFF',
    fontWeight: 'bold',
    fontSize: 12,
    marginTop: 8,
  },
  featureSubtext: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 10,
  },
  loginSection: {
    marginBottom: 20,
  },
  googleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFF',
    padding: 15,
    borderRadius: 30,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  googleIconContainer: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#4285F4',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  googleIcon: {
    color: '#FFF',
    fontWeight: 'bold',
    fontSize: 14,
  },
  googleButtonText: {
    color: '#333',
    fontSize: 16,
    fontWeight: '600',
  },
  orText: {
    textAlign: 'center',
    color: '#999',
    marginVertical: 15,
    fontSize: 12,
  },
  phoneButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFF',
    padding: 15,
    borderRadius: 30,
    borderWidth: 2,
    borderColor: '#4CAF50',
  },
  phoneButtonText: {
    color: '#4CAF50',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 10,
  },
  termsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    marginBottom: 20,
  },
  termsText: {
    fontSize: 12,
    color: '#666',
  },
  termsLink: {
    fontSize: 12,
    color: '#4CAF50',
    textDecorationLine: 'underline',
    fontWeight: '600',
  },
  companyInfo: {
    alignItems: 'center',
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.1)',
  },
  companyText: {
    fontSize: 14,
    color: '#2E7D32',
    fontWeight: 'bold',
  },
  companySubtext: {
    fontSize: 11,
    color: '#888',
    marginTop: 2,
  },
});
