import React from 'react';
import { Modal, View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SPACING, RADIUS } from '../constants/theme';
import { useTheme } from '../contexts/ThemeContext';

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
  const { colors } = useTheme();

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={[styles.overlay, { backgroundColor: colors.modalOverlay }]}>
        <View style={[styles.modalContent, { backgroundColor: colors.cardBg, borderColor: colors.border }]}>
          <View style={[styles.iconContainer, { backgroundColor: colors.primaryGlow }]}>
            <Ionicons name="color-wand-outline" size={32} color={colors.primary} />
          </View>
          
          <Text style={[styles.title, { color: colors.textPrimary }]}>Aplicar Filtro</Text>
          <Text style={[styles.message, { color: colors.textSecondary }]}>
            ¿Deseas aplicar este filtro a todas las páginas del documento o solo a la actual?
          </Text>

          <View style={[styles.infoBox, { backgroundColor: colors.primaryGlow }]}>
            <Ionicons name="information-circle-outline" size={16} color={colors.primary} />
            <Text style={[styles.infoText, { color: colors.textSecondary }]}>
              Nota: El efecto no se muestra en esta vista previa para mantener la app rápida, pero se aplicará con máxima calidad en el PDF final.
            </Text>
          </View>

          <View style={styles.actionsContainer}>
            <TouchableOpacity style={[styles.buttonSecondary, { backgroundColor: colors.cardBgElevated, borderColor: colors.border }]} onPress={onApplyToOne} activeOpacity={0.8}>
              <Text style={[styles.buttonSecondaryText, { color: colors.textPrimary }]}>Solo a esta</Text>
            </TouchableOpacity>
            
            <TouchableOpacity style={[styles.buttonPrimary, { backgroundColor: colors.primary }]} onPress={onApplyToAll} activeOpacity={0.8}>
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
    justifyContent: 'center',
    alignItems: 'center',
    padding: SPACING.xl,
  },
  modalContent: {
    width: '100%',
    borderRadius: RADIUS.lg,
    padding: SPACING.xl,
    alignItems: 'center',
    borderWidth: 1,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.25,
    shadowRadius: 20,
    elevation: 10,
  },
  iconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SPACING.lg,
  },
  title: {
    fontSize: 20,
    fontWeight: '800',
    marginBottom: SPACING.xs,
    textAlign: 'center',
  },
  message: {
    fontSize: 14,
    textAlign: 'center',
    marginBottom: SPACING.lg,
    lineHeight: 20,
  },
  infoBox: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: SPACING.sm,
    borderRadius: RADIUS.sm,
    marginBottom: SPACING.xl,
    gap: 8,
  },
  infoText: {
    flex: 1,
    fontSize: 12,
    lineHeight: 16,
  },
  actionsContainer: {
    flexDirection: 'row',
    gap: SPACING.md,
    width: '100%',
  },
  buttonSecondary: {
    flex: 1,
    paddingVertical: SPACING.md,
    borderRadius: RADIUS.md,
    alignItems: 'center',
    borderWidth: 1,
  },
  buttonSecondaryText: {
    fontSize: 15,
    fontWeight: '600',
  },
  buttonPrimary: {
    flex: 1,
    paddingVertical: SPACING.md,
    borderRadius: RADIUS.md,
    alignItems: 'center',
  },
  buttonPrimaryText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
});
