// firebaseConfig holds credentials for Firebase project
import { firebaseConfig } from "./firebaseConfig.js"

/**
 * Create a Firebass app named `firebaseApp` that's necessary to access 
 * all firebase features
 */
import { initializeApp } from "firebase/app";
const firebaseApp = initializeApp(firebaseConfig);

// AsyncStorage is for persistent storage used by Firebase features
import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * Initialize Firebase authentication features, 
 * which are accessed through the `auth` object:
 */
import { getReactNativePersistence, initializeAuth, getAuth } from "firebase/auth";

// This means of creating `auth` will remember signed in users across
// different launches of the app by using persistent storage. 
export const auth = initializeAuth(firebaseApp, {
  persistence: getReactNativePersistence(AsyncStorage)
});

/**
 * Initialize Firestore, which is accessed through the `db` object.
 * Firestore is used to store data that is organized into collections of
 * JSON-like documents.
 */
import { getFirestore } from "firebase/firestore";
export const db = getFirestore(firebaseApp);

/**
 * Initialize Firebase Storage, which is accessed through the `storage` object.
 * Firebase Storage is used to store large files like images, videos, and audio files. 
 */
import { getStorage } from "firebase/storage";
export const storage = getStorage(firebaseApp, firebaseConfig.storageBucket);



