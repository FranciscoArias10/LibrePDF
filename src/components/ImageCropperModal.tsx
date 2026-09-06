import React, { useState, useRef, useEffect } from 'react';
import { View, Modal, StyleSheet, Image, TouchableOpacity, Text, Dimensions, PanResponder, Alert, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as ImageManipulator from 'expo-image-manipulator';
import { COLORS, SPACING, RADIUS } from '../constants/theme';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface ImageCropperModalProps {
  visible: boolean;
  imageUri: string;
  onClose: () => void;
  onCropComplete: (croppedUri: string) => void;
}

type ActiveHandle = 'TOP_LEFT' | 'TOP_RIGHT' | 'BOTTOM_LEFT' | 'BOTTOM_RIGHT' | 'TOP' | 'BOTTOM' | 'LEFT' | 'RIGHT' | 'CENTER' | null;

export const ImageCropperModal: React.FC<ImageCropperModalProps> = ({
  visible,
  imageUri,
  onClose,
  onCropComplete,
}) => {
  const [imgLayout, setImgLayoutState] = useState({ width: 0, height: 0 });
  const [cropBox, setCropBoxState] = useState<{ x: number; y: number; width: number; height: number } | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const activeHandleRef = useRef<ActiveHandle>(null);
  const initialCropBoxRef = useRef({ x: 0, y: 0, width: 0, height: 0 });
  const currentCropBoxRef = useRef<{ x: number; y: number; width: number; height: number } | null>(null);
  const imgLayoutRef = useRef({ width: 0, height: 0 });

  const setCropBox = (box: { x: number; y: number; width: number; height: number } | null) => {
    currentCropBoxRef.current = box;
    setCropBoxState(box);
  };

  const setImgLayout = (layout: { width: number; height: number }) => {
    imgLayoutRef.current = layout;
    setImgLayoutState(layout);
  };

  // Reset when visibility changes
  useEffect(() => {
    if (!visible) {
      setImgLayout({ width: 0, height: 0 });
      setCropBox(null);
    }
  }, [visible]);

  const handleImageLayout = (e: any) => {
    const { width, height } = e.nativeEvent.layout;
    setImgLayout({ width, height });
    
    // Initialize crop box to 90% of image size on first layout
    if (!cropBox && width > 0 && height > 0) {
      const inset = 20;
      setCropBox({
        x: inset,
        y: inset,
        width: Math.max(50, width - inset * 2),
        height: Math.max(50, height - inset * 2),
      });
    }
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
        
        // Determine which handle was touched
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

        // Move logic
        if (handle === 'CENTER') {
          newX = initial.x + dx;
          newY = initial.y + dy;
        } else {
          // Resize logic
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

        // 1. Clamp Minimum Size for Resizing
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

        // 2. Clamp to Image Boundaries
        const layout = imgLayoutRef.current;
        if (newX < 0) {
          if (handle !== 'CENTER') newW += newX; // shrink width if it hit bounds
          newX = 0;
        }
        if (newY < 0) {
          if (handle !== 'CENTER') newH += newY;
          newY = 0;
        }
        if (newX + newW > layout.width) {
          if (handle === 'CENTER') newX = layout.width - newW;
          else newW = layout.width - newX;
        }
        if (newY + newH > layout.height) {
          if (handle === 'CENTER') newY = layout.height - newH;
          else newH = layout.height - newY;
        }

        setCropBox({ x: newX, y: newY, width: newW, height: newH });
      },
      onPanResponderRelease: () => {
        activeHandleRef.current = null;
      },
    })
  ).current;

  const handleSave = async () => {
    if (!cropBox || imgLayout.width === 0 || imgLayout.height === 0) {
      onCropComplete(imageUri);
      return;
    }

    setIsProcessing(true);
    try {
      // We need original image dimensions to map the crop layout to original pixels
      const { width: origW, height: origH } = await new Promise<{ width: number; height: number }>((resolve, reject) => {
        Image.getSize(imageUri, (width, height) => resolve({ width, height }), reject);
      });

      const scaleX = origW / imgLayout.width;
      const scaleY = origH / imgLayout.height;

      const cropOriginX = Math.max(0, cropBox.x * scaleX);
      const cropOriginY = Math.max(0, cropBox.y * scaleY);
      const cropWidth = Math.min(origW - cropOriginX, cropBox.width * scaleX);
      const cropHeight = Math.min(origH - cropOriginY, cropBox.height * scaleY);

      const result = await ImageManipulator.manipulateAsync(
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
        { compress: 0.9, format: ImageManipulator.SaveFormat.JPEG }
      );

      onCropComplete(result.uri);
    } catch (error) {
      console.error('Error cropping image:', error);
      Alert.alert('Error', 'No se pudo recortar la imagen.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleReset = () => {
    if (imgLayout.width > 0 && imgLayout.height > 0) {
      const inset = 20;
      setCropBox({
        x: inset,
        y: inset,
        width: imgLayout.width - inset * 2,
        height: imgLayout.height - inset * 2,
      });
    }
  };

  return (
    <Modal visible={visible} animationType="fade" transparent={false} onRequestClose={onClose}>
      <SafeAreaView style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity style={styles.headerBtn} onPress={onClose} disabled={isProcessing}>
            <Ionicons name="close" size={26} color="#FFF" />
          </TouchableOpacity>
          <Text style={styles.title}>Encuadrar Imagen</Text>
          <TouchableOpacity style={styles.headerBtn} onPress={handleSave} disabled={isProcessing}>
            {isProcessing ? (
              <ActivityIndicator color={COLORS.primaryLight} size="small" />
            ) : (
              <Ionicons name="checkmark" size={26} color={COLORS.primaryLight} />
            )}
          </TouchableOpacity>
        </View>

        {/* Workspace */}
        <View style={styles.workspace}>
          <View
            style={styles.imageWrapper}
            onLayout={handleImageLayout}
          >
            <Image source={{ uri: imageUri }} style={styles.image} resizeMode="contain" />

            {/* Visual Layer */}
            {cropBox && (
              <View style={StyleSheet.absoluteFill} pointerEvents="none">
                {/* Dimmed Masks */}
                <View style={[styles.mask, { top: 0, left: 0, right: 0, height: cropBox.y }]} />
                <View style={[styles.mask, { top: cropBox.y + cropBox.height, left: 0, right: 0, bottom: 0 }]} />
                <View style={[styles.mask, { top: cropBox.y, left: 0, width: cropBox.x, height: cropBox.height }]} />
                <View style={[styles.mask, { top: cropBox.y, left: cropBox.x + cropBox.width, right: 0, height: cropBox.height }]} />

                {/* Crop Box Frame with Handles */}
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
                  {/* Corner Indicators */}
                  <View style={[styles.corner, styles.cornerTopLeft]} />
                  <View style={[styles.corner, styles.cornerTopRight]} />
                  <View style={[styles.corner, styles.cornerBottomLeft]} />
                  <View style={[styles.corner, styles.cornerBottomRight]} />
                </View>
              </View>
            )}
            
            {/* Interactive Layer (Full size, NO children to prevent Android touch coordinate bugs) */}
            <View style={StyleSheet.absoluteFill} {...panResponder.panHandlers} />
          </View>
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <TouchableOpacity style={styles.resetBtn} onPress={handleReset}>
            <Ionicons name="scan-outline" size={20} color="#FFF" />
            <Text style={styles.resetBtnText}>Restablecer</Text>
          </TouchableOpacity>
          <Text style={styles.instructions}>Arrastra las esquinas o bordes</Text>
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
    backgroundColor: '#000',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.md,
    backgroundColor: '#111',
  },
  headerBtn: {
    padding: SPACING.xs,
  },
  title: {
    color: '#FFF',
    fontSize: 17,
    fontWeight: '700',
  },
  workspace: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: SPACING.lg,
    backgroundColor: '#111',
  },
  imageWrapper: {
    width: '100%',
    aspectRatio: 0.75, // standard photo ratio
    maxWidth: SCREEN_WIDTH - SPACING.lg * 2,
    position: 'relative',
    backgroundColor: '#000',
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
    color: COLORS.textMuted,
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
