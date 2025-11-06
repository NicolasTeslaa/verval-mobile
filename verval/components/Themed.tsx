/**
 * Themed primitives (Text/View) com tokens semânticos.
 * - Text usa 'textStrong' por padrão (alto contraste).
 * - View usa 'surface' por padrão.
 * - A ordem dos estilos garante que seu `style` sobreponha a cor padrão.
 */

import Colors from '@/constants/Colors';
import { Text as DefaultText, View as DefaultView } from 'react-native';
import { useColorScheme } from './useColorScheme';

type ThemeProps = {
  lightColor?: string;
  darkColor?: string;
};

type TextVariant = 'strong' | 'muted';

export type TextProps = ThemeProps &
  DefaultText['props'] & {
    /** Opcional: muda o token usado para cor do texto */
    variant?: TextVariant;
  };

export type ViewProps = ThemeProps & DefaultView['props'];

function useThemeColor(
  props: { light?: string; dark?: string },
  colorName: keyof typeof Colors.light & keyof typeof Colors.dark
) {
  const theme = useColorScheme() ?? 'light';
  const colorFromProps = props[theme];
  return colorFromProps ?? Colors[theme][colorName];
}

export function Text(props: TextProps) {
  const { style, lightColor, darkColor, variant = 'strong', ...otherProps } = props;

  // Usa 'textStrong' como padrão; se variant === 'muted', usa 'textMuted'
  const token = variant === 'muted' ? 'textMuted' : 'textStrong';

  // Pega a cor com fallback para tokens
  const color = useThemeColor({ light: lightColor, dark: darkColor }, token as any);

  // Coloca o seu style por último para permitir override
  return <DefaultText style={[{ color }, style]} {...otherProps} />;
}

export function View(props: ViewProps) {
  const { style, lightColor, darkColor, ...otherProps } = props;

  // Usa 'surface' como fundo padrão (melhor que 'background' para contraste dentro da tela)
  const backgroundColor = useThemeColor({ light: lightColor, dark: darkColor }, 'surface');

  return <DefaultView style={[{ backgroundColor }, style]} {...otherProps} />;
}
