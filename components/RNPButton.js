/**
 * Lyn's wrapper around react-native-paper button that gives it 
 * the same interfaces as a regular react-native button
 */

import { Button } from 'react-native-paper';
import styles from '../styles';

export function RNPButton({title, onPress, disabled}) {
  return (
    <Button
      mode="contained" 
      style={styles.button}
      labelStyle={styles.buttonText}
      disabled={disabled}
      onPress={onPress}>
        {title}
    </Button>
  ); 
}



