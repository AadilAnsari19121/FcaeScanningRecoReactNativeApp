//yeh he button click par scan karna face ko and name dikhana 
//problem yeh ke yeh sab images ko pahle check karta he jisse bahut time lagega

import React, { useEffect, useState } from 'react';
import { View, Text, Button, Image, StyleSheet, Alert, ActivityIndicator } from 'react-native';
import { getDatabase, ref, get } from 'firebase/database';
import { database } from '@/firebaseConfig'; // Import your Firebase config
import * as ImageManipulator from 'expo-image-manipulator';
import * as ImagePicker from 'expo-image-picker';
import axios from 'axios';

const API_KEY = process.env.API_KEY; // Replace with your Face++ API Key
const API_SECRET = process.env.API_SECRET; // Replace with your Face++ API Secret
const API_URL = "https://api-us.faceplusplus.com/facepp/v3/compare"; // Face++ API endpoint

const CompareFacesApp = () => {
    const [image1, setImage1] = useState(null);
    const [loading, setLoading] = useState(false);
    const [userName, setUserName] = useState(null);

    // Function to capture an image
    const openCamera = async () => {
        try {
            const permissionResult = await ImagePicker.requestCameraPermissionsAsync();
            if (permissionResult.granted === false) {
                Alert.alert("Permission Denied", "You've refused to allow this app to access your camera!");
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

    // Function to fetch all user images from Firebase and compare
    const compareWithAllUsers = async () => {
        if (!image1) {
            Alert.alert("Error", "Please capture an image first.");
            return;
        }

        setLoading(true);
        try {
            const usersRef = ref(database, 'users/');
            const snapshot = await get(usersRef);
            if (!snapshot.exists()) {
                Alert.alert("Error", "No users found in the database.");
                setLoading(false);
                return;
            }

            const usersData = snapshot.val();
            let highestConfidence = 0;
            let matchedUser = null;

            for (const userId in usersData) {
                const user = usersData[userId];
                if (user.photo) {
                    const resizedFirebaseImageUri = await resizeImage(user.photo);
                    const base64FirebaseImage = await convertToBase64(resizedFirebaseImageUri);

                    const formData = new FormData();
                    formData.append("api_key", API_KEY);
                    formData.append("api_secret", API_SECRET);
                    formData.append("image_base64_1", await convertToBase64(image1));
                    formData.append("image_base64_2", base64FirebaseImage);

                    const response = await axios.post(API_URL, formData, {
                        headers: { "Content-Type": "multipart/form-data" },
                    });

                    const result = response.data;
                    if (result.confidence) {
                        console.log(`Confidence with ${user.name}: ${result.confidence}`);
                    }

                    if (result.confidence && result.confidence > highestConfidence && result.confidence >= 90) {
                        highestConfidence = result.confidence;
                        matchedUser = user;
                    }
                }
            }

            if (matchedUser) {
                setUserName(matchedUser.name);
                Alert.alert("Match Found", `User: ${matchedUser.name}, Confidence: ${highestConfidence}`);
            } else {
                Alert.alert("No Match", "No user matched with a confidence score of 90 or higher.");
            }
        } catch (error) {
            Alert.alert("Error", "An error occurred during the comparison");
            console.error("Comparison Error:", error.response ? error.response.data : error);
        } finally {
            setLoading(false);
        }
    };

    // Function to resize image
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
            throw error;
        }
    };

    // Function to convert image URI to base64
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
            <Button title="Capture Image" onPress={openCamera} />
            {loading && <ActivityIndicator size="large" color="#0000ff" />}
            {image1 && <Image source={{ uri: image1 }} style={styles.image} />}
            <Button title="Compare Faces" onPress={compareWithAllUsers} disabled={loading} />
            {userName && <Text style={styles.resultText}>Matched User: {userName}</Text>}
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        justifyContent: 'center',
        alignItems: 'center',
        marginTop: 20,
    },
    image: {
        width: 250,
        height: 250,
        margin: 10,
        borderRadius: 10,
    },
    resultText: {
        marginTop: 20,
        fontSize: 16,
        color: "#333",
    },
});

export default CompareFacesApp;
