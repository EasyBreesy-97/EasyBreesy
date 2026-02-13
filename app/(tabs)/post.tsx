import * as ImagePicker from 'expo-image-picker';
import { router } from 'expo-router';
import { useState } from 'react';
import { Button, Image, StyleSheet, Text, TextInput, View } from 'react-native';
import { createPost } from '../../services/postsService';
import { useUser } from '../../store/user';

async function uploadToCloudinary(localUri: string): Promise<string> {
  const data = new FormData();

  data.append('file', {
    uri: localUri,
    type: 'image/jpeg',
    name: 'upload.jpg',
  } as any);

  data.append('upload_preset', 'easybreesy_unsigned');
  data.append('cloud_name', 'ddywhzfmk');

  const res = await fetch(
    'https://api.cloudinary.com/v1_1/ddywhzfmk/image/upload',
    {
      method: 'POST',
      body: data,
    }
  );

  const json = await res.json();

  if (!json.secure_url) {
    throw new Error('Image upload failed');
  }

  return json.secure_url;
}

export default function PostScreen() {
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [image, setImage] = useState<string | undefined>();

  const user = useUser();
  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: 
        ImagePicker.MediaTypeOptions.All,
      
      allowsEditing: true,
      quality: 0.8,
    });

    if (!result.canceled) {
      console.log(result.assets[0].uri);
    }
  };


const handlePost = async () => {
  if (!title || !content) return;

  let imageUrl: string | undefined;

  // Upload image if selected
  if (image) {
    imageUrl = await uploadToCloudinary(image); // FIXED
  }

  await createPost({
    title,
    content,
    image: imageUrl, // URL ONLY
    userName: user?.name || 'Anonymous',
  });

  setTitle('');
  setContent('');
  setImage(undefined);
  router.push('/');
};

  return (
    <View style={styles.container}>
      <Text style={styles.header}>Create Lifestyle Post </Text>

      <TextInput
        placeholder="Title"
        style={styles.input}
        value={title}
        onChangeText={setTitle}
      />

      <TextInput
        placeholder="What's your lifestyle tip?"
        style={[styles.input, styles.textarea]}
        value={content}
        multiline
        onChangeText={setContent}
      />

      <Button title="Pick Image" onPress={pickImage} />

      {image && (
        <Image source={{ uri: image }} style={styles.preview} />
      )}

      <Button title="Post" onPress={handlePost} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16 },
  header: { fontSize: 22, fontWeight: 'bold', marginBottom: 12 },
  input: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 6,
    padding: 10,
    marginBottom: 10,
  },
  textarea: { height: 100 },
  preview: {
    width: '100%',
    height: 200,
    marginVertical: 10,
    borderRadius: 8,
  },
});
