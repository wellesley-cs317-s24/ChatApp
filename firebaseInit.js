import { initializeApp } from "firebase/app";
// access to Firebase authentication features
import { getReactNativePersistence, initializeAuth, getAuth } from "firebase/auth";
// access to Firebase Firestore (for storing JSON-like documents)
import { getFirestore } from "firebase/firestore";
// access to Firebase storage features (for files like images, video, etc.)
import { getStorage } from "firebase/storage";
// firebaseConfig is credentials for Firebase project
import { firebaseConfig } from "./firebaseConfig.js"
// AsyncStorage is for persistent storage used by Firebase
import AsyncStorage from '@react-native-async-storage/async-storage'; 

// Create a firebase app that's used for authenticaion and storage
const firebaseApp = initializeApp(firebaseConfig);

export const auth = initializeAuth(firebaseApp, {
  persistence: getReactNativePersistence(AsyncStorage)
});

export const db = getFirestore(firebaseApp);

export const storage = getStorage(firebaseApp, firebaseConfig.storageBucket);



