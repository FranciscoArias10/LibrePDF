import * as ImageManipulator from 'expo-image-manipulator';
import * as FileSystem from 'expo-file-system';
import { PageImage, ImageFilterType } from '../types';

/**
 * Rotates an image by 90 degrees clockwise
 */
export async function rotateImage(image: PageImage): Promise<PageImage> {
  const newRotation = (image.rotation + 90) % 360;

  try {
    const manipResult = await ImageManipulator.manipulateAsync(
      image.originalUri,
      [{ rotate: 90 }],
      { compress: 0.9, format: ImageManipulator.SaveFormat.JPEG }
    );

    return {
      ...image,
      uri: manipResult.uri,
      originalUri: manipResult.uri, // update original URI to current rotated state
      rotation: 0, // reset rotation index after native manipulation
      width: manipResult.width,
      height: manipResult.height,
    };
  } catch (error) {
    console.error('Error rotating image:', error);
    return {
      ...image,
      rotation: newRotation,
    };
  }
}

/**
 * Applies selected filter to image
 */
export function applyFilterToImage(image: PageImage, filter: ImageFilterType): PageImage {
  return {
    ...image,
    filter,
  };
}

/**
 * Converts image file URI to base64 string for embedding in PDF HTML template
 */
export async function getBase64ImageUri(fileUri: string): Promise<string> {
  try {
    const base64 = await FileSystem.readAsStringAsync(fileUri, {
      encoding: FileSystem.EncodingType.Base64,
    });
    return `data:image/jpeg;base64,${base64}`;
  } catch (error) {
    console.error('Error converting image to base64:', error);
    return fileUri;
  }
}

/**
 * CSS filter strings based on CamScanner preset filter types
 */
export function getCSSFilterStyle(filter: ImageFilterType): string {
  switch (filter) {
    case 'magic_color':
      return 'contrast(125%) brightness(110%) saturate(130%)';
    case 'grayscale':
      return 'grayscale(100%) contrast(110%)';
    case 'bw_contrast':
      return 'grayscale(100%) contrast(220%) brightness(95%)';
    case 'original':
    default:
      return 'none';
  }
}
