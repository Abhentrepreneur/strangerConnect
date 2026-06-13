import React from 'react';
import { TouchableOpacity, Text, StyleSheet } from 'react-native';
import { COLORS } from '../../constants';

interface ActionButtonProps {
  icon: string;
  label: string;
  onPress: () => void;
  active?: boolean;
  danger?: boolean;
}

export function ActionButton({ icon, label, onPress, active, danger }: ActionButtonProps) {
  return (
    <TouchableOpacity
      style={[
        styles.button,
        active && styles.active,
        danger && styles.danger,
      ]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <Text style={styles.icon}>{icon}</Text>
      <Text style={[styles.label, danger && styles.dangerLabel]}>{label}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: 'rgba(20, 20, 20, 0.8)',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  active: {
    backgroundColor: 'rgba(124, 58, 237, 0.3)',
    borderColor: COLORS.primary,
  },
  danger: {
    backgroundColor: 'rgba(239, 68, 68, 0.2)',
    borderColor: COLORS.error,
  },
  icon: {
    fontSize: 22,
  },
  label: {
    color: COLORS.muted,
    fontSize: 10,
    marginTop: 2,
  },
  dangerLabel: {
    color: COLORS.error,
  },
});
