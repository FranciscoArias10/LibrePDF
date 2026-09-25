import React, {
  useState,
  useEffect,
  useRef,
  useImperativeHandle,
  forwardRef,
} from 'react';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
} from 'react-native';
import { WebView, WebViewMessageEvent } from 'react-native-webview';
import * as FileSystem from 'expo-file-system/legacy';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';

export interface PDFEmbeddedViewerRef {
  zoomIn: () => void;
  zoomOut: () => void;
  resetZoom: () => void;
  goToPage: (pageNumber: number) => void;
  nextPage: () => void;
  prevPage: () => void;
}

interface PDFEmbeddedViewerProps {
  pdfUri: string;
  initialPage?: number;
  onPageChange?: (currentPage: number, totalPages: number) => void;
  onZoomChange?: (scale: number) => void;
  onLoadSuccess?: (totalPages: number) => void;
  onLoadError?: (errorMessage: string) => void;
  onOpenExternal?: () => void;
}

export const PDFEmbeddedViewer = forwardRef<PDFEmbeddedViewerRef, PDFEmbeddedViewerProps>(
  (
    {
      pdfUri,
      initialPage = 1,
      onPageChange,
      onZoomChange,
      onLoadSuccess,
      onLoadError,
      onOpenExternal,
    },
    ref
  ) => {
    const { colors, isDark } = useTheme();
    const webViewRef = useRef<WebView>(null);

    const [isLoading, setIsLoading] = useState(true);
    const [loadingMessage, setLoadingMessage] = useState('Preparando documento...');
    const [errorMessage, setErrorMessage] = useState<string | null>(null);
    const [showTimeoutFallback, setShowTimeoutFallback] = useState(false);
    const [currentPage, setCurrentPage] = useState(initialPage);
    const [totalPages, setTotalPages] = useState(0);
    const [base64Content, setBase64Content] = useState<string | null>(null);
    const [isDocumentLoaded, setIsDocumentLoaded] = useState(false);

    // Guard ref to guarantee LOAD_DOCUMENT is sent exactly ONCE
    const hasSentDocumentRef = useRef(false);

    // Timeout detector: If loading takes longer than 6 seconds, offer external viewer
    useEffect(() => {
      if (isLoading && !isDocumentLoaded) {
        const timer = setTimeout(() => {
          if (isLoading) {
            setShowTimeoutFallback(true);
          }
        }, 6000);
        return () => clearTimeout(timer);
      }
    }, [isLoading, isDocumentLoaded]);

    // Read the PDF file into Base64
    useEffect(() => {
      let isMounted = true;
      hasSentDocumentRef.current = false;
      setIsDocumentLoaded(false);

      const loadPdfFile = async () => {
        try {
          setIsLoading(true);
          setErrorMessage(null);
          setShowTimeoutFallback(false);
          setLoadingMessage('Leyendo archivo PDF...');

          const fileInfo = await FileSystem.getInfoAsync(pdfUri);
          if (!fileInfo.exists) {
            throw new Error('El archivo PDF no se encuentra en el almacenamiento.');
          }

          const base64 = await FileSystem.readAsStringAsync(pdfUri, {
            encoding: FileSystem.EncodingType.Base64,
          });

          if (isMounted) {
            setBase64Content(base64);
            setLoadingMessage('Cargando visor...');
          }
        } catch (err: any) {
          console.error('Error reading PDF file for embedded viewer:', err);
          if (isMounted) {
            const msg = err.message || 'No se pudo leer el archivo PDF.';
            setErrorMessage(msg);
            setIsLoading(false);
            onLoadError?.(msg);
          }
        }
      };

      loadPdfFile();

      return () => {
        isMounted = false;
      };
    }, [pdfUri]);

    // Send Base64 document payload to WebView exactly once
    const sendDocumentToWebView = () => {
      if (hasSentDocumentRef.current) return;
      if (base64Content && webViewRef.current) {
        hasSentDocumentRef.current = true;
        webViewRef.current.postMessage(
          JSON.stringify({
            type: 'LOAD_DOCUMENT',
            base64: base64Content,
            initialPage,
          })
        );
      }
    };

    // Expose control methods via ref
    useImperativeHandle(ref, () => ({
      zoomIn: () => {
        webViewRef.current?.postMessage(JSON.stringify({ type: 'ZOOM_IN' }));
      },
      zoomOut: () => {
        webViewRef.current?.postMessage(JSON.stringify({ type: 'ZOOM_OUT' }));
      },
      resetZoom: () => {
        webViewRef.current?.postMessage(JSON.stringify({ type: 'ZOOM_RESET' }));
      },
      goToPage: (pageNumber: number) => {
        if (pageNumber >= 1) {
          webViewRef.current?.postMessage(
            JSON.stringify({ type: 'GO_TO_PAGE', page: pageNumber })
          );
        }
      },
      nextPage: () => {
        webViewRef.current?.postMessage(JSON.stringify({ type: 'NEXT_PAGE' }));
      },
      prevPage: () => {
        webViewRef.current?.postMessage(JSON.stringify({ type: 'PREV_PAGE' }));
      },
    }));

    // Handle messages coming from inside the WebView
    const handleMessage = (event: WebViewMessageEvent) => {
      try {
        const data = JSON.parse(event.nativeEvent.data);

        switch (data.type) {
          case 'VIEWER_READY':
            sendDocumentToWebView();
            break;

          case 'DOCUMENT_LOADED':
            setIsLoading(false);
            setIsDocumentLoaded(true);
            setShowTimeoutFallback(false);
            setTotalPages(data.totalPages);
            onLoadSuccess?.(data.totalPages);
            break;

          case 'PAGE_CHANGED':
            setCurrentPage(data.currentPage);
            onPageChange?.(data.currentPage, data.totalPages || totalPages);
            break;

          case 'ZOOM_CHANGED':
            onZoomChange?.(data.scale);
            break;

          case 'STATUS':
            setLoadingMessage(data.message || 'Cargando...');
            break;

          case 'ERROR':
            console.error('WebView PDF Error:', data.message);
            setIsLoading(false);
            setErrorMessage(data.message || 'Error al procesar el documento PDF.');
            onLoadError?.(data.message);
            break;

          default:
            break;
        }
      } catch (err) {
        console.error('Failed to parse WebView message:', err);
      }
    };

    const bgColor = isDark ? '#121214' : '#E5E7EB';
    const cardBgColor = isDark ? '#1C1C1E' : '#FFFFFF';
    const textColor = isDark ? '#F3F4F6' : '#111827';
    const subtextColor = isDark ? '#9CA3AF' : '#6B7280';

    const viewerHtml = `
      <!DOCTYPE html>
      <html lang="es">
      <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=5.0, user-scalable=yes" />
        <title>LibrePDF Embedded Viewer</title>
        <style>
          * {
            box-sizing: border-box;
            margin: 0;
            padding: 0;
            -webkit-tap-highlight-color: transparent;
          }
          html {
            width: 100%;
            min-height: 100%;
            background-color: ${bgColor};
          }
          body {
            width: 100%;
            min-height: 100%;
            background-color: ${bgColor};
            color: ${textColor};
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
            overflow-x: hidden;
            overflow-y: auto;
            -webkit-overflow-scrolling: touch;
          }
          #pages-wrapper {
            display: flex;
            flex-direction: column;
            align-items: center;
            padding: 16px 8px 84px 8px;
            gap: 16px;
            transform-origin: top center;
            transition: transform 0.15s ease-out;
            min-height: 100vh;
          }
          .page-card {
            background-color: #FFFFFF;
            border-radius: 6px;
            box-shadow: 0 4px 14px rgba(0, 0, 0, ${isDark ? '0.6' : '0.12'});
            position: relative;
            overflow: hidden;
            display: flex;
            justify-content: center;
            align-items: center;
            opacity: 1;
            transition: opacity 0.2s ease-in;
          }
          .page-card canvas {
            display: block;
            width: 100%;
            height: auto;
          }
          .page-badge {
            position: absolute;
            bottom: 8px;
            right: 8px;
            background: rgba(17, 24, 39, 0.7);
            backdrop-filter: blur(4px);
            color: #FFFFFF;
            font-size: 11px;
            font-weight: 600;
            padding: 3px 8px;
            border-radius: 12px;
            pointer-events: none;
            letter-spacing: 0.5px;
          }
        </style>
        <!-- Mozilla PDF.js v3.11 -->
        <script src="https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js"></script>
      </head>
      <body>
        <div id="pages-wrapper"></div>

        <script>
          let pdfDocument = null;
          let baseScaleMultiplier = 1.0;
          let pageElements = [];
          let activePageObserver = null;
          let isRenderingOrLoaded = false;
          let readyInterval = null;

          function postToApp(data) {
            try {
              if (window.ReactNativeWebView && window.ReactNativeWebView.postMessage) {
                window.ReactNativeWebView.postMessage(JSON.stringify(data));
              }
            } catch (e) {
              console.error('postToApp error:', e);
            }
          }

          function showError(message) {
            postToApp({ type: 'ERROR', message: message });
          }

          // Convert Base64 efficiently via native fetch ArrayBuffer
          async function base64ToUint8Array(base64) {
            try {
              const cleanBase64 = base64.replace(/\\s/g, '');
              const res = await fetch('data:application/pdf;base64,' + cleanBase64);
              const buffer = await res.arrayBuffer();
              return new Uint8Array(buffer);
            } catch (e) {
              const clean = base64.replace(/\\s/g, '');
              const raw = window.atob(clean);
              const rawLength = raw.length;
              const array = new Uint8Array(rawLength);
              for (let i = 0; i < rawLength; i++) {
                array[i] = raw.charCodeAt(i);
              }
              return array;
            }
          }

          async function renderAllPages(pdf) {
            const wrapper = document.getElementById('pages-wrapper');
            wrapper.innerHTML = '';
            pageElements = [];

            const numPages = pdf.numPages;
            const screenWidth = window.innerWidth - 20;

            for (let pageNum = 1; pageNum <= numPages; pageNum++) {
              postToApp({
                type: 'STATUS',
                message: 'Renderizando página ' + pageNum + ' de ' + numPages + '...'
              });

              const page = await pdf.getPage(pageNum);
              const unscaledViewport = page.getViewport({ scale: 1.0 });

              // Scale to fit mobile screen width
              const fitRatio = screenWidth / unscaledViewport.width;
              const dpr = Math.min(window.devicePixelRatio || 1, 2);
              const viewport = page.getViewport({ scale: fitRatio * dpr });

              const pageCard = document.createElement('div');
              pageCard.className = 'page-card';
              pageCard.id = 'page-' + pageNum;
              pageCard.dataset.pageNumber = pageNum;
              pageCard.style.width = (unscaledViewport.width * fitRatio) + 'px';
              pageCard.style.minHeight = (unscaledViewport.height * fitRatio) + 'px';

              const canvas = document.createElement('canvas');
              const context = canvas.getContext('2d', { alpha: false });
              canvas.width = viewport.width;
              canvas.height = viewport.height;
              canvas.style.width = '100%';
              canvas.style.height = 'auto';

              const badge = document.createElement('div');
              badge.className = 'page-badge';
              badge.textContent = pageNum + ' / ' + numPages;

              // Render pixels directly into canvas first before appending to DOM
              // to eliminate blank canvas pop and visual screen flickering
              await page.render({
                canvasContext: context,
                viewport: viewport
              }).promise;

              pageCard.appendChild(canvas);
              pageCard.appendChild(badge);
              wrapper.appendChild(pageCard);
              pageElements.push(pageCard);
            }

            setupIntersectionObserver(numPages);
            postToApp({
              type: 'DOCUMENT_LOADED',
              totalPages: numPages
            });
          }

          let currentVisiblePage = 1;
          let isProgrammaticScroll = false;
          let programmaticScrollTimeout = null;

          function applyZoom() {
            const wrapper = document.getElementById('pages-wrapper');
            if (wrapper) {
              wrapper.style.transform = 'scale(' + baseScaleMultiplier + ')';
              if (baseScaleMultiplier > 1.0) {
                document.body.style.overflowX = 'auto';
              } else {
                document.body.style.overflowX = 'hidden';
              }
              const pageEl = document.getElementById('page-' + currentVisiblePage);
              if (pageEl) {
                setTimeout(() => {
                  pageEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
                }, 40);
              }
            }
            postToApp({
              type: 'ZOOM_CHANGED',
              scale: baseScaleMultiplier
            });
          }

          function scrollToPage(pageNum) {
            const el = document.getElementById('page-' + pageNum);
            if (el) {
              currentVisiblePage = pageNum;
              isProgrammaticScroll = true;
              if (programmaticScrollTimeout) {
                clearTimeout(programmaticScrollTimeout);
              }
              programmaticScrollTimeout = setTimeout(() => {
                isProgrammaticScroll = false;
              }, 450);

              const rect = el.getBoundingClientRect();
              const currentScroll = window.pageYOffset || document.documentElement.scrollTop || document.body.scrollTop || 0;
              const targetY = Math.max(0, currentScroll + rect.top - 16);

              try {
                window.scrollTo({
                  top: targetY,
                  behavior: 'smooth'
                });
              } catch (e) {
                window.scrollTo(0, targetY);
              }
              document.body.scrollTop = targetY;
              document.documentElement.scrollTop = targetY;

              postToApp({
                type: 'PAGE_CHANGED',
                currentPage: pageNum,
                totalPages: totalPages
              });
            }
          }

          let scrollThrottleTimeout = null;
          function handleScrollEvent() {
            if (isProgrammaticScroll) return;
            if (scrollThrottleTimeout) return;
            scrollThrottleTimeout = setTimeout(() => {
              scrollThrottleTimeout = null;
              if (isProgrammaticScroll) return;
              updateCurrentVisiblePageFromScroll();
            }, 60);
          }

          function updateCurrentVisiblePageFromScroll() {
            if (!pageElements || pageElements.length === 0) return;
            const centerY = window.innerHeight / 2;
            let bestPage = currentVisiblePage;
            let minDistance = Infinity;

            for (let i = 0; i < pageElements.length; i++) {
              const el = pageElements[i];
              const rect = el.getBoundingClientRect();
              if (rect.top <= centerY && rect.bottom >= centerY) {
                bestPage = parseInt(el.dataset.pageNumber, 10);
                break;
              }
              const pageCenter = (rect.top + rect.bottom) / 2;
              const dist = Math.abs(pageCenter - centerY);
              if (dist < minDistance) {
                minDistance = dist;
                bestPage = parseInt(el.dataset.pageNumber, 10);
              }
            }

            if (bestPage !== currentVisiblePage) {
              currentVisiblePage = bestPage;
              postToApp({
                type: 'PAGE_CHANGED',
                currentPage: bestPage,
                totalPages: totalPages
              });
            }
          }

          function setupIntersectionObserver(totalPages) {
            window.removeEventListener('scroll', handleScrollEvent);
            document.removeEventListener('scroll', handleScrollEvent);
            window.addEventListener('scroll', handleScrollEvent, { passive: true });
            document.addEventListener('scroll', handleScrollEvent, { passive: true });
          }

          // Handle incoming commands from React Native
          async function handleIncomingCommand(event) {
            try {
              let msg = event.data;
              if (typeof msg === 'string') {
                msg = JSON.parse(msg);
              }

              if (msg.type === 'LOAD_DOCUMENT') {
                // Immediate re-entrancy lock to prevent duplicate renders
                if (isRenderingOrLoaded) return;
                isRenderingOrLoaded = true;

                // Stop pinging ready once loading starts
                if (readyInterval) {
                  clearInterval(readyInterval);
                  readyInterval = null;
                }

                postToApp({ type: 'STATUS', message: 'Cargando motor de lectura...' });

                if (!window.pdfjsLib) {
                  showError('No se pudo cargar la librería PDF.js. Verifica tu conexión a internet.');
                  return;
                }

                // Important: Disable workerSrc to avoid cross-origin SecurityError
                if (window.pdfjsLib.GlobalWorkerOptions) {
                  window.pdfjsLib.GlobalWorkerOptions.workerSrc = '';
                }

                postToApp({ type: 'STATUS', message: 'Decodificando documento...' });
                const pdfData = await base64ToUint8Array(msg.base64);

                postToApp({ type: 'STATUS', message: 'Analizando páginas...' });
                const loadingTask = pdfjsLib.getDocument({
                  data: pdfData,
                  disableRange: true,
                  disableStream: true
                });

                pdfDocument = await loadingTask.promise;
                await renderAllPages(pdfDocument);

                if (msg.initialPage && msg.initialPage > 1) {
                  setTimeout(() => scrollToPage(msg.initialPage), 300);
                }
              } else if (msg.type === 'ZOOM_IN') {
                baseScaleMultiplier = Math.min(baseScaleMultiplier + 0.25, 3.0);
                applyZoom();
              } else if (msg.type === 'ZOOM_OUT') {
                baseScaleMultiplier = Math.max(baseScaleMultiplier - 0.25, 1.0);
                applyZoom();
              } else if (msg.type === 'ZOOM_RESET') {
                baseScaleMultiplier = 1.0;
                applyZoom();
              } else if (msg.type === 'GO_TO_PAGE') {
                scrollToPage(msg.page);
              } else if (msg.type === 'NEXT_PAGE') {
                if (currentVisiblePage < totalPages) {
                  scrollToPage(currentVisiblePage + 1);
                }
              } else if (msg.type === 'PREV_PAGE') {
                if (currentVisiblePage > 1) {
                  scrollToPage(currentVisiblePage - 1);
                }
              }
            } catch (err) {
              console.error('Error handling command:', err);
              showError(err.message || 'Error al procesar el documento PDF.');
            }
          }

          // Single deduplicated listener for both window and document
          function safeMessageListener(event) {
            if (event._libreHandled) return;
            event._libreHandled = true;
            handleIncomingCommand(event);
          }

          window.addEventListener('message', safeMessageListener);
          document.addEventListener('message', safeMessageListener);

          // Ping React Native until document loading commences
          readyInterval = setInterval(() => {
            if (!isRenderingOrLoaded) {
              postToApp({ type: 'VIEWER_READY' });
            } else if (readyInterval) {
              clearInterval(readyInterval);
              readyInterval = null;
            }
          }, 300);
        </script>
      </body>
      </html>
    `;

    return (
      <View style={[styles.container, { backgroundColor: bgColor }]}>
        <WebView
          ref={webViewRef}
          source={{ html: viewerHtml }}
          style={styles.webView}
          originWhitelist={['*']}
          javaScriptEnabled={true}
          domStorageEnabled={true}
          allowFileAccess={true}
          allowFileAccessFromFileURLs={true}
          allowUniversalAccessFromFileURLs={true}
          scalesPageToFit={true}
          onMessage={handleMessage}
          onLoadEnd={() => {
            sendDocumentToWebView();
          }}
          onError={(syntheticEvent) => {
            const { nativeEvent } = syntheticEvent;
            console.warn('WebView error: ', nativeEvent);
            setErrorMessage('No se pudo inicializar el visor de PDF.');
            setIsLoading(false);
          }}
        />

        {/* Loading Spinner with Progress and Fallback Button */}
        {isLoading && (
          <View style={[styles.loadingOverlay, { backgroundColor: bgColor }]}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={[styles.loadingText, { color: textColor }]}>
              {loadingMessage}
            </Text>

            {showTimeoutFallback && (
              <View style={styles.fallbackBox}>
                <Text style={[styles.fallbackNotice, { color: subtextColor }]}>
                  Está tardando más de lo habitual en cargar.
                </Text>
                {onOpenExternal && (
                  <TouchableOpacity
                    style={[styles.fallbackBtn, { backgroundColor: colors.primaryDark }]}
                    onPress={onOpenExternal}
                    activeOpacity={0.8}
                  >
                    <Ionicons name="open-outline" size={16} color="#FFF" />
                    <Text style={styles.fallbackBtnText}>
                      Abrir con visor del teléfono
                    </Text>
                  </TouchableOpacity>
                )}
              </View>
            )}
          </View>
        )}

        {/* Error Fallback State */}
        {errorMessage && (
          <View style={[styles.errorOverlay, { backgroundColor: cardBgColor }]}>
            <Ionicons name="alert-circle-outline" size={48} color="#EF4444" />
            <Text style={[styles.errorTitle, { color: textColor }]}>
              No se pudo mostrar el PDF
            </Text>
            <Text style={[styles.errorSubtitle, { color: subtextColor }]}>
              {errorMessage}
            </Text>

            <View style={styles.errorButtonsRow}>
              {onOpenExternal && (
                <TouchableOpacity
                  style={[styles.openExternalBtn, { backgroundColor: colors.primaryDark }]}
                  onPress={onOpenExternal}
                  activeOpacity={0.8}
                >
                  <Ionicons name="open-outline" size={18} color="#FFF" />
                  <Text style={styles.retryBtnText}>Abrir con visor externo</Text>
                </TouchableOpacity>
              )}

              <TouchableOpacity
                style={[styles.retryBtn, { backgroundColor: colors.primary }]}
                onPress={() => {
                  setErrorMessage(null);
                  setIsLoading(true);
                  setIsDocumentLoaded(false);
                  setShowTimeoutFallback(false);
                  hasSentDocumentRef.current = false;
                  webViewRef.current?.reload();
                }}
                activeOpacity={0.8}
              >
                <Ionicons name="refresh" size={18} color="#FFF" />
                <Text style={styles.retryBtnText}>Reintentar</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      </View>
    );
  }
);

const styles = StyleSheet.create({
  container: {
    flex: 1,
    position: 'relative',
  },
  webView: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFill,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    zIndex: 10,
    padding: 24,
  },
  loadingText: {
    fontSize: 14,
    fontWeight: '500',
    textAlign: 'center',
  },
  fallbackBox: {
    marginTop: 18,
    alignItems: 'center',
    gap: 10,
  },
  fallbackNotice: {
    fontSize: 13,
    textAlign: 'center',
  },
  fallbackBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
  },
  fallbackBtnText: {
    color: '#FFF',
    fontSize: 13,
    fontWeight: '600',
  },
  errorOverlay: {
    ...StyleSheet.absoluteFill,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    zIndex: 20,
    margin: 16,
    borderRadius: 16,
  },
  errorTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginTop: 12,
    marginBottom: 6,
    textAlign: 'center',
  },
  errorSubtitle: {
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 20,
    lineHeight: 20,
  },
  errorButtonsRow: {
    gap: 12,
    width: '100%',
  },
  openExternalBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 10,
  },
  retryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 10,
  },
  retryBtnText: {
    color: '#FFF',
    fontSize: 15,
    fontWeight: '600',
  },
});
