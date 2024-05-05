/**
 * Example of how to do Firebase authentication 
 * (email/password signUp, signIn, and signOut) 
 * in the context of Chat Appp
 */

import { useState } from "react";
import { Alert, Text, TextInput, View } from 'react-native';
import { auth } from '../firebaseInit.js'; // Firebase authentication object
import { // for email/password signup (registration):
         createUserWithEmailAndPassword, sendEmailVerification,
         // for email/password signin
         signInWithEmailAndPassword, 
         // for logging out:
         signOut
  } from "firebase/auth";
import { useAuthState } from "react-firebase-hooks/auth" // For tracking state of signed in user
import { RNPButton } from './RNPButton.js'; // Lyn's wrapper for react-native-paper button
import styles from '../styles';

/**
 * PseudoScreen component for authentication. 
 * 
 * For simplicity, this combines signUp, signIn, and signOut in a single pseudoscreen,
 * but in your final projects you may want separate screens for signUp (registration)
 * and signIn. 
 * 
 * Also, signOut typically requires only a signOut button, not an entire screen. 
 */
export default function SignInOutPScreen( {changePscreen} ) {

  // Default email and password (simplifies testing)
  // const defaultEmail = ... your email here ...
  // const defaultPassword = ... your password here ...
  const defaultEmail = '';
  const defaultPassword = ''

  /**  State variable for email input; provide default email for testing */
  const [email, setEmail] = useState(defaultEmail); 
  /**  State variable for password input; provide default password for testing */
  const [password, setPassword] = useState(defaultPassword); 
  /**  State variable for errors and other feedback displayed in red box */
  const [errorMsg, setErrorMsg] = useState(''); 
  /**  
   * Elegant way to track signedInUser in any component.
   * signedInUser will be null until a user signs up or signs in. 
   * After a user signs up or signs in, can test: 
   *   + signedInUser?.email: email of user (undefined if signedInUser is null)
   *   + signedInUser?.emailVerified: whether signedInUser is verified (undefined if signedInUser is null)
   */
  const [signedInUser, authLoading, authError] = useAuthState(auth);

  /**
   * Wrapper for auth createUserWithEmailAndPassword function that:
   *   1. Checks email and password input for valdity
   *   2. Uses errorMsg to tell user to check for verification email 
   */
  async function signUpUserEmailPassword() {
    // Put any test here for email string validity
    if (!email.includes('@')) {
      setErrorMsg('Not a valid email address');
      return;
    }
    // Put any test here for password string validity
    if (password.length < 6) {
      setErrorMsg('Password too short');
      return;
    }
    try {
      // Invoke Firebase authentication API for email/password sign up 
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user; // could also use auth.currentUser
      console.log(`signUpUserEmailPassword: sign up for email ${user.email} succeeded, but email still needs verification.`);
  
      // Send verification email
      await sendEmailVerification(user);
      console.log('signUpUserEmailPassword: sent verification email');
      setErrorMsg(`A verification email has been sent to ${user.email}. You will not be able to sign in to this account until you click on the verification link in that email.`); 

       // Don't clear email/password inputs, because likely to sign in with them. 
      } catch (error) {
        console.log(`signUpUserEmailPassword: sign up failed for email ${email}`);
        const errorMessage = error.message;
        // const errorCode = error.code; // Could use this, too.
        console.log(`createUserWithEmailAndPassword: ${errorMessage}`);
        setErrorMsg(`signUp: ${errorMessage}`);
      };
    }

  /**
   * Wrapper for auth signInWithEmailAndPassword function that:
   *   1. Verifies that signed in user is verified (and otherwise reminds
   *      them to verify if not)
   *   2. Sets email and password inputs back to defaults 
   *   3. Navigates to chat pScreen if user is verified 
   */
  async function signInUserEmailPassword() {
    try {
      // Invoke Firebase authentication API for email/password sign in
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const user = userCredential.user; // could also use auth.currentUser
      console.log(`signInUserEmailPassword succeeded for user?.email=${user?.email}`);

      // Only log in user if their email is verified
      if (checkEmailVerification(user)) {
        // Clear email/password inputs 
        setEmail(defaultEmail);
        setPassword(defaultPassword);
        changePscreen('chat'); // Go to the Chat PseudoScreen
      }

    } catch (error) {
      console.log(`signInUserEmailPassword failed for email=${email}`);
      const errorMessage = error.message;
      console.log(`signInUserEmailPassword errorMessage=${errorMessage}`);
      setErrorMsg(`signIn: ${errorMessage}`);
    }
  }
  
  /**
   * 
   * @param {*} user 
   * @returns boolean indicating whether user.email is verified 
   * Also sets errorMsg in case where user.email is not verified. 
   */
  function checkEmailVerification(user) {
    if (user.emailVerified) {
      console.log(`${user.email} is verified`);
       setErrorMsg(''); // clear any previous error message
       return true;
    } else {
      console.log(`${user.email} is not verified`);
      // Remind user to verify email
      setErrorMsg(`You cannot sign in as ${user.email} until you verify that this is your email address. You can verify this email address by clicking on the link in a verification email sent by this app to ${user.email}.`)
      return false; 
    }
  }

  /**
   * Logs out current user.
   * @returns undefined
   */
  async function logOut() {
    await signOut(auth);
  }

  /**
   * @returns bool indicating whether SignIn/SignUp buttons should be disabled. 
   */
  function signInUpDisabled() {
    return false; // Can replace this stub; see example below
    // Example of conditions for disabling buttons; change these to suit your situation 
    // return !email.includes('@') || password.length < 4
  }

  return (
    <View style={styles.screen}>
      <View style={signedInUser?.emailVerified ? styles.hidden : styles.signInOutPane}>
        <View style={styles.labeledInput}>
            <Text style={styles.inputLabel}>Email:</Text>
            <TextInput 
              placeholder="Enter your email address" 
              style={styles.textInput} 
              value={email} 
              onChangeText={ 
                text => {
                  setEmail(text);
                  setErrorMsg(''); // Clear any error message
                }
              }
              // Helpful settings from CS317 F23 final project team TasteBuds:
              keyboardType="email-address"
              autoCorrect={false}
              autoCapitalize="none"
              autoComplete="off"
            /> 
          </View>
          <View style={styles.labeledInput}>
            <Text style={styles.inputLabel}>Password:</Text>
            <TextInput 
              placeholder="Enter your password" 
              style={styles.textInput} 
              value={password} 
              onChangeText={ 
                text => {
                  setPassword(text);
                  setErrorMsg(''); // Clear any error message
                }
              }
              // Helpful settings from CS317 F23 final project team TasteBuds:
              keyboardType="email-address"
              autoCorrect={false}
              autoCapitalize="none"
              autoComplete="off"
              />
          </View>
          <View style={styles.buttonHolder}>
            <RNPButton 
              title="Sign In" 
              onPress={signInUserEmailPassword}
              disabled={signInUpDisabled()}
            />
            <RNPButton 
              title="Sign Up" 
              onPress={signUpUserEmailPassword}
              disabled={signInUpDisabled()}
            />
          </View>
          <View style={errorMsg === '' ? styles.hidden : styles.errorBox}>
            <Text style={styles.errorMessage}>{errorMsg}</Text>
          </View>
      </View>
      <View style={signedInUser?.emailVerified ? styles.signInOutPane : styles.hidden }>
        <Text>You are signed in as {signedInUser?.email}</Text>
        <RNPButton title="Sign Out" onPress={logOut}/>
      </View>
    </View>
 );

}
