import { useState, useEffect } from 'react';
import { Text, View, SafeAreaView } from 'react-native';
import { SegmentedButtons } from 'react-native-paper';
import SignInOutPScreen from './components/SignInOutPScreen';
import ChatViewPScreen from './components/ChatViewPScreen';
import ComposeMessagePScreen from './components/ComposeMessagePScreen';
import { auth, db, storage } from './firebaseInit.js'; // Firebase authentication and storage objects
import { useAuthState } from "react-firebase-hooks/auth" // For tracking state of signed in user
// for Firestore access (to store messages)
import { doc, setDoc } from "firebase/firestore";
// for Firebase storage access (to store images)
import { ref, uploadBytesResumable, getDownloadURL } from "firebase/storage";
import { testMessages } from './fakeData';

import styles from './styles';

export default function App() {

  /** Fixed list of channels */
  const channels = ['Arts', 'Crafts', 'Food', 'Gatherings', 'Outdoors']; 
  
  /** Current pseudoScreen to display */
  const [pscreen, setPscreen] = useState("login");

  /** Currently selected channel */
  const [selectedChannel, setSelectedChannel] = useState('Food');

  /** Messages for currently selected channel */
  const [selectedMessages, setSelectedMessages] = useState([]);

  /** Fake message database (just a list of messages) for local testing */
  const [localMessageDB, setLocalMessageDB] = useState(testMessages.map( addTimestamp ));

  /** Whether or not Firebase is being used (if not, use fake local message database) */
  const [usingFirestore, setUsingFirestore] = useState(true); // If false, only using local data.

  /** Last message posted to Firestore  */
  const [lastFirestoreMesssagePosted, setLastFirestoreMesssagePosted] = useState(null); 

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

  /**
   * Add a millisecond timestamp to a message
   */
  function addTimestamp(message) {
    // Add millisecond timestamp field to message 
    return {...message, timestamp:message.date.getTime()}
  }  

  /**
   * Toggle between using localDB (for testing) and Firestore
   */
  function toggleStorageMode() {
    setUsingFirestore(prevBool => !prevBool);
    // Note that in ChatViewPScreen getMessagesForChannel(selectedChannel) is re-executed 
    // by above useEffect when usingFirestore changes. 
  }

  /**
   * @param {string} msg 
   * 
   * Post a new messages
   */
  async function postMessage(msg) {

    msg.channel = selectedChannel; // Add current channel as field in mesage

    // Want to see new message immediately in selectecMessages, no matter what,
    // independent of local vs Firebase mode. 
    setSelectedMessages([...selectedMessages, msg]) 

    if (! usingFirestore) {
      setLocalMessageDB([...localMessageDB, msg]);
    } else {
      try {
        if (msg.imageUri === undefined) {
          // Posting message without and image easy.
          await firebasePostMessage(msg);
        } else {
          // Posting message with image is more complicated,
          // have a separate helper function for this
          await firebasePostMessageWithImage(msg)
        }
      } catch (error) {
        const errorMessage = error.message;
        console.log(`error when posting message ${errorMessage}`);
        alert(`error when posting message ${errorMessage}`);
      };
    }
  }

  /**
   * Post a message to Firebase's Firestore by adding a new document
   * for the message in the "messages" collection. It is expected that 
   * msg is a JavaScript object with fields timestamp, date, author, 
   * channel, and content, and an optional imageUri field 
   * (which, if it exists, should be the downloadURL for an image
   * stored in Firebase's storage)
   */ 
  async function firebasePostMessage(msg) {
    // Convert millisecond timestamp to string 
    // (Firestore document keys need to be strings)
    const timestampString = msg.timestamp.toString(); 
    
    // Don't want to store date field in firestore, 
    // so make a copy of message and delete the date field. 
    const docMessage = {...msg} // copy the message
    if (Object.keys(docMessage).includes('date')) {
      delete docMessage.date; // delete the date field
    }
    console.log(`firebasePostMessage ${JSON.stringify(docMessage)}`);
    await setDoc(
        // First argument to setDoc is a doc object 
        doc(db, "messages", timestampString), 
        docMessage);
    // Remember last message posted as a way to force getting messages fromFirestore
    console.log('In firebasePostMessage, setLastFirestoreMesssagePost', docMessage)
    setLastFirestoreMesssagePosted(docMessage); 
  }

  /**
   * Post a message with an image. This is more complicated than
   * posting a message without an image, because with an image we need to:
   * (1) store the image in Firebase storage (different than Firestore)
   * (2) get the downloadURL for the image in Firebase storage
   * (3) add the downloadURL as the imageUri for the msg
   * (4) post the msg-with-imageUri to Firestore. 
   */ 
  async function firebasePostMessageWithImage(msg) {
    // First: create a so-called storageRef, an abstraction location 
    // in Firebase's storages (different from Firestore!) where the
    // bits of the image will be stored. 
    const timestamp = msg.timestamp;
    const storageRef = ref(storage, `chatImages/${timestamp}`);

    // Second: turn a local image from an image picker into 
    // a so-called Blob that can be uploaded to Firebase storage. 
    const localImageUri = msg.imageUri;
    // Lyn learned the next critical two lines of code from 
    // Bianca Pio and Avery Kim's Goose app: 
    const fetchResponse = await fetch(localImageUri);
    const imageBlob = await fetchResponse.blob();

    // Third: upload the image blob to Firebase storage.
    // uploadBytesResumable returns a Promise (here called uploadTask)
    // that receives state changes about upload progress that are here 
    // displayed in the console, but could be displayed in the app itself. 
    const uploadTask = uploadBytesResumable(storageRef, imageBlob);
    console.log(`Uploading image for message with timestamp ${timestamp} ...`);
    uploadTask.on('state_changed',
      // This callback is called with a snapshot on every progress update
      (snapshot) => {
        // Get task progress, including the number of bytes uploaded 
        // and the total number of bytes to be uploaded
        const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
        console.log('Upload is ' + progress + '% done');
        switch (snapshot.state) {
          case 'paused':
            console.log('Upload is paused');
            break;
          case 'running':
            console.log('Upload is running');
            break;
            }
      }, 
      // This callback is called when there's an error in the upload
      (error) => {
        console.error(error);
      }, 
      // This callback is called when the upload is finished 
      async function() {
        console.log(`Uploading image for message with timestamp ${timestamp} succeeded!`);
        // Once the upload is finished, get the downloadURL for the uploaed image
        const downloadURL = await getDownloadURL(storageRef);
        console.log(`Image fileMessage for message with timestamp ${timestamp} available at ${downloadURL}`);

        // change msg.imageUri to be global downloadURL before storing in Firebase
        msg.imageUri = downloadURL

        // Store (in Firestore) the message with the downloadURL as imageUri
        await firebasePostMessage(msg);
      }      
    ); // end arguments to uploadTask.on
  }

  return (
    <SafeAreaView style={styles.container}>
      { pscreen === "login" &&
        <SignInOutPScreen changePscreen={changePscreen}/>
      }
      { pscreen === "chat" &&
        <ChatViewPScreen 
          changePscreen={changePscreen}
          channels={channels}
          selectedChannel={selectedChannel}
          setSelectedChannel={setSelectedChannel}
          selectedMessages={selectedMessages}
          setSelectedMessages={setSelectedMessages}
          usingFirestore={usingFirestore}
          toggleStorageMode={toggleStorageMode}
          localMessageDB={localMessageDB}
          lastFirestoreMesssagePosted={lastFirestoreMesssagePosted}
        />
      }
      { pscreen === "compose" &&
        <ComposeMessagePScreen 
          changePscreen={changePscreen}
          postMessage={postMessage}
        />
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
            // Don't have option for compose ... 
          ]}
        />
      </View>

    </SafeAreaView>
  );
}
