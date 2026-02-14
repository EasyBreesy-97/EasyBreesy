// components/PhoneVerification.tsx
import auth, { FirebaseAuthTypes } from '@react-native-firebase/auth';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Keyboard,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View
} from 'react-native';

interface PhoneVerificationProps {
  onSuccess?: () => void;
}

const PhoneVerification: React.FC<PhoneVerificationProps> = ({ onSuccess }) => {
  const [confirm, setConfirm] = useState<FirebaseAuthTypes.ConfirmationResult | null>(null);
  const [phoneNumber, setPhoneNumber] = useState('');
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [codeError, setCodeError] = useState<string | null>(null);
  
  // Security states
  const [sendAttempts, setSendAttempts] = useState(0);
  const [verifyAttempts, setVerifyAttempts] = useState(0);
  const [lastSentTime, setLastSentTime] = useState<number | null>(null);
  const [verificationStartTime, setVerificationStartTime] = useState<number | null>(null);
  const [timeRemaining, setTimeRemaining] = useState(0);
  const [verifyCooldown, setVerifyCooldown] = useState(0);
  
  // Constants
  const OTP_VALIDITY_DURATION = 5 * 60 * 1000; // 5 minutes
  const SEND_COOLDOWN = 10 * 60 * 1000; // 10 minutes
  const MAX_SEND_ATTEMPTS = 5;
  const MAX_VERIFY_ATTEMPTS = 5;
  const VERIFY_COOLDOWN = 15 * 60 * 1000; // 15 minutes after max attempts

  const isValidPhoneNumber = (phone: string) => {
    // Allow Malaysian and international formats
    return /^\+[1-9]\d{9,14}$/.test(phone);
  };

  const formatPhoneNumber = (input: string) => {
    // Remove all non-digit characters except leading +
    const cleaned = input.replace(/[^\d+]/g, '');
    
    // Ensure it starts with +
    if (!cleaned.startsWith('+')) {
      return '+' + cleaned;
    }
    
    return cleaned;
  };

  // Timer effects
  useEffect(() => {
    if (lastSentTime) {
      const interval = setInterval(() => {
        const now = Date.now();
        const elapsed = now - lastSentTime;
        const remaining = Math.max(0, Math.ceil((SEND_COOLDOWN - elapsed) / 1000));
        setTimeRemaining(remaining);
        
        if (remaining === 0) {
          clearInterval(interval);
        }
      }, 1000);
      
      return () => clearInterval(interval);
    }
  }, [lastSentTime]);

  useEffect(() => {
    if (verificationStartTime) {
      const interval = setInterval(() => {
        const now = Date.now();
        const elapsed = now - verificationStartTime;
        
        // Check if OTP has expired (5 minutes)
        if (elapsed >= OTP_VALIDITY_DURATION) {
          setCodeError('Verification code has expired. Please request a new one.');
          setConfirm(null);
          setVerificationStartTime(null);
          clearInterval(interval);
        }
      }, 1000);
      
      return () => clearInterval(interval);
    }
  }, [verificationStartTime]);

  useEffect(() => {
    if (verifyCooldown > 0) {
      const interval = setInterval(() => {
        setVerifyCooldown(prev => {
          if (prev <= 1) {
            clearInterval(interval);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
      
      return () => clearInterval(interval);
    }
  }, [verifyCooldown]);

  const handlePhoneChange = (text: string) => {
    const formatted = formatPhoneNumber(text);
    setPhoneNumber(formatted);
    setError(null);
  };

  const handleCodeChange = (text: string) => {
    const cleaned = text.replace(/[^\d]/g, '');
    setCode(cleaned);
    setCodeError(null);
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleSendOTP = async () => {
    // Reset errors
    setError(null);
    setCodeError(null);
    
    // Validate phone number
    if (!phoneNumber) {
      setError('Please enter your phone number');
      return;
    }

    if (!isValidPhoneNumber(phoneNumber)) {
      setError('Please enter a valid phone number with country code (e.g., +60123456789)');
      return;
    }

    // Check send attempts limit
    if (sendAttempts >= MAX_SEND_ATTEMPTS) {
      setError(`Maximum attempts reached. Please try again in ${formatTime(timeRemaining)}`);
      return;
    }

    // Check cooldown
    if (timeRemaining > 0) {
      setError(`Please wait ${formatTime(timeRemaining)} before requesting a new code`);
      return;
    }

    // Check verify cooldown (if user hit max verify attempts)
    if (verifyCooldown > 0) {
      setError(`Please wait ${formatTime(verifyCooldown)} before requesting a new code`);
      return;
    }

    setLoading(true);
    Keyboard.dismiss();

    try {
      console.log('Starting OTP process for:', phoneNumber);
      
      const confirmation = await auth().signInWithPhoneNumber(phoneNumber);
      
      console.log('OTP sent successfully');
      
      // Set states
      setConfirm(confirmation);
      setVerificationStartTime(Date.now());
      setLastSentTime(Date.now());
      setSendAttempts(prev => prev + 1);
      setVerifyAttempts(0); // Reset verify attempts for new OTP
      
      // Reset errors
      setError(null);
      
      Alert.alert(
        'Verification Code Sent ✅', 
        'A 6-digit verification code has been sent to your phone. This code will expire in 5 minutes.',
        [{ text: 'OK' }]
      );
    } catch (error: any) {
      console.error('OTP Send Error Details:', error);
      
      let errorMessage = 'Failed to send verification code. Please try again.';
      let showAlert = false;
      
      if (error?.code) {
        switch (error.code) {
          case 'auth/invalid-phone-number':
            errorMessage = 'The phone number format is invalid. Please use format: +60123456789';
            break;
          case 'auth/missing-phone-number':
            errorMessage = 'Please enter a phone number.';
            break;
          case 'auth/quota-exceeded':
            errorMessage = 'We\'ve reached our SMS limit. Please try again in an hour or contact support.';
            showAlert = true;
            break;
          case 'auth/too-many-requests':
            setSendAttempts(MAX_SEND_ATTEMPTS);
            errorMessage = `Too many attempts. Please wait ${formatTime(timeRemaining)} before trying again.`;
            showAlert = true;
            break;
          case 'auth/operation-not-allowed':
            errorMessage = 'Phone verification is currently unavailable. Please try another method or contact support.';
            showAlert = true;
            break;
          case 'auth/network-request-failed':
            errorMessage = 'Network error. Please check your internet connection and try again.';
            break;
          default:
            errorMessage = `Unable to send code. ${error.message || 'Please try again.'}`;
        }
      }
      
      setError(errorMessage);
      
      if (showAlert) {
        Alert.alert('Unable to Send Code', errorMessage, [{ text: 'OK' }]);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOTP = async () => {
    // Reset error
    setCodeError(null);
    
    if (!confirm) {
      setCodeError('No verification session found. Please request a new code.');
      return;
    }
    
    if (!verificationStartTime) {
      setCodeError('Verification session expired. Please request a new code.');
      return;
    }
    
    // Check if OTP has expired
    const now = Date.now();
    const elapsed = now - verificationStartTime;
    if (elapsed >= OTP_VALIDITY_DURATION) {
      setCodeError('Verification code has expired. Please request a new one.');
      setConfirm(null);
      setVerificationStartTime(null);
      return;
    }
    
    if (code.length !== 6) {
      setCodeError('Please enter the 6-digit verification code');
      return;
    }

    // Check verify attempts limit
    if (verifyAttempts >= MAX_VERIFY_ATTEMPTS) {
      setVerifyCooldown(Math.ceil(VERIFY_COOLDOWN / 1000));
      setCodeError(`Maximum verification attempts reached. Please wait ${formatTime(verifyCooldown)} before trying again.`);
      return;
    }

    setLoading(true);
    Keyboard.dismiss();

    try {
      console.log('Verifying OTP with code:', code);
      console.log(`Attempt ${verifyAttempts + 1} of ${MAX_VERIFY_ATTEMPTS}`);
      
      await confirm.confirm(code);

      Alert.alert(
        'Phone Verified Successfully! 🎉', 
        'Your phone number has been successfully verified.',
        [{ text: 'Continue', onPress: () => onSuccess && onSuccess() }]
      );

      // Success - reset all security states
      if (onSuccess) onSuccess();
      resetAllStates();
      
    } catch (error: any) {
      console.error('OTP Verify Error Details:', error);
      
      // Increment verify attempts
      const newAttempts = verifyAttempts + 1;
      setVerifyAttempts(newAttempts);
      
      let errorMessage = 'Invalid verification code. Please try again.';
      let showAlert = false;
      let remainingAttempts = MAX_VERIFY_ATTEMPTS - newAttempts;
      
      if (error?.code) {
        switch (error.code) {
          case 'auth/invalid-verification-code':
            if (newAttempts >= MAX_VERIFY_ATTEMPTS) {
              setVerifyCooldown(Math.ceil(VERIFY_COOLDOWN / 1000));
              errorMessage = `Maximum attempts reached. Please wait ${formatTime(verifyCooldown)} before trying again.`;
            } else {
              errorMessage = `Incorrect code. ${remainingAttempts} attempt${remainingAttempts !== 1 ? 's' : ''} remaining.`;
            }
            break;
          case 'auth/code-expired':
            errorMessage = 'This verification code has expired. Please request a new one.';
            showAlert = true;
            setConfirm(null);
            setVerificationStartTime(null);
            break;
          case 'auth/credential-already-in-use':
            errorMessage = 'This phone number is already linked to another account.';
            showAlert = true;
            break;
          case 'auth/user-disabled':
            errorMessage = 'This account has been disabled. Please contact support.';
            showAlert = true;
            break;
          case 'auth/network-request-failed':
            errorMessage = 'Network error. Please check your internet connection and try again.';
            break;
          default:
            errorMessage = `Verification failed. ${error.message || 'Please try again.'}`;
        }
      }
      
      setCodeError(errorMessage);
      setCode(''); // Clear code on error
      
      if (showAlert) {
        Alert.alert('Verification Failed', errorMessage, [{ text: 'OK' }]);
      }
    } finally {
      setLoading(false);
    }
  };

  const resetAllStates = () => {
    setPhoneNumber('');
    setCode('');
    setConfirm(null);
    setVerificationStartTime(null);
    setSendAttempts(0);
    setVerifyAttempts(0);
    setTimeRemaining(0);
    setVerifyCooldown(0);
    setError(null);
    setCodeError(null);
  };

  const handleResendOTP = async () => {
    if (verifyCooldown > 0) {
      setError(`Please wait ${formatTime(verifyCooldown)} before requesting a new code`);
      return;
    }
    
    if (timeRemaining > 0) {
      setError(`Please wait ${formatTime(timeRemaining)} before requesting a new code`);
      return;
    }
    
    setResendLoading(true);
    try {
      await handleSendOTP();
    } catch (error) {
      console.error('Resend error:', error);
    } finally {
      setResendLoading(false);
    }
  };

  const handleChangePhone = () => {
    resetAllStates();
  };

  // Calculate OTP expiration time
  const getOTPExpirationTime = () => {
    if (!verificationStartTime) return 0;
    const now = Date.now();
    const elapsed = now - verificationStartTime;
    const remaining = Math.max(0, Math.ceil((OTP_VALIDITY_DURATION - elapsed) / 1000));
    return remaining;
  };

  const otpExpirationTime = getOTPExpirationTime();
  const canResend = timeRemaining === 0 && verifyCooldown === 0;
  const remainingVerifyAttempts = MAX_VERIFY_ATTEMPTS - verifyAttempts;

  return (
    <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
      <View style={styles.container}>
        {!confirm ? (
          <View style={styles.form}>
            <Text style={styles.label}>Enter Your Phone Number</Text>
            
            {/* Security Status */}
            {sendAttempts > 0 && (
              <View style={styles.securityStatus}>
                <Text style={styles.securityText}>
                  📱 Requests this session: {sendAttempts}/{MAX_SEND_ATTEMPTS}
                </Text>
                {timeRemaining > 0 && (
                  <Text style={styles.timerText}>
                    ⏰ Next request in: {formatTime(timeRemaining)}
                  </Text>
                )}
              </View>
            )}
            
            <View style={styles.inputContainer}>
              <TextInput
                style={[styles.input, error && styles.inputError]}
                placeholder="+60123456789"
                value={phoneNumber}
                onChangeText={handlePhoneChange}
                keyboardType="phone-pad"
                autoCapitalize="none"
                editable={!loading && timeRemaining === 0 && verifyCooldown === 0}
                placeholderTextColor="#999"
                maxLength={15}
              />
              {error ? (
                <View style={styles.errorContainer}>
                  <Text style={styles.errorIcon}>⚠️</Text>
                  <Text style={styles.errorText}>{error}</Text>
                </View>
              ) : null}
            </View>
            
            <Text style={styles.note}>
              Enter your phone number with country code. We'll send a 6-digit verification code via SMS.
            </Text>
            
            {loading ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#007AFF" />
                <Text style={styles.loadingText}>Sending verification code...</Text>
              </View>
            ) : (
              <TouchableOpacity
                style={[
                  styles.button, 
                  (!isValidPhoneNumber(phoneNumber) || loading || timeRemaining > 0 || verifyCooldown > 0) && styles.buttonDisabled
                ]}
                onPress={handleSendOTP}
                disabled={!isValidPhoneNumber(phoneNumber) || loading || timeRemaining > 0 || verifyCooldown > 0}
              >
                <Text style={styles.buttonText}>
                  {timeRemaining > 0 ? `Wait ${formatTime(timeRemaining)}` : 
                   verifyCooldown > 0 ? `Wait ${formatTime(verifyCooldown)}` : 
                   'Send Verification Code'}
                </Text>
              </TouchableOpacity>
            )}
          </View>
        ) : (
          <View style={styles.form}>
            <Text style={styles.label}>Enter Verification Code</Text>
            
            {/* Security Status */}
            <View style={styles.securityStatus}>
              <Text style={styles.securityText}>
                🔐 Attempts remaining: {remainingVerifyAttempts}/{MAX_VERIFY_ATTEMPTS}
              </Text>
              <Text style={styles.timerText}>
                ⏳ Code expires in: {formatTime(otpExpirationTime)}
              </Text>
              {verifyCooldown > 0 && (
                <Text style={styles.warningText}>
                  ⚠️ Locked for: {formatTime(verifyCooldown)}
                </Text>
              )}
            </View>
            
            <Text style={styles.phoneInfo}>
              Code sent to: <Text style={styles.phoneNumber}>{phoneNumber}</Text>
            </Text>
            
            <View style={styles.inputContainer}>
              <TextInput
                style={[styles.input, codeError && styles.inputError]}
                placeholder="Enter 6-digit code"
                value={code}
                onChangeText={handleCodeChange}
                keyboardType="number-pad"
                maxLength={6}
                editable={!loading && verifyCooldown === 0}
                placeholderTextColor="#999"
                autoFocus
              />
              {codeError ? (
                <View style={styles.errorContainer}>
                  <Text style={styles.errorIcon}>⚠️</Text>
                  <Text style={styles.errorText}>{codeError}</Text>
                </View>
              ) : null}
            </View>
            
            <Text style={styles.codeHint}>
              Enter the 6-digit code sent to your phone (expires in {formatTime(otpExpirationTime)})
            </Text>
            
            {loading ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#007AFF" />
                <Text style={styles.loadingText}>Verifying code...</Text>
              </View>
            ) : (
              <>
                <TouchableOpacity
                  style={[
                    styles.button, 
                    (code.length !== 6 || loading || verifyCooldown > 0) && styles.buttonDisabled
                  ]}
                  onPress={handleVerifyOTP}
                  disabled={code.length !== 6 || loading || verifyCooldown > 0}
                >
                  <Text style={styles.buttonText}>
                    {verifyCooldown > 0 ? `Locked (${formatTime(verifyCooldown)})` : 
                     `Verify Code (${remainingVerifyAttempts} left)`}
                  </Text>
                </TouchableOpacity>
                
                <View style={styles.actionButtons}>
                  <TouchableOpacity
                    style={styles.secondaryButton}
                    onPress={handleChangePhone}
                    disabled={loading || verifyCooldown > 0}
                  >
                    <Text style={styles.secondaryButtonText}>Change Phone Number</Text>
                  </TouchableOpacity>
                  
                  <TouchableOpacity
                    style={[
                      styles.secondaryButton, 
                      (!canResend || resendLoading || loading || verifyCooldown > 0) && styles.buttonDisabled
                    ]}
                    onPress={handleResendOTP}
                    disabled={!canResend || resendLoading || loading || verifyCooldown > 0}
                  >
                    <Text style={styles.secondaryButtonText}>
                      {resendLoading ? 'Sending...' : 
                       verifyCooldown > 0 ? `Locked (${formatTime(verifyCooldown)})` :
                       canResend ? 'Resend Code' : 
                       `Resend in ${formatTime(timeRemaining)}`}
                    </Text>
                  </TouchableOpacity>
                </View>
                
                {verifyAttempts >= 3 && (
                  <View style={styles.warningContainer}>
                    <Text style={styles.warningIcon}>⚠️</Text>
                    <Text style={styles.warningText}>
                      {verifyAttempts >= MAX_VERIFY_ATTEMPTS ? 
                       `Maximum attempts reached. Locked for ${formatTime(verifyCooldown)}` : 
                       `Warning: ${remainingVerifyAttempts} attempt${remainingVerifyAttempts !== 1 ? 's' : ''} remaining`}
                    </Text>
                  </View>
                )}
              </>
            )}
          </View>
        )}
      </View>
    </TouchableWithoutFeedback>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 24,
    backgroundColor: 'white',
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  form: {
    width: '100%',
  },
  label: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1c1c1e',
    marginBottom: 8,
  },
  securityStatus: {
    marginBottom: 16,
    padding: 12,
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e5e5ea',
  },
  securityText: {
    fontSize: 13,
    color: '#495057',
    marginBottom: 4,
  },
  timerText: {
    fontSize: 13,
    color: '#28a745',
    fontWeight: '500',
  },
  inputContainer: {
    marginBottom: 16,
  },
  input: {
    borderWidth: 1,
    borderColor: '#e5e5ea',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    color: '#1c1c1e',
    backgroundColor: '#f8f9fa',
  },
  inputError: {
    borderColor: '#dc3545',
    backgroundColor: '#fff5f5',
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    padding: 8,
    backgroundColor: '#fff5f5',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#f8d7da',
  },
  errorIcon: {
    marginRight: 8,
  },
  errorText: {
    flex: 1,
    fontSize: 14,
    color: '#dc3545',
    lineHeight: 18,
  },
  note: {
    fontSize: 14,
    color: '#8e8e93',
    marginBottom: 24,
    lineHeight: 20,
  },
  button: {
    backgroundColor: '#007AFF',
    borderRadius: 12,
    padding: 18,
    alignItems: 'center',
    marginBottom: 16,
  },
  buttonDisabled: {
    backgroundColor: '#c7c7cc',
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  loadingContainer: {
    alignItems: 'center',
    padding: 20,
  },
  loadingText: {
    marginTop: 12,
    color: '#8e8e93',
    fontSize: 14,
  },
  actionButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  secondaryButton: {
    padding: 12,
  },
  secondaryButtonText: {
    color: '#007AFF',
    fontSize: 14,
    fontWeight: '500',
  },
  phoneInfo: {
    fontSize: 14,
    color: '#8e8e93',
    marginBottom: 16,
  },
  phoneNumber: {
    fontWeight: '600',
    color: '#1c1c1e',
  },
  codeHint: {
    fontSize: 14,
    color: '#8e8e93',
    marginBottom: 16,
    fontStyle: 'italic',
  },
  warningContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginTop: 20,
    padding: 12,
    backgroundColor: '#fff3cd',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ffeaa7',
  },
  warningIcon: {
    marginRight: 8,
    marginTop: 2,
  },
  warningText: {
    flex: 1,
    fontSize: 13,
    color: '#856404',
    lineHeight: 18,
  },
});

export default PhoneVerification;