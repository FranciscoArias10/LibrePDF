import AsyncStorage from '@react-native-async-storage/async-storage';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import { SavedPDFDocument } from '../types';

const HISTORY_STORAGE_KEY = '@librepdf_saved_documents_v1';

/**
 * Get all saved PDF documents from local storage
 */
export async function getSavedPDFs(): Promise<SavedPDFDocument[]> {
  try {
    const data = await AsyncStorage.getItem(HISTORY_STORAGE_KEY);
    if (!data) return [];
    const list: SavedPDFDocument[] = JSON.parse(data);
    // Sort descending by creation date
    return list.sort((a, b) => b.createdAt - a.createdAt);
  } catch (error) {
    console.error('Error reading saved PDFs history:', error);
    return [];
  }
}

/**
 * Save a newly generated PDF to permanent storage and update history list
 */
export async function savePDFDocument(
  tempUri: string,
  base64Data: string | undefined,
  title: string,
  pageCount: number,
  thumbnailUri?: string
): Promise<SavedPDFDocument> {
  const documentId = `pdf_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const cleanTitle = title.trim() || 'Documento_Escaneado';
  const fileName = `${cleanTitle.replace(/[^a-zA-Z0-9_-]/g, '_')}_${Date.now()}.pdf`;

  const destFolder = `${FileSystem.documentDirectory}pdfs/`;

  // Ensure destination directory exists
  const dirInfo = await FileSystem.getInfoAsync(destFolder);
  if (!dirInfo.exists) {
    await FileSystem.makeDirectoryAsync(destFolder, { intermediates: true });
  }

  const destUri = `${destFolder}${fileName}`;

  if (base64Data) {
    // Write base64 string directly to persistent document directory
    await FileSystem.writeAsStringAsync(destUri, base64Data, {
      encoding: FileSystem.EncodingType.Base64,
    });
  } else {
    // Fallback if base64 is missing
    await FileSystem.copyAsync({
      from: tempUri,
      to: destUri,
    });
  }

  // Get file info (size)
  const fileStats = await FileSystem.getInfoAsync(destUri);
  const fileSize = fileStats.exists && 'size' in fileStats ? fileStats.size : 0;

  const newDoc: SavedPDFDocument = {
    id: documentId,
    title: cleanTitle,
    uri: destUri,
    fileSize,
    pageCount,
    createdAt: Date.now(),
    thumbnailUri,
  };

  // Update AsyncStorage list
  const currentList = await getSavedPDFs();
  const updatedList = [newDoc, ...currentList];
  await AsyncStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify(updatedList));

  return newDoc;
}

/**
 * Delete a PDF document from file system and history
 */
export async function deletePDFDocument(id: string): Promise<void> {
  try {
    const list = await getSavedPDFs();
    const targetDoc = list.find((doc) => doc.id === id);

    if (targetDoc) {
      // Delete file from filesystem if exists
      const fileInfo = await FileSystem.getInfoAsync(targetDoc.uri);
      if (fileInfo.exists) {
        await FileSystem.deleteAsync(targetDoc.uri, { idempotent: true });
      }
    }

    const updatedList = list.filter((doc) => doc.id !== id);
    await AsyncStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify(updatedList));
  } catch (error) {
    console.error('Error deleting PDF document:', error);
  }
}

/**
 * Share PDF document using Android/iOS native share sheet
 */
export async function sharePDFDocument(uri: string, mimeType: string = 'application/pdf'): Promise<boolean> {
  try {
    const isAvailable = await Sharing.isAvailableAsync();
    if (!isAvailable) {
      alert('Compartir no está disponible en este dispositivo');
      return false;
    }
    await Sharing.shareAsync(uri, {
      mimeType,
      dialogTitle: 'Compartir Documento PDF',
      UTI: 'com.adobe.pdf',
    });
    return true;
  } catch (error) {
    console.error('Error sharing PDF:', error);
    return false;
  }
}

/**
 * Format file size in human-readable string (KB, MB)
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}
