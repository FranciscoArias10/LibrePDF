import React from 'react';
import { Modal, View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SPACING, RADIUS } from '../constants/theme';

interface FilterApplyModalProps {
  visible: boolean;
  onApplyToOne: () => void;
  onApplyToAll: () => void;
  onClose: () => void;
}

export const FilterApplyModal: React.FC<FilterApplyModalProps> = ({
  visible,
  onApplyToOne,
  onApplyToAll,
  onClose,
}) => {
  return (
    <Modal visible={visible} animationType="fade" transparent={true} onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.modalContainer}>
          <View style={styles.iconContainer}>
            <Ionicons name="color-wand-outline" size={32} color={COLORS.primary} />
          </View>
          
          <Text style={styles.title}>Aplicar Filtro</Text>
          <Text style={styles.message}>
            ¿Deseas aplicar este filtro a todas las páginas del documento o solo a la actual?
          </Text>

          <View style={styles.actionsContainer}>
            <TouchableOpacity style={styles.buttonSecondary} onPress={onApplyToOne} activeOpacity={0.8}>
              <Text style={styles.buttonSecondaryText}>Solo a esta</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.buttonPrimary} onPress={onApplyToAll} activeOpacity={0.8}>
              <Text style={styles.buttonPrimaryText}>A todas</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: COLORS.modalOverlay,
    justifyContent: 'center',
    alignItems: 'center',
    padding: SPACING.xl,
  },
  modalContainer: {
    width: '100%',
    backgroundColor: COLORS.cardBgElevated,
    borderRadius: RADIUS.lg,
    padding: SPACING.lg,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  iconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: COLORS.primaryGlow,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  title: {
    color: COLORS.textPrimary,
    fontSize: 18,
    fontWeight: '700',
    marginBottom: SPACING.sm,
    textAlign: 'center',
  },
  message: {
    color: COLORS.textSecondary,
    fontSize: 14,
    textAlign: 'center',
    marginBottom: SPACING.xl,
    lineHeight: 20,
  },
  actionsContainer: {
    flexDirection: 'row',
    gap: SPACING.md,
    width: '100%',
  },
  buttonSecondary: {
    flex: 1,
    paddingVertical: SPACING.sm + 2,
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: COLORS.borderLight,
    borderRadius: RADIUS.md,
    alignItems: 'center',
  },
  buttonSecondaryText: {
    color: COLORS.textPrimary,
    fontSize: 15,
    fontWeight: '600',
  },
  buttonPrimary: {
    flex: 1,
    paddingVertical: SPACING.sm + 2,
    backgroundColor: COLORS.primary,
    borderRadius: RADIUS.md,
    alignItems: 'center',
  },
  buttonPrimaryText: {
    color: '#000', // Because primary is bright neon cyan, black text reads best
    fontSize: 15,
    fontWeight: '700',
  },
});
