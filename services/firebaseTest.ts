import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';

export async function testFirebaseConnection(uid: string) {
  try {
    console.log('Firebase test started');

    const docRef = await addDoc(collection(db, 'connection_test'), {
      message: 'EasyBreesy connected',
      uid,
      createdAt: serverTimestamp(),
    });

    console.log('Firebase connected, doc id:', docRef.id);
  } catch (error) {
    console.error('Firebase test failed:', error);
  }
}
