import { Button, Image, View, StyleSheet, Platform } from 'react-native';
import { useEffect, useState } from 'react';

import { HelloWave } from '@/components/HelloWave';
import ParallaxScrollView from '@/components/ParallaxScrollView';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import * as ImagePicker from 'expo-image-picker';
import { storage } from '@/firebaseConfig';
// import SplashScreenNew from '@/app/(tabs)/splashScreen';
// import Home from '@/app/(tabs)/home'
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
// import FaceDet from '@/app/(tabs)/faceDet';
// import FaceDet2 from '@/app/(tabs)/facedet2';
// import UploadOnFirebase from './uploadonfirebase';
// import DisplayImageFromDatabase from './compareimagefromfirebase';
// import FcaeScanningGetName from './facescaning';
import ScanFaceLive from './scaneliveface';

export default function HomeScreen() {
  const [image, setImage] = useState<string | null>(null);
  const [uploadURL, setUploadURL] = useState<string | null>(null);
  const [imageurin, setimageurin] = useState('');


  const pickImage = async () => {
    // No permissions request is necessary for launching the image library
    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.All,
      allowsEditing: true,
      aspect: [4, 3],
      quality: 1,
    });

    console.log(image);

    if (!result.canceled) {
      setImage(result.assets[0].uri);
      setimageurin(result.assets[0].uri);
      uploadImageToFirebase(result.assets[0].uri);
    }
  };


  const uploadImageToFirebase = async (imageUri: string) => {
    const fileName = imageUri.substring(imageUri.lastIndexOf('/') + 1);
    const storageRef = ref(storage, `images_folder/${fileName}`);

    // Convert the URI to Blob format
    const response = await fetch(imageUri);
    const blob = await response.blob();

    try {
      await uploadBytes(storageRef, blob);
      const downloadURL = await getDownloadURL(storageRef);
      setUploadURL(downloadURL);
      console.log('File available at:', downloadURL);
    } catch (error) {
      console.error('Error uploading file:', error);
    }
  };

  const [showsplashscreen, setshowsplashscreen] = useState(true);
  useEffect(() => {
    setInterval(() => {
      setshowsplashscreen(false);
    }, 2000);
  });

  return (
    //   <View style={styles.container}>
    //   <Button title="Pick an image from camera roll" onPress={pickImage} />
    //     {image && <Image source={{ uri: image }} style={styles.image} />}

    //   <Button title="upload to firebase" onPress={()=>uploadImageToFirebase(imageurin)}/>
    // </View>
    <><ScanFaceLive /></>

  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  image: {
    width: 200,
    height: 200,
  },
});
