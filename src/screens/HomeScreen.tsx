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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';
import { SavedPDFDocument, PageImage, RootStackParamList } from '../types';
import { getSavedPDFs, deletePDFDocument, sharePDFDocument } from '../utils/storage';
import { Header } from '../components/Header';
import { DocumentCard } from '../components/DocumentCard';
import { PermissionModal, PermissionType } from '../components/PermissionModal';
import { SPACING } from '../constants/theme';
import { useTheme } from '../contexts/ThemeContext';

type NavigationProp = NativeStackNavigationProp<RootStackParamList, 'Home'>;

export const HomeScreen: React.FC = () => {
  const navigation = useNavigation<NavigationProp>();
  const { colors, isDark, toggleTheme } = useTheme();
  const [documents, setDocuments] = useState<SavedPDFDocument[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  
  const [isPermissionModalVisible, setIsPermissionModalVisible] = useState(false);
  const [permissionType, setPermissionType] = useState<PermissionType>('camera');

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

  const handleTakePhoto = async () => {
    const status = await ImagePicker.getCameraPermissionsAsync();
    if (!status.granted && status.canAskAgain) {
      setPermissionType('camera');
      setIsPermissionModalVisible(true);
      return;
    }
    proceedWithCamera();
  };

  const proceedWithCamera = async () => {
    try {
      const permission = await ImagePicker.requestCameraPermissionsAsync();
      if (!permission.granted) return;

      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ['images'],
        quality: 0.9,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const asset = result.assets[0];
        const page: PageImage = {
          id: `img_${Date.now()}_0`,
          uri: asset.uri,
          originalUri: asset.uri,
          width: asset.width,
          height: asset.height,
          rotation: 0,
          filter: 'original',
        };
        navigation.navigate('Editor', { initialImages: [page] });
      }
    } catch (error) {
      Alert.alert('Error', 'No se pudo abrir la cámara');
    }
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
          <Text style={[styles.bannerTitle, { color: colors.textPrimary }]}>Crear Nuevo Documento PDF</Text>
          <Text style={[styles.bannerSubtitle, { color: colors.textSecondary }]}>
            Escanea con la cámara o selecciona fotos de tu galería sin publicidad ni pagos.
          </Text>

          <View style={styles.actionButtonsRow}>
            {/* Gallery Button */}
            <TouchableOpacity
              style={[styles.actionBtn, { backgroundColor: colors.primaryDark, borderColor: colors.primaryLight, borderWidth: 1 }]}
              onPress={handlePickFromGallery}
              activeOpacity={0.85}
            >
              <Ionicons name="images" size={24} color="#FFF" />
              <Text style={styles.actionBtnText}>Galeria</Text>
            </TouchableOpacity>

            {/* Camera Button */}
            <TouchableOpacity
              style={[styles.actionBtn, { backgroundColor: colors.primary }]}
              onPress={handleTakePhoto}
              activeOpacity={0.85}
            >
              <Ionicons name="camera" size={24} color="#FFF" />
              <Text style={styles.actionBtnText}>Cámara</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Search & History Header */}
        <View style={styles.historyHeader}>
          <Text style={[styles.historyTitle, { color: colors.textPrimary }]}>Documentos Recientes</Text>
          <Text style={[styles.historyCount, { color: colors.primaryLight }]}>{documents.length} archivos</Text>
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
              onPress={() => navigation.navigate('Viewer', { pdfDoc: item })}
              onShare={() => handleShareDoc(item)}
              onDelete={() => handleDeleteDoc(item)}
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

      <PermissionModal
        visible={isPermissionModalVisible}
        type={permissionType}
        onAccept={() => {
          setIsPermissionModalVisible(false);
          // Wait briefly for modal to close before launching native picker/camera
          setTimeout(() => {
            if (permissionType === 'gallery') proceedWithGallery();
            if (permissionType === 'camera') proceedWithCamera();
          }, 300);
        }}
        onCancel={() => {
          setIsPermissionModalVisible(false);
        }}
      />
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
    gap: SPACING.sm,
    paddingVertical: SPACING.md - 2,
    borderRadius: 14,
    elevation: 3,
  },
  actionBtnText: {
    color: '#FFF',
    fontSize: 15,
    fontWeight: '700',
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
});
