import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  Alert,
  ScrollView,
} from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { SavedPDFDocument, RootStackParamList } from '../types';
import { formatFileSize, sharePDFDocument, deletePDFDocument } from '../utils/storage';
import { Header } from '../components/Header';
import { COLORS, SPACING, RADIUS } from '../constants/theme';

type NavigationProp = NativeStackNavigationProp<RootStackParamList, 'Viewer'>;
type ViewerRouteProp = RouteProp<RootStackParamList, 'Viewer'>;

export const ViewerScreen: React.FC = () => {
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<ViewerRouteProp>();

  const doc: SavedPDFDocument = route.params.pdfDoc;

  const handleShare = async () => {
    await sharePDFDocument(doc.uri);
  };

  const handleDelete = () => {
    Alert.alert(
      'Eliminar PDF',
      `¿Deseas eliminar "${doc.title}"?`,
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
    <SafeAreaView style={styles.safeArea}>
      <Header
        title="Documento PDF Creado"
        showBack
        onBack={() => navigation.navigate('Home')}
      />

      <ScrollView contentContainerStyle={styles.container}>
        {/* Success Card */}
        <View style={styles.successCard}>
          <View style={styles.iconCircle}>
            <Ionicons name="checkmark-circle" size={48} color={COLORS.primaryLight} />
          </View>
          <Text style={styles.successTitle}>¡PDF Generado con Éxito!</Text>
          <Text style={styles.successSubtitle}>
            Tu documento ha sido procesado y guardado localmente sin marcas de agua.
          </Text>
        </View>

        {/* Document Metadata Card */}
        <View style={styles.detailsCard}>
          <View style={styles.docHeaderRow}>
            <Ionicons name="document-text" size={32} color={COLORS.primaryLight} />
            <View style={styles.docTitleGroup}>
              <Text style={styles.docTitle} numberOfLines={1}>
                {doc.title}
              </Text>
              <Text style={styles.docDate}>{formattedDate}</Text>
            </View>
          </View>

          <View style={styles.divider} />

          <View style={styles.statsGrid}>
            <View style={styles.statBox}>
              <Text style={styles.statLabel}>Páginas</Text>
              <Text style={styles.statValue}>{doc.pageCount}</Text>
            </View>

            <View style={styles.statBox}>
              <Text style={styles.statLabel}>Tamaño</Text>
              <Text style={styles.statValue}>{formatFileSize(doc.fileSize)}</Text>
            </View>

            <View style={styles.statBox}>
              <Text style={styles.statLabel}>Formato</Text>
              <Text style={styles.statValue}>PDF Nactivo</Text>
            </View>
          </View>
        </View>

        {/* Main Action Buttons */}
        <View style={styles.actionsContainer}>
          {/* Share Button */}
          <TouchableOpacity
            style={[styles.bigActionBtn, styles.shareBtn]}
            onPress={handleShare}
            activeOpacity={0.85}
          >
            <Ionicons name="share-social" size={24} color="#FFF" />
            <Text style={styles.bigActionBtnText}>Compartir PDF (WhatsApp / Email)</Text>
          </TouchableOpacity>

          {/* Delete Button */}
          <TouchableOpacity
            style={[styles.bigActionBtn, styles.deleteBtn]}
            onPress={handleDelete}
            activeOpacity={0.85}
          >
            <Ionicons name="trash-outline" size={20} color={COLORS.accentRed} />
            <Text style={styles.deleteBtnText}>Eliminar Documento</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* Back to Home Footer */}
      <View style={styles.footer}>
        <TouchableOpacity
          style={styles.homeBtn}
          onPress={() => navigation.navigate('Home')}
          activeOpacity={0.85}
        >
          <Ionicons name="home-outline" size={20} color={COLORS.textPrimary} />
          <Text style={styles.homeBtnText}>Volver al Inicio</Text>
        </TouchableOpacity>
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
    padding: SPACING.md,
    paddingBottom: SPACING.xl,
  },
  successCard: {
    backgroundColor: COLORS.cardBg,
    borderRadius: RADIUS.lg,
    padding: SPACING.lg,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: SPACING.md,
  },
  iconCircle: {
    marginBottom: SPACING.sm,
  },
  successTitle: {
    color: COLORS.textPrimary,
    fontSize: 20,
    fontWeight: '800',
    marginBottom: 6,
    textAlign: 'center',
  },
  successSubtitle: {
    color: COLORS.textSecondary,
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 18,
  },
  detailsCard: {
    backgroundColor: COLORS.cardBg,
    borderRadius: RADIUS.md,
    padding: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: SPACING.lg,
  },
  docHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm + 4,
  },
  docTitleGroup: {
    flex: 1,
  },
  docTitle: {
    color: COLORS.textPrimary,
    fontSize: 16,
    fontWeight: '700',
  },
  docDate: {
    color: COLORS.textMuted,
    fontSize: 12,
    marginTop: 2,
  },
  divider: {
    height: 1,
    backgroundColor: COLORS.border,
    marginVertical: SPACING.md,
  },
  statsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  statBox: {
    alignItems: 'center',
    flex: 1,
  },
  statLabel: {
    color: COLORS.textMuted,
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'uppercase',
    marginBottom: 2,
  },
  statValue: {
    color: COLORS.primaryLight,
    fontSize: 14,
    fontWeight: '700',
  },
  actionsContainer: {
    gap: SPACING.md,
  },
  bigActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.sm + 2,
    paddingVertical: SPACING.md,
    borderRadius: RADIUS.md,
    elevation: 3,
  },
  shareBtn: {
    backgroundColor: COLORS.primary,
  },
  bigActionBtnText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '700',
  },
  deleteBtn: {
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.3)',
  },
  deleteBtnText: {
    color: COLORS.accentRed,
    fontSize: 15,
    fontWeight: '700',
  },
  footer: {
    padding: SPACING.md,
    backgroundColor: COLORS.cardBg,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  homeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.sm,
    backgroundColor: COLORS.cardBgElevated,
    paddingVertical: SPACING.md - 2,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  homeBtnText: {
    color: COLORS.textPrimary,
    fontSize: 15,
    fontWeight: '700',
  },
});
