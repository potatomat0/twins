import React, { useEffect, useMemo, useRef } from 'react';
import { Animated, Easing, StyleSheet } from 'react-native';
import * as SplashScreen from 'expo-splash-screen';
import { SvgXml } from 'react-native-svg';
import { useTheme } from '@context/ThemeContext';
import { toRgb } from '@themes/index';

type Props = {
  ready: boolean;
  onFinish: () => void;
};

const SHAKE_DISTANCE = 12;
const SHAKE_DURATION = 760;
const FADE_DURATION = 280;

const AnimatedSplash: React.FC<Props> = ({ ready, onFinish }) => {
  const { theme } = useTheme();
  const translateY = useRef(new Animated.Value(0)).current;
  const opacity = useRef(new Animated.Value(1)).current;
  const loopRef = useRef<Animated.CompositeAnimation | null>(null);

  useEffect(() => {
    SplashScreen.hideAsync().catch(() => {});
  }, []);

  useEffect(() => {
    const up = Animated.timing(translateY, {
      toValue: -SHAKE_DISTANCE,
      duration: SHAKE_DURATION,
      easing: Easing.out(Easing.quad),
      useNativeDriver: true,
    });
    const down = Animated.timing(translateY, {
      toValue: SHAKE_DISTANCE,
      duration: SHAKE_DURATION,
      easing: Easing.in(Easing.quad),
      useNativeDriver: true,
    });
    loopRef.current = Animated.loop(Animated.sequence([up, down]));
    loopRef.current.start();
    return () => {
      loopRef.current?.stop();
    };
  }, [translateY]);

  useEffect(() => {
    if (!ready) {
      return;
    }
    loopRef.current?.stop();
    Animated.timing(opacity, {
      toValue: 0,
      duration: FADE_DURATION,
      easing: Easing.out(Easing.quad),
      useNativeDriver: true,
    }).start(({ finished }) => {
      if (finished) {
        onFinish();
      }
    });
  }, [ready, opacity, onFinish]);

  const backgroundColor = useMemo(() => toRgb(theme.colors['--bg']), [theme]);
  const brandColor = useMemo(() => toRgb(theme.colors['--brand-primary']), [theme]);
  const accentColor = useMemo(() => toRgb(theme.colors['--accent-cyan']), [theme]);
  const strokeColor = useMemo(() => toRgb(theme.colors['--text-primary']), [theme]);

  const logoXml = useMemo(
    () => `
      <svg width="210" height="70" viewBox="0 0 210 70" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id="twinsGradientSplash" x1="0%" y1="50%" x2="100%" y2="50%">
            <stop offset="0%" stop-color="${brandColor}" />
            <stop offset="100%" stop-color="${accentColor}" />
          </linearGradient>
        </defs>
        <text x="5" y="48" fill="url(#twinsGradientSplash)" stroke="${strokeColor}" stroke-width="1.6" font-size="44" font-weight="600" letter-spacing="1.5">Twins</text>
      </svg>
    `,
    [brandColor, accentColor, strokeColor],
  );

  const logo = useMemo(
    () => <SvgXml xml={logoXml} width={200} height={70} />,
    [logoXml],
  );

  return (
    <Animated.View style={[styles.overlay, { backgroundColor, opacity }]}>
      <Animated.View style={{ transform: [{ translateY }] }}>{logo}</Animated.View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

export default AnimatedSplash;
