import React, { useEffect, useRef } from 'react';
import { View, StyleSheet } from 'react-native';
import { WebView, WebViewMessageEvent } from 'react-native-webview';
import * as FileSystem from 'expo-file-system/legacy';

interface PDFThumbnailGeneratorProps {
  pdfUri: string;
  onThumbnail: (pageIndex: number, dataUrl: string) => void;
  onComplete?: () => void;
  onError?: (err: string) => void;
}

export const PDFThumbnailGenerator: React.FC<PDFThumbnailGeneratorProps> = ({
  pdfUri,
  onThumbnail,
  onComplete,
  onError,
}) => {
  const webViewRef = useRef<WebView>(null);
  const isStartedRef = useRef(false);

  useEffect(() => {
    isStartedRef.current = false;
  }, [pdfUri]);

  const sendDocument = async () => {
    if (isStartedRef.current) return;
    try {
      const fileInfo = await FileSystem.getInfoAsync(pdfUri);
      if (!fileInfo.exists) {
        onError?.('El archivo PDF no existe en el almacenamiento.');
        return;
      }

      const base64 = await FileSystem.readAsStringAsync(pdfUri, {
        encoding: FileSystem.EncodingType.Base64,
      });

      isStartedRef.current = true;
      webViewRef.current?.postMessage(
        JSON.stringify({
          type: 'LOAD_DOCUMENT',
          base64,
        })
      );
    } catch (err: any) {
      console.error('Error reading PDF for thumbnail generator:', err);
      onError?.(err?.message || 'Error al leer el archivo PDF.');
    }
  };

  const handleMessage = (event: WebViewMessageEvent) => {
    try {
      const data = JSON.parse(event.nativeEvent.data);
      switch (data.type) {
        case 'READY':
          sendDocument();
          break;
        case 'THUMBNAIL':
          if (typeof data.pageIndex === 'number' && data.dataUrl) {
            onThumbnail(data.pageIndex, data.dataUrl);
          }
          break;
        case 'DONE':
          onComplete?.();
          break;
        case 'ERROR':
          console.warn('PDF Thumbnail WebView error:', data.message);
          onError?.(data.message);
          break;
      }
    } catch (err) {
      console.error('Failed to parse thumbnail generator message:', err);
    }
  };

  const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8" />
      <title>Thumbnail Generator</title>
      <script src="https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js"></script>
    </head>
    <body>
      <script>
        function post(data) {
          try {
            if (window.ReactNativeWebView && window.ReactNativeWebView.postMessage) {
              window.ReactNativeWebView.postMessage(JSON.stringify(data));
            }
          } catch (e) {}
        }

        async function base64ToUint8(base64) {
          try {
            const clean = base64.replace(/\\s/g, '');
            const res = await fetch('data:application/pdf;base64,' + clean);
            const buffer = await res.arrayBuffer();
            return new Uint8Array(buffer);
          } catch (e) {
            const clean = base64.replace(/\\s/g, '');
            const raw = window.atob(clean);
            const arr = new Uint8Array(raw.length);
            for (let i = 0; i < raw.length; i++) {
              arr[i] = raw.charCodeAt(i);
            }
            return arr;
          }
        }

        async function generateThumbnails(base64) {
          try {
            const pdfjs = window['pdfjs-dist/build/pdf'] || window.pdfjsLib;
            if (!pdfjs) {
              post({ type: 'ERROR', message: 'PDF.js not available' });
              return;
            }

            if (!pdfjs.GlobalWorkerOptions.workerSrc) {
              pdfjs.GlobalWorkerOptions.workerSrc =
                'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
            }

            const uint8 = await base64ToUint8(base64);
            const loadingTask = pdfjs.getDocument({
              data: uint8,
              stopAtErrors: false,
            });

            const pdf = await loadingTask.promise;
            const numPages = pdf.numPages;

            for (let pageNum = 1; pageNum <= numPages; pageNum++) {
              try {
                const page = await pdf.getPage(pageNum);
                const unscaled = page.getViewport({ scale: 1.0 });
                // Target width 200px for crisp, clean mobile thumbnails
                const targetWidth = 200;
                const scale = targetWidth / unscaled.width;
                const viewport = page.getViewport({ scale: Math.min(scale, 1.5) });

                const canvas = document.createElement('canvas');
                canvas.width = Math.round(viewport.width);
                canvas.height = Math.round(viewport.height);
                const ctx = canvas.getContext('2d', { alpha: false });

                // Fill background white
                ctx.fillStyle = '#FFFFFF';
                ctx.fillRect(0, 0, canvas.width, canvas.height);

                await page.render({ canvasContext: ctx, viewport }).promise;
                const dataUrl = canvas.toDataURL('image/jpeg', 0.65);

                post({
                  type: 'THUMBNAIL',
                  pageIndex: pageNum - 1,
                  dataUrl: dataUrl,
                });

                if (page.cleanup) {
                  page.cleanup();
                }
              } catch (pageErr) {
                console.warn('Error rendering thumbnail page ' + pageNum, pageErr);
              }
            }

            post({ type: 'DONE' });
          } catch (docErr) {
            post({ type: 'ERROR', message: String(docErr) });
          }
        }

        window.addEventListener('message', function(e) {
          try {
            const data = JSON.parse(e.data);
            if (data.type === 'LOAD_DOCUMENT' && data.base64) {
              generateThumbnails(data.base64);
            }
          } catch (err) {}
        });

        document.addEventListener('message', function(e) {
          try {
            const data = JSON.parse(e.data);
            if (data.type === 'LOAD_DOCUMENT' && data.base64) {
              generateThumbnails(data.base64);
            }
          } catch (err) {}
        });

        // Notify app ready
        setTimeout(function() {
          post({ type: 'READY' });
        }, 150);
      </script>
    </body>
    </html>
  `;

  return (
    <View style={styles.hiddenContainer} pointerEvents="none">
      <WebView
        ref={webViewRef}
        originWhitelist={['*']}
        source={{ html: htmlContent }}
        onMessage={handleMessage}
        javaScriptEnabled
        domStorageEnabled
        allowFileAccess
        mixedContentMode="always"
        style={styles.hiddenWebView}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  hiddenContainer: {
    position: 'absolute',
    width: 1,
    height: 1,
    opacity: 0,
    top: -9999,
    left: -9999,
    overflow: 'hidden',
  },
  hiddenWebView: {
    width: 1,
    height: 1,
  },
});
