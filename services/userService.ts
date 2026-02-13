import { doc, getDoc, setDoc, serverTimestamp, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { User } from 'firebase/auth';

export async function ensureUserProfile(user: User) {
  const userRef = doc(db, 'users', user.uid);
  const snap = await getDoc(userRef);

  if (!snap.exists()) {
    await setDoc(userRef, {
      uid: user.uid,
      email: user.email ?? null,
      isAnonymous: user.isAnonymous,
      name: null,
      createdAt: serverTimestamp(),
    });

    console.log('User profile created');
  } else {
    console.log('User profile exists');
  }
}

export async function updateUserProfile(
  uid: string,
  data: Partial<{ name: string; email: string }>
) {
  const userRef = doc(db, 'users', uid);
  await updateDoc(userRef, data);
}
