//yeh he data upload to firebase image and emiid and name

import React, { useState } from 'react';
import { View, Text, Button, TextInput, StyleSheet, Image } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { storage, database } from '@/firebaseConfig'; // Import Firebase config
import { getDatabase, ref as dbRef, set } from "firebase/database";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";


const UploadOnFirebase = () => {
  const [emiid, setEmiid] = useState<string>(''); // State for emiid
  const [name, setName] = useState<string>('');   // State for name
  const [image, setImage] = useState<string | null>(null);
  const [uploadURL, setUploadURL] = useState<string | null>(null);

  // Function to capture an image using the camera
  const captureImage = async () => {
    let result = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      aspect: [1, 1],
      quality: 1,
    });

    if (!result.canceled) {
      setImage(result.assets[0].uri);
    }
  };

  // Function to handle the submit action
  const handleSubmit = async () => {
    if (!image || !emiid || !name) {
      alert('Please fill in all fields and capture an image.');
      return;
    }

    try {
      await uploadImageToFirebase(image);
    } catch (error) {
      console.error('Error during submission:', error);
    }
  };

  // Function to upload image to Firebase Storage and get the download URL
  const uploadImageToFirebase = async (imageUri: string) => {
    console.log('Uploading image with URI:', imageUri);
    const fileName = imageUri.substring(imageUri.lastIndexOf('/') + 1);
    console.log('Generated file name:', fileName);

    const storageRef = ref(storage, `images_folder/${fileName}`);
    console.log('Storage reference:', storageRef);

    try {
      // Convert the URI to Blob format
      const response = await fetch(imageUri);
      const blob = await response.blob();
      console.log('Converted blob:', blob);

      // Upload the image to Firebase Storage
      await uploadBytes(storageRef, blob);
      console.log('Upload successful');

      // Get the download URL after successful upload
      const downloadURL = await getDownloadURL(storageRef);
      setUploadURL(downloadURL);
      console.log('File available at:', downloadURL);

      // Save emiid, name, and photo URL to Realtime Database
      await saveUserDetailsToRealtimeDB(emiid, name, downloadURL);
    } catch (error) {
      console.error('Error uploading file:', error);
    }
  };


  // Function to save emiid, name, and photo URL to Realtime Database
  const saveUserDetailsToRealtimeDB = async (emiid: string, name: string, photoURL: string) => {
    const userRef = dbRef(database, 'users/' + emiid); // Path in Realtime Database
    try {
      // Set data under the user's emiid
      await set(userRef, {
        emiid: emiid,
        name: name,
        photo: photoURL,
      });
      console.log('User details saved to Realtime Database!');
      alert('Details uploaded successfully!');
    } catch (error) {
      console.error('Error saving user details:', error);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Capture Image and Save Details</Text>

      <TextInput
        style={styles.input}
        placeholder="Enter emiid"
        value={emiid}
        onChangeText={(text) => setEmiid(text)}
      />

      <TextInput
        style={styles.input}
        placeholder="Enter name"
        value={name}
        onChangeText={(text) => setName(text)}
      />

      <Button title="Capture Image" onPress={captureImage} />

      {image && (
        <Image
          source={{ uri: image }}
          style={styles.image}
        />
      )}

      <Button title="Submit" onPress={handleSubmit} />

      {uploadURL && <Text>Image URL: {uploadURL}</Text>}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  title: {
    fontSize: 20,
    marginBottom: 20,
  },
  input: {
    height: 40,
    borderColor: '#ccc',
    borderWidth: 1,
    borderRadius: 5,
    marginBottom: 10,
    paddingHorizontal: 8,
    width: '100%',
  },
  image: {
    width: 200,
    height: 200,
    marginTop: 10,
  },
});
export default UploadOnFirebase;
