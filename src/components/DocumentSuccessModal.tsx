import React from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SPACING, RADIUS } from '../constants/theme';
import { useTheme } from '../contexts/ThemeContext';

interface DocumentSuccessModalProps {
  visible: boolean;
  title: string;
  subtitle: string;
  documentTitle: string;
  pageCount: number;
  primaryButtonText?: string;
  secondaryButtonText?: string;
  onViewDocument: () => void;
  onGoHome: () => void;
}

const { width } = Dimensions.get('window');

export const DocumentSuccessModal: React.FC<DocumentSuccessModalProps> = ({
  visible,
  title,
  subtitle,
  documentTitle,
  pageCount,
  primaryButtonText = 'Ver Documento',
  secondaryButtonText = 'Ir al Inicio',
  onViewDocument,
  onGoHome,
}) => {
  const { colors, isDark } = useTheme();

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onGoHome}
    >
      <View style={[styles.backdrop, { backgroundColor: colors.modalOverlay }]}>
        <View
          style={[
            styles.card,
            {
              backgroundColor: colors.cardBg,
              borderColor: colors.border,
            },
          ]}
        >
          {/* Glowing Success Badge */}
          <View style={[styles.iconGlow, { backgroundColor: colors.primaryGlow }]}>
            <Ionicons name="checkmark-circle" size={48} color={colors.primary} />
          </View>

          {/* Titles */}
          <Text style={[styles.title, { color: colors.textPrimary }]}>
            {title}
          </Text>
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
            {subtitle}
          </Text>

          {/* Document Summary Card */}
          <View
            style={[
              styles.docBox,
              {
                backgroundColor: colors.cardBgElevated,
                borderColor: colors.border,
              },
            ]}
          >
            <View
              style={[
                styles.docIconBox,
                { backgroundColor: colors.primaryGlow },
              ]}
            >
              <Ionicons name="document-text" size={24} color={colors.primary} />
            </View>
            <View style={styles.docTexts}>
              <Text
                style={[styles.docTitle, { color: colors.textPrimary }]}
                numberOfLines={1}
              >
                {documentTitle}
              </Text>
              <View style={styles.docMetaRow}>
                <View
                  style={[
                    styles.badge,
                    {
                      backgroundColor: colors.primaryGlow,
                      borderColor: colors.primaryLight,
                    },
                  ]}
                >
                  <Text style={[styles.badgeText, { color: colors.primaryLight }]}>
                    {pageCount} {pageCount === 1 ? 'página' : 'páginas'}
                  </Text>
                </View>
                <Text style={[styles.formatTag, { color: colors.textMuted }]}>
                  • PDF
                </Text>
              </View>
            </View>
          </View>

          {/* Action Buttons */}
          <View style={styles.actions}>
            {/* Primary Action: View Document */}
            <TouchableOpacity
              style={[styles.primaryBtn, { backgroundColor: colors.primary }]}
              onPress={onViewDocument}
              activeOpacity={0.85}
            >
              <Ionicons name="eye-outline" size={20} color="#FFF" />
              <Text style={styles.primaryBtnText}>{primaryButtonText}</Text>
            </TouchableOpacity>

            {/* Secondary Action: Go Home */}
            <TouchableOpacity
              style={[
                styles.secondaryBtn,
                {
                  backgroundColor: colors.cardBgElevated,
                  borderColor: colors.border,
                },
              ]}
              onPress={onGoHome}
              activeOpacity={0.8}
            >
              <Ionicons
                name="home-outline"
                size={18}
                color={colors.textPrimary}
              />
              <Text
                style={[styles.secondaryBtnText, { color: colors.textPrimary }]}
              >
                {secondaryButtonText}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: SPACING.lg,
  },
  card: {
    width: '100%',
    maxWidth: 380,
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.35,
    shadowRadius: 16,
    elevation: 12,
  },
  iconGlow: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 20,
    fontWeight: '800',
    textAlign: 'center',
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 20,
    paddingHorizontal: 8,
  },
  docBox: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
    marginBottom: 20,
    gap: 12,
  },
  docIconBox: {
    width: 44,
    height: 44,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  docTexts: {
    flex: 1,
  },
  docTitle: {
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 4,
  },
  docMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  badge: {
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 4,
    borderWidth: 0.5,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: '700',
  },
  formatTag: {
    fontSize: 11,
    fontWeight: '600',
  },
  actions: {
    width: '100%',
    gap: 10,
  },
  primaryBtn: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 12,
    gap: 8,
    elevation: 4,
  },
  primaryBtnText: {
    color: '#FFF',
    fontSize: 15,
    fontWeight: '700',
  },
  secondaryBtn: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    gap: 6,
  },
  secondaryBtnText: {
    fontSize: 14,
    fontWeight: '600',
  },
});
