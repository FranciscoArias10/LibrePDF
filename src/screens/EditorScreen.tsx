import React, { useState, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  StatusBar,
  useWindowDimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';
import { PageImage, PDFSettings, ImageFilterType, RootStackParamList, PageOrientation } from '../types';
import { DEFAULT_PDF_SETTINGS, generateDefaultDocumentTitle, SPACING, RADIUS, FILTER_PRESETS } from '../constants/theme';
import { rotateImage, applyFilterToImage, getBase64ImageUri } from '../utils/imageProcessor';
import { generatePDF } from '../utils/pdfGenerator';
import { savePDFDocument } from '../utils/storage';
import { useTheme } from '../contexts/ThemeContext';
import { Header } from '../components/Header';
import { PageCard } from '../components/PageCard';
import { FilterPicker } from '../components/FilterPicker';
import { PDFSettingsModal } from '../components/PDFSettingsModal';
import { ImageCropperModal } from '../components/ImageCropperModal';
import { FilterApplyModal } from '../components/FilterApplyModal';
import { PermissionModal, PermissionType } from '../components/PermissionModal';
import { PageLayoutModal } from '../components/PageLayoutModal';
import { SignatureStampModal } from '../components/SignatureStampModal';
import { ImageLayoutTransform, SignatureStamp } from '../types';

type NavigationProp = NativeStackNavigationProp<RootStackParamList, 'Editor'>;
type EditorRouteProp = RouteProp<RootStackParamList, 'Editor'>;

export const EditorScreen: React.FC = () => {
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<EditorRouteProp>();
  const { colors, isDark } = useTheme();
  const { width } = useWindowDimensions();

  const [pages, setPages] = useState<PageImage[]>(
    route.params?.initialImages || []
  );
  const [selectedIndex, setSelectedIndex] = useState<number>(0);
  const [pdfSettings, setPDFSettings] = useState<PDFSettings>(() => ({
    ...DEFAULT_PDF_SETTINGS,
    documentTitle: generateDefaultDocumentTitle(),
  }));
  const [isSettingsModalVisible, setIsSettingsModalVisible] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [hasPromptedFilterToAll, setHasPromptedFilterToAll] = useState(false);
  const [isFilterModalVisible, setIsFilterModalVisible] = useState(false);
  const [pendingFilter, setPendingFilter] = useState<ImageFilterType | null>(null);

  const [isPermissionModalVisible, setIsPermissionModalVisible] = useState(false);
  const [permissionType, setPermissionType] = useState<PermissionType>('camera');

  // Image Cropper State
  const [isCropperVisible, setIsCropperVisible] = useState(false);
  const [croppingIndex, setCroppingIndex] = useState<number | null>(null);

  // Page Layout State
  const [isLayoutModalVisible, setIsLayoutModalVisible] = useState(false);
  const [layoutIndex, setLayoutIndex] = useState<number | null>(null);

  // Signature Stamp State
  const [isSignatureModalVisible, setIsSignatureModalVisible] = useState(false);
  const [signatureIndex, setSignatureIndex] = useState<number | null>(null);

  // Append new images from Camera continuous scan
  useEffect(() => {
    const appended = route.params?.appendedImages;
    if (appended && appended.length > 0) {
      setPages((prev) => [...prev, ...appended]);
      navigation.setParams({ appendedImages: undefined });
    }
  }, [route.params?.appendedImages]);

  // Stable selection handler to prevent re-rendering all PageCards
  const handleSelectPage = useCallback((index: number) => {
    setSelectedIndex(index);
  }, []);

  // Rotate single image
  const handleRotatePage = useCallback(async (index: number) => {
    const targetPage = pages[index];
    const rotated = await rotateImage(targetPage);
    const updated = [...pages];
    updated[index] = rotated;
    setPages(updated);
  }, [pages]);

  // Open Cropper
  const handleCropPage = useCallback((index: number) => {
    setCroppingIndex(index);
    setIsCropperVisible(true);
  }, []);

  // On Crop Complete
  const handleCropComplete = (result: { uri: string; width: number; height: number }) => {
    if (croppingIndex !== null && result.uri) {
      const updated = [...pages];
      updated[croppingIndex] = {
        ...updated[croppingIndex],
        uri: result.uri,
        originalUri: result.uri, // Make it the new baseline for rotation/filters
        width: result.width,
        height: result.height,
      };
      setPages(updated);
    }
    setIsCropperVisible(false);
    setCroppingIndex(null);
  };

  // Open Layout Modal
  const handleLayoutPage = useCallback((index: number) => {
    setLayoutIndex(index);
    setIsLayoutModalVisible(true);
  }, []);

  const handleLayoutSave = (
    transform: ImageLayoutTransform,
    newRotation: number,
    pageOrientation: PageOrientation
  ) => {
    if (layoutIndex !== null) {
      const updated = [...pages];
      updated[layoutIndex] = {
        ...updated[layoutIndex],
        layoutTransform: transform,
        rotation: newRotation,
        orientation: pageOrientation,
      };
      setPages(updated);
    }
    setIsLayoutModalVisible(false);
    setLayoutIndex(null);
  };

  // Open Signature Modal
  const handleSignaturePage = useCallback((index: number) => {
    setSignatureIndex(index);
    setIsSignatureModalVisible(true);
  }, []);

  const handleSignatureSave = (signature: SignatureStamp | undefined) => {
    if (signatureIndex !== null) {
      const updated = [...pages];
      updated[signatureIndex] = {
        ...updated[signatureIndex],
        signature,
      };
      setPages(updated);
    }
    setIsSignatureModalVisible(false);
    setSignatureIndex(null);
  };

  // Reorder move up
  const handleMoveUp = useCallback((index: number) => {
    if (index === 0) return;
    const updated = [...pages];
    const temp = updated[index];
    updated[index] = updated[index - 1];
    updated[index - 1] = temp;
    setPages(updated);
    setSelectedIndex(index - 1);
  }, [pages]);

  // Reorder move down
  const handleMoveDown = useCallback((index: number) => {
    if (index === pages.length - 1) return;
    const updated = [...pages];
    const temp = updated[index];
    updated[index] = updated[index + 1];
    updated[index + 1] = temp;
    setPages(updated);
    setSelectedIndex(index + 1);
  }, [pages]);

  // Delete page
  const handleDeletePage = useCallback((index: number) => {
    Alert.alert('Eliminar Página', '¿Deseas quitar esta página?', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Eliminar',
        style: 'destructive',
        onPress: () => {
          const updated = pages.filter((_, i) => i !== index);
          setPages(updated);
          if (selectedIndex >= updated.length) {
            setSelectedIndex(Math.max(0, updated.length - 1));
          }
        },
      },
    ]);
  }, [pages, selectedIndex]);

  // Toggle document-wide default orientation
  const handleToggleOrientation = () => {
    const nextOrientation: PageOrientation =
      pdfSettings.orientation === 'portrait' ? 'landscape' : 'portrait';
    setPDFSettings((prev) => ({
      ...prev,
      orientation: nextOrientation,
    }));
    // When changing document default, clear individual page overrides so all pages adopt the new default
    setPages((prev) =>
      prev.map((p) => ({
        ...p,
        orientation: undefined,
      }))
    );
  };

  // Apply filter to current page
  const handleFilterChange = (filter: ImageFilterType) => {
    if (pages.length === 0) return;

    if (!hasPromptedFilterToAll && pages.length > 1) {
      setPendingFilter(filter);
      setIsFilterModalVisible(true);
    } else {
      applyFilterToOne(filter);
    }
  };

  const handleConfirmFilterToOne = () => {
    if (pendingFilter) {
      applyFilterToOne(pendingFilter);
      setHasPromptedFilterToAll(true);
    }
    setIsFilterModalVisible(false);
    setPendingFilter(null);
  };

  const handleConfirmFilterToAll = () => {
    if (pendingFilter) {
      handleApplyFilterToAll(pendingFilter);
      setHasPromptedFilterToAll(true);
    }
    setIsFilterModalVisible(false);
    setPendingFilter(null);
  };

  const applyFilterToOne = (filter: ImageFilterType) => {
    const updated = [...pages];
    updated[selectedIndex] = applyFilterToImage(updated[selectedIndex], filter);
    setPages(updated);
  };

  // Apply filter to all pages
  const handleApplyFilterToAll = (filter: ImageFilterType) => {
    const updated = pages.map((page) => applyFilterToImage(page, filter));
    setPages(updated);
  };

  // Add more images from gallery
  const handleAddMoreFromGallery = async () => {
    const status = await ImagePicker.getMediaLibraryPermissionsAsync();
    if (!status.granted && status.canAskAgain) {
      setPermissionType('gallery');
      setIsPermissionModalVisible(true);
      return;
    }
    proceedWithGallery();
  };

  const proceedWithGallery = async () => {
    try {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) return;

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsMultipleSelection: true,
        quality: 0.9,
      });

      if (!result.canceled && result.assets) {
        const newPages: PageImage[] = result.assets.map((asset, i) => ({
          id: `img_${Date.now()}_${pages.length + i}`,
          uri: asset.uri,
          originalUri: asset.uri,
          width: asset.width,
          height: asset.height,
          rotation: 0,
          filter: 'original',
        }));

        setPages([...pages, ...newPages]);
      }
    } catch (error) {
      console.error('Error adding more images:', error);
    }
  };

  // Add more images continuously from camera
  const handleAddMoreFromCamera = () => {
    navigation.navigate('Camera', { returnToEditor: true });
  };

  // Confirm and process PDF Generation
  const handleGeneratePDF = async (settingsToUse: PDFSettings = pdfSettings) => {
    if (pages.length === 0) {
      Alert.alert('Atención', 'Agrega al menos una imagen para generar el PDF');
      return;
    }

    setIsSettingsModalVisible(false);
    setIsGenerating(true);

    try {
      const docTitle = settingsToUse.documentTitle?.trim() || generateDefaultDocumentTitle();
      const finalSettings = { ...settingsToUse, documentTitle: docTitle };

      // 1. Generate PDF file via expo-print
      const pdfResult = await generatePDF(pages, finalSettings);

      // 2. Save PDF to permanent storage
      const savedDoc = await savePDFDocument(
        pdfResult.uri,
        pdfResult.base64,
        docTitle,
        pdfResult.pageCount,
        pages[0]?.uri
      );

      setIsGenerating(false);

      // 3. Navigate to Viewer Screen with isNew: true to show success buttons
      navigation.replace('Viewer', { pdfDoc: savedDoc, isNew: true });
    } catch (error) {
      setIsGenerating(false);
      console.error('Error creating PDF:', error);
      Alert.alert('Error al generar PDF', 'No se pudo crear el documento. Intenta nuevamente.');
    }
  };

  const selectedPage = pages[selectedIndex];

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <StatusBar barStyle={isDark ? "light-content" : "dark-content"} />
      <Header
        title="Editor de PDF"
        subtitle={`${pages.length} página${pages.length !== 1 ? 's' : ''}`}
        onBack={() => navigation.goBack()}
        rightIcon="options-outline"
        onRightPress={() => setIsSettingsModalVisible(true)}
      />

      <View style={styles.workspace}>
        {/* Quick Add Bar */}
        <View style={[styles.topToolbar, { backgroundColor: colors.cardBg, borderBottomColor: colors.border }]}>
          <Text style={[styles.toolbarTitle, { color: colors.textPrimary }]} numberOfLines={1}>
            {width < 380 ? 'Añadir pág.' : 'Añadir página'}
          </Text>
          <View style={styles.toolbarActions}>
            <TouchableOpacity
              style={[styles.addBtn, { backgroundColor: colors.primaryDark }]}
              onPress={handleAddMoreFromGallery}
              activeOpacity={0.8}
            >
              <Ionicons name="images-outline" size={16} color="#FFF" />
              <Text style={styles.addBtnText}>+ Galería</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.addBtn, { backgroundColor: colors.primaryDark }]}
              onPress={handleAddMoreFromCamera}
              activeOpacity={0.8}
            >
              <Ionicons name="camera-outline" size={16} color="#FFF" />
              <Text style={styles.addBtnText}>+ Cámara</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Document Format & Orientation Quick Bar */}
        <View style={[styles.docConfigBar, { backgroundColor: colors.cardBgElevated, borderBottomColor: colors.border }]}>
          <TouchableOpacity
            style={styles.docConfigLeft}
            onPress={() => setIsSettingsModalVisible(true)}
            activeOpacity={0.7}
          >
            <Ionicons name="document-text-outline" size={15} color={colors.primary} />
            <Text style={[styles.docConfigText, { color: colors.textSecondary }]}>
              Formato: <Text style={{ color: colors.textPrimary, fontWeight: '700' }}>{pdfSettings.pageSize}</Text>
            </Text>
          </TouchableOpacity>

          <View style={styles.docConfigRight}>
            <TouchableOpacity
              style={[
                styles.orientationChip,
                { backgroundColor: colors.cardBg, borderColor: colors.border },
              ]}
              onPress={handleToggleOrientation}
              activeOpacity={0.7}
            >
              <Ionicons
                name={pdfSettings.orientation === 'portrait' ? 'phone-portrait-outline' : 'phone-landscape-outline'}
                size={14}
                color={colors.primary}
              />
              <Text style={[styles.orientationChipText, { color: colors.textPrimary }]}>
                {pdfSettings.orientation === 'portrait' ? 'Vertical' : 'Horizontal'}
              </Text>
              <Ionicons name="swap-horizontal" size={12} color={colors.textSecondary} />
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.settingsChip,
                { backgroundColor: colors.cardBg, borderColor: colors.border },
              ]}
              onPress={() => setIsSettingsModalVisible(true)}
              activeOpacity={0.7}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Ionicons name="options-outline" size={15} color={colors.primary} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Page Thumbnails List */}
        {pages.length > 0 ? (
          <FlatList
            data={pages}
            keyExtractor={(item) => item.id}
            renderItem={({ item, index }) => (
              <PageCard
                page={item}
                index={index}
                totalPages={pages.length}
                isSelected={index === selectedIndex}
                onSelect={handleSelectPage}
                onRotate={handleRotatePage}
                onDelete={handleDeletePage}
                onCrop={handleCropPage}
                onLayout={handleLayoutPage}
                onSignature={handleSignaturePage}
                onMoveUp={handleMoveUp}
                onMoveDown={handleMoveDown}
              />
            )}
            contentContainerStyle={styles.listContainer}
            showsVerticalScrollIndicator={false}
          />
        ) : (
          <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
            <Ionicons name="images-outline" size={56} color={colors.textMuted} />
            <Text style={{ color: colors.textSecondary, marginTop: SPACING.md }}>No hay páginas</Text>
          </View>
        )}

        {/* CamScanner Filter Picker for selected page */}
        {pages.length > 0 && selectedPage && (
          <FilterPicker
            currentFilter={selectedPage.filter}
            onSelectFilter={handleFilterChange}
            onApplyToAll={handleApplyFilterToAll}
          />
        )}

        {/* Bottom Floating Generate PDF Button */}
        {pages.length > 0 && (
          <View style={[styles.footerBar, { backgroundColor: colors.cardBg, borderTopColor: colors.border }]}>
            <TouchableOpacity
              style={[styles.generatePDFBtn, { backgroundColor: colors.primary }]}
              onPress={() => setIsSettingsModalVisible(true)}
              activeOpacity={0.85}
              disabled={isGenerating}
            >
              {isGenerating ? (
                <ActivityIndicator color="#FFF" />
              ) : (
                <>
                  <Ionicons name="document-attach-outline" size={22} color="#FFF" />
                  <Text style={styles.generatePDFBtnText}>
                    Convertir {pages.length} fotos a PDF
                  </Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        )}
      </View>

      {/* PDF Settings Modal */}
      <PDFSettingsModal
        visible={isSettingsModalVisible}
        initialSettings={pdfSettings}
        onSaveSettings={(newSettings) => setPDFSettings(newSettings)}
        onGenerate={(newSettings) => {
          setPDFSettings(newSettings);
          setIsSettingsModalVisible(false);
          handleGeneratePDF(newSettings);
        }}
        onClose={() => setIsSettingsModalVisible(false)}
      />

      {/* Custom Image Cropper Modal */}
      {croppingIndex !== null && pages[croppingIndex] && (
        <ImageCropperModal
          visible={isCropperVisible}
          imageUri={pages[croppingIndex].originalUri}
          imageWidth={pages[croppingIndex].width}
          imageHeight={pages[croppingIndex].height}
          onClose={() => {
            setIsCropperVisible(false);
            setCroppingIndex(null);
          }}
          onCropComplete={handleCropComplete}
        />
      )}

      {/* Custom Filter Apply Modal */}
      <FilterApplyModal
        visible={isFilterModalVisible}
        onApplyToOne={handleConfirmFilterToOne}
        onApplyToAll={handleConfirmFilterToAll}
        onClose={() => setIsFilterModalVisible(false)}
      />

      <PermissionModal
        visible={isPermissionModalVisible}
        type={permissionType}
        onAccept={() => {
          setIsPermissionModalVisible(false);
          // Wait briefly for modal to close before launching native picker/camera
          setTimeout(() => {
            if (permissionType === 'gallery') proceedWithGallery();
            if (permissionType === 'camera') handleAddMoreFromCamera();
          }, 300);
        }}
        onCancel={() => {
          setIsPermissionModalVisible(false);
        }}
      />

      {/* Page Layout Modal */}
      <PageLayoutModal
        visible={isLayoutModalVisible}
        page={layoutIndex !== null ? pages[layoutIndex] : null}
        orientation={
          layoutIndex !== null
            ? (pages[layoutIndex].orientation || pdfSettings.orientation)
            : pdfSettings.orientation
        }
        pageSize={pdfSettings.pageSize}
        onSave={handleLayoutSave}
        onCancel={() => {
          setIsLayoutModalVisible(false);
          setLayoutIndex(null);
        }}
      />

      {/* Signature Stamp Modal */}
      <SignatureStampModal
        visible={isSignatureModalVisible}
        page={signatureIndex !== null ? pages[signatureIndex] : null}
        onSave={handleSignatureSave}
        onCancel={() => {
          setIsSignatureModalVisible(false);
          setSignatureIndex(null);
        }}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  settingsHeaderBtn: {
    width: 36,
    height: 36,
    borderRadius: RADIUS.xs,
    alignItems: 'center',
    justifyContent: 'center',
  },
  topToolbar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderBottomWidth: 1,
  },
  toolbarTitle: {
    fontSize: 14,
    fontWeight: '700',
  },
  toolbarActions: {
    flexDirection: 'row',
    gap: SPACING.xs + 4,
  },
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: SPACING.sm + 4,
    paddingVertical: 6,
    borderRadius: RADIUS.xs,
  },
  addBtnText: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: '700',
  },
  docConfigBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.md,
    paddingVertical: 6,
    borderBottomWidth: 1,
  },
  docConfigLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  docConfigText: {
    fontSize: 12,
  },
  docConfigRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs + 2,
  },
  orientationChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: SPACING.sm + 2,
    paddingVertical: 4,
    borderRadius: RADIUS.full,
    borderWidth: 1,
  },
  orientationChipText: {
    fontSize: 12,
    fontWeight: '600',
  },
  settingsChip: {
    width: 28,
    height: 28,
    borderRadius: RADIUS.full,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  workspace: {
    flex: 1,
  },
  listContainer: {
    paddingHorizontal: SPACING.md,
    paddingTop: SPACING.md,
    paddingBottom: 100,
  },
  emptyText: {
    fontSize: 15,
    marginTop: SPACING.md,
  },
  importBtn: {
    marginTop: SPACING.md,
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.sm + 4,
    borderRadius: RADIUS.md,
  },
  importBtnText: {
    color: '#FFF',
  },
  footerBar: {
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.md - 2,
    borderTopWidth: 1,
  },
  generatePDFBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.sm,
    paddingVertical: SPACING.md - 2,
    borderRadius: RADIUS.md,
    elevation: 4,
  },
  generatePDFBtnText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '700',
  },
});
