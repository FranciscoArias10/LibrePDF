import React, { useRef, useState, useEffect } from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Animated,
  PanResponder,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { SPACING, RADIUS } from '../constants/theme';
import { useTheme } from '../contexts/ThemeContext';
import { PageImage, ImageLayoutTransform, PageOrientation, PageSize } from '../types';

interface PageLayoutModalProps {
  visible: boolean;
  page: PageImage | null;
  orientation?: PageOrientation;
  pageSize?: PageSize;
  onSave: (transform: ImageLayoutTransform, newRotation: number, pageOrientation: PageOrientation) => void;
  onCancel: () => void;
}

export const PageLayoutModal: React.FC<PageLayoutModalProps> = ({
  visible,
  page,
  orientation = 'portrait',
  pageSize = 'A4',
  onSave,
  onCancel,
}) => {
  const { colors } = useTheme();
  const [currentOrientation, setCurrentOrientation] = useState<PageOrientation>(orientation);
  const [containerSize, setContainerSize] = useState({ width: 0, height: 0 });
  const [canvasLayout, setCanvasLayout] = useState({ width: 1, height: 1 });
  const [imageBounds, setImageBounds] = useState({ width: 0, height: 0 });
  const [localRotation, setLocalRotation] = useState(0);

  // Sync orientation with prop on open or update
  useEffect(() => {
    if (visible && orientation) {
      setCurrentOrientation(orientation);
    }
  }, [visible, orientation]);

  // Animated values for transform
  const pan = useRef(new Animated.ValueXY({ x: 0, y: 0 })).current;
  const scale = useRef(new Animated.Value(1)).current;

  // Real-time trackers
  const currentPan = useRef({ x: 0, y: 0 });
  const currentScale = useRef(1);

  // Gesture tracking refs
  const initialPinchDist = useRef<number | null>(null);
  const pinchStartScale = useRef<number>(1);
  const lastTapTime = useRef(0);

  useEffect(() => {
    const panListener = pan.addListener((val) => {
      currentPan.current = val;
    });
    const scaleListener = scale.addListener((val) => {
      currentScale.current = val.value;
    });
    return () => {
      pan.removeListener(panListener);
      scale.removeListener(scaleListener);
    };
  }, []);

  // Compute exact tight bounding box bounds for the image on the page
  useEffect(() => {
    if (page && canvasLayout.width > 1) {
      const isRotated = localRotation === 90 || localRotation === 270;

      const imgVisualW = isRotated ? page.height : page.width;
      const imgVisualH = isRotated ? page.width : page.height;
      const visualRatio = imgVisualW / imgVisualH;
      const canvasRatio = canvasLayout.width / canvasLayout.height;

      let visualW = canvasLayout.width;
      let visualH = canvasLayout.height;

      if (visualRatio > canvasRatio) {
        visualW = canvasLayout.width;
        visualH = canvasLayout.width / visualRatio;
      } else {
        visualH = canvasLayout.height;
        visualW = canvasLayout.height * visualRatio;
      }

      const wrapperW = isRotated ? visualH : visualW;
      const wrapperH = isRotated ? visualW : visualH;

      setImageBounds({ width: wrapperW, height: wrapperH });
    }
  }, [page, canvasLayout, localRotation]);

  useEffect(() => {
    if (visible && page && canvasLayout.width > 1) {
      setLocalRotation(page.rotation);
      if (page.layoutTransform) {
        const initialX = page.layoutTransform.x * canvasLayout.width;
        const initialY = page.layoutTransform.y * canvasLayout.height;
        pan.setValue({ x: initialX, y: initialY });
        scale.setValue(page.layoutTransform.scale);
        currentPan.current = { x: initialX, y: initialY };
        currentScale.current = page.layoutTransform.scale;
      } else {
        pan.setValue({ x: 0, y: 0 });
        scale.setValue(1);
        currentPan.current = { x: 0, y: 0 };
        currentScale.current = 1;
      }
    }
  }, [visible, page, canvasLayout]);

  const handleReset = () => {
    pan.flattenOffset();
    Animated.parallel([
      Animated.spring(pan, {
        toValue: { x: 0, y: 0 },
        useNativeDriver: false,
        friction: 7,
        tension: 40,
      }),
      Animated.spring(scale, {
        toValue: 1,
        useNativeDriver: false,
        friction: 7,
        tension: 40,
      }),
    ]).start();
    currentPan.current = { x: 0, y: 0 };
    currentScale.current = 1;
  };

  const handleToggleOrientation = () => {
    const next: PageOrientation = currentOrientation === 'portrait' ? 'landscape' : 'portrait';
    setCurrentOrientation(next);
    handleReset();
  };

  const handleZoomIn = () => {
    const newScale = Math.min(5.0, currentScale.current + 0.2);
    currentScale.current = newScale;
    Animated.timing(scale, {
      toValue: newScale,
      duration: 150,
      useNativeDriver: false,
    }).start();
  };

  const handleZoomOut = () => {
    const newScale = Math.max(0.2, currentScale.current - 0.2);
    currentScale.current = newScale;
    Animated.timing(scale, {
      toValue: newScale,
      duration: 150,
      useNativeDriver: false,
    }).start();
  };

  // Robust Pan (1 finger move) & Pinch (2 finger zoom) responder
  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderTerminationRequest: () => false,

      onPanResponderGrant: () => {
        pan.extractOffset();
        initialPinchDist.current = null;
      },

      onPanResponderMove: (evt, gestureState) => {
        const touches = evt.nativeEvent.touches;
        const numTouches = gestureState.numberActiveTouches || (touches ? touches.length : 1);

        if (numTouches >= 2 && touches && touches.length >= 2) {
          // --- 2 DEDOS: ZOOM (PELLIZCAR) ---
          const t0 = touches[0];
          const t1 = touches[1];
          const x0 = t0.pageX ?? t0.locationX ?? 0;
          const y0 = t0.pageY ?? t0.locationY ?? 0;
          const x1 = t1.pageX ?? t1.locationX ?? 0;
          const y1 = t1.pageY ?? t1.locationY ?? 0;
          const dist = Math.hypot(x0 - x1, y0 - y1);

          if (initialPinchDist.current === null) {
            initialPinchDist.current = Math.max(10, dist);
            pinchStartScale.current = currentScale.current;
          } else if (dist > 10) {
            const factor = dist / initialPinchDist.current;
            const newScale = Math.max(0.15, Math.min(5.0, pinchStartScale.current * factor));
            scale.setValue(newScale);
            currentScale.current = newScale;
          }
        } else {
          // --- 1 DEDO: MOVER LA IMAGEN (PAN) ---
          initialPinchDist.current = null;
          if (typeof gestureState.dx === 'number' && typeof gestureState.dy === 'number') {
            pan.setValue({ x: gestureState.dx, y: gestureState.dy });
          }
        }
      },

      onPanResponderRelease: (evt, gestureState) => {
        pan.flattenOffset();
        initialPinchDist.current = null;

        // Doble toque para centrar
        const now = Date.now();
        if (Math.abs(gestureState.dx) < 8 && Math.abs(gestureState.dy) < 8) {
          if (now - lastTapTime.current < 300) {
            handleReset();
            lastTapTime.current = 0;
          } else {
            lastTapTime.current = now;
          }
        } else {
          lastTapTime.current = 0;
        }
      },

      onPanResponderTerminate: () => {
        pan.flattenOffset();
        initialPinchDist.current = null;
      },
    })
  ).current;

  const handleSave = () => {
    onSave(
      {
        x: currentPan.current.x / canvasLayout.width,
        y: currentPan.current.y / canvasLayout.height,
        scale: currentScale.current,
      },
      localRotation,
      currentOrientation
    );
  };

  if (!page) return null;

  // Calculate paper aspect ratio (width / height)
  const getCanvasAspectRatio = (size: PageSize, orient: PageOrientation): number => {
    let baseRatio = 1 / 1.414; // Default A4 portrait
    if (size === 'LETTER') {
      baseRatio = 8.5 / 11;
    } else if (size === 'LEGAL') {
      baseRatio = 8.5 / 14;
    }
    return orient === 'landscape' ? 1 / baseRatio : baseRatio;
  };

  const canvasRatio = getCanvasAspectRatio(pageSize, currentOrientation);

  // Compute bounding box dimensions to maximize canvas within container
  const getCanvasStyle = () => {
    if (containerSize.width <= 0 || containerSize.height <= 0) {
      return { width: '100%' as const, aspectRatio: canvasRatio };
    }
    const maxW = containerSize.width;
    const maxH = containerSize.height;
    const containerRatio = maxW / maxH;

    let w: number;
    let h: number;
    if (canvasRatio > containerRatio) {
      // Width is limiting
      w = maxW;
      h = maxW / canvasRatio;
    } else {
      // Height is limiting
      h = maxH;
      w = maxH * canvasRatio;
    }
    return {
      width: Math.floor(w),
      height: Math.floor(h),
    };
  };

  return (
    <Modal visible={visible} animationType="slide" transparent={false}>
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={[styles.header, { borderBottomColor: colors.border }]}>
          <TouchableOpacity onPress={onCancel} style={styles.headerBtn}>
            <Ionicons name="close" size={26} color={colors.textPrimary} />
          </TouchableOpacity>
          <View style={styles.headerCenter}>
            <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>Acomodar Página</Text>
            <Text style={[styles.headerSubtitle, { color: colors.primary }]}>
              {pageSize} · {currentOrientation === 'portrait' ? 'Vertical' : 'Horizontal'}
            </Text>
          </View>
          <TouchableOpacity onPress={handleSave} style={styles.headerBtn}>
            <Ionicons name="checkmark" size={26} color={colors.primary} />
          </TouchableOpacity>
        </View>

        {/* Lienzo: captura 1 dedo para mover y 2 dedos para zoom */}
        <View
          style={styles.canvasContainer}
          collapsable={false}
          onLayout={(e) => {
            const { width: cw, height: ch } = e.nativeEvent.layout;
            if (cw > 0 && ch > 0) {
              setContainerSize({ width: cw, height: ch });
            }
          }}
          {...panResponder.panHandlers}
        >
          <View
            style={[
              styles.canvas,
              getCanvasStyle(),
              { backgroundColor: '#FFFFFF' },
            ]}
            collapsable={false}
            onLayout={(e) =>
              setCanvasLayout({
                width: e.nativeEvent.layout.width,
                height: e.nativeEvent.layout.height,
              })
            }
          >
            {/* Elemento que se mueve y escala libremente */}
            <Animated.View
              collapsable={false}
              style={[
                styles.transformWrapper,
                {
                  width: imageBounds.width || '100%',
                  height: imageBounds.height || '100%',
                  transform: [
                    { translateX: pan.x },
                    { translateY: pan.y },
                    { scale: scale },
                    { rotate: `${localRotation}deg` },
                  ],
                },
              ]}
            >
              <View style={styles.boundingBox}>
                <Image source={{ uri: page.uri }} style={styles.image} resizeMode="stretch" />
                <View style={[styles.cornerDot, styles.tl]} pointerEvents="none" />
                <View style={[styles.cornerDot, styles.tr]} pointerEvents="none" />
                <View style={[styles.cornerDot, styles.bl]} pointerEvents="none" />
                <View style={[styles.cornerDot, styles.br]} pointerEvents="none" />
              </View>
            </Animated.View>
          </View>
        </View>

        <View style={[styles.footer, { backgroundColor: colors.cardBg, borderTopColor: colors.border }]}>
          <View style={styles.actionsRow}>
            {/* Botón para cambiar orientación de la hoja */}
            <TouchableOpacity
              style={[styles.actionBtn, { backgroundColor: colors.background, borderColor: colors.border }]}
              onPress={handleToggleOrientation}
              activeOpacity={0.75}
            >
              <Ionicons
                name={currentOrientation === 'portrait' ? 'phone-portrait-outline' : 'phone-landscape-outline'}
                size={16}
                color={colors.primary}
              />
              <Text style={[styles.actionBtnText, { color: colors.primary }]}>
                {currentOrientation === 'portrait' ? 'Vertical' : 'Horizontal'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.actionBtn, { backgroundColor: colors.background, borderColor: colors.border }]}
              onPress={() => setLocalRotation((r) => (r + 90) % 360)}
              activeOpacity={0.75}
            >
              <Ionicons name="refresh" size={16} color={colors.primary} />
              <Text style={[styles.actionBtnText, { color: colors.primary }]}>Girar</Text>
            </TouchableOpacity>

            {/* Controles de Zoom Rápido */}
            <View style={[styles.zoomGroup, { backgroundColor: colors.background, borderColor: colors.border }]}>
              <TouchableOpacity style={styles.zoomBtn} onPress={handleZoomOut}>
                <Ionicons name="remove" size={16} color={colors.textPrimary} />
              </TouchableOpacity>
              <View style={[styles.zoomDivider, { backgroundColor: colors.border }]} />
              <TouchableOpacity style={styles.zoomBtn} onPress={handleZoomIn}>
                <Ionicons name="add" size={16} color={colors.textPrimary} />
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              style={[styles.actionBtn, { backgroundColor: colors.background, borderColor: colors.border }]}
              onPress={handleReset}
              activeOpacity={0.75}
            >
              <Ionicons name="scan-outline" size={16} color={colors.textPrimary} />
              <Text style={[styles.actionBtnText, { color: colors.textPrimary }]}>Centrar</Text>
            </TouchableOpacity>
          </View>

          <Text style={[styles.instruction, { color: colors.textSecondary }]}>
            1 dedo: Mover · 2 dedos: Pellizcar para Zoom · +/-: Zoom rápido
          </Text>
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
    paddingVertical: SPACING.sm + 4,
    borderBottomWidth: 1,
  },
  headerBtn: {
    padding: SPACING.xs,
  },
  headerCenter: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '700',
  },
  headerSubtitle: {
    fontSize: 12,
    fontWeight: '600',
    marginTop: 2,
  },
  canvasContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: SPACING.md,
    backgroundColor: '#090A0F',
  },
  canvas: {
    overflow: 'hidden',
    borderRadius: RADIUS.sm,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
  },
  transformWrapper: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  boundingBox: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#3b82f6',
    borderStyle: 'dashed',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  cornerDot: {
    position: 'absolute',
    width: 10,
    height: 10,
    backgroundColor: '#3b82f6',
    borderRadius: 5,
    borderWidth: 1.5,
    borderColor: '#FFFFFF',
  },
  tl: { top: -5, left: -5 },
  tr: { top: -5, right: -5 },
  bl: { bottom: -5, left: -5 },
  br: { bottom: -5, right: -5 },
  footer: {
    padding: SPACING.md,
    borderTopWidth: 1,
    flexDirection: 'column',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  actionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    flexWrap: 'wrap',
    gap: 8,
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.sm + 4,
    paddingVertical: 7,
    borderRadius: RADIUS.full,
    borderWidth: 1,
    gap: 4,
  },
  actionBtnText: {
    fontWeight: '600',
    fontSize: 12,
  },
  zoomGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: RADIUS.full,
    borderWidth: 1,
    overflow: 'hidden',
  },
  zoomBtn: {
    paddingHorizontal: SPACING.sm + 4,
    paddingVertical: 7,
    justifyContent: 'center',
    alignItems: 'center',
  },
  zoomDivider: {
    width: 1,
    height: 16,
  },
  instruction: {
    fontSize: 12,
    textAlign: 'center',
  },
});

