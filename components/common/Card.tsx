import React from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';
import { useTheme } from '@context/ThemeContext';
import { toRgb } from '@themes/index';

type Props = {
  children: React.ReactNode;
  style?: ViewStyle | ViewStyle[];
};

const Card: React.FC<Props> = ({ children, style }) => {
  const { theme } = useTheme();
  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: toRgb(theme.colors['--dark-card']),
        },
        style,
      ]}
    >
      {children}
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    borderRadius: 16,
    padding: 32,
    width: '100%',
    maxWidth: 500,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 15,
  },
});

export default Card;
