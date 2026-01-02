import React from 'react';
import { TouchableOpacity, Text, StyleSheet, ViewStyle } from 'react-native';
import { LucideIcon } from 'lucide-react-native';
import { colors, sizes } from '../styles/theme';

interface AppButtonProps {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'danger' | 'ghost' | 'secondary';
  icon?: LucideIcon;
  disabled?: boolean;
  style?: ViewStyle;
}

export const AppButton: React.FC<AppButtonProps> = ({ 
  title, onPress, variant = 'primary', icon: Icon, disabled, style
}) => {
  const getBackgroundColor = () => {
    if (disabled) return '#d1d5db';
    if (variant === 'danger') return colors.danger;
    if (variant === 'ghost') return 'transparent';
    if (variant === 'secondary') return colors.white;
    return colors.primary;
  };

  const getTextColor = () => {
    if (disabled) return '#6b7280';
    if (variant === 'ghost') return colors.textGray;
    if (variant === 'secondary') return colors.primary;
    return colors.textLight;
  };

  return (
    <TouchableOpacity 
      onPress={onPress} 
      disabled={disabled}
      activeOpacity={0.8}
      style={[
        styles.btn, 
        { backgroundColor: getBackgroundColor() },
        variant === 'secondary' && { borderWidth: 2, borderColor: colors.primary },
        style
      ]}
    >
      {Icon && <Icon size={22} color={getTextColor()} style={{ marginRight: 12 }} />}
      <Text style={[styles.btnText, { color: getTextColor() }]}>{title}</Text>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  btn: { 
    paddingVertical: 18, 
    paddingHorizontal: 24,
    borderRadius: sizes.borderRadiusSm, 
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'center',
    width: '100%',
    elevation: 4,
  },
  btnText: { fontWeight: 'bold', fontSize: 18 },
});