export type ImageFilterType = 'original' | 'magic_color' | 'grayscale' | 'bw_contrast';

export interface PageImage {
  id: string;
  uri: string;
  originalUri: string;
  width: number;
  height: number;
  rotation: number; // 0, 90, 180, 270
  filter: ImageFilterType;
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
  Editor: { initialImages?: PageImage[] };
  Viewer: { pdfDoc: SavedPDFDocument };
};
