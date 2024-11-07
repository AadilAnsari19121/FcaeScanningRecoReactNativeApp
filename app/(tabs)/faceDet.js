import React, { useState } from "react";
import { View, Button, Image, StyleSheet, Alert, ActivityIndicator, Text } from "react-native";
import * as ImagePicker from "expo-image-picker";
import * as ImageManipulator from "expo-image-manipulator";
import axios from "axios";

const API_KEY = process.env.API_KEY; // Replace with your Face++ API Key
const API_SECRET = process.env.API_SECRET; // Replace with your Face++ API Secret
const API_URL = "https://api-us.faceplusplus.com/facepp/v3/compare";

const FaceDet2 = () => {
    const [image1, setImage1] = useState(null);
    const [image2, setImage2] = useState(null);
    const [loading, setLoading] = useState(false);
    const [comparisonResult, setComparisonResult] = useState(null);

    const openCamera = async (setImage) => {
        try {
            const permissionResult = await ImagePicker.requestCameraPermissionsAsync();
            if (!permissionResult.granted) {
                Alert.alert("Permission Denied", "You've refused to allow this app to access your camera!");
                return;
            }

            const result = await ImagePicker.launchCameraAsync();
            if (!result.canceled) {
                // Resize and compress the image
                const manipulatedImage = await ImageManipulator.manipulateAsync(
                    result.assets[0].uri,
                    [{ resize: { width: 1024, height: 1024 } }],
                    { compress: 0.5, format: ImageManipulator.CompressionFormat.JPEG }
                );
                setImage(manipulatedImage.uri);
            }
        } catch (error) {
            Alert.alert("Error", "An error occurred while accessing the camera");
            console.error("Camera Error:", error);
        }
    };

    const captureTwoImages = async () => {
        setLoading(true);
        try {
            await openCamera(setImage1);
            await openCamera(setImage2);
        } catch (error) {
            Alert.alert("Error", "An error occurred while capturing images");
            console.error("Capture Error:", error);
        } finally {
            setLoading(false);
        }
    };

    const compareFaces = async () => {
        if (!image1 || !image2) {
            Alert.alert("Error", "Please capture both images before comparing");
            return;
        }

        setLoading(true);

        try {
            const base64Image1 = await convertToBase64(image1);
            const base64Image2 = await convertToBase64(image2);

            console.log("Base64 Image 1 Length:", base64Image1.length);
            console.log("Base64 Image 2 Length:", base64Image2.length);

            const formData = new FormData();
            formData.append("api_key", API_KEY);
            formData.append("api_secret", API_SECRET);
            formData.append("image_base64_1", base64Image1);
            formData.append("image_base64_2", base64Image2);

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
            console.error("Comparison Error:", error.response ? error.response.data : error);
        } finally {
            setLoading(false);
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
            <Button title="Capture Two Images" onPress={captureTwoImages} />
            {loading && <ActivityIndicator size="large" color="#0000ff" />}
            {image1 && <Image source={{ uri: image1 }} style={styles.image} />}
            {image2 && <Image source={{ uri: image2 }} style={styles.image} />}
            <Button title="Compare Faces" onPress={compareFaces} disabled={loading} />
            {comparisonResult && <Text style={styles.resultText}>{comparisonResult}</Text>}
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        alignItems: "center",
        justifyContent: "center",
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

export default FaceDet2;