import { useCallback, useEffect, useRef } from 'react';
import { Keyboard } from 'react-native';

/**
 * Returns an imperative trigger that dismisses the virtual keyboard only when the provided
 * checker function returns true. Call the trigger from "Done" handlers or dropdown commits.
 */
export function useAutoDismissKeyboard(checkCompletion: () => boolean) {
  const checkerRef = useRef(checkCompletion);

  useEffect(() => {
    checkerRef.current = checkCompletion;
  }, [checkCompletion]);

  return useCallback(() => {
    try {
      if (checkerRef.current()) {
        Keyboard.dismiss();
      }
    } catch {
      // Ignore errors dismissing the keyboard.
    }
  }, []);
}
