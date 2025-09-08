import React from 'react';
import { Keyboard, Pressable } from 'react-native';

type Props = { children: React.ReactNode };

const KeyboardDismissable: React.FC<Props> = ({ children }) => {
  return (
    <Pressable style={{ flex: 1 }} onPress={Keyboard.dismiss} android_disableSound>
      {children}
    </Pressable>
  );
};

export default KeyboardDismissable;
