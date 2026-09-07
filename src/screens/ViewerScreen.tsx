import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  Platform,
  StatusBar,
} from 'react-native';
import * as IntentLauncher from 'expo-intent-launcher';
import * as FileSystem from 'expo-file-system/legacy';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { SavedPDFDocument, RootStackParamList } from '../types';
import { formatFileSize, sharePDFDocument, deletePDFDocument } from '../utils/storage';
import { Header } from '../components/Header';
import { useTheme } from '../contexts/ThemeContext';

type NavigationProp = NativeStackNavigationProp<RootStackParamList, 'Viewer'>;
type ViewerRouteProp = RouteProp<RootStackParamList, 'Viewer'>;

export const ViewerScreen: React.FC = () => {
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<ViewerRouteProp>();
  const { colors, isDark } = useTheme();

  const doc: SavedPDFDocument = route.params.pdfDoc;

  const handleShare = async () => {
    await sharePDFDocument(doc.uri);
  };

  const handleViewPDF = async () => {
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
      console.error('Error opening PDF:', error);
      Alert.alert('Error', 'No se encontró una aplicación para abrir el PDF.');
    }
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
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />
      <Header
        title="Documento PDF Creado"
        onBack={() => navigation.navigate('Home')}
      />

      <ScrollView contentContainerStyle={styles.container}>
        {/* Success Card */}
        <View style={[styles.successCard, { backgroundColor: colors.cardBg, borderColor: colors.border }]}>
          <View style={styles.iconCircle}>
            <Ionicons name="checkmark-circle" size={48} color={colors.primary} />
          </View>
          <Text style={[styles.successTitle, { color: colors.textPrimary }]}>¡PDF Generado con Éxito!</Text>
          <Text style={[styles.successSubtitle, { color: colors.textSecondary }]}>
            Tu documento ha sido procesado y guardado localmente sin marcas de agua.
          </Text>
        </View>

        {/* Document Metadata Card */}
        <View style={[styles.detailsCard, { backgroundColor: colors.cardBg, borderColor: colors.border }]}>
          <View style={styles.docHeaderRow}>
            <Ionicons name="document-text" size={32} color={colors.primary} />
            <View style={styles.docTitleGroup}>
              <Text style={[styles.docTitle, { color: colors.textPrimary }]} numberOfLines={1}>
                {doc.title}
              </Text>
              <Text style={[styles.docDate, { color: colors.textSecondary }]}>{formattedDate}</Text>
            </View>
          </View>

          <View style={[styles.divider, { backgroundColor: colors.border }]} />

          <View style={styles.statsGrid}>
            <View style={styles.statBox}>
              <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Páginas</Text>
              <Text style={[styles.statValue, { color: colors.primary }]}>{doc.pageCount}</Text>
            </View>

            <View style={styles.statBox}>
              <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Tamaño</Text>
              <Text style={[styles.statValue, { color: colors.primary }]}>{formatFileSize(doc.fileSize)}</Text>
            </View>

            <View style={styles.statBox}>
              <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Formato</Text>
              <Text style={[styles.statValue, { color: colors.primary }]}>PDF Nativo</Text>
            </View>
          </View>
        </View>

        {/* Main Action Buttons */}
        <View style={styles.actionsContainer}>
          {/* View PDF Button */}
          <TouchableOpacity
            style={[styles.bigActionBtn, { backgroundColor: colors.primaryDark }]}
            onPress={handleViewPDF}
            activeOpacity={0.85}
          >
            <Ionicons name="eye-outline" size={24} color="#FFF" />
            <Text style={styles.bigActionBtnText}>Abrir y Ver PDF</Text>
          </TouchableOpacity>

          {/* Share Button */}
          <TouchableOpacity
            style={[styles.bigActionBtn, { backgroundColor: colors.primary }]}
            onPress={handleShare}
            activeOpacity={0.85}
          >
            <Ionicons name="share-social" size={24} color="#FFF" />
            <Text style={styles.bigActionBtnText}>Compartir PDF</Text>
          </TouchableOpacity>

          {/* Delete Button */}
          <TouchableOpacity
            style={[
              styles.bigActionBtn, 
              { 
                backgroundColor: isDark ? '#1C1C1E' : '#FFF', 
                borderWidth: 1.5, 
                borderColor: '#EF4444',
                elevation: 0,
              }
            ]}
            onPress={handleDelete}
            activeOpacity={0.85}
          >
            <Ionicons name="trash-outline" size={20} color="#EF4444" />
            <Text style={[styles.deleteBtnText, { color: '#EF4444' }]}>Eliminar Documento</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* Back to Home Footer */}
      <View style={[styles.footer, { backgroundColor: colors.cardBg, borderTopColor: colors.border }]}>
        <TouchableOpacity
          style={[
            styles.homeBtn, 
            { 
              backgroundColor: colors.background, 
              borderColor: isDark ? '#EF4444' : colors.border 
            }
          ]}
          onPress={() => navigation.navigate('Home')}
          activeOpacity={0.85}
        >
          <Ionicons name="home-outline" size={20} color={isDark ? '#FFF' : colors.textPrimary} />
          <Text style={[styles.homeBtnText, { color: isDark ? '#FFF' : colors.textPrimary }]}>Volver al Inicio</Text>
        </TouchableOpacity>
      </View>
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
});
