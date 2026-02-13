import AsyncStorage from '@react-native-async-storage/async-storage';
import { useSyncExternalStore } from 'react';

export type Post = {
  id: string;
  title: string;
  content: string;
  image?: string;
  userName: string;
};

const STORAGE_KEY = 'EASYBREESY_POSTS';

let posts: Post[] = [];
let listeners: (() => void)[] = [];

function emitChange() {
  listeners.forEach((l) => l());
}

async function savePosts() {
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(posts));
}

async function loadPosts() {
  const data = await AsyncStorage.getItem(STORAGE_KEY);
  posts = data ? JSON.parse(data) : [];
  emitChange();
}

export function addPost(post: Post) {
  posts = [post, ...posts];
  savePosts();
  emitChange();
}

export function usePosts() {
  return useSyncExternalStore(
    (listener) => {
      listeners.push(listener);
      return () => {
        listeners = listeners.filter((l) => l !== listener);
      };
    },
    () => posts
  );
}

// Load saved posts once
loadPosts();
