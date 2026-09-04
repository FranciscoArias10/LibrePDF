import React from 'react';
import {
  View,
  Text,
  Modal,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { PDFSettings, PageSize, PageOrientation, PageMargin } from '../types';
import { COLORS, SPACING, RADIUS } from '../constants/theme';

interface PDFSettingsModalProps {
  visible: boolean;
  settings: PDFSettings;
  onUpdateSettings: (newSettings: PDFSettings) => void;
  onClose: () => void;
  onConfirmGenerate: () => void;
}

export const PDFSettingsModal: React.FC<PDFSettingsModalProps> = ({
  visible,
  settings,
  onUpdateSettings,
  onClose,
  onConfirmGenerate,
}) => {
  const pageSizes: { id: PageSize; label: string }[] = [
    { id: 'A4', label: 'A4' },
    { id: 'LETTER', label: 'Carta (Letter)' },
    { id: 'LEGAL', label: 'Oficio (Legal)' },
  ];

  const orientations: { id: PageOrientation; label: string; icon: string }[] = [
    { id: 'portrait', label: 'Vertical', icon: 'document-outline' },
    { id: 'landscape', label: 'Horizontal', icon: 'document-text-outline' },
  ];

  const margins: { id: PageMargin; label: string }[] = [
    { id: 'none', label: 'Sin Margen' },
    { id: 'small', label: 'Pequeño' },
    { id: 'medium', label: 'Mediano' },
    { id: 'large', label: 'Grande' },
  ];

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={styles.modalCard}>
          {/* Modal Header */}
          <View style={styles.header}>
            <Text style={styles.title}>Ajustes de Exportación PDF</Text>
            <TouchableOpacity onPress={onClose} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
              <Ionicons name="close" size={24} color={COLORS.textSecondary} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.body} showsVerticalScrollIndicator={false}>
            {/* Title Input */}
            <Text style={styles.sectionLabel}>Nombre del Documento</Text>
            <View style={styles.inputContainer}>
              <Ionicons name="create-outline" size={20} color={COLORS.primaryLight} />
              <TextInput
                style={styles.input}
                value={settings.documentTitle}
                onChangeText={(text) =>
                  onUpdateSettings({ ...settings, documentTitle: text })
                }
                placeholder="Ej. Scanner_001"
                placeholderTextColor={COLORS.textMuted}
              />
            </View>

            {/* Page Size Selector */}
            <Text style={styles.sectionLabel}>Tamaño de Página</Text>
            <View style={styles.optionsRow}>
              {pageSizes.map((ps) => {
                const isSelected = settings.pageSize === ps.id;
                return (
                  <TouchableOpacity
                    key={ps.id}
                    style={[styles.chip, isSelected && styles.chipSelected]}
                    onPress={() =>
                      onUpdateSettings({ ...settings, pageSize: ps.id })
                    }
                  >
                    <Text
                      style={[styles.chipText, isSelected && styles.chipTextSelected]}
                    >
                      {ps.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Orientation */}
            <Text style={styles.sectionLabel}>Orientación</Text>
            <View style={styles.optionsRow}>
              {orientations.map((ori) => {
                const isSelected = settings.orientation === ori.id;
                return (
                  <TouchableOpacity
                    key={ori.id}
                    style={[styles.chip, isSelected && styles.chipSelected]}
                    onPress={() =>
                      onUpdateSettings({ ...settings, orientation: ori.id })
                    }
                  >
                    <Ionicons
                      name={ori.icon as any}
                      size={16}
                      color={isSelected ? '#FFF' : COLORS.textSecondary}
                    />
                    <Text
                      style={[styles.chipText, isSelected && styles.chipTextSelected]}
                    >
                      {ori.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Margins */}
            <Text style={styles.sectionLabel}>Márgenes de Página</Text>
            <View style={styles.optionsRow}>
              {margins.map((m) => {
                const isSelected = settings.margin === m.id;
                return (
                  <TouchableOpacity
                    key={m.id}
                    style={[styles.chip, isSelected && styles.chipSelected]}
                    onPress={() =>
                      onUpdateSettings({ ...settings, margin: m.id })
                    }
                  >
                    <Text
                      style={[styles.chipText, isSelected && styles.chipTextSelected]}
                    >
                      {m.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </ScrollView>

          {/* Confirm Button */}
          <View style={styles.footer}>
            <TouchableOpacity
              style={styles.generateBtn}
              onPress={onConfirmGenerate}
              activeOpacity={0.85}
            >
              <Ionicons name="document-text-outline" size={20} color="#FFF" />
              <Text style={styles.generateBtnText}>Generar PDF Ahora</Text>
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
    justifyContent: 'flex-end',
  },
  modalCard: {
    backgroundColor: COLORS.cardBg,
    borderTopLeftRadius: RADIUS.lg,
    borderTopRightRadius: RADIUS.lg,
    maxHeight: '85%',
    paddingBottom: SPACING.lg,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  body: {
    padding: SPACING.md,
  },
  sectionLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginTop: SPACING.sm + 4,
    marginBottom: SPACING.xs + 2,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.cardBgElevated,
    borderRadius: RADIUS.sm,
    paddingHorizontal: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    height: 48,
  },
  input: {
    flex: 1,
    color: COLORS.textPrimary,
    marginLeft: SPACING.sm,
    fontSize: 14,
    fontWeight: '600',
  },
  optionsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.xs + 4,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    backgroundColor: COLORS.cardBgElevated,
    borderRadius: RADIUS.sm,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  chipSelected: {
    backgroundColor: COLORS.primaryDark,
    borderColor: COLORS.primaryLight,
  },
  chipText: {
    color: COLORS.textSecondary,
    fontSize: 13,
    fontWeight: '600',
  },
  chipTextSelected: {
    color: '#FFF',
    fontWeight: '700',
  },
  footer: {
    paddingHorizontal: SPACING.md,
    paddingTop: SPACING.md,
  },
  generateBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.sm,
    backgroundColor: COLORS.primary,
    paddingVertical: SPACING.md,
    borderRadius: RADIUS.md,
  },
  generateBtnText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '700',
  },
});
