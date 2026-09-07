import React, { useState, useRef, useEffect } from 'react';
import { View, Modal, StyleSheet, Image, TouchableOpacity, Text, Dimensions, PanResponder, Alert, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { manipulateAsync, SaveFormat } from 'expo-image-manipulator';
import { SPACING, RADIUS } from '../constants/theme';
import { useTheme } from '../contexts/ThemeContext';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface ImageCropperModalProps {
  visible: boolean;
  imageUri: string;
  imageWidth: number;
  imageHeight: number;
  onClose: () => void;
  onCropComplete: (result: { uri: string; width: number; height: number }) => void;
}

type ActiveHandle = 'TOP_LEFT' | 'TOP_RIGHT' | 'BOTTOM_LEFT' | 'BOTTOM_RIGHT' | 'TOP' | 'BOTTOM' | 'LEFT' | 'RIGHT' | 'CENTER' | null;

export const ImageCropperModal: React.FC<ImageCropperModalProps> = ({
  visible,
  imageUri,
  imageWidth,
  imageHeight,
  onClose,
  onCropComplete,
}) => {
  const { colors } = useTheme();
  const [imgLayout, setImgLayoutState] = useState({ width: 0, height: 0 });
  const [cropBox, setCropBoxState] = useState<{ x: number; y: number; width: number; height: number } | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const activeHandleRef = useRef<ActiveHandle>(null);
  const initialCropBoxRef = useRef({ x: 0, y: 0, width: 0, height: 0 });
  const currentCropBoxRef = useRef<{ x: number; y: number; width: number; height: number } | null>(null);
  const imgLayoutRef = useRef({ width: 0, height: 0 });
  const actualImageBoundsRef = useRef({ x: 0, y: 0, width: 0, height: 0, scale: 1 });

  const setCropBox = (box: { x: number; y: number; width: number; height: number } | null) => {
    currentCropBoxRef.current = box;
    setCropBoxState(box);
  };

  const setImgLayout = (layout: { width: number; height: number }) => {
    imgLayoutRef.current = layout;
    setImgLayoutState(layout);
  };

  useEffect(() => {
    if (!visible) {
      setImgLayout({ width: 0, height: 0 });
      setCropBox(null);
    }
  }, [visible]);

  useEffect(() => {
    if (imgLayoutRef.current.width > 0 && imgLayoutRef.current.height > 0 && imageWidth > 0 && imageHeight > 0) {
      const layoutW = imgLayoutRef.current.width;
      const layoutH = imgLayoutRef.current.height;
      
      const scale = Math.min(layoutW / imageWidth, layoutH / imageHeight);
      const renderedW = imageWidth * scale;
      const renderedH = imageHeight * scale;
      const offsetX = (layoutW - renderedW) / 2;
      const offsetY = (layoutH - renderedH) / 2;
      
      actualImageBoundsRef.current = {
        x: offsetX,
        y: offsetY,
        width: renderedW,
        height: renderedH,
        scale,
      };
      
      if (!currentCropBoxRef.current) {
        setCropBox({
          x: offsetX,
          y: offsetY,
          width: Math.max(50, renderedW),
          height: Math.max(50, renderedH),
        });
      }
    }
  }, [imgLayout, imageWidth, imageHeight]);

  const handleImageLayout = (e: any) => {
    const { width, height } = e.nativeEvent.layout;
    setImgLayout({ width, height });
  };

  const HIT_SLOP = 40;

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onPanResponderGrant: (evt) => {
        const currentBox = currentCropBoxRef.current;
        if (!currentBox) return;
        const { locationX, locationY } = evt.nativeEvent;
        initialCropBoxRef.current = { ...currentBox };
        
        const { x, y, width, height } = currentBox;
        
        const isTop = Math.abs(locationY - y) < HIT_SLOP;
        const isBottom = Math.abs(locationY - (y + height)) < HIT_SLOP;
        const isLeft = Math.abs(locationX - x) < HIT_SLOP;
        const isRight = Math.abs(locationX - (x + width)) < HIT_SLOP;
        const isCenter = locationX > x && locationX < x + width && locationY > y && locationY < y + height;
        
        if (isTop && isLeft) activeHandleRef.current = 'TOP_LEFT';
        else if (isTop && isRight) activeHandleRef.current = 'TOP_RIGHT';
        else if (isBottom && isLeft) activeHandleRef.current = 'BOTTOM_LEFT';
        else if (isBottom && isRight) activeHandleRef.current = 'BOTTOM_RIGHT';
        else if (isTop) activeHandleRef.current = 'TOP';
        else if (isBottom) activeHandleRef.current = 'BOTTOM';
        else if (isLeft) activeHandleRef.current = 'LEFT';
        else if (isRight) activeHandleRef.current = 'RIGHT';
        else if (isCenter) activeHandleRef.current = 'CENTER';
        else activeHandleRef.current = null;
      },
      onPanResponderMove: (evt, gestureState) => {
        if (!activeHandleRef.current || !currentCropBoxRef.current) return;
        
        const initial = initialCropBoxRef.current;
        const dx = gestureState.dx;
        const dy = gestureState.dy;
        const MIN_SIZE = 60;

        let newX = initial.x;
        let newY = initial.y;
        let newW = initial.width;
        let newH = initial.height;

        const handle = activeHandleRef.current;

        if (handle === 'CENTER') {
          newX = initial.x + dx;
          newY = initial.y + dy;
        } else {
          if (handle.includes('TOP')) {
            newY = initial.y + dy;
            newH = initial.height - dy;
          }
          if (handle.includes('BOTTOM')) {
            newH = initial.height + dy;
          }
          if (handle.includes('LEFT')) {
            newX = initial.x + dx;
            newW = initial.width - dx;
          }
          if (handle.includes('RIGHT')) {
            newW = initial.width + dx;
          }
        }

        if (handle !== 'CENTER') {
          if (newW < MIN_SIZE) {
            if (handle.includes('LEFT')) newX = initial.x + initial.width - MIN_SIZE;
            newW = MIN_SIZE;
          }
          if (newH < MIN_SIZE) {
            if (handle.includes('TOP')) newY = initial.y + initial.height - MIN_SIZE;
            newH = MIN_SIZE;
          }
        }

        const bounds = actualImageBoundsRef.current;
        if (newX < bounds.x) {
          if (handle !== 'CENTER') newW -= (bounds.x - newX);
          newX = bounds.x;
        }
        if (newY < bounds.y) {
          if (handle !== 'CENTER') newH -= (bounds.y - newY);
          newY = bounds.y;
        }
        if (newX + newW > bounds.x + bounds.width) {
          if (handle === 'CENTER') newX = bounds.x + bounds.width - newW;
          else newW = bounds.x + bounds.width - newX;
        }
        if (newY + newH > bounds.y + bounds.height) {
          if (handle === 'CENTER') newY = bounds.y + bounds.height - newH;
          else newH = bounds.y + bounds.height - newY;
        }

        setCropBox({ x: newX, y: newY, width: newW, height: newH });
      },
      onPanResponderRelease: () => {
        activeHandleRef.current = null;
      },
    })
  ).current;

  const handleSave = async () => {
    if (!cropBox || imgLayout.width === 0 || imgLayout.height === 0 || imageWidth === 0) {
      onCropComplete({ uri: imageUri, width: imageWidth, height: imageHeight });
      return;
    }

    setIsProcessing(true);
    try {
      const bounds = actualImageBoundsRef.current;
      const relativeX = cropBox.x - bounds.x;
      const relativeY = cropBox.y - bounds.y;
      
      const cropOriginX = Math.max(0, relativeX / bounds.scale);
      const cropOriginY = Math.max(0, relativeY / bounds.scale);
      const cropWidth = Math.min(imageWidth - cropOriginX, cropBox.width / bounds.scale);
      const cropHeight = Math.min(imageHeight - cropOriginY, cropBox.height / bounds.scale);

      const result = await manipulateAsync(
        imageUri,
        [
          {
            crop: {
              originX: cropOriginX,
              originY: cropOriginY,
              width: cropWidth,
              height: cropHeight,
            },
          },
        ],
        { compress: 0.9, format: SaveFormat.JPEG }
      );

      onCropComplete({ uri: result.uri, width: result.width, height: result.height });
    } catch (error) {
      console.error('Error cropping image:', error);
      Alert.alert('Error', 'No se pudo recortar la imagen.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleReset = () => {
    if (imgLayout.width > 0 && imgLayout.height > 0) {
      const bounds = actualImageBoundsRef.current;
      setCropBox({
        x: bounds.x,
        y: bounds.y,
        width: Math.max(50, bounds.width),
        height: Math.max(50, bounds.height),
      });
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent={false} onRequestClose={onClose}>
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={[styles.header, { borderBottomColor: colors.border }]}>
          <TouchableOpacity style={styles.headerBtn} onPress={onClose} disabled={isProcessing}>
            <Ionicons name="close" size={26} color={colors.textPrimary} />
          </TouchableOpacity>
          <Text style={[styles.title, { color: colors.textPrimary }]}>Encuadrar Imagen</Text>
          <TouchableOpacity style={styles.headerBtn} onPress={handleSave} disabled={isProcessing}>
            {isProcessing ? (
              <ActivityIndicator color={colors.primary} size="small" />
            ) : (
              <Ionicons name="checkmark" size={26} color={colors.primary} />
            )}
          </TouchableOpacity>
        </View>

        <View style={styles.workspace}>
          <View style={styles.imageWrapper} onLayout={handleImageLayout}>
            <Image source={{ uri: imageUri }} style={styles.image} resizeMode="contain" />

            {cropBox && (
              <View style={StyleSheet.absoluteFill} pointerEvents="none">
                <View style={[styles.mask, { top: 0, left: 0, right: 0, height: cropBox.y }]} />
                <View style={[styles.mask, { top: cropBox.y + cropBox.height, left: 0, right: 0, bottom: 0 }]} />
                <View style={[styles.mask, { top: cropBox.y, left: 0, width: cropBox.x, height: cropBox.height }]} />
                <View style={[styles.mask, { top: cropBox.y, left: cropBox.x + cropBox.width, right: 0, height: cropBox.height }]} />

                <View
                  style={[
                    styles.cropBox,
                    {
                      left: cropBox.x,
                      top: cropBox.y,
                      width: cropBox.width,
                      height: cropBox.height,
                    },
                  ]}
                >
                  <View style={[styles.corner, styles.cornerTopLeft]} />
                  <View style={[styles.corner, styles.cornerTopRight]} />
                  <View style={[styles.corner, styles.cornerBottomLeft]} />
                  <View style={[styles.corner, styles.cornerBottomRight]} />
                </View>
              </View>
            )}
            <View style={StyleSheet.absoluteFill} {...panResponder.panHandlers} />
          </View>
        </View>

        <View style={styles.footer}>
          <TouchableOpacity style={[styles.resetBtn, { backgroundColor: colors.cardBg }]} onPress={handleReset}>
            <Ionicons name="scan-outline" size={20} color={colors.textPrimary} />
            <Text style={[styles.resetBtnText, { color: colors.textPrimary }]}>Restablecer</Text>
          </TouchableOpacity>
          <Text style={[styles.instructions, { color: colors.textSecondary }]}>Arrastra las esquinas o bordes</Text>
        </View>
      </SafeAreaView>
    </Modal>
  );
};

const CORNER_SIZE = 24;
const CORNER_WIDTH = 4;

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.md,
    borderBottomWidth: 1,
  },
  headerBtn: {
    padding: SPACING.xs,
  },
  title: {
    fontSize: 17,
    fontWeight: '700',
  },
  workspace: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: SPACING.lg,
  },
  imageWrapper: {
    width: '100%',
    aspectRatio: 0.75,
    maxWidth: SCREEN_WIDTH - SPACING.lg * 2,
    position: 'relative',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  mask: {
    position: 'absolute',
    backgroundColor: 'rgba(0,0,0,0.65)',
  },
  cropBox: {
    position: 'absolute',
    borderWidth: 1.5,
    borderColor: '#FFF',
    backgroundColor: 'transparent',
  },
  corner: {
    position: 'absolute',
    width: CORNER_SIZE,
    height: CORNER_SIZE,
    borderColor: '#FFF',
  },
  cornerTopLeft: {
    top: -CORNER_WIDTH,
    left: -CORNER_WIDTH,
    borderTopWidth: CORNER_WIDTH,
    borderLeftWidth: CORNER_WIDTH,
  },
  cornerTopRight: {
    top: -CORNER_WIDTH,
    right: -CORNER_WIDTH,
    borderTopWidth: CORNER_WIDTH,
    borderRightWidth: CORNER_WIDTH,
  },
  cornerBottomLeft: {
    bottom: -CORNER_WIDTH,
    left: -CORNER_WIDTH,
    borderBottomWidth: CORNER_WIDTH,
    borderLeftWidth: CORNER_WIDTH,
  },
  cornerBottomRight: {
    bottom: -CORNER_WIDTH,
    right: -CORNER_WIDTH,
    borderBottomWidth: CORNER_WIDTH,
    borderRightWidth: CORNER_WIDTH,
  },
  footer: {
    padding: SPACING.xl,
    alignItems: 'center',
    backgroundColor: '#111',
    flexDirection: 'column',
    gap: SPACING.md,
  },
  instructions: {
    color: '#71717A',
    fontSize: 13,
  },
  resetBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    paddingVertical: SPACING.sm + 2,
    paddingHorizontal: SPACING.lg,
    borderRadius: RADIUS.md,
    backgroundColor: 'rgba(255,255,255,0.15)',
  },
  resetBtnText: {
    color: '#FFF',
    fontSize: 15,
    fontWeight: '600',
  },
});
