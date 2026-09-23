import React, { useState, useRef, useEffect } from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Animated,
  PanResponder,
  Image,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { SvgXml } from 'react-native-svg';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';
import { PageImage, SignatureStamp } from '../types';
import { SPACING, RADIUS } from '../constants/theme';
import { useTheme } from '../contexts/ThemeContext';
import { SignatureDrawingModal } from './SignatureDrawingModal';
import { getSavedSignature, saveSignature, SavedSignature } from '../utils/storage';

interface SignatureStampModalProps {
  visible: boolean;
  page: PageImage | null;
  onSave: (signature: SignatureStamp | undefined) => void;
  onCancel: () => void;
}

export const SignatureStampModal: React.FC<SignatureStampModalProps> = ({
  visible,
  page,
  onSave,
  onCancel,
}) => {
  const { colors } = useTheme();

  const [canvasLayout, setCanvasLayout] = useState({ width: 1, height: 1 });
  const [isDrawingModalVisible, setIsDrawingModalVisible] = useState(false);
  const [savedDefaultSig, setSavedDefaultSig] = useState<SavedSignature | null>(null);

  // Active signature state
  const [activeSig, setActiveSig] = useState<{
    type: 'drawing' | 'image';
    data: string;
    color?: string;
  } | null>(null);

  // Stamp dimensions and position
  const [stampScale, setStampScale] = useState(0.35); // percentage of page width
  const pan = useRef(new Animated.ValueXY({ x: 0, y: 0 })).current;
  const currentPan = useRef({ x: 0, y: 0 });

  useEffect(() => {
    const listener = pan.addListener((val) => {
      currentPan.current = val;
    });
    return () => {
      pan.removeListener(listener);
    };
  }, []);

  // Load existing signature on page or saved default
  useEffect(() => {
    if (visible) {
      getSavedSignature().then((saved) => setSavedDefaultSig(saved));

      if (page?.signature) {
        setActiveSig({
          type: page.signature.type,
          data: page.signature.data,
          color: page.signature.color,
        });
        setStampScale(page.signature.width || 0.35);
      } else {
        setActiveSig(null);
        setStampScale(0.35);
      }
    }
  }, [visible, page]);

  // Set initial position once canvas layout is known
  useEffect(() => {
    if (visible && canvasLayout.width > 1) {
      if (page?.signature) {
        const initX = page.signature.x * canvasLayout.width;
        const initY = page.signature.y * canvasLayout.height;
        pan.setValue({ x: initX, y: initY });
        currentPan.current = { x: initX, y: initY };
      } else {
        // Default position: lower center of page
        const defX = canvasLayout.width * 0.32;
        const defY = canvasLayout.height * 0.72;
        pan.setValue({ x: defX, y: defY });
        currentPan.current = { x: defX, y: defY };
      }
    }
  }, [visible, canvasLayout, page]);

  // PanResponder to drag the signature stamp
  const stampPanResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderTerminationRequest: () => false,

      onPanResponderGrant: () => {
        pan.extractOffset();
      },

      onPanResponderMove: (evt, gestureState) => {
        if (typeof gestureState.dx === 'number' && typeof gestureState.dy === 'number') {
          pan.setValue({ x: gestureState.dx, y: gestureState.dy });
        }
      },

      onPanResponderRelease: () => {
        pan.flattenOffset();
      },

      onPanResponderTerminate: () => {
        pan.flattenOffset();
      },
    })
  ).current;

  // Handlers for drawing signature
  const handleOpenDrawing = () => {
    setIsDrawingModalVisible(true);
  };

  const handleSaveDrawing = async (svgString: string, color: string, saveAsDefault: boolean) => {
    setIsDrawingModalVisible(false);
    setActiveSig({
      type: 'drawing',
      data: svgString,
      color,
    });

    if (saveAsDefault) {
      await saveSignature({ type: 'drawing', data: svgString, color });
      setSavedDefaultSig({ type: 'drawing', data: svgString, color, createdAt: Date.now() });
    }
  };

  // Handler for picking signature from gallery
  const handlePickFromGallery = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        quality: 0.9,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const uri = result.assets[0].uri;
        setActiveSig({
          type: 'image',
          data: uri,
        });
      }
    } catch (error) {
      Alert.alert('Error', 'No se pudo seleccionar la imagen de la firma.');
    }
  };

  // Handler for using saved signature
  const handleUseSaved = () => {
    if (savedDefaultSig) {
      setActiveSig({
        type: savedDefaultSig.type,
        data: savedDefaultSig.data,
        color: savedDefaultSig.color,
      });
    }
  };

  // Remove signature from page
  const handleRemoveSignature = () => {
    setActiveSig(null);
  };

  // Confirm and apply signature to page
  const handleConfirm = () => {
    if (!activeSig) {
      // Signature removed
      onSave(undefined);
      return;
    }

    const stampW = canvasLayout.width * stampScale;
    const stampH = stampW * 0.45; // standard signature aspect ratio

    const normX = Math.max(0, Math.min(1, currentPan.current.x / canvasLayout.width));
    const normY = Math.max(0, Math.min(1, currentPan.current.y / canvasLayout.height));
    const normW = Math.max(0.1, Math.min(0.9, stampW / canvasLayout.width));
    const normH = Math.max(0.05, Math.min(0.5, stampH / canvasLayout.height));

    const stamp: SignatureStamp = {
      id: `sig_${Date.now()}`,
      type: activeSig.type,
      data: activeSig.data,
      x: normX,
      y: normY,
      width: normW,
      height: normH,
      color: activeSig.color,
    };

    onSave(stamp);
  };

  if (!page) return null;

  const stampPixelWidth = canvasLayout.width * stampScale;
  const stampPixelHeight = stampPixelWidth * 0.45;

  return (
    <Modal visible={visible} animationType="slide" transparent={false}>
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        {/* Header */}
        <View style={[styles.header, { borderBottomColor: colors.border }]}>
          <TouchableOpacity onPress={onCancel} style={styles.headerBtn}>
            <Ionicons name="close" size={28} color={colors.textPrimary} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>Estampar Firma</Text>
          <TouchableOpacity onPress={handleConfirm} style={styles.headerBtn}>
            <Ionicons name="checkmark" size={28} color={colors.primary} />
          </TouchableOpacity>
        </View>

        {/* Page Preview Canvas */}
        <View style={styles.canvasContainer}>
          <View
            style={[styles.canvas, { backgroundColor: '#FFFFFF' }]}
            onLayout={(e) => {
              setCanvasLayout({
                width: e.nativeEvent.layout.width,
                height: e.nativeEvent.layout.height,
              });
            }}
          >
            {/* Base Document Image */}
            <Image
              source={{ uri: page.uri }}
              style={[
                styles.pageImage,
                { transform: [{ rotate: `${page.rotation}deg` }] },
              ]}
              resizeMode="contain"
            />

            {/* Movable & Scalable Signature Stamp Overlay */}
            {activeSig && canvasLayout.width > 1 && (
              <Animated.View
                style={[
                  styles.stampWrapper,
                  {
                    width: stampPixelWidth,
                    height: stampPixelHeight,
                    transform: [{ translateX: pan.x }, { translateY: pan.y }],
                  },
                ]}
                {...stampPanResponder.panHandlers}
              >
                <View style={styles.stampBorder}>
                  {activeSig.type === 'drawing' ? (
                    <SvgXml xml={activeSig.data} width="100%" height="100%" />
                  ) : (
                    <Image
                      source={{ uri: activeSig.data }}
                      style={styles.sigImage}
                      resizeMode="contain"
                    />
                  )}

                  {/* Corner indicator */}
                  <View style={styles.stampHandle}>
                    <Ionicons name="move" size={12} color="#FFFFFF" />
                  </View>
                </View>
              </Animated.View>
            )}
          </View>
        </View>

        {/* Footer Actions */}
        <View style={[styles.footer, { backgroundColor: colors.cardBg, borderTopColor: colors.border }]}>
          {!activeSig ? (
            /* Picker Options when no signature is active */
            <View style={styles.emptyActionsContainer}>
              <Text style={[styles.emptyPrompt, { color: colors.textSecondary }]}>
                Selecciona cómo deseas agregar tu firma:
              </Text>
              <View style={styles.optionsRow}>
                <TouchableOpacity style={[styles.optionBtn, { backgroundColor: colors.background, borderColor: colors.border }]} onPress={handleOpenDrawing}>
                  <Ionicons name="create-outline" size={20} color={colors.primary} />
                  <Text style={[styles.optionBtnText, { color: colors.textPrimary }]}>Dibujar</Text>
                </TouchableOpacity>

                <TouchableOpacity style={[styles.optionBtn, { backgroundColor: colors.background, borderColor: colors.border }]} onPress={handlePickFromGallery}>
                  <Ionicons name="image-outline" size={20} color={colors.primary} />
                  <Text style={[styles.optionBtnText, { color: colors.textPrimary }]}>Galería</Text>
                </TouchableOpacity>

                {savedDefaultSig && (
                  <TouchableOpacity style={[styles.optionBtn, { backgroundColor: colors.background, borderColor: colors.border }]} onPress={handleUseSaved}>
                    <Ionicons name="bookmark-outline" size={20} color={colors.primary} />
                    <Text style={[styles.optionBtnText, { color: colors.textPrimary }]}>Guardada</Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>
          ) : (
            /* Controls when signature is placed */
            <View style={styles.activeControlsContainer}>
              <View style={styles.sizeControlRow}>
                <Text style={[styles.controlLabel, { color: colors.textSecondary }]}>Tamaño:</Text>
                <View style={[styles.zoomGroup, { backgroundColor: colors.background, borderColor: colors.border }]}>
                  <TouchableOpacity
                    style={styles.zoomBtn}
                    onPress={() => setStampScale((s) => Math.max(0.18, s - 0.05))}
                  >
                    <Ionicons name="remove" size={18} color={colors.textPrimary} />
                  </TouchableOpacity>
                  <View style={[styles.zoomDivider, { backgroundColor: colors.border }]} />
                  <TouchableOpacity
                    style={styles.zoomBtn}
                    onPress={() => setStampScale((s) => Math.min(0.75, s + 0.05))}
                  >
                    <Ionicons name="add" size={18} color={colors.textPrimary} />
                  </TouchableOpacity>
                </View>

                {/* Change signature button */}
                <TouchableOpacity
                  style={[styles.smallActionBtn, { backgroundColor: colors.background, borderColor: colors.border }]}
                  onPress={handleOpenDrawing}
                >
                  <Ionicons name="create-outline" size={16} color={colors.primary} />
                  <Text style={[styles.smallActionText, { color: colors.primary }]}>Cambiar</Text>
                </TouchableOpacity>

                {/* Remove button */}
                <TouchableOpacity
                  style={[styles.smallActionBtn, { backgroundColor: colors.background, borderColor: colors.border }]}
                  onPress={handleRemoveSignature}
                >
                  <Ionicons name="trash-outline" size={16} color={colors.accentRed} />
                  <Text style={[styles.smallActionText, { color: colors.accentRed }]}>Quitar</Text>
                </TouchableOpacity>
              </View>

              <Text style={[styles.instruction, { color: colors.textSecondary }]}>
                Arrastra la firma con 1 dedo para posicionarla sobre el documento
              </Text>
            </View>
          )}
        </View>

        {/* Drawing Modal */}
        <SignatureDrawingModal
          visible={isDrawingModalVisible}
          onSave={handleSaveDrawing}
          onCancel={() => setIsDrawingModalVisible(false)}
        />
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
    justifyContent: 'center',
    alignItems: 'center',
    padding: SPACING.md,
    backgroundColor: '#000000',
  },
  canvas: {
    width: '100%',
    aspectRatio: 1 / 1.414,
    borderRadius: RADIUS.sm,
    overflow: 'hidden',
    position: 'relative',
  },
  pageImage: {
    width: '100%',
    height: '100%',
  },
  stampWrapper: {
    position: 'absolute',
    top: 0,
    left: 0,
    zIndex: 10,
  },
  stampBorder: {
    width: '100%',
    height: '100%',
    borderWidth: 1.5,
    borderColor: '#3b82f6',
    borderStyle: 'dashed',
    borderRadius: RADIUS.xs,
    padding: 2,
    position: 'relative',
    backgroundColor: 'rgba(59, 130, 246, 0.06)',
  },
  sigImage: {
    width: '100%',
    height: '100%',
  },
  stampHandle: {
    position: 'absolute',
    bottom: -6,
    right: -6,
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: '#3b82f6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  footer: {
    padding: SPACING.md,
    borderTopWidth: 1,
  },
  emptyActionsContainer: {
    alignItems: 'center',
    gap: SPACING.sm,
  },
  emptyPrompt: {
    fontSize: 13,
    fontWeight: '500',
  },
  optionsRow: {
    flexDirection: 'row',
    gap: SPACING.md,
    width: '100%',
    justifyContent: 'center',
  },
  optionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.md,
    borderRadius: RADIUS.full,
    borderWidth: 1,
    gap: 6,
  },
  optionBtnText: {
    fontWeight: '600',
    fontSize: 13,
  },
  activeControlsContainer: {
    gap: SPACING.sm,
  },
  sizeControlRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: SPACING.sm,
  },
  controlLabel: {
    fontSize: 13,
    fontWeight: '600',
  },
  zoomGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: RADIUS.full,
    borderWidth: 1,
    overflow: 'hidden',
  },
  zoomBtn: {
    paddingHorizontal: SPACING.md,
    paddingVertical: 6,
    justifyContent: 'center',
    alignItems: 'center',
  },
  zoomDivider: {
    width: 1,
    height: 16,
  },
  smallActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.sm,
    paddingVertical: 6,
    borderRadius: RADIUS.full,
    borderWidth: 1,
    gap: 4,
  },
  smallActionText: {
    fontSize: 12,
    fontWeight: '600',
  },
  instruction: {
    fontSize: 12,
    textAlign: 'center',
  },
});
