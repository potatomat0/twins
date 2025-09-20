import React from 'react';
import { Keyboard, TouchableWithoutFeedback, View } from 'react-native';

type Props = { children: React.ReactNode };

const KeyboardDismissable: React.FC<Props> = ({ children }) => {
  // Using TouchableWithoutFeedback avoids capturing scroll/pan gestures like Pressable does,
  // so background taps dismiss the keyboard without locking scroll.
  return (
    <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
      <View style={{ flex: 1 }}>{children}</View>
    </TouchableWithoutFeedback>
  );
};

export default KeyboardDismissable;
