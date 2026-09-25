import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
  RefreshControl,
  StatusBar,
  Modal,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';
import { SavedPDFDocument, PageImage, RootStackParamList } from '../types';
import { getSavedPDFs, deletePDFDocument, sharePDFDocument, renamePDFDocument } from '../utils/storage';
import { Header } from '../components/Header';
import { DocumentCard } from '../components/DocumentCard';
import { PermissionModal, PermissionType } from '../components/PermissionModal';
import { SPACING } from '../constants/theme';
import { useTheme } from '../contexts/ThemeContext';

type NavigationProp = NativeStackNavigationProp<RootStackParamList, 'Home'>;

export const HomeScreen: React.FC = () => {
  const navigation = useNavigation<NavigationProp>();
  const { colors, isDark, toggleTheme } = useTheme();
  const insets = useSafeAreaInsets();
  const [documents, setDocuments] = useState<SavedPDFDocument[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  
  const [isPermissionModalVisible, setIsPermissionModalVisible] = useState(false);
  const [permissionType, setPermissionType] = useState<PermissionType>('camera');

  const [isRenameModalVisible, setIsRenameModalVisible] = useState(false);
  const [renamingDoc, setRenamingDoc] = useState<SavedPDFDocument | null>(null);
  const [newDocTitle, setNewDocTitle] = useState('');

  // Multi-selection mode for merging PDFs
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [selectedDocIds, setSelectedDocIds] = useState<Set<string>>(new Set());

  const handleToggleSelect = (id: string) => {
    const next = new Set(selectedDocIds);
    if (next.has(id)) {
      next.delete(id);
    } else {
      next.add(id);
    }
    setSelectedDocIds(next);
  };

  const handleMergeSelected = () => {
    const selected = documents.filter((doc) => selectedDocIds.has(doc.id));
    setIsSelectionMode(false);
    setSelectedDocIds(new Set());
    navigation.navigate('MergePDF', { initialDocuments: selected });
  };

  const loadDocuments = async () => {
    const docs = await getSavedPDFs();
    setDocuments(docs);
  };

  useFocusEffect(
    useCallback(() => {
      loadDocuments();
    }, [])
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await loadDocuments();
    setRefreshing(false);
  };

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
        selectionLimit: 50,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const pages: PageImage[] = result.assets.map((asset, index) => ({
          id: `img_${Date.now()}_${index}`,
          uri: asset.uri,
          originalUri: asset.uri,
          width: asset.width,
          height: asset.height,
          rotation: 0,
          filter: 'original',
        }));
        navigation.navigate('Editor', { initialImages: pages });
      }
    } catch (error) {
      Alert.alert('Error', 'No se pudieron seleccionar las imágenes');
    }
  };

  const handleTakePhoto = () => {
    navigation.navigate('Camera', { returnToEditor: false });
  };

  const handleDeleteDoc = (doc: SavedPDFDocument) => {
    Alert.alert('Eliminar Documento', `¿Estás seguro de eliminar "${doc.title}"?`, [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Eliminar', style: 'destructive', onPress: async () => { await deletePDFDocument(doc.id); await loadDocuments(); } },
    ]);
  };

  const handleShareDoc = async (doc: SavedPDFDocument) => {
    await sharePDFDocument(doc.uri);
  };

  const handleOpenRename = (doc: SavedPDFDocument) => {
    setRenamingDoc(doc);
    setNewDocTitle(doc.title);
    setIsRenameModalVisible(true);
  };

  const handleConfirmRename = async () => {
    if (renamingDoc && newDocTitle.trim()) {
      await renamePDFDocument(renamingDoc.id, newDocTitle.trim());
      await loadDocuments();
    }
    setIsRenameModalVisible(false);
    setRenamingDoc(null);
  };

  const filteredDocs = documents.filter((doc) =>
    doc.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]}>
      <StatusBar barStyle={isDark ? "light-content" : "dark-content"} />
      <Header 
        title="LibrePDF"
        rightIcon={isDark ? "sunny" : "moon"}
        onRightPress={toggleTheme}
      />

      <View style={styles.container}>
        {/* Quick Action CamScanner Banner */}
        <View style={[styles.bannerContainer, { backgroundColor: colors.cardBg, borderColor: colors.border }]}>
          <Text style={[styles.bannerTitle, { color: colors.textPrimary }]}>Crear y Gestionar PDFs</Text>
          <Text style={[styles.bannerSubtitle, { color: colors.textSecondary }]}>
            Escanea con tu cámara, elige fotos o une múltiples PDFs sin publicidad ni límites.
          </Text>

          <View style={styles.actionButtonsRow}>
            {/* Gallery Button */}
            <TouchableOpacity
              style={[
                styles.actionBtn,
                { backgroundColor: colors.primaryDark, borderColor: colors.primaryLight, borderWidth: 1 },
              ]}
              onPress={handlePickFromGallery}
              activeOpacity={0.85}
            >
              <Ionicons name="images" size={22} color="#FFF" />
              <Text style={styles.actionBtnText}>Galería</Text>
            </TouchableOpacity>

            {/* Camera Button */}
            <TouchableOpacity
              style={[styles.actionBtn, { backgroundColor: colors.primary }]}
              onPress={handleTakePhoto}
              activeOpacity={0.85}
            >
              <Ionicons name="camera" size={22} color="#FFF" />
              <Text style={styles.actionBtnText}>Cámara</Text>
            </TouchableOpacity>
          </View>

          {/* Merge PDF Button (placed below camera and gallery) */}
          <TouchableOpacity
            style={[
              styles.mergeBannerBtn,
              {
                backgroundColor: colors.cardBgElevated,
                borderColor: colors.border,
              },
            ]}
            onPress={() => navigation.navigate('MergePDF')}
            activeOpacity={0.85}
          >
            <View style={[styles.mergeIconBox, { backgroundColor: colors.secondaryGlow }]}>
              <Ionicons name="git-merge-outline" size={20} color={colors.secondary} />
            </View>
            <View style={styles.mergeBtnTexts}>
              <Text style={[styles.mergeBtnTitle, { color: colors.textPrimary }]}>
                Combinar y Unir PDFs
              </Text>
              <Text style={[styles.mergeBtnSub, { color: colors.textSecondary }]}>
                Une 2 o más archivos del historial o de tu teléfono
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
          </TouchableOpacity>
        </View>

        {/* Search & History Header */}
        <View style={styles.historyHeader}>
          <View>
            <Text style={[styles.historyTitle, { color: colors.textPrimary }]}>Documentos Recientes</Text>
            <Text style={[styles.historyCount, { color: colors.primaryLight }]}>{documents.length} archivos</Text>
          </View>
          {documents.length > 1 && (
            <TouchableOpacity
              style={[
                styles.selectModeToggle,
                {
                  backgroundColor: isSelectionMode ? colors.primaryGlow : colors.cardBgElevated,
                  borderColor: isSelectionMode ? colors.primaryLight : colors.border,
                },
              ]}
              onPress={() => {
                if (isSelectionMode) {
                  setIsSelectionMode(false);
                  setSelectedDocIds(new Set());
                } else {
                  setIsSelectionMode(true);
                }
              }}
              activeOpacity={0.8}
            >
              <Ionicons
                name={isSelectionMode ? 'close' : 'checkbox-outline'}
                size={15}
                color={isSelectionMode ? colors.primaryLight : colors.textSecondary}
              />
              <Text
                style={[
                  styles.selectModeText,
                  { color: isSelectionMode ? colors.primaryLight : colors.textSecondary },
                ]}
              >
                {isSelectionMode ? 'Cancelar' : 'Seleccionar'}
              </Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Search Bar */}
        {documents.length > 0 && (
          <View style={[styles.searchBox, { backgroundColor: colors.cardBg, borderColor: colors.border }]}>
            <Ionicons name="search" size={18} color={colors.textMuted} />
            <TextInput
              style={[styles.searchInput, { color: colors.textPrimary }]}
              placeholder="Buscar por nombre..."
              placeholderTextColor={colors.textMuted}
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={() => setSearchQuery('')}>
                <Ionicons name="close-circle" size={18} color={colors.textMuted} />
              </TouchableOpacity>
            )}
          </View>
        )}

        {/* Saved Documents List */}
        <FlatList
          data={filteredDocs}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <DocumentCard
              document={item}
              selectable={isSelectionMode}
              selected={selectedDocIds.has(item.id)}
              onSelectToggle={() => handleToggleSelect(item.id)}
              onPress={() => {
                if (isSelectionMode) {
                  handleToggleSelect(item.id);
                } else {
                  navigation.navigate('Viewer', { pdfDoc: item, isNew: false });
                }
              }}
              onShare={() => handleShareDoc(item)}
              onDelete={() => handleDeleteDoc(item)}
              onRename={() => handleOpenRename(item)}
            />
          )}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={colors.primaryLight}
            />
          }
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Ionicons name="document-text-outline" size={64} color={colors.borderLight} />
              <Text style={[styles.emptyTitle, { color: colors.textPrimary }]}>No hay documentos en tu lista</Text>
              <Text style={[styles.emptySubtitle, { color: colors.textMuted }]}>
                Toca en "Galería" o "Cámara" para escanear tus primeras fotos y crear un PDF.
              </Text>
            </View>
          }
        />
      </View>

      {/* Floating Bottom Selection Bar */}
      {isSelectionMode && selectedDocIds.size > 0 && (
        <View
          style={[
            styles.selectionFloatingBar,
            {
              backgroundColor: colors.cardBg,
              borderColor: colors.border,
              bottom: Math.max(insets.bottom + 12, 24),
            },
          ]}
        >
          <Text style={[styles.selectionFloatingText, { color: colors.textPrimary }]}>
            {selectedDocIds.size} {selectedDocIds.size === 1 ? 'PDF seleccionado' : 'PDFs seleccionados'}
          </Text>
          <TouchableOpacity
            style={[styles.selectionFloatingBtn, { backgroundColor: colors.primary }]}
            onPress={handleMergeSelected}
            activeOpacity={0.85}
          >
            <Ionicons name="git-merge-outline" size={18} color="#FFF" />
            <Text style={styles.selectionFloatingBtnText}>
              Unir ({selectedDocIds.size})
            </Text>
          </TouchableOpacity>
        </View>
      )}

      <PermissionModal
        visible={isPermissionModalVisible}
        type={permissionType}
        onAccept={() => {
          setIsPermissionModalVisible(false);
          // Wait briefly for modal to close before launching native picker/camera
          setTimeout(() => {
            if (permissionType === 'gallery') proceedWithGallery();
            if (permissionType === 'camera') handleTakePhoto();
          }, 300);
        }}
        onCancel={() => {
          setIsPermissionModalVisible(false);
        }}
      />

      {/* Rename Document Modal */}
      <Modal
        visible={isRenameModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setIsRenameModalVisible(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.renameModalBackdrop}
        >
          <View
            style={[
              styles.renameModalCard,
              { backgroundColor: colors.cardBg, borderColor: colors.border },
            ]}
          >
            <View style={styles.renameHeader}>
              <Ionicons name="pencil" size={22} color={colors.primary} />
              <Text style={[styles.renameTitle, { color: colors.textPrimary }]}>
                Renombrar Documento
              </Text>
            </View>

            <TextInput
              style={[
                styles.renameInput,
                {
                  backgroundColor: colors.cardBgElevated,
                  borderColor: colors.border,
                  color: colors.textPrimary,
                },
              ]}
              value={newDocTitle}
              onChangeText={setNewDocTitle}
              placeholder="Nombre del documento"
              placeholderTextColor={colors.textMuted}
              autoFocus
              selectTextOnFocus
            />

            <View style={styles.renameActions}>
              <TouchableOpacity
                style={[
                  styles.renameBtn,
                  {
                    backgroundColor: colors.background,
                    borderColor: colors.border,
                    borderWidth: 1,
                  },
                ]}
                onPress={() => setIsRenameModalVisible(false)}
              >
                <Text
                  style={[styles.renameBtnText, { color: colors.textSecondary }]}
                >
                  Cancelar
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.renameBtn, { backgroundColor: colors.primary }]}
                onPress={handleConfirmRename}
              >
                <Text style={[styles.renameBtnText, { color: '#FFF' }]}>
                  Guardar
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
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
    paddingTop: SPACING.md,
  },
  bannerContainer: {
    borderRadius: 20,
    padding: SPACING.md + 4,
    borderWidth: 1,
    marginBottom: SPACING.md,
  },
  bannerTitle: {
    fontSize: 18,
    fontWeight: '800',
    marginBottom: 4,
  },
  bannerSubtitle: {
    fontSize: 13,
    lineHeight: 18,
    marginBottom: SPACING.md,
  },
  actionButtonsRow: {
    flexDirection: 'row',
    gap: SPACING.md,
  },
  actionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 14,
    elevation: 3,
  },
  actionBtnText: {
    color: '#FFF',
    fontSize: 15,
    fontWeight: '700',
  },
  mergeBannerBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.md,
    paddingVertical: 12,
    borderRadius: 14,
    borderWidth: 1,
    marginTop: SPACING.sm + 2,
    gap: SPACING.sm + 2,
  },
  mergeIconBox: {
    width: 38,
    height: 38,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  mergeBtnTexts: {
    flex: 1,
  },
  mergeBtnTitle: {
    fontSize: 14,
    fontWeight: '700',
  },
  mergeBtnSub: {
    fontSize: 12,
    marginTop: 2,
  },
  historyHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: SPACING.sm,
    marginTop: SPACING.xs,
  },
  historyTitle: {
    fontSize: 16,
    fontWeight: '700',
  },
  historyCount: {
    fontSize: 12,
    fontWeight: '600',
  },
  selectModeToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    gap: 4,
  },
  selectModeText: {
    fontSize: 12,
    fontWeight: '600',
  },
  selectionFloatingBar: {
    position: 'absolute',
    bottom: 24,
    left: SPACING.md,
    right: SPACING.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.md,
    paddingVertical: 12,
    borderRadius: 14,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 10,
  },
  selectionFloatingText: {
    fontSize: 14,
    fontWeight: '700',
  },
  selectionFloatingBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
    gap: 6,
  },
  selectionFloatingBtnText: {
    color: '#FFF',
    fontSize: 13,
    fontWeight: '700',
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 10,
    paddingHorizontal: SPACING.md,
    height: 44,
    borderWidth: 1,
    marginBottom: SPACING.md,
  },
  searchInput: {
    flex: 1,
    marginLeft: SPACING.sm,
    fontSize: 14,
  },
  listContent: {
    paddingBottom: SPACING.xl,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: SPACING.xxl,
    paddingHorizontal: SPACING.lg,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginTop: SPACING.md,
    marginBottom: SPACING.xs,
  },
  emptySubtitle: {
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 18,
  },
  renameModalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.55)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: SPACING.lg,
  },
  renameModalCard: {
    width: '100%',
    maxWidth: 360,
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 8,
  },
  renameHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 16,
  },
  renameTitle: {
    fontSize: 17,
    fontWeight: '700',
  },
  renameInput: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 15,
    marginBottom: 20,
  },
  renameActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 10,
  },
  renameBtn: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    minWidth: 90,
    alignItems: 'center',
  },
  renameBtnText: {
    fontSize: 14,
    fontWeight: '600',
  },
});
