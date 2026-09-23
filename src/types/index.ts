export type ImageFilterType = 'original' | 'magic_color' | 'grayscale' | 'bw_contrast';

export interface ImageLayoutTransform {
  x: number; // percentage of canvas width
  y: number; // percentage of canvas height
  scale: number;
}

export interface SignatureStamp {
  id: string;
  type: 'drawing' | 'image';
  data: string; // SVG string if drawing, or file URI/base64 if image
  x: number; // percentage of page width (0 to 1)
  y: number; // percentage of page height (0 to 1)
  width: number; // percentage of page width (0 to 1)
  height: number; // percentage of page height (0 to 1)
  color?: string; // ink color if drawing
}

export interface PageImage {
  id: string;
  uri: string;
  originalUri: string;
  width: number;
  height: number;
  rotation: number; // 0, 90, 180, 270
  filter: ImageFilterType;
  layoutTransform?: ImageLayoutTransform;
  signature?: SignatureStamp;
}

export type PageSize = 'A4' | 'LETTER' | 'LEGAL' | 'FIT';
export type PageOrientation = 'portrait' | 'landscape';
export type PageMargin = 'none' | 'small' | 'medium' | 'large';

export interface PDFSettings {
  pageSize: PageSize;
  orientation: PageOrientation;
  margin: PageMargin;
  quality: number; // 0.1 to 1.0
  documentTitle: string;
  compressImages: boolean;
}

export interface SavedPDFDocument {
  id: string;
  title: string;
  uri: string;
  fileSize: number; // in bytes
  pageCount: number;
  createdAt: number; // timestamp
  thumbnailUri?: string;
}

export type RootStackParamList = {
  Home: undefined;
  Camera: { returnToEditor?: boolean } | undefined;
  Editor: { initialImages?: PageImage[]; appendedImages?: PageImage[] } | undefined;
  Viewer: { pdfDoc: SavedPDFDocument };
};
