import React, { useState } from 'react';
import {
  View,
  Text,
  Modal,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { PDFSettings, PageSize, PageOrientation, PageMargin } from '../types';
import { SPACING, RADIUS } from '../constants/theme';
import { useTheme } from '../contexts/ThemeContext';

interface PDFSettingsModalProps {
  visible: boolean;
  initialSettings: PDFSettings;
  onGenerate: (settings: PDFSettings) => void;
  onClose: () => void;
}

export const PDFSettingsModal: React.FC<PDFSettingsModalProps> = ({
  visible,
  initialSettings,
  onGenerate,
  onClose,
}) => {
  const { colors } = useTheme();
  const [settings, setSettings] = useState<PDFSettings>(initialSettings);
  const [isKeyboardVisible, setKeyboardVisible] = useState(false);

  const pageSizes: { id: PageSize; label: string }[] = [
    { id: 'A4', label: 'A4' },
    { id: 'LETTER', label: 'Carta' },
    { id: 'LEGAL', label: 'Oficio' },
  ];

  const orientations: { id: PageOrientation; label: string; icon: string }[] = [
    { id: 'portrait', label: 'Vertical', icon: 'document-outline' },
    { id: 'landscape', label: 'Horizontal', icon: 'document-text-outline' },
  ];

  return (
    <Modal visible={visible} animationType="slide" transparent={true} onRequestClose={onClose}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={[styles.overlay, { backgroundColor: colors.modalOverlay }]}>
        <View style={[styles.modalContainer, { backgroundColor: colors.cardBg, borderColor: colors.border }, isKeyboardVisible && styles.modalContainerKeyboard]}>
          <View style={[styles.header, { borderBottomColor: colors.border }]}>
            <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>Ajustes del PDF</Text>
            <TouchableOpacity onPress={onClose} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
              <Ionicons name="close" size={24} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.scrollContent} showsVerticalScrollIndicator={false}>
            {/* Title Input */}
            <View style={styles.section}>
              <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>Nombre del Archivo</Text>
              <View style={[styles.inputContainer, { backgroundColor: colors.cardBgElevated, borderColor: colors.border }]}>
                <Ionicons name="create-outline" size={20} color={colors.primaryLight} />
                <TextInput
                  style={[styles.input, { color: colors.textPrimary }]}
                  value={settings.documentTitle}
                  onChangeText={(text) => setSettings({ ...settings, documentTitle: text })}
                  placeholder="Ej. Documento_Escaneado"
                  placeholderTextColor={colors.textMuted}
                />
              </View>
            </View>

            {/* Page Size Selector */}
            <View style={styles.section}>
              <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>Tamaño de Página</Text>
              <View style={styles.optionsRow}>
                {pageSizes.map((ps) => {
                  const isSelected = settings.pageSize === ps.id;
                  return (
                    <TouchableOpacity
                      key={ps.id}
                      style={[
                        styles.optionBtn,
                        { backgroundColor: colors.cardBgElevated, borderColor: colors.border },
                        isSelected && { backgroundColor: colors.primaryDark, borderColor: colors.primaryLight },
                      ]}
                      onPress={() => setSettings({ ...settings, pageSize: ps.id })}
                    >
                      <Text style={[styles.optionText, { color: isSelected ? '#FFF' : colors.textSecondary }]}>{ps.label}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            {/* Orientation */}
            <View style={styles.section}>
              <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>Orientación</Text>
              <View style={styles.optionsRow}>
                {orientations.map((ori) => {
                  const isSelected = settings.orientation === ori.id;
                  return (
                    <TouchableOpacity
                      key={ori.id}
                      style={[
                        styles.optionBtn,
                        { backgroundColor: colors.cardBgElevated, borderColor: colors.border },
                        isSelected && { backgroundColor: colors.primaryDark, borderColor: colors.primaryLight },
                      ]}
                      onPress={() => setSettings({ ...settings, orientation: ori.id })}
                    >
                      <Ionicons name={ori.icon as any} size={16} color={isSelected ? '#FFF' : colors.textSecondary} />
                      <Text style={[styles.optionText, { color: isSelected ? '#FFF' : colors.textSecondary, marginLeft: 6 }]}>{ori.label}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            {/* Margins */}
            <View style={styles.section}>
              <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>Márgenes</Text>
              <View style={styles.optionsRow}>
                {[
                  { id: 'none', label: 'Sin Margen' },
                  { id: 'small', label: 'Estrecho' },
                  { id: 'medium', label: 'Medio' },
                ].map((margin) => {
                  const isSelected = settings.margin === margin.id;
                  return (
                    <TouchableOpacity
                      key={margin.id}
                      style={[
                        styles.optionBtn,
                        { backgroundColor: colors.cardBgElevated, borderColor: colors.border },
                        isSelected && { backgroundColor: colors.primaryDark, borderColor: colors.primaryLight },
                      ]}
                      onPress={() => setSettings({ ...settings, margin: margin.id as PageMargin })}
                    >
                      <Text style={[styles.optionText, { color: isSelected ? '#FFF' : colors.textSecondary }]}>{margin.label}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
          </ScrollView>

          {/* Confirm Button */}
          <View style={[styles.footer, { borderTopColor: colors.border }]}>
            <TouchableOpacity style={[styles.generateBtn, { backgroundColor: colors.primary }]} onPress={() => onGenerate(settings)}>
              <Text style={styles.generateBtnText}>Generar PDF</Text>
              <Ionicons name="arrow-forward" size={20} color="#FFF" />
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  modalContainer: {
    borderTopLeftRadius: RADIUS.lg,
    borderTopRightRadius: RADIUS.lg,
    maxHeight: '90%',
    minHeight: '60%',
    borderWidth: 1,
  },
  modalContainerKeyboard: {
    minHeight: '40%',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: SPACING.lg,
    borderBottomWidth: 1,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  scrollContent: {
    padding: SPACING.lg,
  },
  section: {
    marginBottom: SPACING.xl,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: SPACING.sm,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: RADIUS.md,
    paddingHorizontal: SPACING.md,
    height: 50,
  },
  input: {
    flex: 1,
    marginLeft: SPACING.sm,
    fontSize: 16,
    height: '100%',
  },
  optionsRow: {
    flexDirection: 'row',
    gap: SPACING.sm,
  },
  optionBtn: {
    flex: 1,
    flexDirection: 'row',
    paddingVertical: SPACING.sm + 4,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: RADIUS.sm,
    borderWidth: 1,
  },
  optionText: {
    fontSize: 14,
    fontWeight: '600',
  },
  footer: {
    padding: SPACING.lg,
    borderTopWidth: 1,
  },
  generateBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.sm,
    paddingVertical: SPACING.md,
    borderRadius: RADIUS.md,
    elevation: 2,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
  },
  generateBtnText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '700',
  },
});
