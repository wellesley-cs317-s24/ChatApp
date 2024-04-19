/**
 * Simple testing of Firestore doc creation and retrieval
 */

import { useState } from "react";
import { Alert, Text, TextInput, View } from 'react-native';
import { auth, db } from '../firebaseInit.js'; // Firebase authentication and Firestore objects
import { useAuthState } from "react-firebase-hooks/auth" // For tracking state of signed in user
import { // for Firestore access (to store messages)
    collection, doc, addDoc, setDoc, getDoc,
    query, where, getDocs
} from "firebase/firestore";
import { RNPButton } from './RNPButton.js'; // Lyn's wrapper for react-native-paper button
import styles from '../styles';

/**
 * PseudoScreen component for  Firestore doc creation and retrieval
 * 
 */
export default function TestFirestore() {

  /**  State variable for username input */
  const [username, setUsername] = useState(''); 
  /**  
   * Elegant way to track signedInUser in any component.
   * signedInUser will be null until a user signs up or signs in. 
   * After a user signs up or signs in, can test: 
   *   + signedInUser?.email: email of user (undefined if signedInUser is null)
   *   + signedInUser?.emailVerified: whether signedInUser is verified (undefined if signedInUser is null)
   */
  const [signedInUser, authLoading, authError] = useAuthState(auth);

  async function addUsernameWithSetDoc() {
    const docRef = doc(db, "users", signedInUser.email);
    const userDoc = {email: signedInUser.email, username: username}; 
    await setDoc(docRef, userDoc); 
    setUsername('');
  }

  async function addUsernameWithAddDoc() {
    const userDoc = {email: signedInUser.email, username: username}; 
    const docRef = await addDoc( collection(db, "users"), userDoc); 
    alert(`document added with ID ${docRef.id}`);
    setUsername('');
  }

  async function getMyUsername() {
    const docRef = doc(db, "users", signedInUser.email);
    const docSnap = await getDoc(docRef);

    if (docSnap.exists()) {
        alert(`Your username is ${docSnap.data().username}.`);
    } else {
        // docSnap.data() will be undefined in this case
        alert("No such document!");
    }
  }

  return (
    <View style={styles.screen}>
      <View style={signedInUser?.emailVerified ? styles.hidden : styles.visible }>
        <Text>No user is logged in yet.</Text>
      </View>
      <View style={signedInUser?.emailVerified ? styles.visible : styles.hidden}>
        <View style={styles.labeledInput}>
           <Text>You are signed in as {signedInUser?.email}</Text>
            <Text style={styles.inputLabel}>Username:</Text>
            <TextInput 
              placeholder="Enter your username" 
              style={styles.textInput} 
              value={username} 
              onChangeText={setUsername}
              // Helpful settings from CS317 F23 final project team TasteBuds:
              autoCorrect={false}
              autoCapitalize="words"
              autoComplete="off"
            /> 
          </View>
          <View style={styles.buttonHolder}>
            <RNPButton 
              title="Add with setDoc" 
              onPress={addUsernameWithSetDoc}
            />
            <RNPButton 
              title="Add with addDoc"
              onPress={addUsernameWithAddDoc}
            />
          </View>
          <View>
            <RNPButton 
              title="Get my usernam"
              onPress={getMyUsername}
            /> 
          </View>
      </View>
    </View>
 );

}
