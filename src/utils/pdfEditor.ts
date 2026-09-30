import { PDFDocument, degrees } from 'pdf-lib';
import * as FileSystem from 'expo-file-system/legacy';
import * as ImageManipulator from 'expo-image-manipulator';
import * as base64js from 'base64-js';
import { SavedPDFDocument, EditablePDFPage } from '../types';
import { readPDFBase64 } from './pdfMerger';
import { savePDFDocument, updatePDFDocument } from './storage';

export interface SavePDFEditOptions {
  originalDoc: SavedPDFDocument;
  pages: EditablePDFPage[];
  newTitle: string;
  mode: 'overwrite' | 'new_copy';
}

/**
 * Applies page additions, removals, rotations, and reordering to a PDF document.
 * - Existing pages are copied losslessly using pdf-lib (vector quality and text preserved).
 * - New images from Camera or Gallery are embedded directly as crisp PDF pages.
 * - Supports in-place overwrite or saving as a new copy in storage history.
 */
export async function saveEditedPDF(
  options: SavePDFEditOptions,
  onProgress?: (progressText: string) => void
): Promise<SavedPDFDocument> {
  const { originalDoc, pages, newTitle, mode } = options;

  if (!pages || pages.length === 0) {
    throw new Error('El documento debe tener al menos una página.');
  }

  onProgress?.('Cargando documento original...');

  // 1. Read and load original PDF
  const originalBase64 = await readPDFBase64(originalDoc.uri);
  const loadedOrigPdf = await PDFDocument.load(originalBase64, {
    ignoreEncryption: true,
  });

  // 2. Create the target consolidated PDF
  const finalPdf = await PDFDocument.create();

  // 3. Process each page in user-defined order
  for (let i = 0; i < pages.length; i++) {
    const pageItem = pages[i];
    onProgress?.(`Procesando página ${i + 1} de ${pages.length}...`);

    if (pageItem.type === 'existing') {
      // Copy lossless page from original PDF
      const [copiedPage] = await finalPdf.copyPages(loadedOrigPdf, [
        pageItem.originalPageIndex,
      ]);

      if (pageItem.rotation) {
        const currentAngle = copiedPage.getRotation().angle || 0;
        copiedPage.setRotation(degrees((currentAngle + pageItem.rotation) % 360));
      }

      finalPdf.addPage(copiedPage);
    } else if (pageItem.type === 'new_image' && pageItem.imageUri) {
      // Embed new photo/image
      try {
        // Optimize and ensure clean JPEG format
        const manipResult = await ImageManipulator.manipulateAsync(
          pageItem.imageUri,
          [],
          {
            compress: 0.88,
            format: ImageManipulator.SaveFormat.JPEG,
            base64: true,
          }
        );

        let imgBytes: Uint8Array;
        if (manipResult.base64) {
          imgBytes = base64js.toByteArray(manipResult.base64);
        } else {
          const rawBase64 = await FileSystem.readAsStringAsync(manipResult.uri, {
            encoding: FileSystem.EncodingType.Base64,
          });
          imgBytes = base64js.toByteArray(rawBase64);
        }

        const embeddedImage = await finalPdf.embedJpg(imgBytes);
        const newPage = finalPdf.addPage([embeddedImage.width, embeddedImage.height]);

        newPage.drawImage(embeddedImage, {
          x: 0,
          y: 0,
          width: embeddedImage.width,
          height: embeddedImage.height,
        });

        if (pageItem.rotation) {
          newPage.setRotation(degrees(pageItem.rotation % 360));
        }
      } catch (imgErr: any) {
        console.error(`Error embedding new page image (${pageItem.id}):`, imgErr);
        throw new Error(
          `No se pudo procesar la nueva imagen agregada: ${imgErr?.message || 'Formato no soportado'}`
        );
      }
    }
  }

  onProgress?.('Generando archivo final...');

  const cleanTitle = newTitle.trim() || originalDoc.title;
  finalPdf.setTitle(cleanTitle);
  finalPdf.setCreator('LibrePDF');
  finalPdf.setProducer('LibrePDF Editor');

  const finalBase64 = await finalPdf.saveAsBase64();

  if (mode === 'overwrite') {
    onProgress?.('Actualizando documento en historial...');
    const updated = await updatePDFDocument(
      originalDoc.id,
      finalBase64,
      pages.length,
      cleanTitle
    );

    if (!updated) {
      // Fallback: if document not found in history, save as new
      return await savePDFDocument('', finalBase64, cleanTitle, pages.length);
    }
    return updated;
  } else {
    onProgress?.('Guardando nuevo documento...');
    return await savePDFDocument('', finalBase64, cleanTitle, pages.length);
  }
}
