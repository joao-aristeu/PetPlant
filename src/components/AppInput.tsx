import React from 'react';
import { View, Text, TextInput, StyleSheet, TextInputProps } from 'react-native';
import { colors, sizes } from '../styles/theme';

interface AppInputProps extends TextInputProps {
  label: string;
}

export const AppInput: React.FC<AppInputProps> = ({ label, ...props }) => (
  <View style={styles.container}>
    <Text style={styles.label}>{label}</Text>
    <TextInput 
      style={styles.input} 
      placeholderTextColor={colors.textGray}
      {...props} 
    />
  </View>
);

const styles = StyleSheet.create({
  container: { marginBottom: 20 },
  label: { fontSize: 16, fontWeight: 'bold', color: colors.textDark, marginBottom: 10 },
  input: { 
    backgroundColor: colors.card, 
    borderRadius: sizes.borderRadiusSm, 
    padding: 18, 
    fontSize: 16, 
    borderWidth: 2, 
    borderColor: colors.primary,
    color: colors.textDark,
  },
});