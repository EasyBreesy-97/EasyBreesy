import {
  addDoc,
  collection,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
} from 'firebase/firestore';
import { auth, db } from '../lib/firebase';
import { deleteDoc, doc } from 'firebase/firestore';

export type CloudPost = {
  id: string;
  title: string;
  content: string;
  image?: string; // optional is correct
  userId: string;  
  userName: string;
};

const postsRef = collection(db, 'posts'); 

/**
 * Listen to posts in real-time
 */
export function listenToPosts(callback: (posts: CloudPost[]) => void) {
  const q = query(postsRef, orderBy('createdAt', 'desc'));

  return onSnapshot(q, (snapshot) => {
    const posts = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...(doc.data() as Omit<CloudPost, 'id'>),
    }));
    callback(posts);
  });
}

/**
 * Create a post safely (NO undefined values sent to Firestore)
 */
export type CreatePostInput = {
  title: string;
  content: string;
  image?: string;
  userName: string;
};

export async function createPost(post: CreatePostInput) {
  if (!auth.currentUser) {
    throw new Error('Not authenticated');
  }  
  const postData: any = {
    title: post.title,
    content: post.content,
    userName: post.userName,
    userId: auth.currentUser.uid, // injected here 
    createdAt: serverTimestamp(),
  };

  // ONLY add image if it exists
  if (post.image) {
    postData.image = post.image;
  }

  await addDoc(postsRef, postData);
}

export async function deletePost(postId: string) {
  await deleteDoc(doc(db, 'posts', postId));
}