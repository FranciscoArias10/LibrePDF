import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';
import { PageImage, PDFSettings, ImageFilterType, RootStackParamList } from '../types';
import { DEFAULT_PDF_SETTINGS, COLORS, SPACING, RADIUS } from '../constants/theme';
import { rotateImage, applyFilterToImage } from '../utils/imageProcessor';
import { generatePDF } from '../utils/pdfGenerator';
import { savePDFDocument } from '../utils/storage';
import { Header } from '../components/Header';
import { PageCard } from '../components/PageCard';
import { FilterPicker } from '../components/FilterPicker';
import { PDFSettingsModal } from '../components/PDFSettingsModal';

type NavigationProp = NativeStackNavigationProp<RootStackParamList, 'Editor'>;
type EditorRouteProp = RouteProp<RootStackParamList, 'Editor'>;

export const EditorScreen: React.FC = () => {
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<EditorRouteProp>();

  const [pages, setPages] = useState<PageImage[]>(
    route.params?.initialImages || []
  );
  const [selectedIndex, setSelectedIndex] = useState<number>(0);
  const [pdfSettings, setPDFSettings] = useState<PDFSettings>(DEFAULT_PDF_SETTINGS);
  const [isSettingsModalVisible, setIsSettingsModalVisible] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [hasPromptedFilterToAll, setHasPromptedFilterToAll] = useState(false);

  // Rotate single image
  const handleRotatePage = async (index: number) => {
    const targetPage = pages[index];
    const rotated = await rotateImage(targetPage);
    const updated = [...pages];
    updated[index] = rotated;
    setPages(updated);
  };

  // Reorder move up
  const handleMoveUp = (index: number) => {
    if (index === 0) return;
    const updated = [...pages];
    const temp = updated[index];
    updated[index] = updated[index - 1];
    updated[index - 1] = temp;
    setPages(updated);
    setSelectedIndex(index - 1);
  };

  // Reorder move down
  const handleMoveDown = (index: number) => {
    if (index === pages.length - 1) return;
    const updated = [...pages];
    const temp = updated[index];
    updated[index] = updated[index + 1];
    updated[index + 1] = temp;
    setPages(updated);
    setSelectedIndex(index + 1);
  };

  // Delete page
  const handleDeletePage = (index: number) => {
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
  };

  // Apply filter to current page
  const handleFilterChange = (filter: ImageFilterType) => {
    if (pages.length === 0) return;

    if (!hasPromptedFilterToAll && pages.length > 1) {
      Alert.alert(
        'Aplicar Filtro',
        '¿Deseas aplicar este filtro a todas las páginas del documento o solo a esta?',
        [
          {
            text: 'Solo a esta',
            onPress: () => {
              setHasPromptedFilterToAll(true);
              applyFilterToOne(filter);
            },
          },
          {
            text: 'A todas',
            onPress: () => {
              setHasPromptedFilterToAll(true);
              handleApplyFilterToAll(filter);
            },
          },
        ]
      );
    } else {
      applyFilterToOne(filter);
    }
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
    try {
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

  // Add more image from camera
  const handleAddMoreFromCamera = async () => {
    try {
      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ['images'],
        quality: 0.9,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const asset = result.assets[0];
        const newPage: PageImage = {
          id: `img_${Date.now()}_${pages.length}`,
          uri: asset.uri,
          originalUri: asset.uri,
          width: asset.width,
          height: asset.height,
          rotation: 0,
          filter: 'original',
        };

        setPages([...pages, newPage]);
      }
    } catch (error) {
      console.error('Error taking photo:', error);
    }
  };

  // Confirm and process PDF Generation
  const handleGeneratePDF = async () => {
    if (pages.length === 0) {
      Alert.alert('Atención', 'Agrega al menos una imagen para generar el PDF');
      return;
    }

    setIsSettingsModalVisible(false);
    setIsGenerating(true);

    try {
      // 1. Generate PDF file via expo-print
      const pdfResult = await generatePDF(pages, pdfSettings);

      // 2. Save PDF to permanent storage
      const savedDoc = await savePDFDocument(
        pdfResult.uri,
        pdfResult.base64,
        pdfSettings.documentTitle || 'Documento_Escaneado',
        pdfResult.pageCount,
        pages[0]?.uri
      );

      setIsGenerating(false);

      // 3. Navigate to Viewer Screen
      navigation.replace('Viewer', { pdfDoc: savedDoc });
    } catch (error) {
      setIsGenerating(false);
      console.error('Error creating PDF:', error);
      Alert.alert('Error al generar PDF', 'No se pudo crear el documento. Intenta nuevamente.');
    }
  };

  const selectedPage = pages[selectedIndex];

  return (
    <SafeAreaView style={styles.safeArea}>
      <Header
        title="Editor de Páginas"
        subtitle={`${pages.length} páginas seleccionadas`}
        showBack
        onBack={() => navigation.goBack()}
        rightAction={
          <TouchableOpacity
            style={styles.settingsHeaderBtn}
            onPress={() => setIsSettingsModalVisible(true)}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Ionicons name="options-outline" size={22} color={COLORS.primaryLight} />
          </TouchableOpacity>
        }
      />

      <View style={styles.container}>
        {/* Quick Add Bar */}
        <View style={styles.topToolbar}>
          <Text style={styles.toolbarTitle}>Páginas del PDF</Text>
          <View style={styles.toolbarActions}>
            <TouchableOpacity
              style={styles.addBtn}
              onPress={handleAddMoreFromGallery}
              activeOpacity={0.8}
            >
              <Ionicons name="images-outline" size={16} color="#FFF" />
              <Text style={styles.addBtnText}>+ Galería</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.addBtn}
              onPress={handleAddMoreFromCamera}
              activeOpacity={0.8}
            >
              <Ionicons name="camera-outline" size={16} color="#FFF" />
              <Text style={styles.addBtnText}>+ Cámara</Text>
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
                onSelect={() => setSelectedIndex(index)}
                onRotate={() => handleRotatePage(index)}
                onDelete={() => handleDeletePage(index)}
                onMoveUp={() => handleMoveUp(index)}
                onMoveDown={() => handleMoveDown(index)}
              />
            )}
            contentContainerStyle={styles.listContainer}
            showsVerticalScrollIndicator={false}
          />
        ) : (
          <View style={styles.emptyEditor}>
            <Ionicons name="images-outline" size={56} color={COLORS.textMuted} />
            <Text style={styles.emptyText}>No hay páginas en este documento</Text>
            <TouchableOpacity
              style={styles.importBtn}
              onPress={handleAddMoreFromGallery}
            >
              <Text style={styles.importBtnText}>Importar Fotos</Text>
            </TouchableOpacity>
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
          <View style={styles.footerBar}>
            <TouchableOpacity
              style={styles.generatePDFBtn}
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
        settings={pdfSettings}
        onUpdateSettings={setPDFSettings}
        onClose={() => setIsSettingsModalVisible(false)}
        onConfirmGenerate={handleGeneratePDF}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  settingsHeaderBtn: {
    width: 36,
    height: 36,
    borderRadius: RADIUS.xs,
    backgroundColor: COLORS.cardBgElevated,
    alignItems: 'center',
    justifyContent: 'center',
  },
  topToolbar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    backgroundColor: COLORS.cardBg,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  toolbarTitle: {
    color: COLORS.textPrimary,
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
    backgroundColor: COLORS.primaryDark,
    paddingHorizontal: SPACING.sm + 4,
    paddingVertical: 6,
    borderRadius: RADIUS.xs,
  },
  addBtnText: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: '700',
  },
  listContainer: {
    padding: SPACING.md,
    paddingBottom: SPACING.xl,
  },
  emptyEditor: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: SPACING.xl,
  },
  emptyText: {
    color: COLORS.textSecondary,
    fontSize: 15,
    marginTop: SPACING.md,
    marginBottom: SPACING.lg,
  },
  importBtn: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md - 4,
    borderRadius: RADIUS.md,
  },
  importBtnText: {
    color: '#FFF',
    fontSize: 15,
    fontWeight: '700',
  },
  footerBar: {
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.md - 2,
    backgroundColor: COLORS.cardBg,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  generatePDFBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.sm,
    backgroundColor: COLORS.primary,
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
