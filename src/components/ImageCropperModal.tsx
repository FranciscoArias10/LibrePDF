import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  View,
  Modal,
  StyleSheet,
  Image,
  TouchableOpacity,
  Text,
  Dimensions,
  PanResponder,
  Alert,
  ActivityIndicator,
  Animated,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import Svg, { Polygon, Line, Circle, G } from 'react-native-svg';
import { WebView } from 'react-native-webview';
import * as FileSystem from 'expo-file-system/legacy';
import { manipulateAsync, SaveFormat } from 'expo-image-manipulator';
import { SPACING, RADIUS } from '../constants/theme';
import { useTheme } from '../contexts/ThemeContext';
import { CornerPoint, DocumentCorners } from '../types';
import { getPerspectiveEngineHtml } from '../utils/perspectiveEngineHtml';
import {
  computeWarpDimensions,
  getDefaultCorners,
  isValidQuad,
} from '../utils/perspectiveTransformer';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

interface ImageCropperModalProps {
  visible: boolean;
  imageUri: string;
  imageWidth: number;
  imageHeight: number;
  onClose: () => void;
  onCropComplete: (result: { uri: string; width: number; height: number }) => void;
}

type CropMode = 'perspective' | 'rect';

type ActiveHandle =
  | 'TL'
  | 'TR'
  | 'BR'
  | 'BL'
  | 'EDGE_TOP'
  | 'EDGE_BOTTOM'
  | 'EDGE_LEFT'
  | 'EDGE_RIGHT'
  | 'RECT_TL'
  | 'RECT_TR'
  | 'RECT_BL'
  | 'RECT_BR'
  | 'RECT_TOP'
  | 'RECT_BOTTOM'
  | 'RECT_LEFT'
  | 'RECT_RIGHT'
  | 'CENTER'
  | null;

const CORNER_RADIUS = 15;
const TOUCH_HIT_SLOP = 34;
const LOUPE_SIZE = 100;
const LOUPE_ZOOM = 2.5;

export const ImageCropperModal: React.FC<ImageCropperModalProps> = ({
  visible,
  imageUri,
  imageWidth: initialWidth,
  imageHeight: initialHeight,
  onClose,
  onCropComplete,
}) => {
  const { colors, isDark } = useTheme();

  // Active Crop Mode
  const [cropMode, setCropMode] = useState<CropMode>('perspective');

  // Working image state (allows in-modal 90° rotation)
  const [currentUri, setCurrentUri] = useState<string>(imageUri);
  const [currentWidth, setCurrentWidth] = useState<number>(initialWidth);
  const [currentHeight, setCurrentHeight] = useState<number>(initialHeight);

  // Layout bounds on screen
  const [imgLayout, setImgLayout] = useState({ width: 0, height: 0 });
  const actualBoundsRef = useRef({ x: 0, y: 0, width: 0, height: 0, scale: 1 });

  // Normalized 4 corners for perspective crop [0..1]
  const [corners, setCorners] = useState<DocumentCorners>(() => getDefaultCorners(0.05));
  const cornersRef = useRef<DocumentCorners>(getDefaultCorners(0.05));

  // Normalized Rectangular Box for standard crop: { x, y, width, height }
  const [rectBox, setRectBox] = useState<{ x: number; y: number; width: number; height: number }>({
    x: 0.05,
    y: 0.05,
    width: 0.9,
    height: 0.9,
  });
  const rectBoxRef = useRef({ x: 0.05, y: 0.05, width: 0.9, height: 0.9 });

  // Touch & Loupe tracking
  const activeHandleRef = useRef<ActiveHandle>(null);
  const touchStartPosRef = useRef({ x: 0, y: 0 });
  const initialCornersRef = useRef<DocumentCorners>(getDefaultCorners(0.05));
  const initialRectRef = useRef({ x: 0.05, y: 0.05, width: 0.9, height: 0.9 });

  const [loupeVisible, setLoupeVisible] = useState(false);
  const [loupePos, setLoupePos] = useState({ x: 0, y: 0 });
  const [loupeTargetNorm, setLoupeTargetNorm] = useState<CornerPoint>({ x: 0.5, y: 0.5 });

  // Status & processing
  const [isEngineReady, setIsEngineReady] = useState(false);
  const [isDetecting, setIsDetecting] = useState(false);
  const [isWarping, setIsWarping] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  // Hidden WebView Engine Ref
  const webViewRef = useRef<WebView | null>(null);
  const engineHtml = useRef(getPerspectiveEngineHtml()).current;

  // Sync ref with state
  const updateCorners = (newCorners: DocumentCorners) => {
    cornersRef.current = newCorners;
    setCorners(newCorners);
  };

  const updateRectBox = (newRect: { x: number; y: number; width: number; height: number }) => {
    rectBoxRef.current = newRect;
    setRectBox(newRect);
  };

  // Reset or initialize when modal becomes visible or imageUri changes
  useEffect(() => {
    if (visible) {
      setCurrentUri(imageUri);
      setCurrentWidth(initialWidth);
      setCurrentHeight(initialHeight);
      const def = getDefaultCorners(0.05);
      updateCorners(def);
      updateRectBox({ x: 0.05, y: 0.05, width: 0.9, height: 0.9 });
      setStatusMessage(null);
      setLoupeVisible(false);
    } else {
      setImgLayout({ width: 0, height: 0 });
      setIsDetecting(false);
      setIsWarping(false);
    }
  }, [visible, imageUri, initialWidth, initialHeight]);

  // Calculate actual rendered image dimensions inside the container
  useEffect(() => {
    if (imgLayout.width > 0 && imgLayout.height > 0 && currentWidth > 0 && currentHeight > 0) {
      const scale = Math.min(imgLayout.width / currentWidth, imgLayout.height / currentHeight);
      const renderedW = currentWidth * scale;
      const renderedH = currentHeight * scale;
      const offsetX = (imgLayout.width - renderedW) / 2;
      const offsetY = (imgLayout.height - renderedH) / 2;

      actualBoundsRef.current = {
        x: offsetX,
        y: offsetY,
        width: renderedW,
        height: renderedH,
        scale,
      };
    }
  }, [imgLayout, currentWidth, currentHeight]);

  // Coordinate Conversion Helpers
  const normToScreen = useCallback((norm: CornerPoint) => {
    const b = actualBoundsRef.current;
    return {
      x: b.x + norm.x * b.width,
      y: b.y + norm.y * b.height,
    };
  }, []);

  const screenToNorm = useCallback((screenX: number, screenY: number) => {
    const b = actualBoundsRef.current;
    if (b.width === 0 || b.height === 0) return { x: 0, y: 0 };
    const nx = Math.max(0, Math.min(1, (screenX - b.x) / b.width));
    const ny = Math.max(0, Math.min(1, (screenY - b.y) / b.height));
    return { x: nx, y: ny };
  }, []);

  // Trigger Automatic Document Edge Detection
  const handleAutoDetect = useCallback(async () => {
    if (!currentUri) return;

    try {
      setIsDetecting(true);
      setStatusMessage('Detectando bordes del documento...');

      // Generate a quick 400px thumbnail as base64 to transfer instantly (<15ms)
      const thumb = await manipulateAsync(
        currentUri,
        [{ resize: { width: 400 } }],
        { format: SaveFormat.JPEG, compress: 0.6, base64: true }
      );

      if (thumb.base64 && webViewRef.current) {
        webViewRef.current.postMessage(
          JSON.stringify({
            type: 'DETECT_CORNERS',
            imageBase64: thumb.base64,
          })
        );
      } else {
        setIsDetecting(false);
      }
    } catch (err) {
      console.warn('Auto-detect error:', err);
      setIsDetecting(false);
      setStatusMessage('No se pudo auto-detectar. Ajusta las esquinas manualmente.');
    }
  }, [currentUri]);

  // When engine becomes ready, trigger auto-detection automatically
  useEffect(() => {
    if (visible && isEngineReady && currentUri) {
      handleAutoDetect();
    }
  }, [visible, isEngineReady, currentUri, handleAutoDetect]);

  // Handle messages from the hidden WebView Engine
  const handleEngineMessage = (event: any) => {
    try {
      const data = JSON.parse(event.nativeEvent.data);

      if (data.type === 'ENGINE_READY') {
        setIsEngineReady(true);
      } else if (data.type === 'CORNERS_DETECTED') {
        setIsDetecting(false);
        if (data.corners && isValidQuad(data.corners)) {
          updateCorners(data.corners);
          if (data.corners.confidence === 'high') {
            setStatusMessage('✨ Bordes detectados automáticamente');
          } else {
            setStatusMessage('Ajusta las esquinas a los bordes de la página');
          }
        }
      } else if (data.type === 'WARP_SUCCESS') {
        handleWarpSuccess(data.base64, data.destWidth, data.destHeight);
      } else if (data.type === 'WARP_ERROR' || data.type === 'ENGINE_ERROR') {
        setIsWarping(false);
        console.error('Perspective warp error:', data.error);
        Alert.alert('Error', 'No se pudo aplicar la corrección de perspectiva. Intenta con recorte estándar.');
      }
    } catch (e) {
      console.error('Error parsing engine message:', e);
    }
  };

  // Rotate 90° Clockwise
  const handleRotate90 = async () => {
    try {
      setIsWarping(true);
      const res = await manipulateAsync(
        currentUri,
        [{ rotate: 90 }],
        { format: SaveFormat.JPEG, compress: 0.92 }
      );
      setCurrentUri(res.uri);
      setCurrentWidth(res.width);
      setCurrentHeight(res.height);

      // Rotate corners 90°: (x, y) -> (1 - y, x)
      const c = cornersRef.current;
      updateCorners({
        tl: { x: 1 - c.bl.y, y: c.bl.x },
        tr: { x: 1 - c.tl.y, y: c.tl.x },
        br: { x: 1 - c.tr.y, y: c.tr.x },
        bl: { x: 1 - c.br.y, y: c.br.x },
      });
    } catch (err) {
      console.error('Rotate error:', err);
    } finally {
      setIsWarping(false);
    }
  };

  // Reset to full bounds
  const handleResetToFull = () => {
    updateCorners(getDefaultCorners(0.01));
    updateRectBox({ x: 0.01, y: 0.01, width: 0.98, height: 0.98 });
    setStatusMessage('Selección restablecida a la imagen completa');
  };

  // PanResponder for Interactive Quad Manipulation & Loupe
  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,

      onPanResponderGrant: (evt) => {
        const { locationX, locationY } = evt.nativeEvent;
        touchStartPosRef.current = { x: locationX, y: locationY };
        initialCornersRef.current = { ...cornersRef.current };
        initialRectRef.current = { ...rectBoxRef.current };

        const b = actualBoundsRef.current;
        if (b.width === 0 || b.height === 0) return;

        if (cropMode === 'perspective') {
          const c = cornersRef.current;
          const sTL = { x: b.x + c.tl.x * b.width, y: b.y + c.tl.y * b.height };
          const sTR = { x: b.x + c.tr.x * b.width, y: b.y + c.tr.y * b.height };
          const sBR = { x: b.x + c.br.x * b.width, y: b.y + c.br.y * b.height };
          const sBL = { x: b.x + c.bl.x * b.width, y: b.y + c.bl.y * b.height };

          const dist = (p: { x: number; y: number }) =>
            Math.hypot(locationX - p.x, locationY - p.y);

          // Check 4 Corner Handles
          if (dist(sTL) < TOUCH_HIT_SLOP) {
            activeHandleRef.current = 'TL';
            setLoupeTargetNorm(c.tl);
            setLoupePos({ x: sTL.x, y: sTL.y });
            setLoupeVisible(true);
            return;
          }
          if (dist(sTR) < TOUCH_HIT_SLOP) {
            activeHandleRef.current = 'TR';
            setLoupeTargetNorm(c.tr);
            setLoupePos({ x: sTR.x, y: sTR.y });
            setLoupeVisible(true);
            return;
          }
          if (dist(sBR) < TOUCH_HIT_SLOP) {
            activeHandleRef.current = 'BR';
            setLoupeTargetNorm(c.br);
            setLoupePos({ x: sBR.x, y: sBR.y });
            setLoupeVisible(true);
            return;
          }
          if (dist(sBL) < TOUCH_HIT_SLOP) {
            activeHandleRef.current = 'BL';
            setLoupeTargetNorm(c.bl);
            setLoupePos({ x: sBL.x, y: sBL.y });
            setLoupeVisible(true);
            return;
          }

          // Check 4 Edge Midpoint Handles
          const midTop = { x: (sTL.x + sTR.x) / 2, y: (sTL.y + sTR.y) / 2 };
          const midRight = { x: (sTR.x + sBR.x) / 2, y: (sTR.y + sBR.y) / 2 };
          const midBottom = { x: (sBL.x + sBR.x) / 2, y: (sBL.y + sBR.y) / 2 };
          const midLeft = { x: (sTL.x + sBL.x) / 2, y: (sTL.y + sBL.y) / 2 };

          if (dist(midTop) < TOUCH_HIT_SLOP) {
            activeHandleRef.current = 'EDGE_TOP';
            setLoupeTargetNorm({ x: (c.tl.x + c.tr.x) / 2, y: (c.tl.y + c.tr.y) / 2 });
            setLoupePos({ x: midTop.x, y: midTop.y });
            setLoupeVisible(true);
            return;
          }
          if (dist(midRight) < TOUCH_HIT_SLOP) {
            activeHandleRef.current = 'EDGE_RIGHT';
            setLoupeTargetNorm({ x: (c.tr.x + c.br.x) / 2, y: (c.tr.y + c.br.y) / 2 });
            setLoupePos({ x: midRight.x, y: midRight.y });
            setLoupeVisible(true);
            return;
          }
          if (dist(midBottom) < TOUCH_HIT_SLOP) {
            activeHandleRef.current = 'EDGE_BOTTOM';
            setLoupeTargetNorm({ x: (c.bl.x + c.br.x) / 2, y: (c.bl.y + c.br.y) / 2 });
            setLoupePos({ x: midBottom.x, y: midBottom.y });
            setLoupeVisible(true);
            return;
          }
          if (dist(midLeft) < TOUCH_HIT_SLOP) {
            activeHandleRef.current = 'EDGE_LEFT';
            setLoupeTargetNorm({ x: (c.tl.x + c.bl.x) / 2, y: (c.tl.y + c.bl.y) / 2 });
            setLoupePos({ x: midLeft.x, y: midLeft.y });
            setLoupeVisible(true);
            return;
          }

          // Inside polygon check -> move entire quad
          activeHandleRef.current = 'CENTER';
        } else {
          // Standard Rectangular Mode Handles
          const r = rectBoxRef.current;
          const rx = b.x + r.x * b.width;
          const ry = b.y + r.y * b.height;
          const rw = r.width * b.width;
          const rh = r.height * b.height;

          const isNear = (v1: number, v2: number) => Math.abs(v1 - v2) < TOUCH_HIT_SLOP;

          const isT = isNear(locationY, ry);
          const isB = isNear(locationY, ry + rh);
          const isL = isNear(locationX, rx);
          const isR = isNear(locationX, rx + rw);

          if (isT && isL) activeHandleRef.current = 'RECT_TL';
          else if (isT && isR) activeHandleRef.current = 'RECT_TR';
          else if (isB && isL) activeHandleRef.current = 'RECT_BL';
          else if (isB && isR) activeHandleRef.current = 'RECT_BR';
          else if (isT) activeHandleRef.current = 'RECT_TOP';
          else if (isB) activeHandleRef.current = 'RECT_BOTTOM';
          else if (isL) activeHandleRef.current = 'RECT_LEFT';
          else if (isR) activeHandleRef.current = 'RECT_RIGHT';
          else activeHandleRef.current = 'CENTER';
        }
      },

      onPanResponderMove: (evt, gestureState) => {
        const handle = activeHandleRef.current;
        if (!handle) return;

        const b = actualBoundsRef.current;
        if (b.width === 0 || b.height === 0) return;

        const normDx = gestureState.dx / b.width;
        const normDy = gestureState.dy / b.height;
        const clamp = (v: number) => Math.max(0, Math.min(1, v));

        if (cropMode === 'perspective') {
          const init = initialCornersRef.current;
          const next = {
            tl: { ...init.tl },
            tr: { ...init.tr },
            br: { ...init.br },
            bl: { ...init.bl },
          };

          if (handle === 'TL') {
            next.tl = { x: clamp(init.tl.x + normDx), y: clamp(init.tl.y + normDy) };
            setLoupeTargetNorm(next.tl);
          } else if (handle === 'TR') {
            next.tr = { x: clamp(init.tr.x + normDx), y: clamp(init.tr.y + normDy) };
            setLoupeTargetNorm(next.tr);
          } else if (handle === 'BR') {
            next.br = { x: clamp(init.br.x + normDx), y: clamp(init.br.y + normDy) };
            setLoupeTargetNorm(next.br);
          } else if (handle === 'BL') {
            next.bl = { x: clamp(init.bl.x + normDx), y: clamp(init.bl.y + normDy) };
            setLoupeTargetNorm(next.bl);
          } else if (handle === 'EDGE_TOP') {
            next.tl.y = clamp(init.tl.y + normDy);
            next.tr.y = clamp(init.tr.y + normDy);
            setLoupeTargetNorm({ x: (next.tl.x + next.tr.x) / 2, y: (next.tl.y + next.tr.y) / 2 });
          } else if (handle === 'EDGE_BOTTOM') {
            next.bl.y = clamp(init.bl.y + normDy);
            next.br.y = clamp(init.br.y + normDy);
            setLoupeTargetNorm({ x: (next.bl.x + next.br.x) / 2, y: (next.bl.y + next.br.y) / 2 });
          } else if (handle === 'EDGE_LEFT') {
            next.tl.x = clamp(init.tl.x + normDx);
            next.bl.x = clamp(init.bl.x + normDx);
            setLoupeTargetNorm({ x: (next.tl.x + next.bl.x) / 2, y: (next.tl.y + next.bl.y) / 2 });
          } else if (handle === 'EDGE_RIGHT') {
            next.tr.x = clamp(init.tr.x + normDx);
            next.br.x = clamp(init.br.x + normDx);
            setLoupeTargetNorm({ x: (next.tr.x + next.br.x) / 2, y: (next.tr.y + next.br.y) / 2 });
          } else if (handle === 'CENTER') {
            // Translate all 4 points
            const minX = Math.min(init.tl.x, init.tr.x, init.br.x, init.bl.x);
            const maxX = Math.max(init.tl.x, init.tr.x, init.br.x, init.bl.x);
            const minY = Math.min(init.tl.y, init.tr.y, init.br.y, init.bl.y);
            const maxY = Math.max(init.tl.y, init.tr.y, init.br.y, init.bl.y);

            const safeDx = Math.max(-minX, Math.min(1 - maxX, normDx));
            const safeDy = Math.max(-minY, Math.min(1 - maxY, normDy));

            next.tl = { x: init.tl.x + safeDx, y: init.tl.y + safeDy };
            next.tr = { x: init.tr.x + safeDx, y: init.tr.y + safeDy };
            next.br = { x: init.br.x + safeDx, y: init.br.y + safeDy };
            next.bl = { x: init.bl.x + safeDx, y: init.bl.y + safeDy };
          }

          setLoupePos({
            x: evt.nativeEvent.locationX,
            y: evt.nativeEvent.locationY,
          });

          updateCorners(next);
        } else {
          // Standard Rectangular Mode logic
          const init = initialRectRef.current;
          let nx = init.x;
          let ny = init.y;
          let nw = init.width;
          let nh = init.height;

          const MIN_SIZE = 0.1;

          if (handle === 'CENTER') {
            nx = Math.max(0, Math.min(1 - nw, init.x + normDx));
            ny = Math.max(0, Math.min(1 - nh, init.y + normDy));
          } else {
            if (handle.includes('TOP')) {
              ny = init.y + normDy;
              nh = init.height - normDy;
            }
            if (handle.includes('BOTTOM')) {
              nh = init.height + normDy;
            }
            if (handle.includes('LEFT')) {
              nx = init.x + normDx;
              nw = init.width - normDx;
            }
            if (handle.includes('RIGHT')) {
              nw = init.width + normDx;
            }

            if (nw < MIN_SIZE) {
              if (handle.includes('LEFT')) nx = init.x + init.width - MIN_SIZE;
              nw = MIN_SIZE;
            }
            if (nh < MIN_SIZE) {
              if (handle.includes('TOP')) ny = init.y + init.height - MIN_SIZE;
              nh = MIN_SIZE;
            }

            nx = clamp(nx);
            ny = clamp(ny);
            if (nx + nw > 1) nw = 1 - nx;
            if (ny + nh > 1) nh = 1 - ny;
          }

          updateRectBox({ x: nx, y: ny, width: nw, height: nh });
        }
      },

      onPanResponderRelease: () => {
        activeHandleRef.current = null;
        setLoupeVisible(false);
      },
    })
  ).current;

  // Execute Perspective Warp & Save
  const handleApplyCrop = async () => {
    if (isWarping) return;

    if (cropMode === 'rect') {
      // Fast Rectangular Crop with expo-image-manipulator
      try {
        setIsWarping(true);
        const r = rectBoxRef.current;
        const originX = Math.round(r.x * currentWidth);
        const originY = Math.round(r.y * currentHeight);
        const cropW = Math.round(r.width * currentWidth);
        const cropH = Math.round(r.height * currentHeight);

        const result = await manipulateAsync(
          currentUri,
          [
            {
              crop: {
                originX: Math.max(0, originX),
                originY: Math.max(0, originY),
                width: Math.min(currentWidth - originX, cropW),
                height: Math.min(currentHeight - originY, cropH),
              },
            },
          ],
          { compress: 0.92, format: SaveFormat.JPEG }
        );

        onCropComplete({ uri: result.uri, width: result.width, height: result.height });
      } catch (err) {
        console.error('Rect crop error:', err);
        Alert.alert('Error', 'No se pudo recortar la imagen.');
      } finally {
        setIsWarping(false);
      }
      return;
    }

    // Perspective Mode: calculate dimensions and execute homography warp
    try {
      setIsWarping(true);
      setStatusMessage('Corrigiendo perspectiva y enderezando...');

      const c = cornersRef.current;
      const targetDims = computeWarpDimensions(c, currentWidth, currentHeight);

      // Read image base64
      const fullBase64 = await FileSystem.readAsStringAsync(currentUri, {
        encoding: FileSystem.EncodingType.Base64,
      });

      if (webViewRef.current) {
        webViewRef.current.postMessage(
          JSON.stringify({
            type: 'WARP_PERSPECTIVE',
            imageBase64: fullBase64,
            corners: c,
            destWidth: targetDims.width,
            destHeight: targetDims.height,
          })
        );
      }
    } catch (err: any) {
      console.error('Error starting perspective warp:', err);
      setIsWarping(false);
      Alert.alert('Error', 'No se pudo leer la imagen para corregir perspectiva.');
    }
  };

  // Called when WebView completes perspective warp
  const handleWarpSuccess = async (base64Result: string, destWidth: number, destHeight: number) => {
    try {
      const cleanBase64 = base64Result.replace(/^data:image\/\w+;base64,/, '');
      const targetFile = `${FileSystem.cacheDirectory}perspective_${Date.now()}.jpg`;

      await FileSystem.writeAsStringAsync(targetFile, cleanBase64, {
        encoding: FileSystem.EncodingType.Base64,
      });

      setIsWarping(false);
      onCropComplete({
        uri: targetFile,
        width: destWidth,
        height: destHeight,
      });
    } catch (err) {
      console.error('Error saving warped image:', err);
      setIsWarping(false);
      Alert.alert('Error', 'No se pudo guardar la imagen corregida.');
    }
  };

  // Screen coordinates of the 4 corners for SVG rendering
  const sTL = normToScreen(corners.tl);
  const sTR = normToScreen(corners.tr);
  const sBR = normToScreen(corners.br);
  const sBL = normToScreen(corners.bl);

  // Screen coordinates for 3x3 internal perspective grid
  const gridPoints = {
    top1: { x: sTL.x + (sTR.x - sTL.x) * (1 / 3), y: sTL.y + (sTR.y - sTL.y) * (1 / 3) },
    top2: { x: sTL.x + (sTR.x - sTL.x) * (2 / 3), y: sTL.y + (sTR.y - sTL.y) * (2 / 3) },
    bot1: { x: sBL.x + (sBR.x - sBL.x) * (1 / 3), y: sBL.y + (sBR.y - sBL.y) * (1 / 3) },
    bot2: { x: sBL.x + (sBR.x - sBL.x) * (2 / 3), y: sBL.y + (sBR.y - sBL.y) * (2 / 3) },
    left1: { x: sTL.x + (sBL.x - sTL.x) * (1 / 3), y: sTL.y + (sBL.y - sTL.y) * (1 / 3) },
    left2: { x: sTL.x + (sBL.x - sTL.x) * (2 / 3), y: sTL.y + (sBL.y - sTL.y) * (2 / 3) },
    right1: { x: sTR.x + (sBR.x - sTR.x) * (1 / 3), y: sTR.y + (sBR.y - sTR.y) * (1 / 3) },
    right2: { x: sTR.x + (sBR.x - sTR.x) * (2 / 3), y: sTR.y + (sBR.y - sTR.y) * (2 / 3) },
  };

  // Midpoints of edges
  const midTop = { x: (sTL.x + sTR.x) / 2, y: (sTL.y + sTR.y) / 2 };
  const midRight = { x: (sTR.x + sBR.x) / 2, y: (sTR.y + sBR.y) / 2 };
  const midBottom = { x: (sBL.x + sBR.x) / 2, y: (sBL.y + sBR.y) / 2 };
  const midLeft = { x: (sTL.x + sBL.x) / 2, y: (sTL.y + sBL.y) / 2 };

  // Rectangular mode coordinates
  const b = actualBoundsRef.current;
  const sRect = {
    x: b.x + rectBox.x * b.width,
    y: b.y + rectBox.y * b.height,
    w: rectBox.width * b.width,
    h: rectBox.height * b.height,
  };

  // Calculate loupe placement so it floats above user's finger
  const loupeLeft = Math.max(16, Math.min(SCREEN_WIDTH - LOUPE_SIZE - 16, loupePos.x - LOUPE_SIZE / 2));
  const loupeTop = Math.max(70, loupePos.y - LOUPE_SIZE - 40);

  return (
    <Modal visible={visible} animationType="slide" transparent={false} onRequestClose={onClose}>
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        {/* Top Header Bar */}
        <View style={[styles.header, { borderBottomColor: colors.border }]}>
          <TouchableOpacity onPress={onClose} style={styles.headerBtn} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
            <Ionicons name="close" size={26} color={colors.textPrimary} />
          </TouchableOpacity>

          <View style={styles.headerTitleContainer}>
            <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>Recorte y Perspectiva</Text>
            {statusMessage && (
              <Text style={[styles.statusSubtitle, { color: colors.primary }]} numberOfLines={1}>
                {statusMessage}
              </Text>
            )}
          </View>

          <TouchableOpacity onPress={handleResetToFull} style={styles.headerBtn} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
            <Ionicons name="refresh-outline" size={24} color={colors.textPrimary} />
          </TouchableOpacity>
        </View>

        {/* Mode Selector Tabs (Perspectiva 4 Esquinas vs Rectangular Clásico) */}
        <View style={styles.modeTabsContainer}>
          <View style={[styles.modeTabsTrack, { backgroundColor: colors.cardBgElevated }]}>
            <TouchableOpacity
              style={[
                styles.modeTab,
                cropMode === 'perspective' && [styles.modeTabActive, { backgroundColor: colors.primary }],
              ]}
              onPress={() => setCropMode('perspective')}
              activeOpacity={0.8}
            >
              <Ionicons
                name="scan-outline"
                size={16}
                color={cropMode === 'perspective' ? '#FFFFFF' : colors.textSecondary}
              />
              <Text
                style={[
                  styles.modeTabText,
                  { color: cropMode === 'perspective' ? '#FFFFFF' : colors.textSecondary },
                ]}
              >
                Perspectiva (4 Esquinas)
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.modeTab,
                cropMode === 'rect' && [styles.modeTabActive, { backgroundColor: colors.primary }],
              ]}
              onPress={() => setCropMode('rect')}
              activeOpacity={0.8}
            >
              <Ionicons
                name="crop-outline"
                size={16}
                color={cropMode === 'rect' ? '#FFFFFF' : colors.textSecondary}
              />
              <Text
                style={[
                  styles.modeTabText,
                  { color: cropMode === 'rect' ? '#FFFFFF' : colors.textSecondary },
                ]}
              >
                Rectangular
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Main Interactive Image Canvas */}
        <View
          style={styles.imageWorkspace}
          onLayout={(e) => setImgLayout(e.nativeEvent.layout)}
          {...panResponder.panHandlers}
        >
          {imgLayout.width > 0 && imgLayout.height > 0 && (
            <>
              {/* Underlying Image */}
              <Image
                source={{ uri: currentUri }}
                style={[
                  styles.baseImage,
                  {
                    left: actualBoundsRef.current.x,
                    top: actualBoundsRef.current.y,
                    width: actualBoundsRef.current.width,
                    height: actualBoundsRef.current.height,
                  },
                ]}
                resizeMode="contain"
              />

              {/* SVG Overlay: 4 Corners / Quadrilateral Mode */}
              {cropMode === 'perspective' && (
                <Svg style={StyleSheet.absoluteFill} pointerEvents="none">
                  {/* Shaded polygon over document */}
                  <Polygon
                    points={`${sTL.x},${sTL.y} ${sTR.x},${sTR.y} ${sBR.x},${sBR.y} ${sBL.x},${sBL.y}`}
                    fill="rgba(229, 57, 53, 0.18)"
                    stroke="#E53935"
                    strokeWidth="2.5"
                    strokeLinejoin="round"
                  />

                  {/* 3x3 Perspective Grid Lines */}
                  <Line
                    x1={gridPoints.top1.x}
                    y1={gridPoints.top1.y}
                    x2={gridPoints.bot1.x}
                    y2={gridPoints.bot1.y}
                    stroke="rgba(255, 255, 255, 0.3)"
                    strokeWidth="1"
                    strokeDasharray="4, 4"
                  />
                  <Line
                    x1={gridPoints.top2.x}
                    y1={gridPoints.top2.y}
                    x2={gridPoints.bot2.x}
                    y2={gridPoints.bot2.y}
                    stroke="rgba(255, 255, 255, 0.3)"
                    strokeWidth="1"
                    strokeDasharray="4, 4"
                  />
                  <Line
                    x1={gridPoints.left1.x}
                    y1={gridPoints.left1.y}
                    x2={gridPoints.right1.x}
                    y2={gridPoints.right1.y}
                    stroke="rgba(255, 255, 255, 0.3)"
                    strokeWidth="1"
                    strokeDasharray="4, 4"
                  />
                  <Line
                    x1={gridPoints.left2.x}
                    y1={gridPoints.left2.y}
                    x2={gridPoints.right2.x}
                    y2={gridPoints.right2.y}
                    stroke="rgba(255, 255, 255, 0.3)"
                    strokeWidth="1"
                    strokeDasharray="4, 4"
                  />

                  {/* 4 Edge Midpoint Pill Markers */}
                  <Circle cx={midTop.x} cy={midTop.y} r="5" fill="#FFFFFF" stroke="#E53935" strokeWidth="2" />
                  <Circle cx={midRight.x} cy={midRight.y} r="5" fill="#FFFFFF" stroke="#E53935" strokeWidth="2" />
                  <Circle cx={midBottom.x} cy={midBottom.y} r="5" fill="#FFFFFF" stroke="#E53935" strokeWidth="2" />
                  <Circle cx={midLeft.x} cy={midLeft.y} r="5" fill="#FFFFFF" stroke="#E53935" strokeWidth="2" />

                  {/* 4 Corner Handles with Outer Ring and Center Crosshair */}
                  {[sTL, sTR, sBR, sBL].map((pt, idx) => (
                    <G key={idx}>
                      <Circle cx={pt.x} cy={pt.y} r={CORNER_RADIUS} fill="#E53935" stroke="#FFFFFF" strokeWidth="2.5" />
                      <Circle cx={pt.x} cy={pt.y} r="3.5" fill="#FFFFFF" />
                    </G>
                  ))}
                </Svg>
              )}

              {/* Standard Rectangular Mode Overlay */}
              {cropMode === 'rect' && (
                <View
                  pointerEvents="none"
                  style={[
                    styles.rectBoxOverlay,
                    {
                      left: sRect.x,
                      top: sRect.y,
                      width: sRect.w,
                      height: sRect.h,
                      borderColor: colors.primary,
                    },
                  ]}
                >
                  <View style={[styles.rectHandle, styles.rH_TL, { borderColor: colors.primary }]} />
                  <View style={[styles.rectHandle, styles.rH_TR, { borderColor: colors.primary }]} />
                  <View style={[styles.rectHandle, styles.rH_BL, { borderColor: colors.primary }]} />
                  <View style={[styles.rectHandle, styles.rH_BR, { borderColor: colors.primary }]} />
                </View>
              )}

              {/* Magnifying Loupe (Lupa de Precisión) floating over touch point */}
              {loupeVisible && cropMode === 'perspective' && (
                <View style={[styles.loupeContainer, { left: loupeLeft, top: loupeTop }]}>
                  <View style={styles.loupeInnerMask}>
                    <Image
                      source={{ uri: currentUri }}
                      style={{
                        position: 'absolute',
                        width: actualBoundsRef.current.width * LOUPE_ZOOM,
                        height: actualBoundsRef.current.height * LOUPE_ZOOM,
                        left: LOUPE_SIZE / 2 - loupeTargetNorm.x * actualBoundsRef.current.width * LOUPE_ZOOM,
                        top: LOUPE_SIZE / 2 - loupeTargetNorm.y * actualBoundsRef.current.height * LOUPE_ZOOM,
                      }}
                      resizeMode="contain"
                    />
                    {/* Reticle / Crosshair */}
                    <View style={styles.loupeCrossH} />
                    <View style={styles.loupeCrossV} />
                    <View style={styles.loupeCenterDot} />
                  </View>
                </View>
              )}
            </>
          )}

          {/* Detecting / Warping Indicator */}
          {(isDetecting || isWarping) && (
            <View style={styles.processingBackdrop}>
              <View style={[styles.processingCard, { backgroundColor: colors.cardBgElevated }]}>
                <ActivityIndicator size="large" color={colors.primary} />
                <Text style={[styles.processingText, { color: colors.textPrimary }]}>
                  {isDetecting ? 'Detectando esquinas...' : 'Enderezando documento...'}
                </Text>
              </View>
            </View>
          )}
        </View>

        {/* Bottom Toolbar & Action Buttons */}
        <View style={[styles.bottomBar, { borderTopColor: colors.border, backgroundColor: colors.cardBg }]}>
          {/* Quick Tools: Auto-Detect, Rotate 90, Full */}
          <View style={styles.quickToolsRow}>
            {cropMode === 'perspective' && (
              <TouchableOpacity
                style={[styles.quickToolBtn, { backgroundColor: colors.cardBgElevated }]}
                onPress={handleAutoDetect}
                disabled={isDetecting || isWarping}
                activeOpacity={0.8}
              >
                <Ionicons name="sparkles" size={17} color={colors.primary} />
                <Text style={[styles.quickToolText, { color: colors.textPrimary }]}>Auto-detectar</Text>
              </TouchableOpacity>
            )}

            <TouchableOpacity
              style={[styles.quickToolBtn, { backgroundColor: colors.cardBgElevated }]}
              onPress={handleRotate90}
              disabled={isWarping}
              activeOpacity={0.8}
            >
              <Ionicons name="refresh" size={17} color={colors.textPrimary} />
              <Text style={[styles.quickToolText, { color: colors.textPrimary }]}>Girar 90°</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.quickToolBtn, { backgroundColor: colors.cardBgElevated }]}
              onPress={handleResetToFull}
              disabled={isWarping}
              activeOpacity={0.8}
            >
              <Ionicons name="expand-outline" size={17} color={colors.textPrimary} />
              <Text style={[styles.quickToolText, { color: colors.textPrimary }]}>Pantalla Completa</Text>
            </TouchableOpacity>
          </View>

          {/* Confirm / Apply Button */}
          <TouchableOpacity
            style={[styles.applyBtn, { backgroundColor: colors.primary }, isWarping && styles.btnDisabled]}
            onPress={handleApplyCrop}
            disabled={isWarping || isDetecting}
            activeOpacity={0.85}
          >
            <Ionicons name="checkmark-done" size={22} color="#FFFFFF" style={{ marginRight: 8 }} />
            <Text style={styles.applyBtnText}>
              {cropMode === 'perspective' ? 'Corregir Perspectiva y Recortar' : 'Aplicar Recorte'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Hidden WebView running WebGL & HTML5 Engine */}
        <View style={styles.hiddenEngineContainer} pointerEvents="none">
          <WebView
            ref={webViewRef}
            source={{ html: engineHtml }}
            originWhitelist={['*']}
            javaScriptEnabled={true}
            domStorageEnabled={true}
            allowFileAccess={true}
            allowFileAccessFromFileURLs={true}
            allowUniversalAccessFromFileURLs={true}
            onMessage={handleEngineMessage}
          />
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
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderBottomWidth: 1,
  },
  headerBtn: {
    padding: SPACING.xs,
  },
  headerTitleContainer: {
    flex: 1,
    alignItems: 'center',
    marginHorizontal: SPACING.sm,
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '700',
  },
  statusSubtitle: {
    fontSize: 12,
    fontWeight: '600',
    marginTop: 2,
  },
  modeTabsContainer: {
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
  },
  modeTabsTrack: {
    flexDirection: 'row',
    borderRadius: RADIUS.full,
    padding: 3,
  },
  modeTab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 7,
    borderRadius: RADIUS.full,
    gap: 6,
  },
  modeTabActive: {
    shadowColor: '#E53935',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },
  modeTabText: {
    fontSize: 13,
    fontWeight: '600',
  },
  imageWorkspace: {
    flex: 1,
    overflow: 'hidden',
    position: 'relative',
    backgroundColor: '#0A0A0A',
  },
  baseImage: {
    position: 'absolute',
  },
  rectBoxOverlay: {
    position: 'absolute',
    borderWidth: 2,
    backgroundColor: 'rgba(229, 57, 53, 0.15)',
  },
  rectHandle: {
    position: 'absolute',
    width: 16,
    height: 16,
    backgroundColor: '#FFFFFF',
    borderWidth: 2.5,
    borderRadius: 8,
  },
  rH_TL: { top: -8, left: -8 },
  rH_TR: { top: -8, right: -8 },
  rH_BL: { bottom: -8, left: -8 },
  rH_BR: { bottom: -8, right: -8 },

  // Magnifying Loupe
  loupeContainer: {
    position: 'absolute',
    width: LOUPE_SIZE,
    height: LOUPE_SIZE,
    borderRadius: LOUPE_SIZE / 2,
    borderWidth: 3,
    borderColor: '#FFFFFF',
    backgroundColor: '#000000',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.5,
    shadowRadius: 10,
    elevation: 12,
    zIndex: 999,
  },
  loupeInnerMask: {
    width: '100%',
    height: '100%',
    borderRadius: LOUPE_SIZE / 2,
    overflow: 'hidden',
    position: 'relative',
    justifyContent: 'center',
    alignItems: 'center',
  },
  loupeCrossH: {
    position: 'absolute',
    width: 22,
    height: 2,
    backgroundColor: '#E53935',
  },
  loupeCrossV: {
    position: 'absolute',
    width: 2,
    height: 22,
    backgroundColor: '#E53935',
  },
  loupeCenterDot: {
    position: 'absolute',
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#FFFFFF',
  },

  // Processing Overlay
  processingBackdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 100,
  },
  processingCard: {
    paddingHorizontal: SPACING.xl,
    paddingVertical: SPACING.lg,
    borderRadius: RADIUS.lg,
    alignItems: 'center',
    gap: SPACING.sm,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 6,
  },
  processingText: {
    fontSize: 15,
    fontWeight: '600',
  },

  // Bottom Toolbar
  bottomBar: {
    paddingHorizontal: SPACING.md,
    paddingTop: SPACING.sm,
    paddingBottom: SPACING.md,
    borderTopWidth: 1,
    gap: SPACING.sm,
  },
  quickToolsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: SPACING.xs,
  },
  quickToolBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 9,
    paddingHorizontal: 8,
    borderRadius: RADIUS.md,
    gap: 6,
  },
  quickToolText: {
    fontSize: 12,
    fontWeight: '600',
  },
  applyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: RADIUS.full,
    shadowColor: '#E53935',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.35,
    shadowRadius: 6,
    elevation: 4,
  },
  applyBtnText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  btnDisabled: {
    opacity: 0.6,
  },

  // Off-screen engine container
  hiddenEngineContainer: {
    position: 'absolute',
    top: -9999,
    left: -9999,
    width: 1,
    height: 1,
    opacity: 0,
  },
});
