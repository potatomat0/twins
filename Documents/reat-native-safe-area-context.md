React Native Safe Area Context Migration Notes

Why migrate
- The core `react-native` `SafeAreaView` is deprecated. The recommended drop‑in is `react-native-safe-area-context`, which provides more accurate insets across devices (including iPhone notches, dynamic island, and various Android cutouts) and more flexible APIs.

Key APIs
- `SafeAreaView` (from `react-native-safe-area-context`): A view that applies top/bottom/left/right padding using the platform insets.
- `useSafeAreaInsets()`: Hook to read the current insets; helpful when composing custom headers/toolbars.
- `SafeAreaProvider`: Wrap your app root (Expo adds this automatically). If you need manual control, wrap the root navigator.

Usage patterns in this app
- All screens import `SafeAreaView` from `react-native-safe-area-context` instead of `react-native`.
- Custom header (`SwipeHeader`) uses `useSafeAreaInsets()` to add extra `paddingTop` so content sits comfortably below the notch/status bar.

Gotchas
- Do not nest multiple `SafeAreaView`s with conflicting background colors; prefer a single top‑level `SafeAreaView` per screen.
- When you need pixel‑perfect control, use `useSafeAreaInsets()` and apply paddings to your own containers instead of relying solely on `SafeAreaView`.

Links
- Library: https://github.com/th3rdwave/react-native-safe-area-context

