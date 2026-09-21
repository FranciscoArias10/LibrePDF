import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  Alert,
  Animated,
  StatusBar,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import {
  CameraView,
  useCameraPermissions,
  CameraType,
  FlashMode,
} from 'expo-camera';
import { Ionicons } from '@expo/vector-icons';
import { PageImage, RootStackParamList } from '../types';
import { SPACING, RADIUS } from '../constants/theme';
import { useTheme } from '../contexts/ThemeContext';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

type NavigationProp = NativeStackNavigationProp<RootStackParamList, 'Camera'>;
type CameraRouteProp = RouteProp<RootStackParamList, 'Camera'>;

export const CameraScreen: React.FC = () => {
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<CameraRouteProp>();
  const { colors } = useTheme();

  const returnToEditor = route.params?.returnToEditor ?? false;

  const [permission, requestPermission] = useCameraPermissions();
  const cameraRef = useRef<CameraView | null>(null);

  const [facing, setFacing] = useState<CameraType>('back');
  const [flash, setFlash] = useState<FlashMode>('off');
  const [capturedPages, setCapturedPages] = useState<PageImage[]>([]);
  const [isCapturing, setIsCapturing] = useState(false);

  // Flash animation for shutter feedback
  const flashAnim = useRef(new Animated.Value(0)).current;

  // Trigger white flash animation on shutter
  const triggerShutterEffect = () => {
    flashAnim.setValue(1);
    Animated.timing(flashAnim, {
      toValue: 0,
      duration: 180,
      useNativeDriver: true,
    }).start();
  };

  const handleTakePicture = async () => {
    if (!cameraRef.current || isCapturing) return;

    try {
      setIsCapturing(true);
      triggerShutterEffect();

      const photo = await cameraRef.current.takePictureAsync({
        quality: 0.9,
        skipProcessing: false,
      });

      if (photo && photo.uri) {
        const newPage: PageImage = {
          id: `img_${Date.now()}_${capturedPages.length}`,
          uri: photo.uri,
          originalUri: photo.uri,
          width: photo.width || 1080,
          height: photo.height || 1920,
          rotation: 0,
          filter: 'original',
        };

        setCapturedPages((prev) => [...prev, newPage]);
      }
    } catch (error) {
      console.error('Error al tomar foto:', error);
      Alert.alert('Error', 'No se pudo capturar la imagen. Intenta nuevamente.');
    } finally {
      setIsCapturing(false);
    }
  };

  const toggleFacing = () => {
    setFacing((prev) => (prev === 'back' ? 'front' : 'back'));
  };

  const toggleFlash = () => {
    setFlash((prev) => {
      if (prev === 'off') return 'on';
      if (prev === 'on') return 'auto';
      return 'off';
    });
  };

  const handleFinish = () => {
    if (capturedPages.length === 0) {
      navigation.goBack();
      return;
    }

    if (returnToEditor) {
      // Append pages to existing editor session
      navigation.navigate('Editor', { appendedImages: capturedPages });
    } else {
      // Start new editor session
      navigation.navigate('Editor', { initialImages: capturedPages });
    }
  };

  const handleCancel = () => {
    if (capturedPages.length > 0) {
      Alert.alert(
        'Descartar páginas',
        `Tienes ${capturedPages.length} página(s) capturada(s). ¿Deseas descartarlas y salir?`,
        [
          { text: 'Seguir capturando', style: 'cancel' },
          {
            text: 'Descartar',
            style: 'destructive',
            onPress: () => navigation.goBack(),
          },
        ]
      );
    } else {
      navigation.goBack();
    }
  };

  if (!permission) {
    return <View style={styles.permissionContainer} />;
  }

  if (!permission.granted) {
    return (
      <SafeAreaView style={[styles.permissionContainer, { backgroundColor: colors.background }]}>
        <StatusBar barStyle="light-content" />
        <View style={styles.permissionCard}>
          <Ionicons name="camera" size={64} color={colors.primary} />
          <Text style={[styles.permissionTitle, { color: colors.textPrimary }]}>
            Permiso de Cámara
          </Text>
          <Text style={[styles.permissionDesc, { color: colors.textSecondary }]}>
            LibrePDF necesita acceso a la cámara para escanear múltiples páginas consecutivas.
          </Text>
          <TouchableOpacity
            style={[styles.permissionBtn, { backgroundColor: colors.primary }]}
            onPress={requestPermission}
          >
            <Text style={styles.permissionBtnText}>Permitir Acceso</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const lastPhoto = capturedPages.length > 0 ? capturedPages[capturedPages.length - 1] : null;

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />

      {/* Live Camera View */}
      <CameraView
        ref={cameraRef}
        style={StyleSheet.absoluteFill}
        facing={facing}
        flash={flash}
        autofocus="on"
      />

      {/* White shutter flash effect */}
      <Animated.View
        pointerEvents="none"
        style={[
          styles.shutterFlash,
          {
            opacity: flashAnim,
          },
        ]}
      />

      {/* Document Framing Guide */}
      <View pointerEvents="none" style={styles.guideContainer}>
        <View style={styles.guideFrame}>
          <View style={[styles.guideCorner, styles.cTL]} />
          <View style={[styles.guideCorner, styles.cTR]} />
          <View style={[styles.guideCorner, styles.cBL]} />
          <View style={[styles.guideCorner, styles.cBR]} />
        </View>
        <Text style={styles.guideHint}>Alinea la hoja dentro del recuadro</Text>
      </View>

      {/* Top Controls Overlay */}
      <SafeAreaView style={styles.topBar}>
        <TouchableOpacity
          style={styles.topBtn}
          onPress={handleCancel}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
        >
          <Ionicons name="close" size={28} color="#FFFFFF" />
        </TouchableOpacity>

        <View style={styles.modeBadge}>
          <Text style={styles.modeText}>
            Escaneo Continuo · Pág. {capturedPages.length + 1}
          </Text>
        </View>

        <View style={styles.topRightGroup}>
          <TouchableOpacity
            style={styles.topBtn}
            onPress={toggleFlash}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          >
            <Ionicons
              name={
                flash === 'on'
                  ? 'flash'
                  : flash === 'auto'
                  ? 'flash-outline'
                  : 'flash-off'
              }
              size={24}
              color={flash === 'off' ? '#CCCCCC' : '#FBBF24'}
            />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.topBtn}
            onPress={toggleFacing}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          >
            <Ionicons name="camera-reverse-outline" size={26} color="#FFFFFF" />
          </TouchableOpacity>
        </View>
      </SafeAreaView>

      {/* Bottom Controls Overlay */}
      <View style={styles.bottomBar}>
        {/* Left: Thumbnail & Counter */}
        <View style={styles.thumbContainer}>
          {lastPhoto ? (
            <View style={styles.thumbWrapper}>
              <Image source={{ uri: lastPhoto.uri }} style={styles.thumbImage} />
              <View style={styles.counterBadge}>
                <Text style={styles.counterText}>{capturedPages.length}</Text>
              </View>
            </View>
          ) : (
            <View style={styles.thumbEmpty}>
              <Ionicons name="documents-outline" size={24} color="#666666" />
            </View>
          )}
        </View>

        {/* Center: Main Shutter Button */}
        <TouchableOpacity
          style={[styles.shutterOuter, isCapturing && styles.shutterDisabled]}
          onPress={handleTakePicture}
          disabled={isCapturing}
          activeOpacity={0.7}
        >
          <View style={styles.shutterInner} />
        </TouchableOpacity>

        {/* Right: Done / Next Button */}
        <View style={styles.finishContainer}>
          {capturedPages.length > 0 ? (
            <TouchableOpacity
              style={styles.doneBtn}
              onPress={handleFinish}
              activeOpacity={0.8}
            >
              <Text style={styles.doneBtnText}>Listo</Text>
              <View style={styles.doneCountBadge}>
                <Text style={styles.doneCountText}>{capturedPages.length}</Text>
              </View>
              <Ionicons name="arrow-forward" size={18} color="#FFFFFF" />
            </TouchableOpacity>
          ) : (
            <View style={styles.finishPlaceholder} />
          )}
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
  permissionContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: SPACING.xl,
  },
  permissionCard: {
    alignItems: 'center',
    padding: SPACING.xl,
    borderRadius: RADIUS.lg,
  },
  permissionTitle: {
    fontSize: 20,
    fontWeight: '700',
    marginTop: SPACING.md,
  },
  permissionDesc: {
    fontSize: 14,
    textAlign: 'center',
    marginTop: SPACING.sm,
    marginBottom: SPACING.lg,
  },
  permissionBtn: {
    paddingHorizontal: SPACING.xl,
    paddingVertical: SPACING.md,
    borderRadius: RADIUS.full,
  },
  permissionBtnText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 16,
  },
  shutterFlash: {
    ...StyleSheet.absoluteFill,
    backgroundColor: '#FFFFFF',
    zIndex: 10,
  },
  guideContainer: {
    ...StyleSheet.absoluteFill,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 2,
  },
  guideFrame: {
    width: SCREEN_WIDTH * 0.84,
    height: SCREEN_HEIGHT * 0.58,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.25)',
    position: 'relative',
  },
  guideCorner: {
    position: 'absolute',
    width: 24,
    height: 24,
    borderColor: '#3b82f6',
  },
  cTL: { top: -2, left: -2, borderTopWidth: 4, borderLeftWidth: 4, borderTopLeftRadius: 6 },
  cTR: { top: -2, right: -2, borderTopWidth: 4, borderRightWidth: 4, borderTopRightRadius: 6 },
  cBL: { bottom: -2, left: -2, borderBottomWidth: 4, borderLeftWidth: 4, borderBottomLeftRadius: 6 },
  cBR: { bottom: -2, right: -2, borderBottomWidth: 4, borderRightWidth: 4, borderBottomRightRadius: 6 },
  guideHint: {
    color: 'rgba(255, 255, 255, 0.75)',
    fontSize: 13,
    marginTop: SPACING.md,
    fontWeight: '500',
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    paddingHorizontal: SPACING.md,
    paddingVertical: 4,
    borderRadius: RADIUS.full,
  },
  topBar: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.sm,
    zIndex: 5,
  },
  topBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  topRightGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  modeBadge: {
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    paddingHorizontal: SPACING.md,
    paddingVertical: 6,
    borderRadius: RADIUS.full,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
  },
  modeText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '600',
  },
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 140,
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.xl,
    paddingBottom: SPACING.lg,
    zIndex: 5,
  },
  thumbContainer: {
    width: 70,
    alignItems: 'flex-start',
  },
  thumbWrapper: {
    width: 52,
    height: 68,
    borderRadius: RADIUS.sm,
    borderWidth: 2,
    borderColor: '#FFFFFF',
    position: 'relative',
    overflow: 'visible',
  },
  thumbImage: {
    width: '100%',
    height: '100%',
    borderRadius: RADIUS.sm - 2,
  },
  counterBadge: {
    position: 'absolute',
    top: -8,
    right: -8,
    backgroundColor: '#3b82f6',
    width: 22,
    height: 22,
    borderRadius: 11,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#FFFFFF',
  },
  counterText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
  },
  thumbEmpty: {
    width: 52,
    height: 68,
    borderRadius: RADIUS.sm,
    borderWidth: 1.5,
    borderColor: '#444444',
    borderStyle: 'dashed',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
  },
  shutterOuter: {
    width: 76,
    height: 76,
    borderRadius: 38,
    borderWidth: 4,
    borderColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'transparent',
  },
  shutterInner: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#FFFFFF',
  },
  shutterDisabled: {
    opacity: 0.5,
  },
  finishContainer: {
    width: 100,
    alignItems: 'flex-end',
  },
  finishPlaceholder: {
    width: 100,
  },
  doneBtn: {
    backgroundColor: '#10B981',
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: RADIUS.full,
    gap: 6,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },
  doneBtnText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 14,
  },
  doneCountBadge: {
    backgroundColor: '#059669',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 10,
  },
  doneCountText: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 12,
  },
});
