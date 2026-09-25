import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
  Modal,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import * as DocumentPicker from 'expo-document-picker';
import { SavedPDFDocument, RootStackParamList } from '../types';
import { getSavedPDFs } from '../utils/storage';
import { MergeSourceItem, mergePDFDocuments, getPDFPageCount } from '../utils/pdfMerger';
import { Header } from '../components/Header';
import { SPACING, RADIUS, generateDefaultDocumentTitle } from '../constants/theme';
import { useTheme } from '../contexts/ThemeContext';

type NavigationProp = NativeStackNavigationProp<RootStackParamList, 'MergePDF'>;
type MergeRouteProp = RouteProp<RootStackParamList, 'MergePDF'>;

export const MergePDFScreen: React.FC = () => {
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<MergeRouteProp>();
  const { colors, isDark } = useTheme();

  // Selected items to be merged in order
  const [selectedItems, setSelectedItems] = useState<MergeSourceItem[]>([]);
  const [outputTitle, setOutputTitle] = useState<string>(() => {
    return `Unido_${generateDefaultDocumentTitle()}`;
  });

  // Loading & Progress
  const [isMerging, setIsMerging] = useState(false);
  const [mergeProgressText, setMergeProgressText] = useState('');

  // History Picker Modal State
  const [isHistoryModalVisible, setIsHistoryModalVisible] = useState(false);
  const [historyDocs, setHistoryDocs] = useState<SavedPDFDocument[]>([]);
  const [historySearch, setHistorySearch] = useState('');
  const [tempCheckedIds, setTempCheckedIds] = useState<Set<string>>(new Set());

  // Initialize with initialDocuments if passed from HomeScreen
  useEffect(() => {
    if (route.params?.initialDocuments && route.params.initialDocuments.length > 0) {
      const initial: MergeSourceItem[] = route.params.initialDocuments.map((doc) => ({
        id: `history_${doc.id}_${Date.now()}`,
        title: doc.title,
        uri: doc.uri,
        pageCount: doc.pageCount,
        fileSize: doc.fileSize,
        source: 'history',
      }));
      setSelectedItems(initial);
    }
  }, [route.params?.initialDocuments]);

  // Load history documents when opening the modal
  const handleOpenHistoryModal = async () => {
    const docs = await getSavedPDFs();
    setHistoryDocs(docs);
    setHistorySearch('');
    // Pre-check any currently selected history items if applicable
    const existingUris = new Set(selectedItems.map((item) => item.uri));
    const preChecked = new Set<string>();
    docs.forEach((doc) => {
      if (existingUris.has(doc.uri)) {
        preChecked.add(doc.id);
      }
    });
    setTempCheckedIds(preChecked);
    setIsHistoryModalVisible(true);
  };

  const toggleHistoryItem = (id: string) => {
    const next = new Set(tempCheckedIds);
    if (next.has(id)) {
      next.delete(id);
    } else {
      next.add(id);
    }
    setTempCheckedIds(next);
  };

  const handleConfirmHistorySelection = () => {
    const selectedFromModal = historyDocs.filter((doc) => tempCheckedIds.has(doc.id));
    const newItems: MergeSourceItem[] = selectedFromModal.map((doc) => ({
      id: `history_${doc.id}_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      title: doc.title,
      uri: doc.uri,
      pageCount: doc.pageCount,
      fileSize: doc.fileSize,
      source: 'history',
    }));

    // Keep items from device, and replace/add history items
    const nonHistoryItems = selectedItems.filter((item) => item.source === 'device');
    setSelectedItems([...nonHistoryItems, ...newItems]);
    setIsHistoryModalVisible(false);
  };

  // Pick PDF from device storage via expo-document-picker
  const handlePickFromDevice = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: 'application/pdf',
        copyToCacheDirectory: true,
        multiple: true,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const addedItems: MergeSourceItem[] = [];

        for (const asset of result.assets) {
          // Calculate page count asynchronously
          const count = await getPDFPageCount(asset.uri);
          addedItems.push({
            id: `device_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
            title: asset.name.replace(/\.pdf$/i, ''),
            uri: asset.uri,
            pageCount: count,
            fileSize: asset.size || 0,
            source: 'device',
          });
        }

        setSelectedItems((prev) => [...prev, ...addedItems]);
      }
    } catch (error) {
      console.error('Error picking document from device:', error);
      Alert.alert('Error', 'No se pudo seleccionar el archivo PDF del dispositivo.');
    }
  };

  // Reorder items
  const handleMoveUp = (index: number) => {
    if (index === 0) return;
    setSelectedItems((prev) => {
      const updated = [...prev];
      const temp = updated[index];
      updated[index] = updated[index - 1];
      updated[index - 1] = temp;
      return updated;
    });
  };

  const handleMoveDown = (index: number) => {
    if (index === selectedItems.length - 1) return;
    setSelectedItems((prev) => {
      const updated = [...prev];
      const temp = updated[index];
      updated[index] = updated[index + 1];
      updated[index + 1] = temp;
      return updated;
    });
  };

  const handleRemoveItem = (index: number) => {
    setSelectedItems((prev) => prev.filter((_, i) => i !== index));
  };

  // Merge Action
  const handleStartMerge = async () => {
    if (selectedItems.length < 2) {
      Alert.alert('Atención', 'Selecciona al menos 2 documentos PDF para unirlos.');
      return;
    }

    try {
      setIsMerging(true);
      setMergeProgressText(`Uniendo ${selectedItems.length} documentos...`);

      const finalDoc = await mergePDFDocuments(
        selectedItems,
        outputTitle,
        (current, total) => {
          setMergeProgressText(`Procesando documento ${current} de ${total}...`);
        }
      );

      setIsMerging(false);

      // Navigate to viewer with new document
      navigation.navigate('Viewer', {
        pdfDoc: finalDoc,
        isNew: true,
      });
    } catch (error: any) {
      setIsMerging(false);
      Alert.alert(
        'Error al unir PDFs',
        error?.message || 'Ocurrió un problema inesperado al combinar los archivos.'
      );
    }
  };

  const formatFileSize = (bytes?: number) => {
    if (!bytes) return '';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const totalPagesCount = selectedItems.reduce(
    (sum, item) => sum + (item.pageCount || 1),
    0
  );

  const filteredHistory = historyDocs.filter((doc) =>
    doc.title.toLowerCase().includes(historySearch.toLowerCase())
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <Header
        title="Unir PDFs"
        onBack={() => navigation.goBack()}
        rightIcon={selectedItems.length > 0 ? 'trash-outline' : undefined}
        onRightPress={() => {
          if (selectedItems.length > 0) {
            Alert.alert('Vaciar lista', '¿Deseas quitar todos los documentos seleccionados?', [
              { text: 'Cancelar', style: 'cancel' },
              { text: 'Vaciar', style: 'destructive', onPress: () => setSelectedItems([]) },
            ]);
          }
        }}
      />

      <View style={styles.content}>
        {/* Source Selector Buttons */}
        <View style={styles.sourceSelectorRow}>
          <TouchableOpacity
            style={[
              styles.sourceButton,
              { backgroundColor: colors.cardBg, borderColor: colors.border },
            ]}
            onPress={handleOpenHistoryModal}
            activeOpacity={0.8}
          >
            <View style={[styles.sourceIconBadge, { backgroundColor: colors.primaryGlow }]}>
              <Ionicons name="document-text" size={20} color={colors.primaryLight} />
            </View>
            <View style={styles.sourceButtonTexts}>
              <Text style={[styles.sourceButtonTitle, { color: colors.textPrimary }]}>
                Desde Historial
              </Text>
              <Text style={[styles.sourceButtonSub, { color: colors.textSecondary }]}>
                PDFs de LibrePDF
              </Text>
            </View>
            <Ionicons name="add-circle" size={22} color={colors.primary} />
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.sourceButton,
              { backgroundColor: colors.cardBg, borderColor: colors.border },
            ]}
            onPress={handlePickFromDevice}
            activeOpacity={0.8}
          >
            <View style={[styles.sourceIconBadge, { backgroundColor: colors.secondaryGlow }]}>
              <Ionicons name="folder-open" size={20} color={colors.secondary} />
            </View>
            <View style={styles.sourceButtonTexts}>
              <Text style={[styles.sourceButtonTitle, { color: colors.textPrimary }]}>
                Del Dispositivo
              </Text>
              <Text style={[styles.sourceButtonSub, { color: colors.textSecondary }]}>
                Memoria y descargas
              </Text>
            </View>
            <Ionicons name="add-circle" size={22} color={colors.secondary} />
          </TouchableOpacity>
        </View>

        {/* Output Title Box */}
        <View
          style={[
            styles.titleBox,
            { backgroundColor: colors.cardBg, borderColor: colors.border },
          ]}
        >
          <Ionicons name="create-outline" size={20} color={colors.primaryLight} />
          <View style={styles.titleInputContainer}>
            <Text style={[styles.titleInputLabel, { color: colors.textSecondary }]}>
              Nombre del archivo final
            </Text>
            <TextInput
              style={[styles.titleTextInput, { color: colors.textPrimary }]}
              value={outputTitle}
              onChangeText={setOutputTitle}
              placeholder="Ingresa nombre del documento..."
              placeholderTextColor={colors.textMuted}
            />
          </View>
          {outputTitle.length > 0 && (
            <TouchableOpacity onPress={() => setOutputTitle('')}>
              <Ionicons name="close-circle" size={18} color={colors.textMuted} />
            </TouchableOpacity>
          )}
        </View>

        {/* List Section Header */}
        <View style={styles.listSectionHeader}>
          <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>
            Orden de Unión ({selectedItems.length})
          </Text>
          {selectedItems.length > 0 && (
            <Text style={[styles.sectionSubtitle, { color: colors.primaryLight }]}>
              ~{totalPagesCount} páginas en total
            </Text>
          )}
        </View>

        {/* Selected Documents List or Empty State */}
        {selectedItems.length === 0 ? (
          <View style={styles.emptyContainer}>
            <View style={[styles.emptyIconCircle, { backgroundColor: colors.cardBg, borderColor: colors.border }]}>
              <Ionicons name="layers-outline" size={54} color={colors.textMuted} />
            </View>
            <Text style={[styles.emptyTitle, { color: colors.textPrimary }]}>
              Sin documentos para unir
            </Text>
            <Text style={[styles.emptySubtitle, { color: colors.textSecondary }]}>
              Agrega 2 o más archivos PDF tocando "Desde Historial" o "Del Dispositivo" para combinarlos en un solo archivo.
            </Text>
          </View>
        ) : (
          <FlatList
            data={selectedItems}
            keyExtractor={(item) => item.id}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.listContent}
            renderItem={({ item, index }) => (
              <View
                style={[
                  styles.itemCard,
                  { backgroundColor: colors.cardBg, borderColor: colors.border },
                ]}
              >
                {/* Index Badge */}
                <View
                  style={[
                    styles.indexBadge,
                    {
                      backgroundColor:
                        item.source === 'history'
                          ? colors.primaryGlow
                          : colors.secondaryGlow,
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.indexText,
                      {
                        color:
                          item.source === 'history'
                            ? colors.primaryLight
                            : colors.secondary,
                      },
                    ]}
                  >
                    {index + 1}
                  </Text>
                </View>

                {/* Details */}
                <View style={styles.itemDetails}>
                  <View style={styles.itemTitleRow}>
                    <Text
                      style={[styles.itemTitle, { color: colors.textPrimary }]}
                      numberOfLines={1}
                    >
                      {item.title}
                    </Text>
                  </View>
                  <View style={styles.itemMetaRow}>
                    <View
                      style={[
                        styles.sourcePill,
                        {
                          backgroundColor:
                            item.source === 'history'
                              ? 'rgba(255, 0, 60, 0.12)'
                              : 'rgba(0, 229, 255, 0.12)',
                        },
                      ]}
                    >
                      <Text
                        style={[
                          styles.sourcePillText,
                          {
                            color:
                              item.source === 'history'
                                ? colors.primaryLight
                                : colors.secondary,
                          },
                        ]}
                      >
                        {item.source === 'history' ? 'Historial' : 'Dispositivo'}
                      </Text>
                    </View>
                    <Text style={[styles.itemMetaText, { color: colors.textSecondary }]}>
                      {item.pageCount ? `${item.pageCount} pág.` : '1 pág.'}
                      {item.fileSize ? ` • ${formatFileSize(item.fileSize)}` : ''}
                    </Text>
                  </View>
                </View>

                {/* Reorder & Remove Actions */}
                <View style={styles.actionsColumn}>
                  <View style={styles.reorderRow}>
                    <TouchableOpacity
                      onPress={() => handleMoveUp(index)}
                      disabled={index === 0}
                      style={[
                        styles.reorderBtn,
                        index === 0 && styles.reorderBtnDisabled,
                      ]}
                    >
                      <Ionicons
                        name="arrow-up"
                        size={16}
                        color={index === 0 ? colors.borderLight : colors.textPrimary}
                      />
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={() => handleMoveDown(index)}
                      disabled={index === selectedItems.length - 1}
                      style={[
                        styles.reorderBtn,
                        index === selectedItems.length - 1 && styles.reorderBtnDisabled,
                      ]}
                    >
                      <Ionicons
                        name="arrow-down"
                        size={16}
                        color={
                          index === selectedItems.length - 1
                            ? colors.borderLight
                            : colors.textPrimary
                        }
                      />
                    </TouchableOpacity>
                  </View>

                  <TouchableOpacity
                    onPress={() => handleRemoveItem(index)}
                    style={styles.removeBtn}
                  >
                    <Ionicons name="trash-outline" size={17} color={colors.accentRed} />
                  </TouchableOpacity>
                </View>
              </View>
            )}
          />
        )}
      </View>

      {/* Floating Bottom Merge Button */}
      <View
        style={[
          styles.footerContainer,
          { backgroundColor: colors.cardBg, borderTopColor: colors.border },
        ]}
      >
        <TouchableOpacity
          style={[
            styles.mergeSubmitButton,
            {
              backgroundColor:
                selectedItems.length >= 2 ? colors.primary : colors.cardBgElevated,
              opacity: selectedItems.length >= 2 ? 1 : 0.6,
            },
          ]}
          onPress={handleStartMerge}
          disabled={selectedItems.length < 2 || isMerging}
          activeOpacity={0.85}
        >
          {isMerging ? (
            <ActivityIndicator color="#FFF" size="small" />
          ) : (
            <Ionicons
              name="git-merge-outline"
              size={22}
              color={selectedItems.length >= 2 ? '#FFF' : colors.textMuted}
            />
          )}
          <Text
            style={[
              styles.mergeSubmitButtonText,
              {
                color: selectedItems.length >= 2 ? '#FFF' : colors.textMuted,
              },
            ]}
          >
            {isMerging
              ? 'Combinando...'
              : selectedItems.length >= 2
              ? `Combinar ${selectedItems.length} PDFs`
              : 'Selecciona al menos 2 PDFs'}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Merging Progress Modal */}
      <Modal visible={isMerging} transparent animationType="fade">
        <View style={[styles.modalOverlay, { backgroundColor: colors.modalOverlay }]}>
          <View
            style={[
              styles.progressCard,
              { backgroundColor: colors.cardBg, borderColor: colors.border },
            ]}
          >
            <ActivityIndicator size="large" color={colors.primaryLight} />
            <Text style={[styles.progressTitle, { color: colors.textPrimary }]}>
              Uniendo Documentos
            </Text>
            <Text style={[styles.progressSubtitle, { color: colors.textSecondary }]}>
              {mergeProgressText}
            </Text>
          </View>
        </View>
      </Modal>

      {/* History Selection Modal */}
      <Modal
        visible={isHistoryModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setIsHistoryModalVisible(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.historyModalOverlay}
        >
          <View
            style={[
              styles.historyModalContent,
              { backgroundColor: colors.cardBg, borderColor: colors.border },
            ]}
          >
            {/* Modal Header */}
            <View style={styles.historyModalHeader}>
              <View>
                <Text style={[styles.historyModalTitle, { color: colors.textPrimary }]}>
                  Documentos del Historial
                </Text>
                <Text style={[styles.historyModalSub, { color: colors.textSecondary }]}>
                  {tempCheckedIds.size} seleccionados
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => setIsHistoryModalVisible(false)}
                style={styles.closeModalBtn}
              >
                <Ionicons name="close" size={24} color={colors.textPrimary} />
              </TouchableOpacity>
            </View>

            {/* Search */}
            <View
              style={[
                styles.historySearchBox,
                { backgroundColor: colors.cardBgElevated, borderColor: colors.border },
              ]}
            >
              <Ionicons name="search" size={18} color={colors.textMuted} />
              <TextInput
                style={[styles.historySearchInput, { color: colors.textPrimary }]}
                placeholder="Buscar por nombre..."
                placeholderTextColor={colors.textMuted}
                value={historySearch}
                onChangeText={setHistorySearch}
              />
              {historySearch.length > 0 && (
                <TouchableOpacity onPress={() => setHistorySearch('')}>
                  <Ionicons name="close-circle" size={18} color={colors.textMuted} />
                </TouchableOpacity>
              )}
            </View>

            {/* History List */}
            {filteredHistory.length === 0 ? (
              <View style={styles.historyEmpty}>
                <Ionicons name="document-text-outline" size={44} color={colors.textMuted} />
                <Text style={[styles.historyEmptyText, { color: colors.textSecondary }]}>
                  No hay documentos en el historial
                </Text>
              </View>
            ) : (
              <FlatList
                data={filteredHistory}
                keyExtractor={(doc) => doc.id}
                style={styles.historyFlatList}
                renderItem={({ item }) => {
                  const isChecked = tempCheckedIds.has(item.id);
                  return (
                    <TouchableOpacity
                      style={[
                        styles.historyItemRow,
                        { borderColor: colors.border },
                        isChecked && { backgroundColor: colors.primaryGlow },
                      ]}
                      onPress={() => toggleHistoryItem(item.id)}
                      activeOpacity={0.7}
                    >
                      <Ionicons
                        name={isChecked ? 'checkbox' : 'square-outline'}
                        size={22}
                        color={isChecked ? colors.primaryLight : colors.textMuted}
                      />
                      <View style={styles.historyItemInfo}>
                        <Text
                          style={[styles.historyItemTitle, { color: colors.textPrimary }]}
                          numberOfLines={1}
                        >
                          {item.title}
                        </Text>
                        <Text
                          style={[styles.historyItemMeta, { color: colors.textSecondary }]}
                        >
                          {item.pageCount} pág. • {formatFileSize(item.fileSize)}
                        </Text>
                      </View>
                    </TouchableOpacity>
                  );
                }}
              />
            )}

            {/* Modal Actions */}
            <View style={styles.historyModalFooter}>
              <TouchableOpacity
                style={[styles.modalSecondaryBtn, { borderColor: colors.border }]}
                onPress={() => {
                  if (tempCheckedIds.size === filteredHistory.length) {
                    setTempCheckedIds(new Set());
                  } else {
                    setTempCheckedIds(new Set(filteredHistory.map((d) => d.id)));
                  }
                }}
              >
                <Text style={[styles.modalSecondaryBtnText, { color: colors.textPrimary }]}>
                  {tempCheckedIds.size === filteredHistory.length
                    ? 'Deseleccionar todos'
                    : 'Seleccionar todos'}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.modalPrimaryBtn, { backgroundColor: colors.primary }]}
                onPress={handleConfirmHistorySelection}
              >
                <Text style={styles.modalPrimaryBtnText}>
                  Añadir ({tempCheckedIds.size})
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
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    paddingHorizontal: SPACING.md,
  },
  sourceSelectorRow: {
    flexDirection: 'row',
    gap: SPACING.sm,
    marginTop: SPACING.sm,
    marginBottom: SPACING.sm,
  },
  sourceButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    padding: SPACING.sm + 2,
    borderRadius: RADIUS.md,
    borderWidth: 1,
  },
  sourceIconBadge: {
    width: 38,
    height: 38,
    borderRadius: RADIUS.sm,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: SPACING.sm,
  },
  sourceButtonTexts: {
    flex: 1,
  },
  sourceButtonTitle: {
    fontSize: 13,
    fontWeight: '700',
  },
  sourceButtonSub: {
    fontSize: 11,
    marginTop: 1,
  },
  titleBox: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    marginBottom: SPACING.sm,
  },
  titleInputContainer: {
    flex: 1,
    marginLeft: SPACING.sm,
  },
  titleInputLabel: {
    fontSize: 10,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  titleTextInput: {
    fontSize: 14,
    fontWeight: '600',
    paddingVertical: 2,
  },
  listSectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginVertical: SPACING.xs,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  sectionSubtitle: {
    fontSize: 12,
    fontWeight: '600',
  },
  listContent: {
    paddingBottom: 90,
  },
  itemCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: SPACING.sm + 2,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    marginBottom: SPACING.sm,
  },
  indexBadge: {
    width: 28,
    height: 28,
    borderRadius: RADIUS.full,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: SPACING.sm,
  },
  indexText: {
    fontSize: 13,
    fontWeight: '800',
  },
  itemDetails: {
    flex: 1,
    marginRight: SPACING.sm,
  },
  itemTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  itemTitle: {
    fontSize: 14,
    fontWeight: '600',
  },
  itemMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 3,
    gap: 6,
  },
  sourcePill: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  sourcePillText: {
    fontSize: 10,
    fontWeight: '700',
  },
  itemMetaText: {
    fontSize: 11,
  },
  actionsColumn: {
    alignItems: 'center',
    gap: 6,
  },
  reorderRow: {
    flexDirection: 'row',
    gap: 4,
  },
  reorderBtn: {
    padding: 5,
    borderRadius: 6,
  },
  reorderBtnDisabled: {
    opacity: 0.25,
  },
  removeBtn: {
    padding: 4,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: SPACING.xl,
    paddingBottom: 60,
  },
  emptyIconCircle: {
    width: 90,
    height: 90,
    borderRadius: 45,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  emptyTitle: {
    fontSize: 17,
    fontWeight: '700',
    marginBottom: SPACING.xs,
  },
  emptySubtitle: {
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 19,
  },
  footerContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: SPACING.md,
    borderTopWidth: 1,
  },
  mergeSubmitButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: SPACING.md,
    borderRadius: RADIUS.md,
    gap: SPACING.sm,
  },
  mergeSubmitButtonText: {
    fontSize: 15,
    fontWeight: '700',
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: SPACING.lg,
  },
  progressCard: {
    width: '85%',
    padding: SPACING.xl,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    alignItems: 'center',
    gap: SPACING.md,
  },
  progressTitle: {
    fontSize: 16,
    fontWeight: '700',
  },
  progressSubtitle: {
    fontSize: 13,
    textAlign: 'center',
  },
  historyModalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
  },
  historyModalContent: {
    height: '75%',
    borderTopLeftRadius: RADIUS.lg,
    borderTopRightRadius: RADIUS.lg,
    borderTopWidth: 1,
    padding: SPACING.md,
  },
  historyModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  historyModalTitle: {
    fontSize: 17,
    fontWeight: '700',
  },
  historyModalSub: {
    fontSize: 12,
    marginTop: 2,
  },
  closeModalBtn: {
    padding: SPACING.xs,
  },
  historySearchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.sm,
    paddingVertical: 8,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    marginBottom: SPACING.sm,
    gap: SPACING.xs,
  },
  historySearchInput: {
    flex: 1,
    fontSize: 14,
  },
  historyFlatList: {
    flex: 1,
  },
  historyEmpty: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  historyEmptyText: {
    fontSize: 14,
  },
  historyItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.sm,
    borderRadius: RADIUS.sm,
    borderBottomWidth: 1,
    gap: SPACING.sm,
  },
  historyItemInfo: {
    flex: 1,
  },
  historyItemTitle: {
    fontSize: 14,
    fontWeight: '600',
  },
  historyItemMeta: {
    fontSize: 12,
    marginTop: 2,
  },
  historyModalFooter: {
    flexDirection: 'row',
    paddingTop: SPACING.sm,
    gap: SPACING.sm,
  },
  modalSecondaryBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalSecondaryBtnText: {
    fontSize: 12,
    fontWeight: '600',
  },
  modalPrimaryBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: RADIUS.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalPrimaryBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFF',
  },
});
