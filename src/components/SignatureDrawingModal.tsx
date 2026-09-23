import React, { useState, useRef } from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  PanResponder,
  GestureResponderEvent,
  PanResponderGestureState,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Path } from 'react-native-svg';
import { Ionicons } from '@expo/vector-icons';
import { SPACING, RADIUS } from '../constants/theme';
import { useTheme } from '../contexts/ThemeContext';

interface Stroke {
  path: string;
  color: string;
  width: number;
  points: { x: number; y: number }[];
}

interface SignatureDrawingModalProps {
  visible: boolean;
  onSave: (svgString: string, color: string, saveAsDefault: boolean) => void;
  onCancel: () => void;
}

const INK_COLORS = [
  { label: 'Negro', value: '#111827' },
  { label: 'Azul Real', value: '#1D4ED8' },
  { label: 'Azul Marino', value: '#1E3A8A' },
];

const STROKE_WIDTHS = [
  { label: 'Fino', value: 2.5 },
  { label: 'Normal', value: 4 },
  { label: 'Grueso', value: 6 },
];

export const SignatureDrawingModal: React.FC<SignatureDrawingModalProps> = ({
  visible,
  onSave,
  onCancel,
}) => {
  const { colors } = useTheme();

  const [strokes, setStrokes] = useState<Stroke[]>([]);
  const [currentStroke, setCurrentStroke] = useState<Stroke | null>(null);
  const [selectedColor, setSelectedColor] = useState('#111827');
  const [selectedWidth, setSelectedWidth] = useState(4);
  const [saveAsDefault, setSaveAsDefault] = useState(true);

  // Keep refs to active ink settings to avoid stale closures in PanResponder
  const selectedColorRef = useRef(selectedColor);
  const selectedWidthRef = useRef(selectedWidth);

  // Keep a ref to the active points to avoid stale closures in gesture callbacks
  const currentPointsRef = useRef<{ x: number; y: number }[]>([]);

  const handleColorChange = (newColor: string) => {
    setSelectedColor(newColor);
    selectedColorRef.current = newColor;
    // Retroactively update all existing strokes so the entire signature reflects the new ink
    setStrokes((prev) => prev.map((s) => ({ ...s, color: newColor })));
  };

  const handleWidthChange = (newWidth: number) => {
    setSelectedWidth(newWidth);
    selectedWidthRef.current = newWidth;
    // Retroactively update all existing strokes so the entire signature reflects the new stroke width
    setStrokes((prev) => prev.map((s) => ({ ...s, width: newWidth })));
  };

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,

      onPanResponderGrant: (evt: GestureResponderEvent) => {
        const { locationX, locationY } = evt.nativeEvent;
        const pt = { x: locationX, y: locationY };
        currentPointsRef.current = [pt];

        setCurrentStroke({
          path: `M ${locationX.toFixed(1)} ${locationY.toFixed(1)}`,
          color: selectedColorRef.current,
          width: selectedWidthRef.current,
          points: [pt],
        });
      },

      onPanResponderMove: (evt: GestureResponderEvent) => {
        const { locationX, locationY } = evt.nativeEvent;
        const pt = { x: locationX, y: locationY };
        currentPointsRef.current.push(pt);

        setCurrentStroke((prev) => {
          if (!prev) return null;
          return {
            ...prev,
            path: `${prev.path} L ${locationX.toFixed(1)} ${locationY.toFixed(1)}`,
            points: [...prev.points, pt],
          };
        });
      },

      onPanResponderRelease: () => {
        if (currentPointsRef.current.length > 0) {
          const finishedStroke: Stroke = {
            path: currentPointsRef.current
              .map((pt, i) => `${i === 0 ? 'M' : 'L'} ${pt.x.toFixed(1)} ${pt.y.toFixed(1)}`)
              .join(' '),
            color: selectedColorRef.current,
            width: selectedWidthRef.current,
            points: [...currentPointsRef.current],
          };

          setStrokes((prev) => [...prev, finishedStroke]);
        }
        currentPointsRef.current = [];
        setCurrentStroke(null);
      },
    })
  ).current;

  const handleClear = () => {
    setStrokes([]);
    setCurrentStroke(null);
    currentPointsRef.current = [];
  };

  const handleUndo = () => {
    setStrokes((prev) => prev.slice(0, -1));
  };

  const handleConfirm = () => {
    if (strokes.length === 0) {
      Alert.alert('Firma vacía', 'Por favor dibuja tu firma en el recuadro antes de guardar.');
      return;
    }

    // Compute tight bounding box across all points
    let minX = Infinity;
    let maxX = -Infinity;
    let minY = Infinity;
    let maxY = -Infinity;

    strokes.forEach((s) => {
      s.points.forEach((pt) => {
        if (pt.x < minX) minX = pt.x;
        if (pt.x > maxX) maxX = pt.x;
        if (pt.y < minY) minY = pt.y;
        if (pt.y > maxY) maxY = pt.y;
      });
    });

    const padding = 12;
    const boxX = Math.max(0, Math.floor(minX - padding));
    const boxY = Math.max(0, Math.floor(minY - padding));
    const boxW = Math.max(20, Math.ceil(maxX - minX + padding * 2));
    const boxH = Math.max(20, Math.ceil(maxY - minY + padding * 2));

    const pathsSvg = strokes
      .map(
        (s) =>
          `<path d="${s.path}" stroke="${s.color}" stroke-width="${s.width}" fill="none" stroke-linecap="round" stroke-linejoin="round" />`
      )
      .join('\n    ');

    const svgString = `<svg viewBox="${boxX} ${boxY} ${boxW} ${boxH}" xmlns="http://www.w3.org/2000/svg" width="100%" height="100%">
    ${pathsSvg}
</svg>`;

    onSave(svgString, selectedColorRef.current, saveAsDefault);
    handleClear();
  };

  return (
    <Modal visible={visible} animationType="slide" transparent={false}>
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        {/* Header */}
        <View style={[styles.header, { borderBottomColor: colors.border }]}>
          <TouchableOpacity onPress={onCancel} style={styles.headerBtn}>
            <Ionicons name="close" size={26} color={colors.textPrimary} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>Dibujar Firma</Text>
          <TouchableOpacity
            onPress={handleConfirm}
            style={[styles.headerBtn, strokes.length === 0 && { opacity: 0.4 }]}
            disabled={strokes.length === 0}
          >
            <Ionicons name="checkmark" size={28} color={colors.primary} />
          </TouchableOpacity>
        </View>

        {/* Drawing Pad Canvas */}
        <View style={styles.canvasContainer}>
          <View style={styles.canvasWrapper} {...panResponder.panHandlers}>
            <Svg style={StyleSheet.absoluteFill}>
              {strokes.map((s, index) => (
                <Path
                  key={`stroke_${index}`}
                  d={s.path}
                  stroke={s.color}
                  strokeWidth={s.width}
                  fill="none"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              ))}
              {currentStroke && (
                <Path
                  d={currentStroke.path}
                  stroke={currentStroke.color}
                  strokeWidth={currentStroke.width}
                  fill="none"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              )}
            </Svg>

            {/* Signature guide baseline */}
            <View pointerEvents="none" style={styles.baselineGuide}>
              <View style={styles.baselineLine} />
              <Text style={styles.baselineLabel}>Firma aquí</Text>
            </View>
          </View>

          {/* Quick Undo / Clear floating buttons */}
          <View style={styles.canvasActions}>
            <TouchableOpacity
              style={[styles.canvasActionBtn, strokes.length === 0 && styles.disabledBtn]}
              onPress={handleUndo}
              disabled={strokes.length === 0}
            >
              <Ionicons name="arrow-undo-outline" size={18} color="#FFFFFF" />
              <Text style={styles.canvasActionText}>Deshacer</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.canvasActionBtn, strokes.length === 0 && styles.disabledBtn]}
              onPress={handleClear}
              disabled={strokes.length === 0}
            >
              <Ionicons name="trash-outline" size={18} color="#FFFFFF" />
              <Text style={styles.canvasActionText}>Limpiar</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Tools Toolbar */}
        <View style={[styles.toolbar, { backgroundColor: colors.cardBg, borderTopColor: colors.border }]}>
          {/* Colors */}
          <View style={styles.toolRow}>
            <Text style={[styles.toolLabel, { color: colors.textSecondary }]}>Tinta:</Text>
            <View style={styles.colorGroup}>
              {INK_COLORS.map((c) => (
                <TouchableOpacity
                  key={c.value}
                  style={[
                    styles.colorCircle,
                    { backgroundColor: c.value },
                    selectedColor === c.value && styles.colorCircleSelected,
                  ]}
                  onPress={() => handleColorChange(c.value)}
                >
                  {selectedColor === c.value && (
                    <Ionicons name="checkmark" size={16} color="#FFFFFF" />
                  )}
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Stroke Widths */}
          <View style={styles.toolRow}>
            <Text style={[styles.toolLabel, { color: colors.textSecondary }]}>Grosor:</Text>
            <View style={styles.widthGroup}>
              {STROKE_WIDTHS.map((w) => (
                <TouchableOpacity
                  key={w.label}
                  style={[
                    styles.widthBtn,
                    { borderColor: colors.border },
                    selectedWidth === w.value && {
                      backgroundColor: colors.primary,
                      borderColor: colors.primary,
                    },
                  ]}
                  onPress={() => handleWidthChange(w.value)}
                >
                  <Text
                    style={[
                      styles.widthBtnText,
                      { color: selectedWidth === w.value ? '#FFFFFF' : colors.textPrimary },
                    ]}
                  >
                    {w.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Save as default toggle */}
          <TouchableOpacity
            style={styles.defaultToggleRow}
            onPress={() => setSaveAsDefault((prev) => !prev)}
          >
            <Ionicons
              name={saveAsDefault ? 'checkbox' : 'square-outline'}
              size={22}
              color={saveAsDefault ? colors.primary : colors.textSecondary}
            />
            <Text style={[styles.defaultToggleText, { color: colors.textPrimary }]}>
              Guardar como mi firma predeterminada
            </Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.md,
    borderBottomWidth: 1,
  },
  headerBtn: {
    padding: SPACING.xs,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  canvasContainer: {
    flex: 1,
    padding: SPACING.md,
    justifyContent: 'center',
    alignItems: 'center',
  },
  canvasWrapper: {
    width: '100%',
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: RADIUS.md,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: '#3b82f630',
    position: 'relative',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 5,
  },
  baselineGuide: {
    position: 'absolute',
    bottom: 50,
    left: 30,
    right: 30,
    alignItems: 'center',
  },
  baselineLine: {
    width: '100%',
    height: 1.5,
    backgroundColor: '#9ca3af',
    borderStyle: 'dashed',
  },
  baselineLabel: {
    color: '#9ca3af',
    fontSize: 12,
    marginTop: 6,
    textTransform: 'uppercase',
    letterSpacing: 1,
    fontWeight: '500',
  },
  canvasActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    marginTop: SPACING.sm,
    gap: SPACING.md,
  },
  canvasActionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(59, 130, 246, 0.85)',
    paddingVertical: SPACING.sm,
    borderRadius: RADIUS.full,
    gap: 6,
  },
  disabledBtn: {
    opacity: 0.35,
  },
  canvasActionText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 13,
  },
  toolbar: {
    padding: SPACING.md,
    borderTopWidth: 1,
    gap: SPACING.md,
  },
  toolRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  toolLabel: {
    fontSize: 14,
    fontWeight: '600',
  },
  colorGroup: {
    flexDirection: 'row',
    gap: SPACING.md,
  },
  colorCircle: {
    width: 34,
    height: 34,
    borderRadius: 17,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  colorCircleSelected: {
    borderColor: '#3b82f6',
    transform: [{ scale: 1.15 }],
  },
  widthGroup: {
    flexDirection: 'row',
    gap: SPACING.sm,
  },
  widthBtn: {
    paddingHorizontal: SPACING.md,
    paddingVertical: 6,
    borderRadius: RADIUS.full,
    borderWidth: 1,
  },
  widthBtnText: {
    fontSize: 12,
    fontWeight: '600',
  },
  defaultToggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    paddingTop: SPACING.xs,
  },
  defaultToggleText: {
    fontSize: 13,
    fontWeight: '500',
  },
});
