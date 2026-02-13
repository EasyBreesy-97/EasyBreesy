import { initializeApp } from 'firebase/app';
import { 
  initializeAuth, 
  getReactNativePersistence
} from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import ReactNativeAsyncStorage from '@react-native-async-storage/async-storage';

export const firebaseConfig = {
  apiKey: 'AIzaSyAkCy9ftH-yQs0M68ZUrrr-Ao6kgy803VQ',
  authDomain: 'easybreesy-app-e917c.firebaseapp.com',
  projectId: 'lifeeasy-app-e917c',
  storageBucket: 'easybreesy-app-e917c.firebasestorage.app',
  messagingSenderId: '986711830893',
  appId: '1:986711830893:web:b29d499f672c0eba792a64',
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Auth with AsyncStorage for React Native
export const auth = initializeAuth(app, {
  persistence: getReactNativePersistence(ReactNativeAsyncStorage)
});

export const db = getFirestore(app);
export { app };