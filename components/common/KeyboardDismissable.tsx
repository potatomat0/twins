import React from 'react';
import { Keyboard, TouchableWithoutFeedback } from 'react-native';

type Props = { children: React.ReactNode };

const KeyboardDismissable: React.FC<Props> = ({ children }) => {
  return (
    <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
      {children}
    </TouchableWithoutFeedback>
  );
};

export default KeyboardDismissable;
