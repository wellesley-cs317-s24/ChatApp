import { useState} from "react";
import { Image, StyleSheet, TextInput, View } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { RNPButton } from './RNPButton.js'; // Lyn's wrapper for react-native-paper button
import { auth } from '../firebaseInit.js'; // Firebase authentication and storage objects
import { useAuthState } from "react-firebase-hooks/auth" // For tracking state of signed in user
import globalStyles from '../styles';

export default function ComposeMessagePScreen( {changePscreen, postMessage} ) {

  // Components with state variables need to be defined in separate files
  // rather than as helper components within other components. 
  // Otherwise the state variables will be reinitialized in unexpected ways.    
  const [textInputValue, setTextInputValue] = useState('');
  const [imageUri, setImageUri] = useState(null);

  /**  
   * Elegant way to track signedInUser in any component.
   * signedInUser will be null until a user signs up or signs in. 
   * After a user signs up or signs in, can test: 
   *   + signedInUser?.email: email of user (undefined if signedInUser is null)
   *   + signedInUser?.verified: whether signedInUser is verified (undefined if signedInUser is null)
   */
    const [signedInUser, authLoading, authError] = useAuthState(auth);

  /**
   * Cancel the current message composition. 
   * This is the action for the Cancel button in the message composition pane.
   */ 
  function cancelAction() {
    setImageUri(null); 
    changePscreen('chat'); // navigate back to chat screen
  }

  /**
   * Add an image to the message being composed. 
   * This is the action for the Add Image button in the message composition pane.
   * Currently, only one image can be added to a message; calling this
   * when there's already an image changes the image to be added. 
   * This behavior could be modified to support a *list* of an arbitrary
   * number of images. 
   */ 
  async function addImageAction () {
    await(pickImage());
  } 

  /**
   * Pick an image from the device's image gallery and store it in 
   * the state variable imageUri. 
   * For a simple demonstration of image picking, see the Snack 
   * https://snack.expo.dev/@fturbak/image-picker-example
   */ 
  async function pickImage () {
    // No permissions request is necessary for launching the image library
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.All,
      allowsEditing: true,
      aspect: [4, 3], // desired aspect ratio of images
      quality: 1,
    });
    
    console.log('Picked image:', result);
    
    if (!result.canceled) {
      // assets[0] has info about picked image;
      // assets[0].uri is its URI
      setImageUri(result.assets[0].uri);
    }
  };

  /**
    * Post a message to the the currently selected chat room.
    */ 
  async function postAction() {
    const now = new Date();
    const timestamp = now.getTime(); // millsecond timestamp
    const newMessage = {
      'author': signedInUser?.email, 
      'date': now, 
      'timestamp': timestamp, 
      'content': textInputValue, 
      // Channel is not known here, but will be added by postMessage
    }
    // Add imageUri to newMessage if there is one. 
    if (imageUri !== null) {
      newMessage.imageUri = imageUri; // Local image uri
    }
    await postMessage(newMessage); // Actually post the message to the current channel
    setTextInputValue(''); // clear text input for next time
    setImageUri(null); // clear imageUri for next time
    changePscreen('chat'); // navigate to chat screen after posting message (in next render)
  }

  return (
    <View style={globalStyles.screen}>
      <TextInput
        multiline
        placeholder="message text goes here"
        style={styles.textInputArea}
        value={textInputValue} 
        onChangeText={setTextInputValue}
      />
      {// Conditionally display image if there is one: 
        imageUri &&
        <Image
          style={styles.thumbnail}
          source={{uri: imageUri}}
        />
      }
      <View style={globalStyles.buttonHolder}>
        <RNPButton title="Cancel" onPress={cancelAction}/>
        <RNPButton title="Add Image"onPress={addImageAction}/>
        <RNPButton title="Post" onPress={postAction}/>
        </View>
      </View>
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
      width:'95%',
      height:100,
      fontSize: 14, 
      padding: 5,
      borderWidth: 1,
      borderStyle: 'dashed',
    },
    composeScreen: {
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
  