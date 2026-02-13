import {
  getAuth,
  signInAnonymously,
  linkWithCredential,
  EmailAuthProvider,
  onAuthStateChanged,
  User,
} from 'firebase/auth';
import { ensureUserProfile } from './userService';


const auth = getAuth();
let authInitialized = false;

export async function ensureAuth(): Promise<User> {
  if (authInitialized && auth.currentUser) {
    return auth.currentUser;
  }

  authInitialized = true;

  return new Promise<User>((resolve, reject) => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        await ensureUserProfile(user);
        console.log('Auth ready:', user.uid);
        unsubscribe();
        resolve(user);
      } else {
        try {
          const result = await signInAnonymously(auth);
          console.log('Signed in anonymously');
          unsubscribe();
          resolve(result.user);
        } catch (e) {
          reject(e);
        }
      }
    });
  });
}

export async function upgradeToEmail(email: string, password: string) {
  if (!auth.currentUser) throw new Error('No user to upgrade');

  const credential = EmailAuthProvider.credential(email, password);
  await linkWithCredential(auth.currentUser, credential);
}
