import * as Print from 'expo-print';
import { PDFDocument } from 'pdf-lib';
import * as FileSystem from 'expo-file-system/legacy';
import { PageImage, PDFSettings, PageOrientation } from '../types';
import { getBase64ImageUri, getCSSFilterStyle } from './imageProcessor';

/**
 * Returns margin padding in CSS pixels based on setting
 */
function getMarginPaddingCss(margin: PDFSettings['margin']): string {
  switch (margin) {
    case 'small':
      return '16px';
    case 'medium':
      return '32px';
    case 'large':
      return '48px';
    case 'none':
    default:
      return '0px';
  }
}

/**
 * Returns CSS @page size directive
 */
function getPageCssDirective(settings: PDFSettings): string {
  const orientation = settings.orientation === 'landscape' ? 'landscape' : 'portrait';
  switch (settings.pageSize) {
    case 'LETTER':
      return `letter ${orientation}`;
    case 'LEGAL':
      return `legal ${orientation}`;
    case 'A4':
    default:
      return `A4 ${orientation}`;
  }
}

/**
 * Helper to render an individual image page HTML element
 */
async function renderImageElementHTML(img: PageImage): Promise<string> {
  const base64Uri = await getBase64ImageUri(img.uri);
  const filterStyle = getCSSFilterStyle(img.filter);

  let transformCss = `rotate(${img.rotation}deg)`;
  if (img.layoutTransform) {
    const tx = img.layoutTransform.x * 100;
    const ty = img.layoutTransform.y * 100;
    const scale = img.layoutTransform.scale;
    transformCss = `translate(${tx}vw, ${ty}vh) scale(${scale}) ${transformCss}`;
  }

  let signatureHtml = '';
  if (img.signature) {
    const sig = img.signature;
    const left = (sig.x * 100).toFixed(2);
    const top = (sig.y * 100).toFixed(2);
    const width = (sig.width * 100).toFixed(2);
    const height = (sig.height * 100).toFixed(2);

    if (sig.type === 'drawing') {
      signatureHtml = `
        <div style="position: absolute; left: ${left}%; top: ${top}%; width: ${width}%; height: ${height}%; pointer-events: none; z-index: 10;">
          ${sig.data}
        </div>
      `;
    } else {
      const sigBase64 = await getBase64ImageUri(sig.data);
      signatureHtml = `
        <img 
          src="${sigBase64}" 
          style="position: absolute; left: ${left}%; top: ${top}%; width: ${width}%; height: ${height}%; object-fit: contain; mix-blend-mode: multiply; pointer-events: none; z-index: 10;" 
        />
      `;
    }
  }

  return `
    <div class="page">
      <img 
        src="${base64Uri}" 
        class="doc-img" 
        style="filter: ${filterStyle}; transform: ${transformCss};" 
      />
      ${signatureHtml}
    </div>
  `;
}

/**
 * Helper to build the full HTML document for a batch of pages sharing the same orientation
 */
function buildBatchHTML(
  settings: PDFSettings,
  orientation: PageOrientation,
  imageElementsHTML: string[]
): string {
  const paddingCss = getMarginPaddingCss(settings.margin);
  const pageCssSize = getPageCssDirective({ ...settings, orientation });

  return `
    <!DOCTYPE html>
    <html lang="es">
    <head>
      <meta charset="utf-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      <title>${settings.documentTitle || 'LibrePDF_Document'}</title>
      <style>
        @page {
          size: ${pageCssSize};
          margin: 0;
        }
        * {
          box-sizing: border-box;
          margin: 0;
          padding: 0;
        }
        html, body {
          width: 100%;
          height: 100%;
          background-color: #ffffff;
        }
        .page {
          width: 100vw;
          height: 100vh;
          position: relative;
          page-break-after: always;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: ${paddingCss};
          overflow: hidden;
        }
        .page:last-child {
          page-break-after: avoid;
        }
        .doc-img {
          max-width: 100%;
          max-height: 100%;
          object-fit: contain;
          display: block;
        }
      </style>
    </head>
    <body>
      ${imageElementsHTML.join('\n')}
    </body>
    </html>
  `;
}

/**
 * Renders a single batch of images with identical page orientation into a temporary PDF.
 */
async function generateBatchPDF(
  images: PageImage[],
  settings: PDFSettings,
  orientation: PageOrientation
): Promise<{ uri: string; base64: string }> {
  const imageElementsHTML = await Promise.all(images.map((img) => renderImageElementHTML(img)));
  const htmlContent = buildBatchHTML(settings, orientation, imageElementsHTML);

  const fileResult = await Print.printToFileAsync({
    html: htmlContent,
    base64: true,
  });

  return {
    uri: fileResult.uri,
    base64: fileResult.base64 || '',
  };
}

/**
 * Generates high quality PDF from selected array of page images,
 * with full native support for mixed page orientations (some pages portrait, some landscape).
 */
export async function generatePDF(
  images: PageImage[],
  settings: PDFSettings
): Promise<{ uri: string; base64?: string; pageCount: number }> {
  if (images.length === 0) {
    throw new Error('No hay imágenes para generar el PDF');
  }

  // Determine effective orientation for each image (page override or document default)
  const defaultOrientation = settings.orientation || 'portrait';
  const effectiveOrientations = images.map((img) => img.orientation || defaultOrientation);

  // Check if all pages share uniform orientation
  const isUniform = effectiveOrientations.every((o) => o === effectiveOrientations[0]);

  if (isUniform) {
    // Uniform document: generate in a single pass (fastest)
    const result = await generateBatchPDF(images, settings, effectiveOrientations[0]);
    return {
      uri: result.uri,
      base64: result.base64,
      pageCount: images.length,
    };
  }

  // Mixed orientations: partition consecutive pages of identical orientation into batches
  interface Batch {
    orientation: PageOrientation;
    images: PageImage[];
  }

  const batches: Batch[] = [];
  let currentBatch: Batch = {
    orientation: effectiveOrientations[0],
    images: [images[0]],
  };

  for (let i = 1; i < images.length; i++) {
    const o = effectiveOrientations[i];
    if (o === currentBatch.orientation) {
      currentBatch.images.push(images[i]);
    } else {
      batches.push(currentBatch);
      currentBatch = {
        orientation: o,
        images: [images[i]],
      };
    }
  }
  batches.push(currentBatch);

  // Render each batch to a temporary PDF
  const batchResults: { uri: string; base64: string }[] = [];
  for (const batch of batches) {
    const batchResult = await generateBatchPDF(batch.images, settings, batch.orientation);
    batchResults.push(batchResult);
  }

  // Merge the batch PDFs using pdf-lib (preserves distinct dimensions and orientations per page)
  const mergedPdf = await PDFDocument.create();
  for (const batchResult of batchResults) {
    const loadedDoc = await PDFDocument.load(batchResult.base64, { ignoreEncryption: true });
    const copiedPages = await mergedPdf.copyPages(loadedDoc, loadedDoc.getPageIndices());
    copiedPages.forEach((page) => mergedPdf.addPage(page));
  }

  const mergedBase64 = await mergedPdf.saveAsBase64();
  const tempUri = `${FileSystem.cacheDirectory}mixed_${Date.now()}.pdf`;
  await FileSystem.writeAsStringAsync(tempUri, mergedBase64, {
    encoding: FileSystem.EncodingType.Base64,
  });

  return {
    uri: tempUri,
    base64: mergedBase64,
    pageCount: images.length,
  };
}
