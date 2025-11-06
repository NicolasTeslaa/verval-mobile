import { Text } from '@/components/Themed';
import React from 'react';
import { Platform, StyleSheet, TextInput, View } from 'react-native';

type Props = { label: string; multiline?: boolean } & React.ComponentProps<typeof TextInput>;

export function LabeledInput({ label, multiline, ...props }: Props) {
  return (
    <View style={{ marginBottom: 12 }}>
      <Text style={{ marginBottom: 6, color: '#6b7280' }}>{label}</Text>
      <TextInput
        {...props}
        style={[styles.input, multiline && { height: 88, textAlignVertical: 'top' }]}
        placeholderTextColor="#9ca3af"
        multiline={multiline}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  input: { borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 10, paddingHorizontal: 12, paddingVertical: Platform.select({ ios: 12, android: 8, default: 10 }) },
});
