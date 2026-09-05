import * as Print from 'expo-print';
import { PageImage, PDFSettings } from '../types';
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
 * Generates high quality PDF from selected array of page images
 */
export async function generatePDF(
  images: PageImage[],
  settings: PDFSettings
): Promise<{ uri: string; base64?: string; pageCount: number }> {
  if (images.length === 0) {
    throw new Error('No hay imágenes para generar el PDF');
  }

  // Convert images to Base64 in parallel for reliable local html printing
  const imageElementsHTMLPromises = images.map(async (img) => {
    const base64Uri = await getBase64ImageUri(img.uri);
    const filterStyle = getCSSFilterStyle(img.filter);

    return `
      <div class="page">
        <img 
          src="${base64Uri}" 
          class="doc-img" 
          style="filter: ${filterStyle}; transform: rotate(${img.rotation}deg);" 
        />
      </div>
    `;
  });

  const imagePagesHTML = (await Promise.all(imageElementsHTMLPromises)).join('\n');
  const paddingCss = getMarginPaddingCss(settings.margin);
  const pageCssSize = getPageCssDirective(settings);

  const htmlContent = `
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
      ${imagePagesHTML}
    </body>
    </html>
  `;

  // Use expo-print to render PDF to temporary file
  const fileResult = await Print.printToFileAsync({
    html: htmlContent,
    base64: true,
  });

  return {
    uri: fileResult.uri,
    base64: fileResult.base64,
    pageCount: images.length,
  };
}
