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
 * Reads a PDF file from a local URI and returns its page count
 */
export async function getPDFPageCount(uri: string): Promise<number> {
  try {
    const base64 = await FileSystem.readAsStringAsync(uri, {
      encoding: FileSystem.EncodingType.Base64,
    });
    const doc = await PDFDocument.load(base64, { ignoreEncryption: true });
    return doc.getPageCount();
  } catch (error) {
    console.warn(`Could not read page count for ${uri}:`, error);
    return 1;
  }
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
      const base64Data = await FileSystem.readAsStringAsync(item.uri, {
        encoding: FileSystem.EncodingType.Base64,
      });

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
