import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  Platform,
  StatusBar,
  Modal,
  TextInput,
  KeyboardAvoidingView,
} from 'react-native';
import * as IntentLauncher from 'expo-intent-launcher';
import * as FileSystem from 'expo-file-system/legacy';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { SavedPDFDocument, RootStackParamList } from '../types';
import { formatFileSize, sharePDFDocument, deletePDFDocument, renamePDFDocument } from '../utils/storage';
import { Header } from '../components/Header';
import { useTheme } from '../contexts/ThemeContext';
import { PDFEmbeddedViewer, PDFEmbeddedViewerRef } from '../components/PDFEmbeddedViewer';

type NavigationProp = NativeStackNavigationProp<RootStackParamList, 'Viewer'>;
type ViewerRouteProp = RouteProp<RootStackParamList, 'Viewer'>;

export const ViewerScreen: React.FC = () => {
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<ViewerRouteProp>();
  const { colors, isDark } = useTheme();
  const insets = useSafeAreaInsets();

  const doc: SavedPDFDocument = route.params.pdfDoc;
  const isNew = route.params?.isNew ?? false;
  const viewerRef = useRef<PDFEmbeddedViewerRef>(null);

  // Editable document title state
  const [docTitle, setDocTitle] = useState(doc.title);
  const [isRenameModalVisible, setIsRenameModalVisible] = useState(false);
  const [newTitleInput, setNewTitleInput] = useState(doc.title);

  // If opened directly from Home (isNew === false), open the reader immediately
  // If created newly in Editor (isNew === true), show the success buttons first
  const [isReaderVisible, setIsReaderVisible] = useState(!isNew);
  const [readerCurrentPage, setReaderCurrentPage] = useState(1);
  const [readerTotalPages, setReaderTotalPages] = useState(doc.pageCount || 1);
  const [zoomScale, setZoomScale] = useState(1.0);

  const handleOpenRename = () => {
    setNewTitleInput(docTitle);
    setIsRenameModalVisible(true);
  };

  const handleConfirmRename = async () => {
    const cleanTitle = newTitleInput.trim();
    if (cleanTitle && cleanTitle !== docTitle) {
      const updated = await renamePDFDocument(doc.id, cleanTitle);
      if (updated) {
        setDocTitle(cleanTitle);
      }
    }
    setIsRenameModalVisible(false);
  };

  const handlePrevPage = () => {
    if (readerCurrentPage > 1) {
      const target = readerCurrentPage - 1;
      setReaderCurrentPage(target);
      viewerRef.current?.goToPage(target);
    }
  };

  const handleNextPage = () => {
    if (readerCurrentPage < readerTotalPages) {
      const target = readerCurrentPage + 1;
      setReaderCurrentPage(target);
      viewerRef.current?.goToPage(target);
    }
  };

  const handleShare = async () => {
    await sharePDFDocument(doc.uri);
  };

  const handleOpenExternal = async () => {
    try {
      if (Platform.OS === 'android') {
        const contentUri = await FileSystem.getContentUriAsync(doc.uri);
        await IntentLauncher.startActivityAsync('android.intent.action.VIEW', {
          data: contentUri,
          flags: 1,
          type: 'application/pdf',
        });
      } else {
        await sharePDFDocument(doc.uri);
      }
    } catch (error) {
      console.error('Error opening external PDF:', error);
      Alert.alert(
        'Aviso',
        'No se encontró una aplicación externa para abrir el PDF. Puedes visualizarlo directamente con el visor integrado o compartirlo.'
      );
    }
  };

  const handleDelete = () => {
    Alert.alert(
      'Eliminar Documento',
      `¿Deseas eliminar "${docTitle}" de tu dispositivo?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: async () => {
            await deletePDFDocument(doc.id);
            navigation.replace('Home');
          },
        },
      ]
    );
  };

  const formattedDate = new Date(doc.createdAt).toLocaleDateString('es-ES', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />

      {/* Main Screen Header */}
      <Header
        title="Documento PDF"
        onBack={() => navigation.navigate('Home')}
      />

      <ScrollView contentContainerStyle={styles.container}>
        {/* Success Card */}
        <View
          style={[
            styles.successCard,
            { backgroundColor: colors.cardBg, borderColor: colors.border },
          ]}
        >
          <View style={styles.iconCircle}>
            <Ionicons
              name={isNew ? 'checkmark-circle' : 'document-text'}
              size={48}
              color={colors.primary}
            />
          </View>
          <Text style={[styles.successTitle, { color: colors.textPrimary }]}>
            {isNew ? '¡PDF Generado con Éxito!' : 'Documento Guardado'}
          </Text>
          <Text style={[styles.successSubtitle, { color: colors.textSecondary }]}>
            {isNew
              ? 'Tu documento ha sido procesado y guardado localmente sin marcas de agua.'
              : 'Este documento se encuentra almacenado localmente en tu dispositivo.'}
          </Text>
        </View>

        {/* Document Metadata Card */}
        <View
          style={[
            styles.detailsCard,
            { backgroundColor: colors.cardBg, borderColor: colors.border },
          ]}
        >
          <View style={styles.docHeaderRow}>
            <Ionicons name="document-text" size={32} color={colors.primary} />
            <View style={styles.docTitleGroup}>
              <Text
                style={[styles.docTitle, { color: colors.textPrimary }]}
                numberOfLines={1}
              >
                {docTitle}
              </Text>
              <Text style={[styles.docDate, { color: colors.textSecondary }]}>
                {formattedDate}
              </Text>
            </View>

            <TouchableOpacity
              style={[
                styles.renameActionBtn,
                { backgroundColor: colors.cardBgElevated, borderColor: colors.border },
              ]}
              onPress={handleOpenRename}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Ionicons name="pencil-outline" size={18} color={colors.primaryLight} />
            </TouchableOpacity>
          </View>

          <View style={[styles.divider, { backgroundColor: colors.border }]} />

          <View style={styles.statsGrid}>
            <View style={styles.statBox}>
              <Text style={[styles.statLabel, { color: colors.textSecondary }]}>
                Páginas
              </Text>
              <Text style={[styles.statValue, { color: colors.primary }]}>
                {doc.pageCount}
              </Text>
            </View>

            <View style={styles.statBox}>
              <Text style={[styles.statLabel, { color: colors.textSecondary }]}>
                Tamaño
              </Text>
              <Text style={[styles.statValue, { color: colors.primary }]}>
                {formatFileSize(doc.fileSize)}
              </Text>
            </View>

            <View style={styles.statBox}>
              <Text style={[styles.statLabel, { color: colors.textSecondary }]}>
                Formato
              </Text>
              <Text style={[styles.statValue, { color: colors.primary }]}>
                PDF Nativo
              </Text>
            </View>
          </View>
        </View>

        {/* Action Buttons */}
        <View style={styles.actionsContainer}>
          {/* Button 1: View PDF (Launches the In-App Embedded PDF Viewer) */}
          <TouchableOpacity
            style={[styles.bigActionBtn, { backgroundColor: colors.primaryDark }]}
            onPress={() => setIsReaderVisible(true)}
            activeOpacity={0.85}
          >
            <Ionicons name="eye-outline" size={24} color="#FFF" />
            <Text style={styles.bigActionBtnText}>Abrir y Ver PDF</Text>
          </TouchableOpacity>

          {/* Button 2: Share PDF Immediately */}
          <TouchableOpacity
            style={[styles.bigActionBtn, { backgroundColor: colors.primary }]}
            onPress={handleShare}
            activeOpacity={0.85}
          >
            <Ionicons name="share-social" size={24} color="#FFF" />
            <Text style={styles.bigActionBtnText}>Compartir PDF</Text>
          </TouchableOpacity>

          {/* Button 3: Delete Document */}
          <TouchableOpacity
            style={[
              styles.bigActionBtn,
              {
                backgroundColor: isDark ? '#1C1C1E' : '#FFF',
                borderWidth: 1.5,
                borderColor: '#EF4444',
                elevation: 0,
              },
            ]}
            onPress={handleDelete}
            activeOpacity={0.85}
          >
            <Ionicons name="trash-outline" size={20} color="#EF4444" />
            <Text style={[styles.deleteBtnText, { color: '#EF4444' }]}>
              Eliminar Documento
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* Back to Home Footer */}
      <View
        style={[
          styles.footer,
          { backgroundColor: colors.cardBg, borderTopColor: colors.border },
        ]}
      >
        <TouchableOpacity
          style={[
            styles.homeBtn,
            {
              backgroundColor: colors.background,
              borderColor: isDark ? '#374151' : colors.border,
            },
          ]}
          onPress={() => navigation.navigate('Home')}
          activeOpacity={0.85}
        >
          <Ionicons
            name="home-outline"
            size={20}
            color={isDark ? '#FFF' : colors.textPrimary}
          />
          <Text
            style={[
              styles.homeBtnText,
              { color: isDark ? '#FFF' : colors.textPrimary },
            ]}
          >
            Volver al Inicio
          </Text>
        </TouchableOpacity>
      </View>

      {/* Fullscreen Modal: In-App Embedded PDF Reader */}
      <Modal
        visible={isReaderVisible}
        animationType="slide"
        presentationStyle="fullScreen"
        onRequestClose={() => {
          if (isNew) {
            setIsReaderVisible(false);
          } else {
            navigation.navigate('Home');
          }
        }}
      >
        <SafeAreaView
          style={[styles.readerSafeArea, { backgroundColor: colors.background }]}
          edges={['top', 'left', 'right', 'bottom']}
        >
          <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />

          {/* Reader Header */}
          <View
            style={[
              styles.readerHeader,
              {
                backgroundColor: colors.cardBg,
                borderBottomColor: colors.border,
              },
            ]}
          >
            <TouchableOpacity
              style={styles.headerBtn}
              onPress={() => {
                if (isNew) {
                  setIsReaderVisible(false);
                } else {
                  navigation.navigate('Home');
                }
              }}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Ionicons name="arrow-back" size={24} color={colors.textPrimary} />
            </TouchableOpacity>

            <View style={styles.readerTitleContainer}>
              <Text
                style={[styles.readerTitle, { color: colors.textPrimary }]}
                numberOfLines={1}
              >
                {docTitle}
              </Text>
              <Text style={[styles.readerSubtitle, { color: colors.primaryLight }]}>
                Página {readerCurrentPage} de {readerTotalPages}
              </Text>
            </View>

            <View style={styles.readerActions}>
              {/* Share from Reader */}
              <TouchableOpacity
                style={styles.headerBtn}
                onPress={handleShare}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <Ionicons
                  name="share-social-outline"
                  size={22}
                  color={colors.textPrimary}
                />
              </TouchableOpacity>

              {/* Open in external app if desired */}
              <TouchableOpacity
                style={styles.headerBtn}
                onPress={handleOpenExternal}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <Ionicons
                  name="open-outline"
                  size={22}
                  color={colors.textPrimary}
                />
              </TouchableOpacity>
            </View>
          </View>

          {/* Embedded Viewer Core */}
          <View style={styles.readerViewerBox}>
            <PDFEmbeddedViewer
              ref={viewerRef}
              pdfUri={doc.uri}
              initialPage={1}
              onPageChange={(page, total) => {
                setReaderCurrentPage(page);
                if (total) setReaderTotalPages(total);
              }}
              onZoomChange={(scale) => {
                setZoomScale(scale);
              }}
              onLoadSuccess={(total) => {
                setReaderTotalPages(total);
              }}
              onOpenExternal={handleOpenExternal}
            />

            {/* Floating Zoom & Page Jump Controls */}
            <View
              style={[
                styles.floatingBar,
                {
                  backgroundColor: isDark
                    ? 'rgba(28, 28, 30, 0.94)'
                    : 'rgba(255, 255, 255, 0.94)',
                  borderColor: colors.border,
                  bottom: Math.max(insets.bottom + 12, 24),
                },
              ]}
            >
              {/* Zoom Out */}
              <TouchableOpacity
                style={[
                  styles.controlBtn,
                  zoomScale <= 1.0 && styles.controlBtnDisabled,
                ]}
                onPress={() => viewerRef.current?.zoomOut()}
                disabled={zoomScale <= 1.0}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Ionicons
                  name="remove"
                  size={20}
                  color={zoomScale <= 1.0 ? colors.textMuted : colors.textPrimary}
                />
              </TouchableOpacity>

              {/* Reset / Fit to Width (Shows Zoom % and resets on press) */}
              <TouchableOpacity
                style={[
                  styles.zoomBadgeBtn,
                  {
                    backgroundColor:
                      zoomScale > 1.05
                        ? colors.primaryGlow
                        : isDark
                        ? 'rgba(255, 255, 255, 0.08)'
                        : 'rgba(0, 0, 0, 0.05)',
                    borderColor:
                      zoomScale > 1.05 ? colors.primaryLight : colors.border,
                  },
                ]}
                onPress={() => viewerRef.current?.resetZoom()}
                activeOpacity={0.7}
                hitSlop={{ top: 10, bottom: 10, left: 6, right: 6 }}
              >
                <Text
                  style={[
                    styles.zoomBadgeText,
                    {
                      color:
                        zoomScale > 1.05
                          ? colors.primaryLight
                          : colors.textSecondary,
                    },
                  ]}
                >
                  {Math.round(zoomScale * 100)}%
                </Text>
              </TouchableOpacity>

              {/* Zoom In */}
              <TouchableOpacity
                style={styles.controlBtn}
                onPress={() => viewerRef.current?.zoomIn()}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Ionicons name="add" size={20} color={colors.textPrimary} />
              </TouchableOpacity>

              <View
                style={[styles.verticalDivider, { backgroundColor: colors.border }]}
              />

              {/* Prev Page */}
              <TouchableOpacity
                style={[
                  styles.controlBtn,
                  readerCurrentPage <= 1 && styles.controlBtnDisabled,
                ]}
                onPress={handlePrevPage}
                disabled={readerCurrentPage <= 1}
                activeOpacity={0.6}
                hitSlop={{ top: 14, bottom: 14, left: 10, right: 10 }}
              >
                <Ionicons
                  name="chevron-back"
                  size={20}
                  color={
                    readerCurrentPage <= 1
                      ? colors.textMuted
                      : colors.textPrimary
                  }
                />
              </TouchableOpacity>

              {/* Page Pill */}
              <View
                style={[
                  styles.pagePill,
                  { backgroundColor: colors.background },
                ]}
              >
                <Text
                  style={[styles.pagePillText, { color: colors.textPrimary }]}
                >
                  {readerCurrentPage} / {readerTotalPages}
                </Text>
              </View>

              {/* Next Page */}
              <TouchableOpacity
                style={[
                  styles.controlBtn,
                  readerCurrentPage >= readerTotalPages &&
                    styles.controlBtnDisabled,
                ]}
                onPress={handleNextPage}
                disabled={readerCurrentPage >= readerTotalPages}
                activeOpacity={0.6}
                hitSlop={{ top: 14, bottom: 14, left: 10, right: 10 }}
              >
                <Ionicons
                  name="chevron-forward"
                  size={20}
                  color={
                    readerCurrentPage >= readerTotalPages
                      ? colors.textMuted
                      : colors.textPrimary
                  }
                />
              </TouchableOpacity>
            </View>
          </View>
        </SafeAreaView>
      </Modal>

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
              value={newTitleInput}
              onChangeText={setNewTitleInput}
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
    padding: 16,
    paddingBottom: 24,
  },
  successCard: {
    marginBottom: 16,
    padding: 16,
    borderRadius: 12,
  },
  iconCircle: {
    alignItems: 'center',
    marginBottom: 8,
  },
  successTitle: {
    fontSize: 20,
    fontWeight: '800',
    marginBottom: 4,
    textAlign: 'center',
  },
  successSubtitle: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
  },
  detailsCard: {
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    marginBottom: 24,
  },
  docHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  docTitleGroup: {
    flex: 1,
  },
  docTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 2,
  },
  docDate: {
    fontSize: 12,
  },
  divider: {
    height: 1,
    width: '100%',
    marginVertical: 16,
  },
  statsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  statBox: {
    alignItems: 'center',
  },
  statLabel: {
    fontSize: 11,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  statValue: {
    fontSize: 14,
    fontWeight: '700',
  },
  actionsContainer: {
    gap: 16,
  },
  bigActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 12,
    elevation: 3,
  },
  bigActionBtnText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '700',
  },
  deleteBtnText: {
    fontSize: 16,
    fontWeight: '700',
  },
  footer: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
  },
  homeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
  },
  homeBtnText: {
    fontSize: 15,
    fontWeight: '600',
  },

  // Fullscreen In-App Reader Styles
  readerSafeArea: {
    flex: 1,
  },
  readerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    gap: 12,
  },
  headerBtn: {
    padding: 4,
  },
  readerTitleContainer: {
    flex: 1,
  },
  readerTitle: {
    fontSize: 16,
    fontWeight: '700',
  },
  readerSubtitle: {
    fontSize: 12,
    fontWeight: '600',
    marginTop: 1,
  },
  readerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  readerViewerBox: {
    flex: 1,
    position: 'relative',
  },
  floatingBar: {
    position: 'absolute',
    bottom: 24,
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 28,
    borderWidth: 1,
    gap: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 10,
    elevation: 8,
  },
  controlBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
  },
  controlBtnDisabled: {
    opacity: 0.35,
  },
  zoomBadgeBtn: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    minWidth: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  zoomBadgeText: {
    fontSize: 11,
    fontWeight: '700',
  },
  verticalDivider: {
    width: 1,
    height: 20,
  },
  pagePill: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  pagePillText: {
    fontSize: 12,
    fontWeight: '700',
  },
  renameActionBtn: {
    width: 36,
    height: 36,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  renameModalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.55)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
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
