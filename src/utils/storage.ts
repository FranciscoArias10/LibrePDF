import AsyncStorage from '@react-native-async-storage/async-storage';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import { SavedPDFDocument } from '../types';
import { generateDefaultDocumentTitle } from '../constants/theme';

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
  const cleanTitle = title?.trim() || generateDefaultDocumentTitle();
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
    // Fallback: Move temporary file to persistent directory
    await FileSystem.moveAsync({
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
 * Rename an existing PDF document in storage history
 */
export async function renamePDFDocument(id: string, newTitle: string): Promise<SavedPDFDocument | null> {
  try {
    const cleanTitle = newTitle.trim();
    if (!cleanTitle) return null;

    const list = await getSavedPDFs();
    let updatedDoc: SavedPDFDocument | null = null;

    const updatedList = list.map((doc) => {
      if (doc.id === id) {
        updatedDoc = { ...doc, title: cleanTitle };
        return updatedDoc;
      }
      return doc;
    });

    if (updatedDoc) {
      await AsyncStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify(updatedList));
    }
    return updatedDoc;
  } catch (error) {
    console.error('Error renaming PDF document:', error);
    return null;
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

const SAVED_SIGNATURE_KEY = '@librepdf_saved_signature_v1';

export interface SavedSignature {
  type: 'drawing' | 'image';
  data: string; // SVG markup or base64 image
  color?: string;
  createdAt: number;
}

/**
 * Get user's saved default signature from AsyncStorage
 */
export async function getSavedSignature(): Promise<SavedSignature | null> {
  try {
    const data = await AsyncStorage.getItem(SAVED_SIGNATURE_KEY);
    if (!data) return null;
    return JSON.parse(data);
  } catch (error) {
    console.error('Error reading saved signature:', error);
    return null;
  }
}

/**
 * Save user's default signature to AsyncStorage
 */
export async function saveSignature(signature: Omit<SavedSignature, 'createdAt'>): Promise<void> {
  try {
    const toSave: SavedSignature = {
      ...signature,
      createdAt: Date.now(),
    };
    await AsyncStorage.setItem(SAVED_SIGNATURE_KEY, JSON.stringify(toSave));
  } catch (error) {
    console.error('Error saving signature:', error);
  }
}

/**
 * Delete user's saved default signature
 */
export async function deleteSavedSignature(): Promise<void> {
  try {
    await AsyncStorage.removeItem(SAVED_SIGNATURE_KEY);
  } catch (error) {
    console.error('Error deleting saved signature:', error);
  }
}

