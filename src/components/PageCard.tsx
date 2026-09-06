import React from 'react';
import { View, Text, Image, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { PageImage } from '../types';
import { COLORS, SPACING, RADIUS, FILTER_PRESETS } from '../constants/theme';

interface PageCardProps {
  page: PageImage;
  index: number;
  totalPages: number;
  isSelected: boolean;
  onSelect: () => void;
  onRotate: () => void;
  onDelete: () => void;
  onCrop: () => void;
  onMoveUp?: () => void;
  onMoveDown?: () => void;
}

export const PageCard: React.FC<PageCardProps> = ({
  page,
  index,
  totalPages,
  isSelected,
  onSelect,
  onRotate,
  onDelete,
  onCrop,
  onMoveUp,
  onMoveDown,
}) => {
  const currentFilterLabel =
    FILTER_PRESETS.find((f) => f.id === page.filter)?.label || 'Original';

  return (
    <TouchableOpacity
      style={[styles.card, isSelected && styles.cardSelected]}
      onPress={onSelect}
      activeOpacity={0.9}
    >
      {/* Thumbnail Container */}
      <View style={styles.imageContainer}>
        <Image
          source={{ uri: page.uri }}
          style={[
            styles.thumbnail,
            { transform: [{ rotate: `${page.rotation}deg` }] },
          ]}
          resizeMode="contain"
        />

        {/* Page Number Badge */}
        <View style={styles.pageBadge}>
          <Text style={styles.pageBadgeText}>{index + 1}</Text>
        </View>

        {/* Filter Tag */}
        {page.filter !== 'original' && (
          <View style={styles.filterTag}>
            <Ionicons name="color-filter-outline" size={10} color="#FFF" />
            <Text style={styles.filterTagText}>{currentFilterLabel}</Text>
          </View>
        )}
      </View>

      {/* Control Buttons Footer */}
      <View style={styles.actionsBar}>
        {/* Reorder Buttons */}
        <View style={styles.reorderGroup}>
          <TouchableOpacity
            style={[styles.iconBtn, index === 0 && styles.iconBtnDisabled]}
            onPress={onMoveUp}
            disabled={index === 0}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Ionicons
              name="chevron-up"
              size={18}
              color={index === 0 ? COLORS.textMuted : COLORS.textPrimary}
            />
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.iconBtn, index === totalPages - 1 && styles.iconBtnDisabled]}
            onPress={onMoveDown}
            disabled={index === totalPages - 1}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Ionicons
              name="chevron-down"
              size={18}
              color={index === totalPages - 1 ? COLORS.textMuted : COLORS.textPrimary}
            />
          </TouchableOpacity>
        </View>

        {/* Edit/Crop Button */}
        <TouchableOpacity
          style={styles.iconBtn}
          onPress={onCrop}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Ionicons name="crop" size={16} color={COLORS.primaryLight} />
        </TouchableOpacity>

        {/* Rotate Button */}
        <TouchableOpacity
          style={styles.iconBtn}
          onPress={onRotate}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Ionicons name="reload" size={16} color={COLORS.primaryLight} />
        </TouchableOpacity>

        {/* Delete Button */}
        <TouchableOpacity
          style={[styles.iconBtn, styles.deleteBtn]}
          onPress={onDelete}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Ionicons name="trash-outline" size={16} color={COLORS.accentRed} />
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: COLORS.cardBg,
    borderRadius: RADIUS.md,
    overflow: 'hidden',
    borderWidth: 1.5,
    borderColor: COLORS.border,
    marginBottom: SPACING.md,
  },
  cardSelected: {
    borderColor: COLORS.primaryLight,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  imageContainer: {
    height: 350,
    width: '100%',
    backgroundColor: '#050811',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    overflow: 'hidden',
  },
  thumbnail: {
    width: '100%',
    height: '100%',
  },
  pageBadge: {
    position: 'absolute',
    top: SPACING.xs + 2,
    left: SPACING.xs + 2,
    backgroundColor: COLORS.primary,
    paddingHorizontal: SPACING.sm,
    paddingVertical: 2,
    borderRadius: RADIUS.xs,
  },
  pageBadgeText: {
    color: '#FFF',
    fontWeight: '700',
    fontSize: 12,
  },
  filterTag: {
    position: 'absolute',
    bottom: SPACING.xs + 2,
    right: SPACING.xs + 2,
    backgroundColor: 'rgba(15, 23, 42, 0.85)',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: SPACING.xs + 2,
    paddingVertical: 2,
    borderRadius: RADIUS.xs,
    borderWidth: 0.5,
    borderColor: COLORS.primaryLight,
  },
  filterTagText: {
    color: COLORS.primaryLight,
    fontSize: 10,
    fontWeight: '600',
  },
  actionsBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xs + 2,
    backgroundColor: COLORS.cardBgElevated,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  reorderGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  iconBtn: {
    padding: SPACING.xs - 2,
    borderRadius: RADIUS.xs,
    backgroundColor: COLORS.cardBg,
  },
  iconBtnDisabled: {
    opacity: 0.3,
  },
  deleteBtn: {
    backgroundColor: 'rgba(239, 68, 68, 0.12)',
  },
});
