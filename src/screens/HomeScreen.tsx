import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  TextInput,
  Alert,
  StatusBar,
  SafeAreaView,
  RefreshControl,
} from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';
import { SavedPDFDocument, PageImage, RootStackParamList } from '../types';
import { getSavedPDFs, deletePDFDocument, sharePDFDocument } from '../utils/storage';
import { Header } from '../components/Header';
import { DocumentCard } from '../components/DocumentCard';
import { COLORS, SPACING, RADIUS } from '../constants/theme';

type NavigationProp = NativeStackNavigationProp<RootStackParamList, 'Home'>;

export const HomeScreen: React.FC = () => {
  const navigation = useNavigation<NavigationProp>();
  const [documents, setDocuments] = useState<SavedPDFDocument[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [refreshing, setRefreshing] = useState(false);

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

  // Open Gallery picker (Multi-select)
  const handlePickFromGallery = async () => {
    try {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        Alert.alert(
          'Permiso Requerido',
          'Necesitamos acceso a tu galería para importar imágenes.'
        );
        return;
      }

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
      console.error('Error picking images from gallery:', error);
      Alert.alert('Error', 'No se pudieron seleccionar las imágenes');
    }
  };

  // Take photo with Camera
  const handleTakePhoto = async () => {
    try {
      const permission = await ImagePicker.requestCameraPermissionsAsync();
      if (!permission.granted) {
        Alert.alert(
          'Permiso Requerido',
          'Necesitamos acceso a tu cámara para escanear documentos.'
        );
        return;
      }

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
      console.error('Error taking photo:', error);
      Alert.alert('Error', 'No se pudo abrir la cámara');
    }
  };

  const handleDeleteDoc = (doc: SavedPDFDocument) => {
    Alert.alert(
      'Eliminar Documento',
      `¿Estás seguro de eliminar "${doc.title}"?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: async () => {
            await deletePDFDocument(doc.id);
            await loadDocuments();
          },
        },
      ]
    );
  };

  const handleShareDoc = async (doc: SavedPDFDocument) => {
    await sharePDFDocument(doc.uri);
  };

  const filteredDocs = documents.filter((doc) =>
    doc.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.background} />
      <Header
        title="LibrePDF"
        subtitle="Escáner & Convertidor a PDF (CamScanner Free)"
      />

      <View style={styles.container}>
        {/* Quick Action CamScanner Banner */}
        <View style={styles.bannerContainer}>
          <Text style={styles.bannerTitle}>Crear Nuevo Documento PDF</Text>
          <Text style={styles.bannerSubtitle}>
            Escanea con la cámara o selecciona fotos de tu galería sin publicidad ni pagos.
          </Text>

          <View style={styles.actionButtonsRow}>
            {/* Gallery Button */}
            <TouchableOpacity
              style={[styles.actionBtn, styles.galleryBtn]}
              onPress={handlePickFromGallery}
              activeOpacity={0.85}
            >
              <Ionicons name="images" size={24} color="#FFF" />
              <Text style={styles.actionBtnText}>Galeria</Text>
            </TouchableOpacity>

            {/* Camera Button */}
            <TouchableOpacity
              style={[styles.actionBtn, styles.cameraBtn]}
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
          <Text style={styles.historyTitle}>Documentos Recientes</Text>
          <Text style={styles.historyCount}>{documents.length} archivos</Text>
        </View>

        {/* Search Bar */}
        {documents.length > 0 && (
          <View style={styles.searchBox}>
            <Ionicons name="search" size={18} color={COLORS.textMuted} />
            <TextInput
              style={styles.searchInput}
              placeholder="Buscar por nombre..."
              placeholderTextColor={COLORS.textMuted}
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={() => setSearchQuery('')}>
                <Ionicons name="close-circle" size={18} color={COLORS.textMuted} />
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
              tintColor={COLORS.primaryLight}
            />
          }
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Ionicons name="document-text-outline" size={64} color={COLORS.borderLight} />
              <Text style={styles.emptyTitle}>No hay documentos en tu lista</Text>
              <Text style={styles.emptySubtitle}>
                Toca en "Galería" o "Cámara" para escanear tus primeras fotos y crear un PDF.
              </Text>
            </View>
          }
        />
      </View>
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
    paddingHorizontal: SPACING.md,
    paddingTop: SPACING.md,
  },
  bannerContainer: {
    backgroundColor: COLORS.cardBg,
    borderRadius: RADIUS.lg,
    padding: SPACING.md + 4,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: SPACING.md,
  },
  bannerTitle: {
    color: COLORS.textPrimary,
    fontSize: 18,
    fontWeight: '800',
    marginBottom: 4,
  },
  bannerSubtitle: {
    color: COLORS.textSecondary,
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
    borderRadius: RADIUS.md,
    elevation: 3,
  },
  galleryBtn: {
    backgroundColor: COLORS.primaryDark,
    borderWidth: 1,
    borderColor: COLORS.primaryLight,
  },
  cameraBtn: {
    backgroundColor: COLORS.primary,
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
    color: COLORS.textPrimary,
    fontSize: 16,
    fontWeight: '700',
  },
  historyCount: {
    color: COLORS.primaryLight,
    fontSize: 12,
    fontWeight: '600',
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.cardBg,
    borderRadius: RADIUS.sm,
    paddingHorizontal: SPACING.md,
    height: 44,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: SPACING.md,
  },
  searchInput: {
    flex: 1,
    color: COLORS.textPrimary,
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
    color: COLORS.textPrimary,
    fontSize: 16,
    fontWeight: '700',
    marginTop: SPACING.md,
    marginBottom: SPACING.xs,
  },
  emptySubtitle: {
    color: COLORS.textMuted,
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 18,
  },
});
