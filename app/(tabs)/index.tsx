import { useEffect, useState } from 'react';
import { FlatList, Image, StyleSheet, Text, View } from 'react-native';
import { CloudPost, listenToPosts } from '../../services/postsService';
import { useUser } from '../../store/user';
import { auth } from '../../lib/firebase';
import { deletePost } from '../../services/postsService';
import { Button } from 'react-native';
import { ensureAuth } from '@/services/authService';
import { testFirebaseConnection } from '@/services/firebaseTest';



export default function HomeScreen() {
  const user  = useUser();  
  const [cloudPosts, setCloudPosts] = useState<CloudPost[]>([]);

useEffect(() => {
  let mounted = true;

  async function init() {
    if (!auth.currentUser) return;

    if (mounted) {
      await testFirebaseConnection(auth.currentUser.uid);
    }
  }

  init();

  return () => {
    mounted = false;
  };
}, []);

  useEffect(() => {
    const unsubscribe = listenToPosts(setCloudPosts);
    return unsubscribe;
  }, []);

  return (
    <View style={styles.container}>
      
      {user?.name && (
        <Text style={{ fontSize: 16, marginBottom: 12 }}>
          Welcome {user.name}
        </Text>
    )}

        <FlatList
          data={cloudPosts}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <View style={styles.card}>
              <Text style={styles.user}>{item.userName}</Text>
              <Text style={styles.title}>{item.title}</Text>
              <Text>{item.content}</Text>

              {item.image && (
                <Image source={{ uri: item.image }} style={styles.image} />
              )}
              {/* OWNER ONLY */}
              {item.userId === auth.currentUser?.uid && (
                <Button
                   title="Delete"
                   color="red"
                   onPress={() => deletePost(item.id)}
                />
              )}     
            </View>
          )}
        />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16 },
  header: { fontSize: 24, fontWeight: 'bold', marginBottom: 10 },
  empty: { marginTop: 20, color: '#777' },
  card: {
    backgroundColor: '#f2f2f2',
    padding: 12,
    borderRadius: 8,
    marginBottom: 10,
  },
  user: {
    fontSize: 12,
    color: '#666',
    marginBottom: 4,
  },
  title: { fontWeight: 'bold', marginBottom: 4 },
    image: {
    width: '100%',
    height: 180,
    borderRadius: 8,
    marginTop: 8,
  },

});
