import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ImageFilterType } from '../types';
import { SPACING, RADIUS, FILTER_PRESETS } from '../constants/theme';
import { useTheme } from '../contexts/ThemeContext';

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
  const { colors } = useTheme();

  return (
    <View style={[styles.container, { backgroundColor: colors.cardBg, borderTopColor: colors.border }]}>
      <View style={styles.headerRow}>
        <Text style={[styles.title, { color: colors.textSecondary }]}>Filtros LibrePDF</Text>
        {onApplyToAll && (
          <TouchableOpacity
            onPress={() => onApplyToAll(currentFilter)}
            activeOpacity={0.7}
          >
            <Text style={[styles.applyAllText, { color: colors.primary }]}>Aplicar a todas las páginas</Text>
          </TouchableOpacity>
        )}
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {FILTER_PRESETS.map((preset) => {
          const isActive = currentFilter === preset.id;
          return (
            <TouchableOpacity
              key={preset.id}
              style={[
                styles.filterItem,
                isActive && { backgroundColor: colors.primaryGlow, borderColor: colors.primary },
              ]}
              onPress={() => onSelectFilter(preset.id as ImageFilterType)}
              activeOpacity={0.7}
            >
              <View style={[styles.iconBox, isActive ? { backgroundColor: colors.primary } : { backgroundColor: colors.cardBgElevated }]}>
                <Ionicons
                  name={preset.icon as any}
                  size={20}
                  color={isActive ? '#FFF' : colors.textSecondary}
                />
              </View>
              <Text style={[styles.filterLabel, { color: isActive ? colors.primary : colors.textSecondary }]}>
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
    paddingVertical: SPACING.md,
    borderTopWidth: 1,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.md,
    marginBottom: SPACING.xs + 4,
  },
  title: {
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  applyAllText: {
    fontSize: 12,
    fontWeight: '600',
  },
  scrollContent: {
    paddingHorizontal: SPACING.md,
    gap: SPACING.md,
  },
  filterItem: {
    alignItems: 'center',
    padding: SPACING.sm,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: 'transparent',
    width: 76,
  },
  iconBox: {
    width: 44,
    height: 44,
    borderRadius: RADIUS.full,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SPACING.xs,
  },
  filterLabel: {
    fontSize: 11,
    fontWeight: '600',
    textAlign: 'center',
  },
});
