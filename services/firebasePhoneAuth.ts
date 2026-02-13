// services/firebasePhoneAuth.ts
import { auth } from '@/lib/firebase';
import { PhoneAuthProvider } from 'firebase/auth';

/**
 * Alternative method for sending OTP in React Native
 * This handles the reCAPTCHA issue differently
 */
export const sendPhoneOTP = async (phoneNumber: string): Promise<string> => {
  try {
    const provider = new PhoneAuthProvider(auth);
    
    // For React Native, we need to handle this differently
    // The key is NOT to pass a verifier at all
    const verificationId = await provider.verifyPhoneNumber(
      phoneNumber,
      undefined // DO NOT pass null, pass undefined
    );
    
    return verificationId;
  } catch (error: any) {
    console.error('Phone OTP Error:', {
      code: error.code,
      message: error.message,
      phone: phoneNumber
    });
    throw error;
  }
};

/**
 * Verify the OTP code
 */
export const verifyPhoneOTP = async (
  verificationId: string, 
  code: string
) => {
  try {
    const credential = PhoneAuthProvider.credential(verificationId, code);
    
    if (auth.currentUser?.isAnonymous) {
      // Link to anonymous user
      return await auth.currentUser.linkWithCredential(credential);
    } else {
      // Sign in with credential
      return await auth.signInWithCredential(credential);
    }
  } catch (error) {
    console.error('Verify OTP Error:', error);
    throw error;
  }
};