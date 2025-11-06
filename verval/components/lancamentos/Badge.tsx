import { Text } from '@/components/Themed';
import React from 'react';
import { StyleSheet, View } from 'react-native';

export function Badge({ text, toneBg, toneText }: { text: string; toneBg?: string; toneText?: string }) {
  return (
    <View style={[styles.badge, toneBg ? { backgroundColor: toneBg } : null]}>
      <Text style={[styles.badgeText, toneText ? { color: toneText } : null]} numberOfLines={1}>
        {text}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: { paddingHorizontal: 8, paddingVertical: 4, backgroundColor: '#f3f4f6', borderRadius: 9999, maxWidth: '50%' },
  badgeText: { fontSize: 12, color: 'grey' },
});
