import AsyncStorage from '@react-native-async-storage/async-storage';
import { useSyncExternalStore } from 'react';

export type User = {
  id: string;
  name: string;
};

const STORAGE_KEY = 'EASYBREESY_USER';

let currentUser: User | null = null;
let listeners: (() => void)[] = [];

function emit() {
  listeners.forEach((l) => l());
}

async function saveUser() {
  if (currentUser) {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(currentUser));
  }
}

async function loadUser() {
  const data = await AsyncStorage.getItem(STORAGE_KEY);
  currentUser = data ? JSON.parse(data) : null;
  emit();
}

export function setUser(user: User) {
  currentUser = user;
  saveUser();
  emit();
}

export function useUser() {
  return useSyncExternalStore(
    (listener) => {
      listeners.push(listener);

      // load user ONLY on client
      loadUser();
            
      return () => {
        listeners = listeners.filter((l) => l !== listener);
      };
    },
    () => currentUser
  );
}


