import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SavedPDFDocument } from '../types';
import { formatFileSize } from '../utils/storage';
import { COLORS, SPACING, RADIUS } from '../constants/theme';

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
  const formattedDate = new Date(document.createdAt).toLocaleDateString('es-ES', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  return (
    <TouchableOpacity
      style={styles.card}
      onPress={onPress}
      activeOpacity={0.85}
    >
      {/* Icon/Thumbnail Box */}
      <View style={styles.thumbnailBox}>
        <Ionicons name="document-text-sharp" size={32} color={COLORS.primaryLight} />
        <View style={styles.badgeContainer}>
          <Text style={styles.badgeText}>{document.pageCount} págs</Text>
        </View>
      </View>

      {/* Details Container */}
      <View style={styles.infoContainer}>
        <Text style={styles.title} numberOfLines={1}>
          {document.title}
        </Text>
        <Text style={styles.metaText}>{formattedDate}</Text>
        <View style={styles.statsRow}>
          <Text style={styles.sizeTag}>{formatFileSize(document.fileSize)}</Text>
          <Text style={styles.bullet}>•</Text>
          <Text style={styles.formatTag}>PDF</Text>
        </View>
      </View>

      {/* Action Buttons */}
      <View style={styles.actionsGroup}>
        <TouchableOpacity
          style={styles.actionBtn}
          onPress={onShare}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Ionicons name="share-social-outline" size={20} color={COLORS.primaryLight} />
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.actionBtn, styles.deleteActionBtn]}
          onPress={onDelete}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Ionicons name="trash-outline" size={20} color={COLORS.accentRed} />
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.cardBg,
    borderRadius: RADIUS.md,
    padding: SPACING.sm + 4,
    marginBottom: SPACING.sm + 4,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  thumbnailBox: {
    width: 56,
    height: 64,
    borderRadius: RADIUS.sm,
    backgroundColor: COLORS.cardBgElevated,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.borderLight,
    position: 'relative',
  },
  badgeContainer: {
    position: 'absolute',
    bottom: -4,
    backgroundColor: COLORS.primaryDark,
    paddingHorizontal: 4,
    paddingVertical: 1,
    borderRadius: 4,
    borderWidth: 0.5,
    borderColor: COLORS.primaryLight,
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
    color: COLORS.textPrimary,
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 2,
  },
  metaText: {
    color: COLORS.textMuted,
    fontSize: 12,
    marginBottom: 4,
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  sizeTag: {
    color: COLORS.textSecondary,
    fontSize: 11,
    fontWeight: '600',
  },
  bullet: {
    color: COLORS.textMuted,
    fontSize: 10,
  },
  formatTag: {
    color: COLORS.primaryLight,
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
    backgroundColor: COLORS.cardBgElevated,
    alignItems: 'center',
    justifyContent: 'center',
  },
  deleteActionBtn: {
    backgroundColor: 'rgba(239, 68, 68, 0.12)',
  },
});
