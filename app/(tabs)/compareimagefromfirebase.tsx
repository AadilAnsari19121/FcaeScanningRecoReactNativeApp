//yeh he firebase se image ko get karke face scan karna but yeh static he testing purpose

import React, { useEffect, useState } from "react";
import {
  View,
  Image,
  Text,
  StyleSheet,
  Button,
  ActivityIndicator,
  Alert,
} from "react-native";
import { ref, get } from "firebase/database";
import { database } from "@/firebaseConfig"; // Import Firebase config
import * as ImageManipulator from "expo-image-manipulator";
import * as ImagePicker from "expo-image-picker";
import axios from "axios";

const API_KEY = process.env.API_KEY; // Replace with your Face++ API Key
const API_SECRET = process.env.API_SECRET; // Replace with your Face++ API Secret
const API_URL = "https://api-us.faceplusplus.com/facepp/v3/compare"; // Face++ API endpoint

type DisplayImageProps = {
  emiid: string;
};

const DisplayImageFromDatabase = () => {
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [userName, setUserName] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const emiid = "Emp03"; // Employee ID

  const [image1, setImage1] = useState(null);
  const [comparisonResult, setComparisonResult] = useState(null);

  useEffect(() => {
    const fetchUserDetails = async () => {
      const userRef = ref(database, "users/" + emiid);
      try {
        const snapshot = await get(userRef);
        if (snapshot.exists()) {
          const data = snapshot.val();
          setImageUrl(data.photo); // Get the photo URL from Firebase
          setUserName(data.name);
        } else {
          console.log("No user found!");
        }
      } catch (error) {
        console.error("Error fetching user data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchUserDetails();
  }, [emiid]);

  if (loading) {
    return <Text>Loading...</Text>;
  }

  const openCamera = async () => {
    try {
      const permissionResult =
        await ImagePicker.requestCameraPermissionsAsync();
      if (permissionResult.granted === false) {
        Alert.alert(
          "Permission Denied",
          "You've refused to allow this app to access your camera!"
        );
        return;
      }

      const result = await ImagePicker.launchCameraAsync();

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const manipulatedImage = await ImageManipulator.manipulateAsync(
          result.assets[0].uri,
          [{ resize: { width: 720, height: 720 } }],
          { compress: 0.9, format: ImageManipulator.SaveFormat.JPEG }
        );
        setImage1(manipulatedImage.uri);
      } else {
        Alert.alert("No Image Captured", "Please capture an image.");
      }
    } catch (error) {
      Alert.alert("Error", "An error occurred while accessing the camera");
      console.error("Camera Error:", error);
    }
  };

  const compareFaces = async () => {
    if (!image1 || !imageUrl) {
      Alert.alert(
        "Error",
        "Both images (captured and stored) are required for comparison."
      );
      return;
    }

    setLoading(true);

    try {
      // Resize and convert Firebase image to Base64
      const resizedFirebaseImageUri = await resizeImage(imageUrl);
      const base64FirebaseImage = await convertToBase64(
        resizedFirebaseImageUri
      );

      const formData = new FormData();
      formData.append("api_key", API_KEY);
      formData.append("api_secret", API_SECRET);
      formData.append("image_base64_1", await convertToBase64(image1)); // Convert captured image to base64
      formData.append("image_base64_2", base64FirebaseImage); // Send resized Firebase image as base64

      const response = await axios.post(API_URL, formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      const result = response.data;
      if (result.confidence) {
        setComparisonResult(`Confidence: ${result.confidence}`);
      } else {
        setComparisonResult("Comparison failed, no confidence score found.");
      }
    } catch (error) {
      Alert.alert("Error", "An error occurred during the comparison");
      console.error(
        "Comparison Error:",
        error.response ? error.response.data : error
      );
    } finally {
      setLoading(false);
    }
  };

  // Function to resize the image
  const resizeImage = async (uri) => {
    try {
      const manipulatedImage = await ImageManipulator.manipulateAsync(
        uri,
        [{ resize: { width: 720, height: 720 } }],
        { compress: 0.8, format: ImageManipulator.SaveFormat.JPEG }
      );
      return manipulatedImage.uri;
    } catch (error) {
      Alert.alert("Error", "Failed to resize image");
      console.error("Resize Image Error:", error);
      throw error; // Rethrow to handle it in compareFaces
    }
  };

  const convertToBase64 = async (uri) => {
    try {
      const response = await fetch(uri);
      const blob = await response.blob();
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => {
          const base64String = reader.result.split(",")[1];
          resolve(base64String);
        };
        reader.onerror = (error) => {
          console.error("Base64 Conversion Error:", error);
          reject(error);
        };
        reader.readAsDataURL(blob);
      });
    } catch (error) {
      Alert.alert("Error", "Failed to convert image to Base64");
      console.error("Conversion Error:", error);
    }
  };

  return (
    <View style={styles.container}>
      {userName && (
        <Text style={styles.nameText}>{userName}</Text> // Display the name
      )}
      {/* Don't display the image fetched from Firebase */}
      <Text style={styles.text}>Captured Image:</Text>
      {image1 && <Image source={{ uri: image1 }} style={styles.image} />}

      <Button title="Capture Image" onPress={openCamera} />
      {loading && <ActivityIndicator size="large" color="#0000ff" />}
      <Button title="Compare Faces" onPress={compareFaces} disabled={loading} />
      {comparisonResult && (
        <Text style={styles.resultText}>{comparisonResult}</Text>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    justifyContent: "center",
    alignItems: "center",
    marginTop: 20,
  },
  image: {
    width: 250,
    height: 250,
    margin: 10,
    borderRadius: 10,
  },
  nameText: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  resultText: {
    marginTop: 20,
    fontSize: 16,
    color: "#333",
  },
  text: {
    fontSize: 16,
    marginBottom: 10,
  },
});

export default DisplayImageFromDatabase;
