import { 
  PhoneAuthProvider, 
  signInWithCredential, 
  linkWithCredential 
} from 'firebase/auth';
import { auth } from '@/lib/firebase';

export async function sendOTP(
  phone: string
) {
  const provider = new PhoneAuthProvider(auth);
  
  // For React Native, Firebase handles reCAPTCHA automatically
  const verificationId = await provider.verifyPhoneNumber(
    phone,
    null as any // Let Firebase handle reCAPTCHA automatically
  );

  return verificationId;
}

export async function verifyOTP(
  verificationId: string,
  code: string
) {
  const credential = PhoneAuthProvider.credential(verificationId, code);

  if (auth.currentUser?.isAnonymous) {
    // Upgrade anonymous user
    return await linkWithCredential(auth.currentUser, credential);
  } else {
    // Sign in with phone credential
    return await signInWithCredential(auth, credential);
  }
}