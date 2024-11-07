//yeh he live scan karne ke liye without button click 

import React, { useEffect, useState, useRef } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, Alert } from 'react-native';
import { Camera } from 'expo-camera'; // Ensure Camera is being imported correctly
import * as ImageManipulator from 'expo-image-manipulator';
import axios from 'axios';
import { getDatabase, ref, get } from 'firebase/database';
import { database } from '@/firebaseConfig'; // Your Firebase config

const API_KEY = process.env.API_KEY; // Replace with your Face++ API Key
const API_SECRET = process.env.API_SECRET; // Replace with your Face++ API Secret
const API_URL = "https://api-us.faceplusplus.com/facepp/v3/compare"; // Face++ API endpoint

const ScanFaceLive = () => {
    const [hasPermission, setHasPermission] = useState(null);
    const [loading, setLoading] = useState(false);
    const [userName, setUserName] = useState(null);
    const cameraRef = useRef(null);

    useEffect(() => {
        (async () => {
            const { status } = await Camera.requestCameraPermissionsAsync();
            setHasPermission(status === 'granted');
        })();
    }, []);

    const handleFacesDetected = async ({ faces }) => {
        if (faces.length === 0 || loading) return; // Only proceed if a face is detected and not already loading

        setLoading(true);

        try {
            if (cameraRef.current) {
                // Take a picture when a face is detected
                const photo = await cameraRef.current.takePictureAsync();

                // Resize the image
                const manipulatedImage = await ImageManipulator.manipulateAsync(
                    photo.uri,
                    [{ resize: { width: 720, height: 720 } }],
                    { compress: 0.9, format: ImageManipulator.SaveFormat.JPEG }
                );

                // Start comparing with all users
                await compareWithAllUsers(manipulatedImage.uri);
            }
        } catch (error) {
            Alert.alert("Error", "An error occurred while capturing and comparing the image.");
            console.error("Face Detection Error:", error);
        } finally {
            setLoading(false);
        }
    };

    const compareWithAllUsers = async (imageUri) => {
        const usersRef = ref(database, 'users/');
        const snapshot = await get(usersRef);
        if (!snapshot.exists()) {
            Alert.alert("Error", "No users found in the database.");
            return;
        }

        const usersData = snapshot.val();
        let highestConfidence = 0;
        let matchedUser = null;

        for (const userId in usersData) {
            const user = usersData[userId];
            if (user.photo) {
                const formData = new FormData();
                formData.append("api_key", API_KEY);
                formData.append("api_secret", API_SECRET);
                formData.append("image_base64_1", await convertToBase64(imageUri));
                formData.append("image_base64_2", user.photo); // Assuming user.photo is in base64

                const response = await axios.post(API_URL, formData, {
                    headers: { "Content-Type": "multipart/form-data" },
                });

                const result = response.data;
                console.log(`Confidence with ${user.name}: ${result.confidence}`);

                if (result.confidence > highestConfidence && result.confidence >= 90) {
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
    };

    const convertToBase64 = async (uri) => {
        try {
            const response = await fetch(uri);
            const blob = await response.blob();
            return new Promise((resolve, reject) => {
                const reader = new FileReader();
                reader.onloadend = () => resolve(reader.result.split(",")[1]);
                reader.onerror = (error) => reject(error);
                reader.readAsDataURL(blob);
            });
        } catch (error) {
            Alert.alert("Error", "Failed to convert image to Base64");
            console.error("Base64 Conversion Error:", error);
        }
    };

    if (hasPermission === null) {
        return <View><Text>Requesting camera permission...</Text></View>;
    }
    if (hasPermission === false) {
        return <View><Text>No access to camera</Text></View>;
    }

    return (
        <View style={styles.container}>
            <Camera
                style={styles.camera}
                type={Camera.Constants.Type.front}
                ref={cameraRef}
                onFacesDetected={handleFacesDetected}
                faceDetectorSettings={{
                    mode: Camera.Constants.FaceDetection.Mode.fast,
                    detectLandmarks: Camera.Constants.FaceDetection.Landmarks.all,
                    runClassifications: Camera.Constants.FaceDetection.Classifications.all,
                }}
            />
            {loading && <ActivityIndicator size="large" color="#0000ff" />}
            {userName && <Text style={styles.resultText}>Matched User: {userName}</Text>}
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    camera: {
        width: '100%',
        height: '80%',
    },
    resultText: {
        marginTop: 20,
        fontSize: 16,
        color: "#333",
    },
});

export default ScanFaceLive;
