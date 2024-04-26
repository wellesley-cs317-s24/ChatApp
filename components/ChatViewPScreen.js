import { useEffect } from "react";
import { FlatList, Image, StyleSheet,  Text, View } from 'react-native';
import {Picker} from '@react-native-picker/picker';
import { RNPButton } from './RNPButton.js'; // Lyn's wrapper for react-native-paper button
import { auth, db, storage } from '../firebaseInit.js'; // Firebase authentication and storage objects
import { useAuthState } from "react-firebase-hooks/auth" // For tracking state of signed in user
// for Firestore access (to store messages)
import { collection, doc, setDoc, query, where, getDocs } from "firebase/firestore";
// for Firebase storage access (to store images)
import { ref,  deleteObject } from "firebase/storage";
import * as utils from '../utils';
import globalStyles from '../styles';
import { testMessages } from '../fakeData';

export default function ChatViewPScreen( 
  {changePscreen, 
   channels, selectedChannel, setSelectedChannel,
   selectedMessages, setSelectedMessages, 
   usingFirestore, toggleStorageMode, localMessageDB,
   lastFirestoreMesssagePosted
  } ) {

  /**  
   * Elegant way to track signedInUser in any component.
   * signedInUser will be null until a user signs up or signs in. 
   * After a user signs up or signs in, can test: 
   *   + signedInUser?.email: email of user (undefined if signedInUser is null)
   *   + signedInUser?.verified: whether signedInUser is verified (undefined if signedInUser is null)
   */
  const [signedInUser, authLoading, authError] = useAuthState(auth);

  /***************************************************************************
   CHAT CHANNEL/MESSAGE CODE
   ***************************************************************************/

   /**
   * useEffect is a hook for running code when either 
   *   1. The component is entered (created) or exited (destroyed)
   *   2. One of the state variables in the list of dependencies changes.
   * 
   * This code gets messages for current channel when entering ChatViewPScreen.
   * This is *not* the best way to get messages, since it can lead to 
   * Firestore quota exceeded errors! We will see later how do use
   * onSnapshot to avoid this issue. 
   */

  // Update messages when selectedChannel, localMessageDB, or usingFirestore changes
  useEffect(
    () => { 
      console.log('Entering ChatViewPScreen');
      async function fetchMessages () {
      // Executed when entering component
        const messages = await getMessagesForChannel(selectedChannel);
        const lastMessage = messages[messages.length-1].content;
        console.log('most recent messages content is:', content);
      }
      fetchMessages();
      return () => {
        // Executed when exiting component
        console.log('Exiting ChatViewPScreen');
      }
    },
    // If any of the following dependencies changes, execute effect again
    [selectedChannel, localMessageDB, usingFirestore, lastFirestoreMesssagePosted, signedInUser]
  ); 

  /**
   * Button for displaying debugging information within app itself. 
   * The button is displayed only if visible property is true. 
   */ 
  function DebugButton( {visible} ) {
    if (visible) {
      return (
        <RNPButton
          title='Debug'
          onPress={debug}
        />
      ); 
    } else {
      return false; // No component will be rendered
    }
  }      

  /**
   * Action for the Debug button. 
   * Displays information about channels and messages. 
   * This is just an example of displaying debugging information; 
   * adapt it to your purposes.
   */ 
  async function debug() {
    const debugObj = {
      channels: channels, 
      selectedChannel: selectedChannel, 
      selectedMessages: selectedMessages, 
    }
    alert("Below are values of relevant variables."
          + " You can remove this button by changing the value of"
          + " displayDebugButton from true to false near the top of"
          + " components/ChatViewScreen.js.\n"
          + utils.formatJSON(debugObj)); 
  }

  async function deleteStorageFile(filename) {
    console.log(`Deleting storage file ${filename} ... `)
    // Create a reference to the file to delete
    const desertRef = ref(storage, filename);

    // Delete the file
    try {
      await deleteObject(desertRef)
      console.log(` ... deletion succeeeded`);
    } catch(error) {
      console.log(` ... deletion failed due to error ${error}`); 
    }
  }

  /**
   * Button for toggling between localDB and Firebase storage 
   * The button is displayed only if the argument is true
   */ 
  function ToggleStorageButton( {visible} ) {
    if (visible) {
      return (
        <RNPButton
          title={usingFirestore ? 
            'Using Firestore; Click for localDB' :
            'Using localDB; Click for Firestore'}
          onPress={toggleStorageMode}
        />
      ); 
    } else {
      return false; // No component will be rendered
    }
  }   



  /**
   * Button for populating Firestore with a list of fake chat messages. 
   * The button is displayed only if displayPopulateButton is true
   */ 
  function PopulateButton( {visible} ) {
    if (visible) {
      return (
        <RNPButton
          title="Populate Firestore"
          onPress={() => populateFirestoreDB(testMessages)}
        />
      ); 
    } else {
      return false; // No component will be rendered
    }
  }     

  /**
   * Populate Firestore with some initial test messages. 
   * Should only call this *once*, *not* every time the app runs. 
   * This is the action of the Populate button, which is only displayed
   * if displayPopulateButton is true. 
   * This is just an example of populating Firestore with fake data;
   * adapt it to your purposes.
   */ 
   async function populateFirestoreDB(messages) {

    // Returns a promise to add message to firestore
    async function addMessageToDB(message) {
      const timestamp = message.date.getTime(); // millsecond timestamp
      const timestampString = timestamp.toString();

      // Add a new document in collection "messages"
      return setDoc(doc(db, "messages", timestampString), 
        {
          'timestamp': timestamp, 
          'author': message.author, 
          'channel': message.channel, 
          'content': message.content, 
        }
      );
    }

    // Peform one await for all the promises. 
    await Promise.all(
      messages.map( addMessageToDB ) 
    );

    alert("Firestore has been populated with test messages."
          + " You can remove this button by changing the value of"
          + " displayPopulateButton from true to false near the top of"
          + " components/ChatViewScreen.js.");
  }

  /**
   * Get current messages for the given channel
   */ 
  async function getMessagesForChannel(chan) {
    console.log(`getMessagesForChannel(${chan}); usingFirestore=${usingFirestore}`);
    let messages = [];
    if (usingFirestore) {
      messages = await(firebaseGetMessagesForChannel(chan));
    } else {
      messages = localDBGetMessagesForChannel(chan);
    }
    console.log(`${messages.length} messages retrieved from channel ${chan}.`);
    return messages; // Return messages just for debugging 
  }

  /**
   * Get current messages for the given channel from localMesssageDB
   */ 
  function localDBGetMessagesForChannel(chan) {
    const localMessages = localMessageDB.filter( msg => msg.channel === chan );
    setSelectedMessages(localMessages);
    return localMessages;
  }

  /**
   * Get current messages for the given channel from Firebase's Firestore
   */ 
  async function firebaseGetMessagesForChannel(chan) {
    const q = query(collection(db, 'messages'), where('channel', '==', chan));
    const querySnapshot = await getDocs(q);
    let messages = []; 
    querySnapshot.forEach(doc => {
        messages.push(docToMessage(doc));
    });
    setSelectedMessages( messages );
    return messages;
  }

  /**
   * Convert a Firebase message doc to a local message object
   * by adding a human-readable date (which isn't stored in Firestore).
   */ 
  function docToMessage(msgDoc) {
    // msgDoc has the form {id: timestampstring, 
    //                   data: {timestamp: ..., // a number, not a string 
    //                          author: ..., // email address
    //                          channel: ..., // name of channel 
    //                          content: ..., // string for contents of message. 
    //                          imageUri: ... // optional field containing downloadURL for
    //                                        // image file stored in Firebase's storage
    //                          }
    // Need to add missing date field to data portion, reconstructed from timestamp
    // console.log('docToMessage');
    const data = msgDoc.data();
    // console.log(msgDoc.id, " => ", data);
    return {...data, date: new Date(data.timestamp)}
  }

  /**
   * Open an area for message composition. Currently uses conditional formatting
   * (controlled by isComposingMessage state variabel) to do this within ChatViewScreen,
   * but really should be done by a Modal or separate screen. 
   */ 
  function composeAction() {
    changePscreen('compose');
  }

  /**
   * MessageItem is a simple component for displaying a single chat message
   */
  const MessageItem = ( { message } ) => { 
    return (
      <View style={styles.messageItem}>
        <Text style={styles.messageDateTime}>{utils.formatDateTime(message.date)}</Text>
        <Text style={styles.messageAuthor}>{message.author}</Text>
        <Text style={styles.messageContent}>{message.content}</Text>
        {// New for images. Conditionally display image if there is one: 
          message.imageUri &&
          <Image
            style={styles.thumbnail}
            source={{uri: message.imageUri}}
          />
        }
      </View> 
    ); 
  }

  

  function DisplayMessagePane() {
    return (
    <View style={styles.displayPane}>
    <Text style={styles.header}>Selected Channel</Text>
    <Picker
      style={styles.pickerStyles}
      mode='dropdown' // or 'dialog'; chooses mode on Android
      selectedValue={selectedChannel}
      onValueChange={(itemValue, itemIndex) => setSelectedChannel(itemValue)}>
      {channels.map(chan => <Picker.Item key={chan} label={chan} value={chan}/>)}
    </Picker>
    <Text style={styles.header}>Messages</Text> 
    {(selectedMessages.length === 0) ? 
      <Text>No messages to display</Text> :
      <FlatList style={styles.messageList}
        // reverse messages to show most recent first
        data={utils.reversed(selectedMessages)} 
        renderItem={ datum => <MessageItem message={datum.item}></MessageItem>} 
        // keyExtractor extracts a unique key for each item, 
        // which removes warnings about missing keeys 
        keyExtractor={item => item.timestamp} 
      />
    }
    </View>
    );
  }

  return (
    <>
    <View style={signedInUser?.emailVerified ? globalStyles.hidden : globalStyles.screen }>
      <Text>No user is logged in yet.</Text>
    </View>
    <View style={signedInUser?.emailVerified ? globalStyles.screen : globalStyles.hidden }>
      <Text>{signedInUser?.email} is logged in</Text>
      <Text>{`usingFirestore=${usingFirestore}`}</Text>
      <View style={globalStyles.buttonHolder}>
        <DebugButton visible={true} />
        <PopulateButton visible={true} />
        <ToggleStorageButton visible={true} />
        <RNPButton title="Compose Message" onPress={composeAction}
        />
      </View> 
      <DisplayMessagePane/>
    </View>
  </>
  );
}

const styles = StyleSheet.create({
  header: {
    marginTop: 10,
    fontSize: 20,
    fontWeight: 'bold'
  },
  pickerStyles:{
    width:'70%',
    backgroundColor:'plum',
    color:'black'
  },
  messageList: {
    width:'90%',
    marginTop: 5,
  },
  messageItem: {
    marginTop: 5,
    marginBottom: 5,
    backgroundColor:'bisque',
    color:'black',
    borderWidth: 1,
    borderColor: 'blue',
  },
  messageDateTime: {
    paddingLeft: 5,
    color:'gray',
  },
  messageAuthor: {
    paddingLeft: 5,
    color:'blue',
  },
  messageContent: {
    padding: 5,
    color:'black',
  },
  composePane: {
    width:'70%',
    borderWidth: 1,
    borderColor: 'blue',
  },
  displayPane: {
    width:'100%',
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  textInputArea: {
    fontSize: 14, 
    padding: 5,
    borderWidth: 1,
    borderStyle: 'dashed',
  },
  composeButton: {
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 8,
      paddingHorizontal: 10,
      backgroundColor: 'salmon',
      marginLeft: 10,
  },
  bigImage: {
      width: 300,
      height: 300,
      margin: 20
  },
  thumbnail: {
      width: 90,
      height: 90,
      margin: 10
  },
});

