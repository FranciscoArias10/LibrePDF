import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ImageFilterType } from '../types';
import { COLORS, SPACING, RADIUS, FILTER_PRESETS } from '../constants/theme';

interface FilterPickerProps {
  currentFilter: ImageFilterType;
  onSelectFilter: (filter: ImageFilterType) => void;
  onApplyToAll?: (filter: ImageFilterType) => void;
}

export const FilterPicker: React.FC<FilterPickerProps> = ({
  currentFilter,
  onSelectFilter,
  onApplyToAll,
}) => {
  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        <Text style={styles.title}>Filtros CamScanner</Text>
        {onApplyToAll && (
          <TouchableOpacity
            onPress={() => onApplyToAll(currentFilter)}
            activeOpacity={0.7}
          >
            <Text style={styles.applyAllText}>Aplicar a todas las páginas</Text>
          </TouchableOpacity>
        )}
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContainer}
      >
        {FILTER_PRESETS.map((preset) => {
          const isActive = currentFilter === preset.id;
          return (
            <TouchableOpacity
              key={preset.id}
              style={[styles.presetCard, isActive && styles.presetCardActive]}
              onPress={() => onSelectFilter(preset.id as ImageFilterType)}
              activeOpacity={0.8}
            >
              <View style={[styles.iconWrapper, isActive && styles.iconWrapperActive]}>
                <Ionicons
                  name={preset.icon as any}
                  size={20}
                  color={isActive ? '#FFF' : COLORS.textSecondary}
                />
              </View>
              <Text style={[styles.presetLabel, isActive && styles.presetLabelActive]}>
                {preset.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: COLORS.cardBg,
    paddingVertical: SPACING.sm + 2,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.md,
    marginBottom: SPACING.xs + 4,
  },
  title: {
    color: COLORS.textSecondary,
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  applyAllText: {
    color: COLORS.primaryLight,
    fontSize: 12,
    fontWeight: '600',
  },
  scrollContainer: {
    paddingHorizontal: SPACING.md,
    gap: SPACING.sm + 4,
  },
  presetCard: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: SPACING.sm + 4,
    paddingVertical: SPACING.xs + 4,
    backgroundColor: COLORS.cardBgElevated,
    borderRadius: RADIUS.sm,
    borderWidth: 1,
    borderColor: COLORS.border,
    minWidth: 90,
  },
  presetCardActive: {
    backgroundColor: COLORS.primaryDark,
    borderColor: COLORS.primaryLight,
  },
  iconWrapper: {
    width: 32,
    height: 32,
    borderRadius: RADIUS.xs,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  iconWrapperActive: {
    backgroundColor: COLORS.primary,
  },
  presetLabel: {
    fontSize: 11,
    color: COLORS.textMuted,
    fontWeight: '600',
  },
  presetLabelActive: {
    color: '#FFF',
    fontWeight: '700',
  },
});
