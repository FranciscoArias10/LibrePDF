import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Image,
  Animated,
  PanResponder,
  useWindowDimensions,
  Vibration,
  GestureResponderEvent,
  PanResponderGestureState,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { SPACING, RADIUS } from '../constants/theme';
import { useTheme } from '../contexts/ThemeContext';

export interface ReorderPagesModalProps<T> {
  visible: boolean;
  items: T[];
  getItemKey: (item: T) => string;
  getItemUri: (item: T) => string;
  getItemRotation?: (item: T) => number;
  getItemBadge?: (item: T, index: number) => string | undefined;
  title?: string;
  onSave: (reorderedItems: T[]) => void;
  onClose: () => void;
}

export function ReorderPagesModal<T>({
  visible,
  items: initialItems,
  getItemKey,
  getItemUri,
  getItemRotation,
  getItemBadge,
  title = 'Organizar Páginas',
  onSave,
  onClose,
}: ReorderPagesModalProps<T>) {
  const { colors, isDark } = useTheme();
  const { width } = useWindowDimensions();

  // Local state for the ordered items
  const [items, setItems] = useState<T[]>(initialItems);
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [originalItems, setOriginalItems] = useState<T[]>(initialItems);

  // Drag and drop state
  const [draggingIndex, setDraggingIndex] = useState<number | null>(null);
  const [targetIndex, setTargetIndex] = useState<number | null>(null);
  const [infoBanner, setInfoBanner] = useState<string | null>(null);

  // Animated values for the floating item during drag
  const pan = useRef(new Animated.ValueXY({ x: 0, y: 0 })).current;
  const dragScale = useRef(new Animated.Value(1)).current;

  // Grid sizing calculations (3 columns)
  const NUM_COLS = 3;
  const GRID_PADDING = SPACING.md;
  const GRID_GAP = 10;
  const availableWidth = width - GRID_PADDING * 2;
  const itemWidth = Math.floor((availableWidth - (NUM_COLS - 1) * GRID_GAP) / NUM_COLS);
  const itemHeight = Math.floor(itemWidth * 1.35);

  // Sync with initial items when modal opens
  useEffect(() => {
    if (visible) {
      setItems([...initialItems]);
      setOriginalItems([...initialItems]);
      setSelectedIndex(null);
      setDraggingIndex(null);
      setTargetIndex(null);
      setInfoBanner(null);
    }
  }, [visible, initialItems]);

  const hasChanges = JSON.stringify(items.map(getItemKey)) !== JSON.stringify(originalItems.map(getItemKey));

  // Quick action: Move single item by step
  const moveItem = useCallback((fromIdx: number, toIdx: number) => {
    if (toIdx < 0 || toIdx >= items.length || fromIdx === toIdx) return;
    const updated = [...items];
    const [moved] = updated.splice(fromIdx, 1);
    updated.splice(toIdx, 0, moved);
    setItems(updated);
    setSelectedIndex(toIdx);
    Vibration.vibrate(20);
  }, [items]);

  // Invert entire order
  const handleInvertOrder = () => {
    if (items.length <= 1) return;
    const reversed = [...items].reverse();
    setItems(reversed);
    if (selectedIndex !== null) {
      setSelectedIndex(items.length - 1 - selectedIndex);
    }
    Vibration.vibrate(30);
    showBanner('Orden invertido (última página a primera)');
  };

  // Reset to original
  const handleResetOrder = () => {
    setItems([...originalItems]);
    setSelectedIndex(null);
    Vibration.vibrate(20);
    showBanner('Orden restablecido al original');
  };

  const showBanner = (msg: string) => {
    setInfoBanner(msg);
    setTimeout(() => {
      setInfoBanner((prev) => (prev === msg ? null : prev));
    }, 2500);
  };

  // Start dragging a specific item
  const startDrag = (index: number) => {
    Vibration.vibrate(40);
    setDraggingIndex(index);
    setTargetIndex(index);
    setSelectedIndex(index);
    pan.setValue({ x: 0, y: 0 });

    Animated.spring(dragScale, {
      toValue: 1.08,
      useNativeDriver: true,
      friction: 5,
    }).start();
  };

  // Handle drag movement
  const handleDragMove = (gestureState: PanResponderGestureState, fromIndex: number) => {
    pan.setValue({ x: gestureState.dx, y: gestureState.dy });

    // Calculate grid delta
    const colDelta = Math.round(gestureState.dx / (itemWidth + GRID_GAP));
    const rowDelta = Math.round(gestureState.dy / (itemHeight + GRID_GAP));

    const fromCol = fromIndex % NUM_COLS;
    const fromRow = Math.floor(fromIndex / NUM_COLS);

    const toCol = Math.max(0, Math.min(NUM_COLS - 1, fromCol + colDelta));
    const toRow = Math.max(0, fromRow + rowDelta);

    let calculatedTarget = toRow * NUM_COLS + toCol;
    calculatedTarget = Math.max(0, Math.min(items.length - 1, calculatedTarget));

    if (calculatedTarget !== targetIndex) {
      setTargetIndex(calculatedTarget);
    }
  };

  // Complete drag and drop
  const endDrag = (fromIndex: number) => {
    Animated.spring(dragScale, {
      toValue: 1,
      useNativeDriver: true,
      friction: 5,
    }).start();

    if (targetIndex !== null && targetIndex !== fromIndex) {
      const updated = [...items];
      const [moved] = updated.splice(fromIndex, 1);
      updated.splice(targetIndex, 0, moved);
      setItems(updated);
      setSelectedIndex(targetIndex);
      Vibration.vibrate(25);
    }

    setDraggingIndex(null);
    setTargetIndex(null);
    pan.setValue({ x: 0, y: 0 });
  };

  // Create PanResponder for an item
  const createPanResponder = (index: number) => {
    return PanResponder.create({
      onStartShouldSetPanResponder: () => false,
      onMoveShouldSetPanResponder: (_, gestureState) => {
        // Activate if dragged beyond threshold
        return Math.abs(gestureState.dx) > 8 || Math.abs(gestureState.dy) > 8;
      },
      onPanResponderGrant: () => {
        startDrag(index);
      },
      onPanResponderMove: (_, gestureState) => {
        handleDragMove(gestureState, index);
      },
      onPanResponderRelease: () => {
        endDrag(index);
      },
      onPanResponderTerminate: () => {
        endDrag(index);
      },
    });
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={false}
      onRequestClose={onClose}
    >
      <SafeAreaView
        style={[styles.container, { backgroundColor: colors.background }]}
        edges={['top', 'left', 'right', 'bottom']}
      >
        {/* Header */}
        <View style={[styles.header, { backgroundColor: colors.cardBg, borderBottomColor: colors.border }]}>
          <TouchableOpacity
            style={[styles.headerBtn, { backgroundColor: colors.cardBgElevated }]}
            onPress={onClose}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Ionicons name="close" size={20} color={colors.textPrimary} />
          </TouchableOpacity>

          <View style={styles.headerTitleCenter}>
            <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>
              {title}
            </Text>
            <Text style={[styles.headerSubtitle, { color: colors.textSecondary }]}>
              {items.length} {items.length === 1 ? 'página' : 'páginas'} • Arrastra o usa los controles
            </Text>
          </View>

          {/* Quick reverse tool */}
          <TouchableOpacity
            style={[
              styles.actionHeaderBtn,
              { backgroundColor: colors.cardBgElevated, borderColor: colors.border },
            ]}
            onPress={handleInvertOrder}
            activeOpacity={0.7}
            hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
          >
            <Ionicons name="swap-vertical" size={16} color={colors.primary} />
            <Text style={[styles.actionHeaderBtnText, { color: colors.primary }]}>Invertir</Text>
          </TouchableOpacity>
        </View>

        {/* Temporary Info Banner */}
        {infoBanner && (
          <View style={[styles.banner, { backgroundColor: colors.primary + '18', borderColor: colors.primary }]}>
            <Ionicons name="information-circle" size={16} color={colors.primary} />
            <Text style={[styles.bannerText, { color: colors.primaryLight }]}>{infoBanner}</Text>
          </View>
        )}

        {/* Instructions strip */}
        <View style={[styles.instructionsRow, { backgroundColor: colors.cardBgElevated }]}>
          <Ionicons name="hand-left-outline" size={14} color={colors.textSecondary} />
          <Text style={[styles.instructionsText, { color: colors.textSecondary }]}>
            Mantén presionado el icono de arrastre <Ionicons name="reorder-two" size={12} color={colors.textSecondary} /> o toca una página para moverla.
          </Text>
        </View>

        {/* Grid ScrollView */}
        <ScrollView
          style={styles.scrollArea}
          contentContainerStyle={[styles.gridContainer, { padding: GRID_PADDING, gap: GRID_GAP }]}
          scrollEnabled={draggingIndex === null}
          showsVerticalScrollIndicator={false}
        >
          {items.map((item, index) => {
            const isDragging = draggingIndex === index;
            const isTarget = targetIndex === index && draggingIndex !== null && draggingIndex !== index;
            const isSelected = selectedIndex === index;
            const rotation = getItemRotation ? getItemRotation(item) : 0;
            const badge = getItemBadge ? getItemBadge(item, index) : undefined;
            const panResponder = createPanResponder(index);

            return (
              <Animated.View
                key={getItemKey(item)}
                style={[
                  styles.cardWrapper,
                  {
                    width: itemWidth,
                    height: itemHeight,
                  },
                  isDragging && [
                    styles.draggingCard,
                    {
                      zIndex: 999,
                      transform: [
                        { translateX: pan.x },
                        { translateY: pan.y },
                        { scale: dragScale },
                      ],
                      shadowColor: colors.primary,
                      borderColor: colors.primary,
                    },
                  ],
                ]}
              >
                <TouchableOpacity
                  style={[
                    styles.card,
                    {
                      backgroundColor: colors.cardBg,
                      borderColor: isDragging
                        ? colors.primary
                        : isTarget
                        ? '#10B981'
                        : isSelected
                        ? colors.primary
                        : colors.border,
                      borderWidth: isDragging || isTarget || isSelected ? 2 : 1,
                    },
                  ]}
                  activeOpacity={0.9}
                  onPress={() => setSelectedIndex(isSelected ? null : index)}
                  onLongPress={() => startDrag(index)}
                  delayLongPress={200}
                >
                  {/* Thumbnail Image */}
                  <Image
                    source={{ uri: getItemUri(item) }}
                    style={[
                      styles.cardImage,
                      {
                        transform: [{ rotate: `${rotation}deg` }],
                      },
                    ]}
                    resizeMode="cover"
                  />

                  {/* Page Number Badge */}
                  <View
                    style={[
                      styles.pageBadge,
                      {
                        backgroundColor: isSelected ? colors.primary : 'rgba(15, 23, 42, 0.85)',
                      },
                    ]}
                  >
                    <Text style={styles.pageBadgeText}>{index + 1}</Text>
                  </View>

                  {/* Drag Handle Icon Button */}
                  <View
                    {...panResponder.panHandlers}
                    style={[styles.dragHandle, { backgroundColor: 'rgba(15, 23, 42, 0.85)' }]}
                  >
                    <Ionicons name="reorder-two" size={16} color="#FFF" />
                  </View>

                  {/* Optional Rotation / Custom Badge */}
                  {badge && (
                    <View style={styles.customBadge}>
                      <Text style={styles.customBadgeText} numberOfLines={1}>{badge}</Text>
                    </View>
                  )}

                  {/* Target Insertion Indicator */}
                  {isTarget && (
                    <View style={styles.targetOverlay}>
                      <View style={styles.targetIndicatorCircle}>
                        <Ionicons name="arrow-down-circle" size={26} color="#10B981" />
                      </View>
                    </View>
                  )}
                </TouchableOpacity>
              </Animated.View>
            );
          })}
        </ScrollView>

        {/* Selected Page Quick Move Bar */}
        {selectedIndex !== null && items[selectedIndex] && (
          <View style={[styles.quickBar, { backgroundColor: colors.cardBg, borderTopColor: colors.border }]}>
            <View style={styles.quickBarInfo}>
              <View style={[styles.quickBarPageDot, { backgroundColor: colors.primary }]}>
                <Text style={styles.quickBarPageDotText}>{selectedIndex + 1}</Text>
              </View>
              <Text style={[styles.quickBarLabel, { color: colors.textPrimary }]}>
                Página {selectedIndex + 1} seleccionada
              </Text>
            </View>

            <View style={styles.quickBarButtonsRow}>
              {/* To First */}
              <TouchableOpacity
                style={[
                  styles.quickBtn,
                  { backgroundColor: colors.cardBgElevated, borderColor: colors.border },
                  selectedIndex === 0 && styles.quickBtnDisabled,
                ]}
                onPress={() => moveItem(selectedIndex, 0)}
                disabled={selectedIndex === 0}
                activeOpacity={0.7}
              >
                <Ionicons
                  name="play-skip-back"
                  size={14}
                  color={selectedIndex === 0 ? colors.textMuted : colors.textPrimary}
                />
                <Text
                  style={[
                    styles.quickBtnText,
                    { color: selectedIndex === 0 ? colors.textMuted : colors.textPrimary },
                  ]}
                >
                  Inicio
                </Text>
              </TouchableOpacity>

              {/* Move Left / Prev */}
              <TouchableOpacity
                style={[
                  styles.quickBtn,
                  { backgroundColor: colors.cardBgElevated, borderColor: colors.border },
                  selectedIndex === 0 && styles.quickBtnDisabled,
                ]}
                onPress={() => moveItem(selectedIndex, selectedIndex - 1)}
                disabled={selectedIndex === 0}
                activeOpacity={0.7}
              >
                <Ionicons
                  name="chevron-back"
                  size={16}
                  color={selectedIndex === 0 ? colors.textMuted : colors.textPrimary}
                />
                <Text
                  style={[
                    styles.quickBtnText,
                    { color: selectedIndex === 0 ? colors.textMuted : colors.textPrimary },
                  ]}
                >
                  Atrás
                </Text>
              </TouchableOpacity>

              {/* Move Right / Next */}
              <TouchableOpacity
                style={[
                  styles.quickBtn,
                  { backgroundColor: colors.cardBgElevated, borderColor: colors.border },
                  selectedIndex === items.length - 1 && styles.quickBtnDisabled,
                ]}
                onPress={() => moveItem(selectedIndex, selectedIndex + 1)}
                disabled={selectedIndex === items.length - 1}
                activeOpacity={0.7}
              >
                <Text
                  style={[
                    styles.quickBtnText,
                    { color: selectedIndex === items.length - 1 ? colors.textMuted : colors.textPrimary },
                  ]}
                >
                  Adelante
                </Text>
                <Ionicons
                  name="chevron-forward"
                  size={16}
                  color={selectedIndex === items.length - 1 ? colors.textMuted : colors.textPrimary}
                />
              </TouchableOpacity>

              {/* To Last */}
              <TouchableOpacity
                style={[
                  styles.quickBtn,
                  { backgroundColor: colors.cardBgElevated, borderColor: colors.border },
                  selectedIndex === items.length - 1 && styles.quickBtnDisabled,
                ]}
                onPress={() => moveItem(selectedIndex, items.length - 1)}
                disabled={selectedIndex === items.length - 1}
                activeOpacity={0.7}
              >
                <Text
                  style={[
                    styles.quickBtnText,
                    { color: selectedIndex === items.length - 1 ? colors.textMuted : colors.textPrimary },
                  ]}
                >
                  Fin
                </Text>
                <Ionicons
                  name="play-skip-forward"
                  size={14}
                  color={selectedIndex === items.length - 1 ? colors.textMuted : colors.textPrimary}
                />
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Footer Actions */}
        <View style={[styles.footer, { backgroundColor: colors.cardBg, borderTopColor: colors.border }]}>
          {hasChanges && (
            <TouchableOpacity
              style={[styles.resetBtn, { borderColor: colors.border }]}
              onPress={handleResetOrder}
              activeOpacity={0.8}
            >
              <Ionicons name="refresh-outline" size={16} color={colors.textSecondary} />
              <Text style={[styles.resetBtnText, { color: colors.textSecondary }]}>Restablecer</Text>
            </TouchableOpacity>
          )}

          <TouchableOpacity
            style={[styles.cancelBtn, { borderColor: colors.border }]}
            onPress={onClose}
            activeOpacity={0.8}
          >
            <Text style={[styles.cancelBtnText, { color: colors.textPrimary }]}>Cancelar</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.saveBtn, { backgroundColor: colors.primary }]}
            onPress={() => {
              onSave(items);
              onClose();
            }}
            activeOpacity={0.85}
          >
            <Ionicons name="checkmark-sharp" size={18} color="#FFF" />
            <Text style={styles.saveBtnText}>
              Aplicar Orden ({items.length})
            </Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm + 2,
    borderBottomWidth: 1,
  },
  headerBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitleCenter: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: SPACING.sm,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '700',
  },
  headerSubtitle: {
    fontSize: 12,
    marginTop: 2,
  },
  actionHeaderBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: RADIUS.sm,
    borderWidth: 1,
  },
  actionHeaderBtnText: {
    fontSize: 12,
    fontWeight: '600',
  },
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: SPACING.md,
    paddingVertical: 8,
    borderBottomWidth: 1,
  },
  bannerText: {
    fontSize: 12,
    fontWeight: '600',
  },
  instructionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: SPACING.md,
    paddingVertical: 7,
  },
  instructionsText: {
    fontSize: 11,
    flex: 1,
  },
  scrollArea: {
    flex: 1,
  },
  gridContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  cardWrapper: {
    position: 'relative',
  },
  draggingCard: {
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.45,
    shadowRadius: 12,
    elevation: 12,
  },
  card: {
    flex: 1,
    borderRadius: RADIUS.sm + 2,
    overflow: 'hidden',
    position: 'relative',
  },
  cardImage: {
    width: '100%',
    height: '100%',
    backgroundColor: '#0a0f1d',
  },
  pageBadge: {
    position: 'absolute',
    top: 6,
    left: 6,
    minWidth: 22,
    height: 22,
    paddingHorizontal: 5,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pageBadgeText: {
    color: '#FFF',
    fontSize: 11,
    fontWeight: '700',
  },
  dragHandle: {
    position: 'absolute',
    top: 6,
    right: 6,
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  customBadge: {
    position: 'absolute',
    bottom: 6,
    left: 6,
    backgroundColor: 'rgba(15, 23, 42, 0.85)',
    paddingHorizontal: 5,
    paddingVertical: 2,
    borderRadius: 4,
    maxWidth: '80%',
  },
  customBadgeText: {
    color: '#FFF',
    fontSize: 9,
    fontWeight: '600',
  },
  targetOverlay: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(16, 185, 129, 0.25)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  targetIndicatorCircle: {
    backgroundColor: '#FFF',
    borderRadius: 16,
    padding: 2,
  },
  quickBar: {
    paddingHorizontal: SPACING.md,
    paddingVertical: 10,
    borderTopWidth: 1,
    gap: 8,
  },
  quickBarInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  quickBarPageDot: {
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  quickBarPageDotText: {
    color: '#FFF',
    fontSize: 11,
    fontWeight: '700',
  },
  quickBarLabel: {
    fontSize: 12,
    fontWeight: '600',
  },
  quickBarButtonsRow: {
    flexDirection: 'row',
    gap: 6,
  },
  quickBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingVertical: 7,
    borderRadius: RADIUS.sm,
    borderWidth: 1,
  },
  quickBtnDisabled: {
    opacity: 0.4,
  },
  quickBtnText: {
    fontSize: 11,
    fontWeight: '600',
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm + 2,
    borderTopWidth: 1,
  },
  resetBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: RADIUS.sm + 2,
    borderWidth: 1,
  },
  resetBtnText: {
    fontSize: 12,
    fontWeight: '600',
  },
  cancelBtn: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 11,
    borderRadius: RADIUS.sm + 2,
    borderWidth: 1,
  },
  cancelBtnText: {
    fontSize: 13,
    fontWeight: '600',
  },
  saveBtn: {
    flex: 1.5,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 11,
    borderRadius: RADIUS.sm + 2,
  },
  saveBtnText: {
    color: '#FFF',
    fontSize: 13,
    fontWeight: '700',
  },
});
