import { useEffect, useRef } from 'react';
import { Keyboard } from 'react-native';

/**
 * Dismisses the virtual keyboard automatically when the provided condition
 * transitions from false to true. Useful for closing the keyboard once
 * every required form field has been filled out.
 */
export function useAutoDismissKeyboard(shouldDismiss: boolean) {
  const previous = useRef(false);

  useEffect(() => {
    if (shouldDismiss && !previous.current) {
      Keyboard.dismiss();
    }
    previous.current = shouldDismiss;
  }, [shouldDismiss]);
}
