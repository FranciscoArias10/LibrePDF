import { PDFDocument } from 'pdf-lib';
import * as FileSystem from 'expo-file-system/legacy';
import { SavedPDFDocument } from '../types';
import { savePDFDocument } from './storage';
import { generateDefaultDocumentTitle } from '../constants/theme';

export interface MergeSourceItem {
  id: string;
  title: string;
  uri: string;
  pageCount?: number;
  fileSize?: number;
  source: 'history' | 'device';
}

/**
 * Reads a PDF file as Base64 string from local file://, content://, or scoped storage.
 * Handles Expo Go permission restrictions on Android DocumentPicker cache by falling back
 * to React Native's ContentResolver-backed fetch/blob reader.
 */
export async function readPDFBase64(uri: string): Promise<string> {
  // 1. Try standard Expo FileSystem first (works for files in documentDirectory)
  try {
    const base64 = await FileSystem.readAsStringAsync(uri, {
      encoding: FileSystem.EncodingType.Base64,
    });
    return base64;
  } catch (fsErr: any) {
    // In Expo Go on Android, DocumentPicker files are placed in host cache which FileSystem blocks.
    // Fall back to React Native's ContentResolver-backed fetch/blob
  }

  // 2. Fallback: fetch + blob + FileReader (ContentResolver bypasses Expo Go path sandbox)
  try {
    const response = await fetch(uri);
    const blob = await response.blob();
    return await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        if (typeof reader.result === 'string') {
          const commaIndex = reader.result.indexOf(',');
          const base64 =
            commaIndex !== -1 ? reader.result.substring(commaIndex + 1) : reader.result;
          resolve(base64);
        } else {
          reject(new Error('No se pudo convertir el PDF a Base64.'));
        }
      };
      reader.onerror = (e) => reject(e);
      reader.readAsDataURL(blob);
    });
  } catch (fetchErr: any) {
    console.error(`[readPDFBase64] Fetch fallback also failed for ${uri}:`, fetchErr);
    throw new Error(`No se pudo leer el archivo PDF: ${fetchErr?.message || 'Permiso denegado'}`);
  }
}

/**
 * Reads a PDF file from a URI and returns its page count
 */
export async function getPDFPageCount(uri: string): Promise<number> {
  try {
    const base64 = await readPDFBase64(uri);
    const doc = await PDFDocument.load(base64, { ignoreEncryption: true });
    return doc.getPageCount();
  } catch (error) {
    console.warn(`Could not read page count for ${uri}:`, error);
    return 1;
  }
}

/**
 * Safely copies an external PDF (from DocumentPicker or external storage) into LibrePDF's
 * internal persistent document directory so it is fully accessible to all modules and preserved.
 */
export async function importExternalPDFToLocalStorage(
  uri: string,
  originalName: string
): Promise<{ localUri: string; pageCount: number; fileSize: number }> {
  const base64Data = await readPDFBase64(uri);
  const doc = await PDFDocument.load(base64Data, { ignoreEncryption: true });
  const pageCount = doc.getPageCount();

  const cleanName = (originalName || 'documento.pdf').replace(/[^a-zA-Z0-9._-]/g, '_');
  const targetDir = `${FileSystem.documentDirectory}imported_pdfs/`;

  const dirInfo = await FileSystem.getInfoAsync(targetDir);
  if (!dirInfo.exists) {
    await FileSystem.makeDirectoryAsync(targetDir, { intermediates: true });
  }

  const localUri = `${targetDir}${Date.now()}_${cleanName}`;
  await FileSystem.writeAsStringAsync(localUri, base64Data, {
    encoding: FileSystem.EncodingType.Base64,
  });

  const fileInfo = await FileSystem.getInfoAsync(localUri);
  const fileSize =
    fileInfo.exists && 'size' in fileInfo
      ? fileInfo.size
      : Math.round(base64Data.length * 0.75);

  return { localUri, pageCount, fileSize };
}

/**
 * Merges multiple PDF files in the specified order and saves the consolidated document
 * into LibrePDF's permanent storage.
 */
export async function mergePDFDocuments(
  sources: MergeSourceItem[],
  outputTitle: string,
  onProgress?: (current: number, total: number) => void
): Promise<SavedPDFDocument> {
  if (!sources || sources.length < 2) {
    throw new Error('Se requieren al menos 2 documentos para combinar.');
  }

  const mergedPdf = await PDFDocument.create();
  let totalPageCount = 0;

  for (let i = 0; i < sources.length; i++) {
    const item = sources[i];
    if (onProgress) {
      onProgress(i + 1, sources.length);
    }

    try {
      const base64Data = await readPDFBase64(item.uri);

      const loadedPdf = await PDFDocument.load(base64Data, {
        ignoreEncryption: true,
      });

      const pageIndices = loadedPdf.getPageIndices();
      const copiedPages = await mergedPdf.copyPages(loadedPdf, pageIndices);

      copiedPages.forEach((page) => {
        mergedPdf.addPage(page);
        totalPageCount++;
      });
    } catch (err: any) {
      console.error(`Error loading PDF for merge (${item.title}):`, err);
      throw new Error(
        `Error al procesar "${item.title}": ${err?.message || 'Archivo dañado o no soportado'}`
      );
    }
  }

  const cleanTitle = outputTitle.trim() || `Unido_${generateDefaultDocumentTitle()}`;
  mergedPdf.setTitle(cleanTitle);
  mergedPdf.setCreator('LibrePDF');
  mergedPdf.setProducer('LibrePDF Scanner');

  const finalBase64 = await mergedPdf.saveAsBase64();

  // Save using LibrePDF's storage pipeline
  const savedDocument = await savePDFDocument(
    '',
    finalBase64,
    cleanTitle,
    totalPageCount
  );

  return savedDocument;
}
