import React, { forwardRef, useImperativeHandle, useMemo, useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { useTheme } from '@context/ThemeContext';
import { toRgb, toRgba } from '@themes/index';

type Option = { label: string; value: string } | string;

type Props = {
  options: Option[];
  value?: string;
  placeholder?: string;
  onChange: (value: string) => void;
  onCommit?: () => void; // called after a selection is made and modal closes
};

export type DropdownHandle = {
  open: () => void;
  close: () => void;
};

const Dropdown = forwardRef<DropdownHandle, Props>(({ options, value, placeholder = 'Select…', onChange, onCommit }, ref) => {
  const { theme } = useTheme();
  const [open, setOpen] = useState(false);
  const items = useMemo(
    () =>
      options.map((o) =>
        typeof o === 'string' ? { label: o, value: o } : { label: o.label, value: o.value }
      ),
    [options]
  );

  const currentLabel = items.find((i) => i.value === value)?.label;

  useImperativeHandle(ref, () => ({
    open: () => setOpen(true),
    close: () => setOpen(false),
  }));

  return (
    <>
      <Pressable
        accessibilityRole="button"
        onPress={() => setOpen(true)}
        style={({ pressed }) => [
          styles.input,
          {
            backgroundColor: toRgb(theme.colors['--surface']),
            borderColor: toRgba(theme.colors['--border'], 0.08),
            opacity: pressed ? 0.9 : 1,
          },
        ]}
      >
        <Text style={{ color: value ? toRgb(theme.colors['--text-primary']) : toRgb(theme.colors['--text-secondary']) }}>
          {currentLabel ?? placeholder}
        </Text>
      </Pressable>

      <Modal visible={open} animationType="fade" transparent onRequestClose={() => setOpen(false)}>
        <Pressable style={styles.backdrop} onPress={() => setOpen(false)} />
        <View
          style={[
            styles.sheet,
            { backgroundColor: toRgb(theme.colors['--surface']), borderColor: toRgba(theme.colors['--border'], 0.08) },
          ]}
        >
          {items.map((it) => {
            const selected = it.value === value;
            return (
              <Pressable
                key={it.value}
                style={({ pressed }) => [
                  styles.row,
                  {
                    backgroundColor: selected
                      ? 'rgba(99,102,241,0.18)'
                      : pressed
                      ? toRgba(theme.colors['--border'], 0.04)
                      : 'transparent',
                  },
                ]}
                onPress={() => {
                  onChange(it.value);
                  setOpen(false);
                  // defer onCommit slightly to allow modal to close
                  setTimeout(() => onCommit?.(), 0);
                }}
              >
                <Text style={{ color: toRgb(theme.colors['--text-primary']), fontSize: 16 }}>{it.label}</Text>
              </Pressable>
            );
          })}
        </View>
      </Modal>
    </>
  );
});

const styles = StyleSheet.create({
  input: {
    borderRadius: 12,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
  },
  backdrop: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  sheet: {
    position: 'absolute',
    left: 16,
    right: 16,
    bottom: 24,
    borderRadius: 14,
    borderWidth: 1,
    overflow: 'hidden',
  },
  row: {
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
});

export default Dropdown;
