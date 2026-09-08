import React from 'react';
import { Modal, View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SPACING, RADIUS } from '../constants/theme';
import { useTheme } from '../contexts/ThemeContext';

export type PermissionType = 'camera' | 'gallery';

interface PermissionModalProps {
  visible: boolean;
  type: PermissionType;
  onAccept: () => void;
  onCancel: () => void;
}

export const PermissionModal: React.FC<PermissionModalProps> = ({
  visible,
  type,
  onAccept,
  onCancel,
}) => {
  const { colors } = useTheme();

  const isCamera = type === 'camera';
  
  const title = isCamera ? 'Permiso de Cámara' : 'Acceso a Galería';
  const iconName = isCamera ? 'camera-outline' : 'images-outline';
  const description = isCamera 
    ? 'Para escanear documentos y convertirlos en PDF, LibrePDF necesita acceso a la cámara de tu dispositivo.'
    : 'Para importar fotos existentes y convertirlas a PDF, necesitamos acceso a tu galería de imágenes.';
  const noteText = isCamera
    ? 'A continuación verás el diálogo de permisos de tu sistema operativo. Por favor, selecciona "Permitir".'
    : 'A continuación verás el diálogo de permisos de tu sistema operativo. Por favor, concede el acceso.';

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel}>
      <View style={[styles.overlay, { backgroundColor: colors.modalOverlay }]}>
        <View style={[styles.modalContent, { backgroundColor: colors.cardBg, borderColor: colors.border }]}>
          
          <View style={[styles.iconContainer, { backgroundColor: colors.primaryGlow }]}>
            <Ionicons name={iconName} size={32} color={colors.primary} />
          </View>
          
          <Text style={[styles.title, { color: colors.textPrimary }]}>{title}</Text>
          <Text style={[styles.message, { color: colors.textSecondary }]}>
            {description}
          </Text>

          <View style={[styles.infoBox, { backgroundColor: colors.primaryGlow }]}>
            <Ionicons name="information-circle-outline" size={16} color={colors.primary} />
            <Text style={[styles.infoText, { color: colors.textSecondary }]}>
              {noteText}
            </Text>
          </View>

          <View style={styles.actionsContainer}>
            <TouchableOpacity 
              style={[styles.buttonSecondary, { backgroundColor: colors.cardBgElevated, borderColor: colors.border }]} 
              onPress={onCancel} 
              activeOpacity={0.8}
            >
              <Text style={[styles.buttonSecondaryText, { color: colors.textPrimary }]}>Cancelar</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={[styles.buttonPrimary, { backgroundColor: colors.primary }]} 
              onPress={onAccept} 
              activeOpacity={0.8}
            >
              <Text style={styles.buttonPrimaryText}>Continuar</Text>
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
