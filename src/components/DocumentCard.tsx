import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SavedPDFDocument } from '../types';
import { formatFileSize } from '../utils/storage';
import { SPACING, RADIUS } from '../constants/theme';
import { useTheme } from '../contexts/ThemeContext';

interface DocumentCardProps {
  document: SavedPDFDocument;
  onPress: () => void;
  onShare: () => void;
  onDelete: () => void;
}

export const DocumentCard: React.FC<DocumentCardProps> = ({
  document,
  onPress,
  onShare,
  onDelete,
}) => {
  const { colors, isDark } = useTheme();
  
  const formattedDate = new Date(document.createdAt).toLocaleDateString('es-ES', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  return (
    <TouchableOpacity
      style={[styles.card, { backgroundColor: colors.cardBg, borderColor: colors.border }]}
      onPress={onPress}
      activeOpacity={0.85}
    >
      <View style={[styles.thumbnailBox, { backgroundColor: colors.cardBgElevated, borderColor: colors.borderLight }]}>
        <Ionicons name="document-text-sharp" size={32} color={colors.primaryLight} />
        <View style={[styles.badgeContainer, { backgroundColor: colors.primaryDark, borderColor: colors.primaryLight }]}>
          <Text style={styles.badgeText}>{document.pageCount} págs</Text>
        </View>
      </View>

      <View style={styles.infoContainer}>
        <Text style={[styles.title, { color: colors.textPrimary }]} numberOfLines={1}>
          {document.title}
        </Text>
        <Text style={[styles.metaText, { color: colors.textMuted }]}>{formattedDate}</Text>
        <View style={styles.statsRow}>
          <Text style={[styles.sizeTag, { color: colors.textSecondary }]}>{formatFileSize(document.fileSize)}</Text>
          <Text style={[styles.bullet, { color: colors.textMuted }]}>•</Text>
          <Text style={[styles.formatTag, { color: colors.primaryLight }]}>PDF</Text>
        </View>
      </View>

      <View style={styles.actionsGroup}>
        <TouchableOpacity
          style={[styles.actionBtn, { backgroundColor: colors.cardBgElevated }]}
          onPress={onShare}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Ionicons name="share-social-outline" size={20} color={colors.primaryLight} />
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.actionBtn, 
            { backgroundColor: isDark ? 'rgba(239, 68, 68, 0.25)' : 'rgba(239, 68, 68, 0.12)' }
          ]}
          onPress={onDelete}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Ionicons name="trash-outline" size={20} color={colors.accentRed} />
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: RADIUS.md,
    padding: SPACING.sm + 4,
    marginBottom: SPACING.sm + 4,
    borderWidth: 1,
  },
  thumbnailBox: {
    width: 56,
    height: 64,
    borderRadius: RADIUS.sm,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: SPACING.md,
    borderWidth: 1,
    position: 'relative',
  },
  badgeContainer: {
    position: 'absolute',
    bottom: -4,
    paddingHorizontal: 4,
    paddingVertical: 1,
    borderRadius: 4,
    borderWidth: 0.5,
  },
  badgeText: {
    color: '#FFF',
    fontSize: 9,
    fontWeight: '700',
  },
  infoContainer: {
    flex: 1,
  },
  title: {
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 2,
  },
  metaText: {
    fontSize: 12,
    marginBottom: 4,
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  sizeTag: {
    fontSize: 11,
    fontWeight: '600',
  },
  bullet: {
    fontSize: 10,
  },
  formatTag: {
    fontSize: 10,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  actionsGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
  },
  actionBtn: {
    width: 36,
    height: 36,
    borderRadius: RADIUS.xs,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
