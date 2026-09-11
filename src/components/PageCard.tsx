import React from 'react';
import { View, Text, Image, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { PageImage } from '../types';
import { SPACING, RADIUS, FILTER_PRESETS } from '../constants/theme';
import { useTheme } from '../contexts/ThemeContext';

interface PageCardProps {
  page: PageImage;
  index: number;
  totalPages: number;
  isSelected: boolean;
  onSelect: (index: number) => void;
  onRotate: (index: number) => void;
  onDelete: (index: number) => void;
  onCrop: (index: number) => void;
  onLayout: (index: number) => void;
  onMoveUp?: (index: number) => void;
  onMoveDown?: (index: number) => void;
}

export const PageCard = React.memo<PageCardProps>(({
  page,
  index,
  totalPages,
  isSelected,
  onSelect,
  onRotate,
  onDelete,
  onCrop,
  onLayout,
  onMoveUp,
  onMoveDown,
}) => {
  const { colors } = useTheme();
  const currentFilterLabel =
    FILTER_PRESETS.find((f) => f.id === page.filter)?.label || 'Original';

  return (
    <TouchableOpacity
      style={[
        styles.card, 
        { backgroundColor: colors.cardBg, borderColor: colors.border },
        isSelected && [styles.cardSelected, { borderColor: colors.primary, shadowColor: colors.primary }]
      ]}
      onPress={() => onSelect(index)}
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
        <View style={[styles.pageBadge, { backgroundColor: colors.primary }]}>
          <Text style={styles.pageBadgeText}>{index + 1}</Text>
        </View>

        {/* Filter Tag */}
        {page.filter !== 'original' && (
          <View style={[styles.filterTag, { borderColor: colors.primary }]}>
            <Ionicons name="color-filter-outline" size={10} color="#FFF" />
            <Text style={[styles.filterTagText, { color: colors.primary }]}>{currentFilterLabel}</Text>
          </View>
        )}
      </View>

      {/* Control Buttons Footer */}
      <View style={[styles.actionsBar, { backgroundColor: colors.cardBgElevated, borderTopColor: colors.border }]}>
        {/* Reorder Buttons */}
        <View style={styles.reorderGroup}>
          <TouchableOpacity
            style={[styles.iconBtn, { backgroundColor: colors.cardBg }, index === 0 && styles.iconBtnDisabled]}
            onPress={() => onMoveUp && onMoveUp(index)}
            disabled={index === 0}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Ionicons
              name="chevron-up"
              size={18}
              color={index === 0 ? colors.textMuted : colors.textPrimary}
            />
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.iconBtn, { backgroundColor: colors.cardBg }, index === totalPages - 1 && styles.iconBtnDisabled]}
            onPress={() => onMoveDown && onMoveDown(index)}
            disabled={index === totalPages - 1}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Ionicons
              name="chevron-down"
              size={18}
              color={index === totalPages - 1 ? colors.textMuted : colors.textPrimary}
            />
          </TouchableOpacity>
        </View>

        {/* Edit/Crop Button */}
        <TouchableOpacity
          style={[styles.iconBtn, { backgroundColor: colors.cardBg }]}
          onPress={() => onCrop(index)}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Ionicons name="crop" size={16} color={colors.primary} />
        </TouchableOpacity>

        {/* Rotate Button */}
        <TouchableOpacity
          style={[styles.iconBtn, { backgroundColor: colors.cardBgElevated }]}
          onPress={() => onRotate(index)}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Ionicons name="refresh-outline" size={18} color={colors.textPrimary} />
        </TouchableOpacity>

        {/* Layout Button */}
        <TouchableOpacity
          style={[styles.iconBtn, { backgroundColor: colors.cardBgElevated }]}
          onPress={() => onLayout(index)}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Ionicons name="move-outline" size={18} color={colors.textPrimary} />
        </TouchableOpacity>

        {/* Delete Button */}
        <TouchableOpacity
          style={[styles.iconBtn, styles.deleteBtn]}
          onPress={() => onDelete(index)}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Ionicons name="trash-outline" size={16} color={colors.accentRed} />
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );
});

const styles = StyleSheet.create({
  card: {
    borderRadius: RADIUS.md,
    overflow: 'hidden',
    borderWidth: 1.5,
    marginBottom: SPACING.md,
  },
  cardSelected: {
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
  },
  filterTagText: {
    fontSize: 10,
    fontWeight: '600',
  },
  actionsBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xs + 2,
    borderTopWidth: 1,
  },
  reorderGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  iconBtn: {
    padding: SPACING.xs - 2,
    borderRadius: RADIUS.xs,
  },
  iconBtnDisabled: {
    opacity: 0.3,
  },
  deleteBtn: {
    backgroundColor: 'rgba(239, 68, 68, 0.12)',
  },
});
