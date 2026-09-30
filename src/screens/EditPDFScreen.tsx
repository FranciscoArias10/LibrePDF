import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Image,
  Alert,
  ActivityIndicator,
  StatusBar,
  Modal,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  useWindowDimensions,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';
import { SavedPDFDocument, EditablePDFPage, RootStackParamList } from '../types';
import { Header } from '../components/Header';
import { PDFThumbnailGenerator } from '../components/PDFThumbnailGenerator';
import { PermissionModal, PermissionType } from '../components/PermissionModal';
import { DocumentSuccessModal } from '../components/DocumentSuccessModal';
import { ConfirmActionModal } from '../components/ConfirmActionModal';
import { saveEditedPDF } from '../utils/pdfEditor';
import { getPDFPageCount } from '../utils/pdfMerger';
import { SPACING, RADIUS } from '../constants/theme';
import { useTheme } from '../contexts/ThemeContext';

type NavigationProp = NativeStackNavigationProp<RootStackParamList, 'EditPDF'>;
type EditPDFRouteProp = RouteProp<RootStackParamList, 'EditPDF'>;

export const EditPDFScreen: React.FC = () => {
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<EditPDFRouteProp>();
  const { colors, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();

  const originalDoc = route.params.document;

  const [pages, setPages] = useState<EditablePDFPage[]>([]);
  const [initialLoading, setInitialLoading] = useState(true);
  const [savingProgress, setSavingProgress] = useState<string | null>(null);

  // Permission modal
  const [isPermissionModalVisible, setIsPermissionModalVisible] = useState(false);
  const [permissionType, setPermissionType] = useState<PermissionType>('gallery');

  // Preview modal for single page
  const [previewPage, setPreviewPage] = useState<EditablePDFPage | null>(null);

  // Save Modal state
  const [isSaveModalVisible, setIsSaveModalVisible] = useState(false);
  const [saveTitle, setSaveTitle] = useState(originalDoc.title);
  const [saveMode, setSaveMode] = useState<'overwrite' | 'new_copy'>('overwrite');

  // Native In-App Success Modal (replaces system alert)
  const [successModalData, setSuccessModalData] = useState<{
    doc: SavedPDFDocument;
    title: string;
    subtitle: string;
  } | null>(null);

  // Native In-App Delete Page Confirm Modal
  const [deleteConfirmIndex, setDeleteConfirmIndex] = useState<number | null>(null);

  // Native In-App Discard Changes Modal
  const [isDiscardModalVisible, setIsDiscardModalVisible] = useState(false);

  // Native In-App Warning / Info Modal
  const [infoModalData, setInfoModalData] = useState<{
    title: string;
    message: string;
    icon?: keyof typeof Ionicons.glyphMap;
  } | null>(null);

  // Initialize pages from original document
  useEffect(() => {
    let isMounted = true;

    const initPages = async () => {
      try {
        setInitialLoading(true);
        const count = originalDoc.pageCount || (await getPDFPageCount(originalDoc.uri));
        const list: EditablePDFPage[] = [];

        for (let i = 0; i < count; i++) {
          list.push({
            id: `orig_page_${i}_${Date.now()}`,
            type: 'existing',
            originalPageIndex: i,
            originalPageNumber: i + 1,
            rotation: 0,
          });
        }

        if (isMounted) {
          setPages(list);
          setInitialLoading(false);
        }
      } catch (err) {
        console.error('Error initializing PDF pages for editing:', err);
        if (isMounted) {
          setInitialLoading(false);
          Alert.alert(
            'Error al abrir documento',
            'No se pudieron cargar las páginas del PDF. El archivo podría estar protegido o dañado.',
            [{ text: 'Volver', onPress: () => navigation.goBack() }]
          );
        }
      }
    };

    initPages();

    return () => {
      isMounted = false;
    };
  }, [originalDoc]);

  // Handle appended images from CameraScreen
  useEffect(() => {
    const appended = route.params?.appendedImages;
    if (appended && appended.length > 0) {
      const newItems: EditablePDFPage[] = appended.map((img, i) => ({
        id: `camera_img_${Date.now()}_${i}`,
        type: 'new_image',
        originalPageIndex: -1,
        originalPageNumber: -1,
        thumbnailUri: img.uri,
        imageUri: img.uri,
        rotation: 0,
      }));

      setPages((prev) => [...prev, ...newItems]);
      navigation.setParams({ appendedImages: undefined });
    }
  }, [route.params?.appendedImages]);

  // Receive rendered thumbnail from background WebView generator
  const handleThumbnailGenerated = useCallback((pageIndex: number, dataUrl: string) => {
    setPages((prevPages) =>
      prevPages.map((p) => {
        if (p.type === 'existing' && p.originalPageIndex === pageIndex) {
          return { ...p, thumbnailUri: dataUrl };
        }
        return p;
      })
    );
  }, []);

  // Delete page
  const handleDeletePage = (index: number) => {
    if (pages.length <= 1) {
      setInfoModalData({
        title: 'Atención',
        message: 'El documento no puede quedar vacío. Debe contener al menos una página.',
        icon: 'warning-outline',
      });
      return;
    }
    setDeleteConfirmIndex(index);
  };

  // Rotate page 90 degrees clockwise
  const handleRotatePage = (index: number) => {
    setPages((prev) => {
      const next = [...prev];
      const currentRot = next[index].rotation || 0;
      next[index] = {
        ...next[index],
        rotation: (currentRot + 90) % 360,
      };
      return next;
    });
  };

  // Move page up
  const handleMoveUp = (index: number) => {
    if (index <= 0) return;
    setPages((prev) => {
      const next = [...prev];
      const temp = next[index];
      next[index] = next[index - 1];
      next[index - 1] = temp;
      return next;
    });
  };

  // Move page down
  const handleMoveDown = (index: number) => {
    if (index >= pages.length - 1) return;
    setPages((prev) => {
      const next = [...prev];
      const temp = next[index];
      next[index] = next[index + 1];
      next[index + 1] = temp;
      return next;
    });
  };

  // Add pages from Gallery
  const handlePickFromGallery = async () => {
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

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const newPages: EditablePDFPage[] = result.assets.map((asset, i) => ({
          id: `gallery_img_${Date.now()}_${i}`,
          type: 'new_image',
          originalPageIndex: -1,
          originalPageNumber: -1,
          thumbnailUri: asset.uri,
          imageUri: asset.uri,
          rotation: 0,
        }));

        setPages((prev) => [...prev, ...newPages]);
      }
    } catch (err) {
      console.error('Error adding images from gallery:', err);
      setInfoModalData({
        title: 'Error de Importación',
        message: 'No se pudieron importar las imágenes de la galería.',
        icon: 'alert-circle-outline',
      });
    }
  };

  // Add pages from Camera
  const handleTakePhoto = () => {
    navigation.navigate('Camera', { returnToEditPDF: true });
  };

  // Check if modifications were made
  const hasChanges = useMemo(() => {
    if (pages.length !== originalDoc.pageCount) return true;
    for (let i = 0; i < pages.length; i++) {
      const p = pages[i];
      if (p.type === 'new_image') return true;
      if (p.originalPageIndex !== i) return true;
      if (p.rotation !== 0) return true;
    }
    return false;
  }, [pages, originalDoc]);

  // Handle Back
  const handleBack = () => {
    if (hasChanges) {
      setIsDiscardModalVisible(true);
    } else {
      navigation.goBack();
    }
  };

  // Open Save Modal
  const handleOpenSaveModal = () => {
    if (pages.length === 0) {
      setInfoModalData({
        title: 'Atención',
        message: 'El documento debe contener al menos una página.',
        icon: 'warning-outline',
      });
      return;
    }
    setSaveTitle(originalDoc.title);
    setSaveMode('overwrite');
    setIsSaveModalVisible(true);
  };

  // Execute Save
  const handleConfirmSave = async () => {
    setIsSaveModalVisible(false);
    setSavingProgress('Preparando guardado...');

    try {
      const updatedDoc = await saveEditedPDF(
        {
          originalDoc,
          pages,
          newTitle: saveTitle,
          mode: saveMode,
        },
        (progressText) => setSavingProgress(progressText)
      );

      setSavingProgress(null);

      // Trigger Native In-App Success Modal (replaces Android system alerts!)
      setSuccessModalData({
        doc: updatedDoc,
        title: saveMode === 'overwrite' ? '¡Cambios Guardados!' : '¡Copia Creada!',
        subtitle:
          saveMode === 'overwrite'
            ? 'El archivo ha sido actualizado con éxito en tu dispositivo.'
            : 'Se ha creado una nueva copia modificada del documento.',
      });
    } catch (err: any) {
      setSavingProgress(null);
      console.error('Error saving edited PDF:', err);
      setInfoModalData({
        title: 'Error al Guardar',
        message: err?.message || 'Ocurrió un error inesperado al aplicar las modificaciones.',
        icon: 'close-circle-outline',
      });
    }
  };

  const existingPagesCount = pages.filter((p) => p.type === 'existing').length;
  const newPagesCount = pages.filter((p) => p.type === 'new_image').length;

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />

      <Header
        title="Editar Páginas"
        subtitle={`${pages.length} página${pages.length !== 1 ? 's' : ''}`}
        onBack={handleBack}
      />

      {/* Hidden thumbnail generator for original PDF pages */}
      <PDFThumbnailGenerator
        pdfUri={originalDoc.uri}
        onThumbnail={handleThumbnailGenerated}
      />

      <View style={styles.container}>
        {/* Quick Add Bar */}
        <View
          style={[
            styles.addBanner,
            { backgroundColor: colors.cardBg, borderColor: colors.border },
          ]}
        >
          <View style={styles.addBannerTexts}>
            <Text style={[styles.addBannerTitle, { color: colors.textPrimary }]}>
              {originalDoc.title}
            </Text>
            <Text style={[styles.addBannerStats, { color: colors.textSecondary }]}>
              {pages.length} págs ({existingPagesCount} orig.{newPagesCount > 0 ? `, ${newPagesCount} nuevas` : ''})
            </Text>
          </View>

          <View style={styles.addButtonsGroup}>
            <TouchableOpacity
              style={[styles.addBtn, { backgroundColor: colors.primaryDark }]}
              onPress={handlePickFromGallery}
              activeOpacity={0.8}
            >
              <Ionicons name="images-outline" size={17} color="#FFF" />
              <Text style={styles.addBtnText}>+ Galería</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.addBtn, { backgroundColor: colors.primary }]}
              onPress={handleTakePhoto}
              activeOpacity={0.8}
            >
              <Ionicons name="camera-outline" size={17} color="#FFF" />
              <Text style={styles.addBtnText}>+ Cámara</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Pages List */}
        {initialLoading ? (
          <View style={styles.loadingBox}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={[styles.loadingText, { color: colors.textSecondary }]}>
              Cargando páginas del documento...
            </Text>
          </View>
        ) : (
          <FlatList
            data={pages}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
            renderItem={({ item, index }) => {
              const isFirst = index === 0;
              const isLast = index === pages.length - 1;

              return (
                <View
                  style={[
                    styles.pageCard,
                    {
                      backgroundColor: colors.cardBg,
                      borderColor: item.type === 'new_image' ? colors.primaryLight : colors.border,
                      borderWidth: item.type === 'new_image' ? 1.5 : 1,
                    },
                  ]}
                >
                  {/* Page Preview / Thumbnail */}
                  <TouchableOpacity
                    style={[
                      styles.thumbnailContainer,
                      { backgroundColor: colors.cardBgElevated, borderColor: colors.borderLight },
                    ]}
                    onPress={() => setPreviewPage(item)}
                    activeOpacity={0.85}
                  >
                    {item.thumbnailUri ? (
                      <Image
                        source={{ uri: item.thumbnailUri }}
                        style={[
                          styles.thumbnailImg,
                          {
                            transform: [{ rotate: `${item.rotation || 0}deg` }],
                          },
                        ]}
                        resizeMode="contain"
                      />
                    ) : (
                      <View style={styles.placeholderBox}>
                        <Ionicons
                          name="document-text-outline"
                          size={36}
                          color={colors.primaryLight}
                        />
                        <ActivityIndicator
                          size="small"
                          color={colors.primary}
                          style={{ marginTop: 6 }}
                        />
                      </View>
                    )}

                    {/* Zoom icon badge */}
                    <View style={styles.zoomBadge}>
                      <Ionicons name="expand" size={12} color="#FFF" />
                    </View>
                  </TouchableOpacity>

                  {/* Info and Actions */}
                  <View style={styles.pageInfoBox}>
                    <View style={styles.pageHeaderRow}>
                      <View style={styles.pageBadgeRow}>
                        <View
                          style={[
                            styles.pageNumberBadge,
                            {
                              backgroundColor:
                                item.type === 'new_image'
                                  ? colors.secondaryGlow
                                  : colors.primaryGlow,
                              borderColor:
                                item.type === 'new_image'
                                  ? colors.secondary
                                  : colors.primaryLight,
                            },
                          ]}
                        >
                          <Text
                            style={[
                              styles.pageNumberText,
                              {
                                color:
                                  item.type === 'new_image'
                                    ? colors.secondary
                                    : colors.primaryLight,
                              },
                            ]}
                          >
                            Pág. {index + 1}
                          </Text>
                        </View>

                        <Text
                          style={[styles.originTag, { color: colors.textMuted }]}
                          numberOfLines={1}
                        >
                          {item.type === 'existing'
                            ? `(Original ${item.originalPageNumber})`
                            : '★ Nueva foto'}
                        </Text>
                      </View>

                      {/* Delete Page Button */}
                      <TouchableOpacity
                        style={[
                          styles.deleteBtn,
                          {
                            backgroundColor: isDark
                              ? 'rgba(239, 68, 68, 0.22)'
                              : 'rgba(239, 68, 68, 0.1)',
                          },
                        ]}
                        onPress={() => handleDeletePage(index)}
                        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                      >
                        <Ionicons name="trash-outline" size={18} color={colors.accentRed} />
                      </TouchableOpacity>
                    </View>

                    {item.rotation !== 0 && (
                      <Text style={[styles.rotationHint, { color: colors.primaryLight }]}>
                        ↻ Rotada {item.rotation}°
                      </Text>
                    )}

                    {/* Action Controls Row */}
                    <View style={styles.pageControlsRow}>
                      {/* Rotate */}
                      <TouchableOpacity
                        style={[
                          styles.controlBtn,
                          { backgroundColor: colors.cardBgElevated, borderColor: colors.border },
                        ]}
                        onPress={() => handleRotatePage(index)}
                        activeOpacity={0.7}
                      >
                        <Ionicons name="refresh" size={17} color={colors.textPrimary} />
                        <Text style={[styles.controlBtnText, { color: colors.textPrimary }]}>
                          Rotar
                        </Text>
                      </TouchableOpacity>

                      {/* Move Up */}
                      <TouchableOpacity
                        style={[
                          styles.controlBtn,
                          { backgroundColor: colors.cardBgElevated, borderColor: colors.border },
                          isFirst && styles.controlBtnDisabled,
                        ]}
                        onPress={() => handleMoveUp(index)}
                        disabled={isFirst}
                        activeOpacity={0.7}
                      >
                        <Ionicons
                          name="arrow-up"
                          size={16}
                          color={isFirst ? colors.textMuted : colors.textPrimary}
                        />
                        <Text
                          style={[
                            styles.controlBtnText,
                            { color: isFirst ? colors.textMuted : colors.textPrimary },
                          ]}
                        >
                          Subir
                        </Text>
                      </TouchableOpacity>

                      {/* Move Down */}
                      <TouchableOpacity
                        style={[
                          styles.controlBtn,
                          { backgroundColor: colors.cardBgElevated, borderColor: colors.border },
                          isLast && styles.controlBtnDisabled,
                        ]}
                        onPress={() => handleMoveDown(index)}
                        disabled={isLast}
                        activeOpacity={0.7}
                      >
                        <Ionicons
                          name="arrow-down"
                          size={16}
                          color={isLast ? colors.textMuted : colors.textPrimary}
                        />
                        <Text
                          style={[
                            styles.controlBtnText,
                            { color: isLast ? colors.textMuted : colors.textPrimary },
                          ]}
                        >
                          Bajar
                        </Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                </View>
              );
            }}
          />
        )}
      </View>

      {/* Floating Save Bar */}
      <View
        style={[
          styles.footerBar,
          {
            backgroundColor: colors.cardBg,
            borderTopColor: colors.border,
            paddingBottom: Math.max(insets.bottom + 8, 14),
          },
        ]}
      >
        <TouchableOpacity
          style={[
            styles.saveMainBtn,
            {
              backgroundColor: hasChanges ? colors.primary : colors.primaryDark,
              opacity: pages.length === 0 ? 0.6 : 1,
            },
          ]}
          onPress={handleOpenSaveModal}
          disabled={pages.length === 0 || !!savingProgress}
          activeOpacity={0.85}
        >
          <Ionicons name="save-outline" size={22} color="#FFF" />
          <Text style={styles.saveMainBtnText}>
            {hasChanges ? 'Guardar Cambios' : 'Guardar Documento'} ({pages.length} págs)
          </Text>
        </TouchableOpacity>
      </View>

      {/* Save Modal (Overwrite vs New Copy) */}
      <Modal
        visible={isSaveModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setIsSaveModalVisible(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.modalBackdrop}
        >
          <View
            style={[
              styles.saveModalCard,
              { backgroundColor: colors.cardBg, borderColor: colors.border },
            ]}
          >
            <View style={styles.modalHeader}>
              <Ionicons name="save" size={22} color={colors.primary} />
              <Text style={[styles.modalTitle, { color: colors.textPrimary }]}>
                Guardar Modificaciones
              </Text>
            </View>

            <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>
              Nombre del documento:
            </Text>
            <TextInput
              style={[
                styles.titleInput,
                {
                  backgroundColor: colors.cardBgElevated,
                  borderColor: colors.border,
                  color: colors.textPrimary,
                },
              ]}
              value={saveTitle}
              onChangeText={setSaveTitle}
              placeholder="Título del PDF"
              placeholderTextColor={colors.textMuted}
            />

            <Text style={[styles.inputLabel, { color: colors.textSecondary, marginTop: 12 }]}>
              ¿Cómo deseas guardar los cambios?
            </Text>

            {/* Option 1: Overwrite */}
            <TouchableOpacity
              style={[
                styles.saveOptionCard,
                {
                  backgroundColor:
                    saveMode === 'overwrite' ? colors.primaryGlow : colors.cardBgElevated,
                  borderColor:
                    saveMode === 'overwrite' ? colors.primaryLight : colors.border,
                },
              ]}
              onPress={() => setSaveMode('overwrite')}
              activeOpacity={0.8}
            >
              <Ionicons
                name={saveMode === 'overwrite' ? 'radio-button-on' : 'radio-button-off'}
                size={20}
                color={saveMode === 'overwrite' ? colors.primaryLight : colors.textMuted}
              />
              <View style={styles.saveOptionTexts}>
                <Text style={[styles.saveOptionTitle, { color: colors.textPrimary }]}>
                  Sobrescribir archivo actual
                </Text>
                <Text style={[styles.saveOptionSub, { color: colors.textMuted }]}>
                  Reemplaza el PDF original en tu historial conservando su ubicación.
                </Text>
              </View>
            </TouchableOpacity>

            {/* Option 2: Save as New Copy */}
            <TouchableOpacity
              style={[
                styles.saveOptionCard,
                {
                  backgroundColor:
                    saveMode === 'new_copy' ? colors.primaryGlow : colors.cardBgElevated,
                  borderColor:
                    saveMode === 'new_copy' ? colors.primaryLight : colors.border,
                },
              ]}
              onPress={() => {
                setSaveMode('new_copy');
                if (!saveTitle.includes('_editado')) {
                  setSaveTitle(`${saveTitle}_editado`);
                }
              }}
              activeOpacity={0.8}
            >
              <Ionicons
                name={saveMode === 'new_copy' ? 'radio-button-on' : 'radio-button-off'}
                size={20}
                color={saveMode === 'new_copy' ? colors.primaryLight : colors.textMuted}
              />
              <View style={styles.saveOptionTexts}>
                <Text style={[styles.saveOptionTitle, { color: colors.textPrimary }]}>
                  Guardar como nuevo PDF
                </Text>
                <Text style={[styles.saveOptionSub, { color: colors.textMuted }]}>
                  Crea un nuevo documento independiente sin tocar el original.
                </Text>
              </View>
            </TouchableOpacity>

            {/* Modal Actions */}
            <View style={styles.modalActionButtons}>
              <TouchableOpacity
                style={[
                  styles.modalCancelBtn,
                  { backgroundColor: colors.background, borderColor: colors.border },
                ]}
                onPress={() => setIsSaveModalVisible(false)}
              >
                <Text style={[styles.modalCancelText, { color: colors.textSecondary }]}>
                  Cancelar
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.modalConfirmBtn, { backgroundColor: colors.primary }]}
                onPress={handleConfirmSave}
              >
                <Text style={styles.modalConfirmText}>Guardar</Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Progress Overlay */}
      {savingProgress && (
        <View style={styles.progressBackdrop}>
          <View
            style={[
              styles.progressCard,
              { backgroundColor: colors.cardBg, borderColor: colors.border },
            ]}
          >
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={[styles.progressTitle, { color: colors.textPrimary }]}>
              Guardando Documento
            </Text>
            <Text style={[styles.progressSubtitle, { color: colors.textSecondary }]}>
              {savingProgress}
            </Text>
          </View>
        </View>
      )}

      {/* Page Zoom Preview Modal */}
      <Modal
        visible={!!previewPage}
        transparent
        animationType="fade"
        onRequestClose={() => setPreviewPage(null)}
      >
        <SafeAreaView style={styles.previewBackdrop}>
          <View style={styles.previewHeader}>
            <Text style={styles.previewTitle}>
              {previewPage?.type === 'existing'
                ? `Página ${previewPage.originalPageNumber} (Original)`
                : 'Página agregada'}
            </Text>
            <TouchableOpacity
              style={styles.previewCloseBtn}
              onPress={() => setPreviewPage(null)}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Ionicons name="close" size={26} color="#FFF" />
            </TouchableOpacity>
          </View>

          <View style={styles.previewBody}>
            {previewPage?.thumbnailUri ? (
              <Image
                source={{ uri: previewPage.thumbnailUri }}
                style={[
                  styles.previewImage,
                  {
                    transform: [{ rotate: `${previewPage.rotation || 0}deg` }],
                  },
                ]}
                resizeMode="contain"
              />
            ) : (
              <ActivityIndicator size="large" color="#FFF" />
            )}
          </View>
        </SafeAreaView>
      </Modal>

      {/* Permission Modal */}
      <PermissionModal
        visible={isPermissionModalVisible}
        type={permissionType}
        onAccept={() => {
          setIsPermissionModalVisible(false);
          setTimeout(() => {
            if (permissionType === 'gallery') proceedWithGallery();
          }, 300);
        }}
        onCancel={() => setIsPermissionModalVisible(false)}
      />

      {/* Native In-App Document Success Modal (Replaces Android system alert for viewing doc) */}
      {successModalData && (
        <DocumentSuccessModal
          visible={!!successModalData}
          title={successModalData.title}
          subtitle={successModalData.subtitle}
          documentTitle={successModalData.doc.title}
          pageCount={successModalData.doc.pageCount}
          primaryButtonText="Ver Documento"
          secondaryButtonText="Ir al Inicio"
          onViewDocument={() => {
            const targetDoc = successModalData.doc;
            setSuccessModalData(null);
            navigation.replace('Viewer', {
              pdfDoc: targetDoc,
              isNew: false,
            });
          }}
          onGoHome={() => {
            setSuccessModalData(null);
            navigation.navigate('Home');
          }}
        />
      )}

      {/* Native Delete Page Confirmation Modal */}
      <ConfirmActionModal
        visible={deleteConfirmIndex !== null}
        title="Eliminar Página"
        message={
          deleteConfirmIndex !== null && pages[deleteConfirmIndex]
            ? `¿Deseas eliminar la ${
                pages[deleteConfirmIndex].type === 'existing'
                  ? `página ${pages[deleteConfirmIndex].originalPageNumber} (original)`
                  : `página nueva (${deleteConfirmIndex + 1})`
              }?`
            : '¿Deseas eliminar esta página?'
        }
        confirmText="Eliminar"
        cancelText="Cancelar"
        isDestructive
        icon="trash-outline"
        onConfirm={() => {
          if (deleteConfirmIndex !== null) {
            setPages((prev) => prev.filter((_, i) => i !== deleteConfirmIndex));
            setDeleteConfirmIndex(null);
          }
        }}
        onCancel={() => setDeleteConfirmIndex(null)}
      />

      {/* Native Discard Changes Confirmation Modal */}
      <ConfirmActionModal
        visible={isDiscardModalVisible}
        title="Descartar Cambios"
        message="Has realizado modificaciones en las páginas del PDF. ¿Deseas salir sin guardar?"
        confirmText="Descartar"
        cancelText="Continuar Editando"
        isDestructive
        icon="alert-circle-outline"
        onConfirm={() => {
          setIsDiscardModalVisible(false);
          navigation.goBack();
        }}
        onCancel={() => setIsDiscardModalVisible(false)}
      />

      {/* Native Info / Warning Modal */}
      {infoModalData && (
        <ConfirmActionModal
          visible={!!infoModalData}
          title={infoModalData.title}
          message={infoModalData.message}
          confirmText="Entendido"
          cancelText="Cerrar"
          icon={infoModalData.icon || 'information-circle-outline'}
          onConfirm={() => setInfoModalData(null)}
          onCancel={() => setInfoModalData(null)}
        />
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  container: {
    flex: 1,
    paddingHorizontal: SPACING.md,
    paddingTop: SPACING.sm,
  },
  addBanner: {
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    marginBottom: SPACING.md,
    gap: 12,
  },
  addBannerTexts: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  addBannerTitle: {
    fontSize: 15,
    fontWeight: '700',
    flex: 1,
    marginRight: 8,
  },
  addBannerStats: {
    fontSize: 12,
    fontWeight: '600',
  },
  addButtonsGroup: {
    flexDirection: 'row',
    gap: 10,
  },
  addBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 10,
    gap: 6,
  },
  addBtnText: {
    color: '#FFF',
    fontSize: 13,
    fontWeight: '700',
  },
  loadingBox: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  loadingText: {
    fontSize: 14,
  },
  listContent: {
    paddingBottom: 110,
  },
  pageCard: {
    flexDirection: 'row',
    borderRadius: 14,
    padding: 12,
    marginBottom: 12,
    gap: 12,
    alignItems: 'center',
  },
  thumbnailContainer: {
    width: 84,
    height: 116,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    position: 'relative',
  },
  thumbnailImg: {
    width: '100%',
    height: '100%',
  },
  placeholderBox: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  zoomBadge: {
    position: 'absolute',
    top: 4,
    right: 4,
    backgroundColor: 'rgba(0,0,0,0.65)',
    borderRadius: 10,
    padding: 3,
  },
  pageInfoBox: {
    flex: 1,
  },
  pageHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  pageBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flex: 1,
  },
  pageNumberBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    borderWidth: 1,
  },
  pageNumberText: {
    fontSize: 12,
    fontWeight: '700',
  },
  originTag: {
    fontSize: 11,
    flexShrink: 1,
  },
  deleteBtn: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rotationHint: {
    fontSize: 11,
    fontWeight: '600',
    marginBottom: 6,
  },
  pageControlsRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 4,
  },
  controlBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 7,
    borderRadius: 8,
    borderWidth: 1,
    gap: 4,
  },
  controlBtnDisabled: {
    opacity: 0.35,
  },
  controlBtnText: {
    fontSize: 11,
    fontWeight: '600',
  },
  footerBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: SPACING.md,
    paddingTop: 12,
    borderTopWidth: 1,
  },
  saveMainBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 14,
    gap: 8,
    elevation: 4,
  },
  saveMainBtnText: {
    color: '#FFF',
    fontSize: 15,
    fontWeight: '700',
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: SPACING.lg,
  },
  saveModalCard: {
    width: '100%',
    maxWidth: 380,
    borderRadius: 18,
    padding: 20,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 10,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: '700',
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 6,
  },
  titleInput: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 9,
    fontSize: 14,
  },
  saveOptionCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    marginTop: 8,
  },
  saveOptionTexts: {
    flex: 1,
  },
  saveOptionTitle: {
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 2,
  },
  saveOptionSub: {
    fontSize: 11,
    lineHeight: 15,
  },
  modalActionButtons: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 10,
    marginTop: 20,
  },
  modalCancelBtn: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
  },
  modalCancelText: {
    fontSize: 13,
    fontWeight: '600',
  },
  modalConfirmBtn: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 10,
  },
  modalConfirmText: {
    color: '#FFF',
    fontSize: 13,
    fontWeight: '700',
  },
  progressBackdrop: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(0,0,0,0.65)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: SPACING.lg,
    zIndex: 9999,
  },
  progressCard: {
    width: '100%',
    maxWidth: 320,
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    borderWidth: 1,
    gap: 12,
  },
  progressTitle: {
    fontSize: 16,
    fontWeight: '700',
  },
  progressSubtitle: {
    fontSize: 13,
    textAlign: 'center',
  },
  previewBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.92)',
  },
  previewHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
  },
  previewTitle: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '700',
  },
  previewCloseBtn: {
    padding: 6,
  },
  previewBody: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: SPACING.md,
  },
  previewImage: {
    width: '100%',
    height: '100%',
  },
});
