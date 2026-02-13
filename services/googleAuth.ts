import * as WebBrowser from 'expo-web-browser';
import * as Google from 'expo-auth-session/providers/google';
import { GoogleAuthProvider, linkWithCredential, signInWithCredential } from 'firebase/auth';
import { auth } from '@/lib/firebase';

WebBrowser.maybeCompleteAuthSession();

export function useGoogleAuth() {
  const [request, response, promptAsync] = Google.useAuthRequest({
    clientId: '1:986711830893:web:b29d499f672c0eba792a64',
  });

  async function handleGoogleLogin() {
    const result = await promptAsync();

    if (result.type !== 'success') return;

    const { id_token } = result.params;

    const credential = GoogleAuthProvider.credential(id_token);

    if (auth.currentUser?.isAnonymous) {
      // LINK anonymous → Google
      await linkWithCredential(auth.currentUser, credential);
    } else {
      await signInWithCredential(auth, credential);
    }
  }

  return { handleGoogleLogin };
}
