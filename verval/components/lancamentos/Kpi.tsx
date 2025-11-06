import { Text } from '@/components/Themed';
import { FontAwesome } from '@expo/vector-icons';
import React from 'react';
import { Pressable, StyleSheet, View, type TextStyle, type ViewStyle } from 'react-native';
import type { Tone } from './utils';

type Size = 'sm' | 'md' | 'lg';

type Props = {
  title: string;
  value: string | number;
  icon: React.ComponentProps<typeof FontAwesome>['name'];
  tone: Tone;
  size?: Size;
  containerStyle?: ViewStyle;
  titleStyle?: TextStyle;
  valueStyle?: TextStyle;
  onPress?: () => void;   // <<< novo
  active?: boolean;       // <<< novo
};

const TITLE_SIZES: Record<Size, number> = { sm: 11, md: 12, lg: 14 };
const VALUE_SIZES: Record<Size, number> = { sm: 16, md: 17, lg: 20 };

export function Kpi({
  title,
  value,
  icon,
  tone,
  size = 'md',
  containerStyle,
  titleStyle,
  valueStyle,
  onPress,
  active = false,
}: Props) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      android_ripple={{ color: '#00000018', borderless: false }}
      style={[
        styles.kpi,
        { backgroundColor: tone.bg, borderColor: active ? tone.text : tone.border, borderWidth: active ? 2 : 1 },
        active && styles.kpiActive,
        containerStyle,
      ]}
    >
      <View style={styles.headerRow}>
        <FontAwesome name={icon} size={16} color={tone.text} />
        <Text
          numberOfLines={1}
          adjustsFontSizeToFit
          minimumFontScale={0.85}
          style={[
            styles.kpiTitle,
            { color: tone.text, fontSize: TITLE_SIZES[size] },
            titleStyle,
          ]}
        >
          {title}
        </Text>
      </View>

      <Text
        numberOfLines={1}
        adjustsFontSizeToFit
        minimumFontScale={0.85}
        style={[
          styles.kpiValue,
          { color: tone.text, fontSize: VALUE_SIZES[size] },
          valueStyle,
        ]}
      >
        {String(value)}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  kpi: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
  },
  kpiActive: {
    transform: [{ scale: 0.99 }],
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  kpiTitle: {
    fontWeight: '600',
  },
  kpiValue: {
    fontWeight: '700',
    marginTop: 6,
  },
});
