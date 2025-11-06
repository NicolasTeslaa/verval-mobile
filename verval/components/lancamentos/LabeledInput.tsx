// components/lancamentos/LabeledInput.tsx
import { Text } from '@/components/Themed';
import { useColorScheme } from '@/components/useColorScheme';
import Colors from '@/constants/Colors';
import React from 'react';
import { Platform, StyleSheet, TextInput, TextInputProps, View } from 'react-native';

type Props = { label: string; multiline?: boolean } & TextInputProps;

export function LabeledInput({ label, multiline, style, placeholderTextColor, ...props }: Props) {
  const scheme = useColorScheme();
  const isDark = scheme === 'dark';
  const C = Colors[scheme ?? 'light'];

  return (
    <View style={{ marginBottom: 12 }}>
      <Text variant="muted" style={{ marginBottom: 6 }}>
        {label}
      </Text>

      <TextInput
        {...props}
        multiline={multiline}
        style={[
          styles.input,
          {
            borderColor: C.border,
            backgroundColor: C.card,
            color: C.textStrong,                // texto digitado visível no dark
          },
          multiline && { height: 88, textAlignVertical: 'top' },
          style,
        ]}
        placeholderTextColor={placeholderTextColor ?? C.textMuted} // placeholder visível no dark
        selectionColor={C.tint}
        keyboardAppearance={isDark ? 'dark' : 'light'}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  input: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: Platform.select({ ios: 12, android: 8, default: 10 }),
    fontSize: 14,
  },
});
