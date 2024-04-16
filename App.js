import { useState, useEffect } from 'react';
import { Text, View, SafeAreaView } from 'react-native';
import { SegmentedButtons } from 'react-native-paper';
import SignInOutPScreen from './components/SignInOutPScreen';
import ChatViewPScreen from './components/ChatViewPScreen';
import { auth } from './firebaseInit.js'; // Firebase authentication object
import { useAuthState } from "react-firebase-hooks/auth" // For tracking state of signed in user
import styles from './styles';

export default function App() {

  /** Determined current pseudoScreen */
  const [pscreen, setPscreen] = useState("login");
  /**  
   * Elegant way to track signedInUser in any component.
   * signedInUser will be null until a user signs up or signs in. 
   * After a user signs up or signs in, can test: 
   *   + signedInUser?.email: email of user (undefined if signedInUser is null)
   *   + signedInUser?.verified: whether signedInUser is verified (undefined if signedInUser is null)
   */
  const [signedInUser, authLoading, authError] = useAuthState(auth);

  /**
   * useEffect is a hook for running code when either 
   *   1. The component is entered (created) or exited (destroyed)
   *   2. One of the state variables in the list of dependencies changes. 
   */
  useEffect(() => {
    // Executed when entering component
    console.log('Entering App component');
    if (signedInUser?.emailVerified) {
      console.log('User already signed in on App launch, so start in chat screen'); 
      changePscreen('chat');
    }

    return () => {
      // Executed when exiting component
      console.log('Exiting App component');
     }
   }, 
   // This is dependency list of state variables for effect
   [signedInUser, authLoading, authError]
  );

  function changePscreen(pscreenName) {
    console.log('changing pscreen to', pscreenName);
    setPscreen(pscreenName);
  }

  return (
    <SafeAreaView style={styles.container}>
      { pscreen === "login" &&
        <SignInOutPScreen changePscreen={changePscreen}/>
      }
      { pscreen === "chat" &&
        <ChatViewPScreen/>
     }
      <View style={{width: '100%'}}>
      <SegmentedButtons
        style={styles.pscreenButtons}
        value={pscreen}
        onValueChange={changePscreen}
        buttons={[
          {
            value: 'login',
            label: 'Login',
          },
          {
            value: 'chat',
            label: 'Chat',
          },
        ]}
      />
      </View>

    </SafeAreaView>
  );
}
