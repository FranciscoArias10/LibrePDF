/**
 * HTML5 & WebGL engine for offline Document Edge Detection and Perspective Transformation (Homography Warping).
 * Runs inside a lightweight hidden WebView in React Native.
 */

export const getPerspectiveEngineHtml = (): string => `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0, user-scalable=no">
  <style>
    html, body {
      margin: 0;
      padding: 0;
      overflow: hidden;
      background: transparent;
      width: 100%;
      height: 100%;
    }
    canvas {
      display: none;
    }
  </style>
</head>
<body>
  <canvas id="cvCanvas"></canvas>
  <canvas id="glCanvas"></canvas>

  <script>
    function postToRN(data) {
      try {
        if (window.ReactNativeWebView && window.ReactNativeWebView.postMessage) {
          window.ReactNativeWebView.postMessage(JSON.stringify(data));
        }
      } catch (err) {
        console.error('Error posting to React Native:', err);
      }
    }

    /**
     * Compute 3x3 Homography Matrix (Paul Heckbert formulation)
     * Maps unit square [0,0]->[1,0]->[1,1]->[0,1] to arbitrary quad (x0,y0)..(x3,y3).
     * Returns 9 elements in OpenGL column-major order.
     */
    function getUnitSquareToQuadHomography(x0, y0, x1, y1, x2, y2, x3, y3) {
      var dx1 = x1 - x2;
      var dx2 = x3 - x2;
      var sx = x0 - x1 + x2 - x3;
      var dy1 = y1 - y2;
      var dy2 = y3 - y2;
      var sy = y0 - y1 + y2 - y3;

      if (Math.abs(sx) < 1e-7 && Math.abs(sy) < 1e-7) {
        return [
          x1 - x0, y1 - y0, 0,
          x2 - x1, y2 - y1, 0,
          x0, y0, 1
        ];
      }

      var det = dx1 * dy2 - dy1 * dx2;
      if (Math.abs(det) < 1e-7) {
        return [
          1, 0, 0,
          0, 1, 0,
          0, 0, 1
        ];
      }

      var g = (sx * dy2 - sy * dx2) / det;
      var h = (dx1 * sy - dy1 * sx) / det;
      var a = x1 - x0 + g * x1;
      var b = x3 - x0 + h * x3;
      var c = x0;
      var d = y1 - y0 + g * y1;
      var e = y3 - y0 + h * y3;
      var f = y0;

      // OpenGL mat3 column-major order:
      return [a, d, g, b, e, h, c, f, 1.0];
    }

    /**
     * High-speed Document Edge & Corner Detection on downscaled image
     */
    function detectCorners(img) {
      var W = 280;
      var H = Math.round((img.height / img.width) * W);
      if (H < 100) H = 100;
      if (H > 500) H = 500;

      var canvas = document.getElementById('cvCanvas');
      canvas.width = W;
      canvas.height = H;
      var ctx = canvas.getContext('2d', { willReadFrequently: true });
      ctx.drawImage(img, 0, 0, W, H);
      var imgData = ctx.getImageData(0, 0, W, H);
      var pixels = imgData.data;

      var gray = new Uint8Array(W * H);
      for (var i = 0, j = 0; i < pixels.length; i += 4, j++) {
        gray[j] = Math.round(0.299 * pixels[i] + 0.587 * pixels[i + 1] + 0.114 * pixels[i + 2]);
      }

      // Sobel gradient magnitude
      var grad = new Float32Array(W * H);
      var maxGrad = 0;
      for (var y = 1; y < H - 1; y++) {
        var rowPrev = (y - 1) * W;
        var rowCurr = y * W;
        var rowNext = (y + 1) * W;
        for (var x = 1; x < W - 1; x++) {
          var gx = (-gray[rowPrev + x - 1] + gray[rowPrev + x + 1]) +
                   (-2 * gray[rowCurr + x - 1] + 2 * gray[rowCurr + x + 1]) +
                   (-gray[rowNext + x - 1] + gray[rowNext + x + 1]);
          var gy = (-gray[rowPrev + x - 1] - 2 * gray[rowPrev + x] - gray[rowPrev + x + 1]) +
                   (gray[rowNext + x - 1] + 2 * gray[rowNext + x] + gray[rowNext + x + 1]);
          var g = Math.abs(gx) + Math.abs(gy);
          grad[rowCurr + x] = g;
          if (g > maxGrad) maxGrad = g;
        }
      }

      var defaultFallback = {
        tl: { x: 0.05, y: 0.05 },
        tr: { x: 0.95, y: 0.05 },
        br: { x: 0.95, y: 0.95 },
        bl: { x: 0.05, y: 0.95 },
        confidence: 'fallback'
      };

      if (maxGrad < 35) return defaultFallback;

      var thresh = Math.max(30, maxGrad * 0.22);
      var topPts = [], bottomPts = [], leftPts = [], rightPts = [];

      var samples = 17;
      for (var s = 1; s <= samples; s++) {
        var x = Math.round((s / (samples + 1)) * W);
        for (var y = 2; y < H * 0.65; y++) {
          if (grad[y * W + x] >= thresh) { topPts.push({ x: x, y: y }); break; }
        }
        for (var y = H - 3; y > H * 0.35; y--) {
          if (grad[y * W + x] >= thresh) { bottomPts.push({ x: x, y: y }); break; }
        }
      }

      for (var s = 1; s <= samples; s++) {
        var y = Math.round((s / (samples + 1)) * H);
        for (var x = 2; x < W * 0.65; x++) {
          if (grad[y * W + x] >= thresh) { leftPts.push({ x: x, y: y }); break; }
        }
        for (var x = W - 3; x > W * 0.35; x--) {
          if (grad[y * W + x] >= thresh) { rightPts.push({ x: x, y: y }); break; }
        }
      }

      if (topPts.length < 3 || bottomPts.length < 3 || leftPts.length < 3 || rightPts.length < 3) {
        return defaultFallback;
      }

      function fitLineY(points) {
        var sumX = 0, sumY = 0, sumXY = 0, sumXX = 0;
        var n = points.length;
        for (var p = 0; p < n; p++) {
          sumX += points[p].x; sumY += points[p].y;
          sumXY += points[p].x * points[p].y; sumXX += points[p].x * points[p].x;
        }
        var denom = n * sumXX - sumX * sumX;
        if (Math.abs(denom) < 1e-5) return null;
        var m = (n * sumXY - sumX * sumY) / denom;
        var b = (sumY - m * sumX) / n;
        return { m: m, b: b };
      }

      function fitLineX(points) {
        var sumX = 0, sumY = 0, sumXY = 0, sumYY = 0;
        var n = points.length;
        for (var p = 0; p < n; p++) {
          sumX += points[p].x; sumY += points[p].y;
          sumXY += points[p].x * points[p].y; sumYY += points[p].y * points[p].y;
        }
        var denom = n * sumYY - sumY * sumY;
        if (Math.abs(denom) < 1e-5) return null;
        var m = (n * sumXY - sumX * sumY) / denom;
        var b = (sumX - m * sumY) / n;
        return { m: m, b: b };
      }

      var lTop = fitLineY(topPts);
      var lBot = fitLineY(bottomPts);
      var lLeft = fitLineX(leftPts);
      var lRight = fitLineX(rightPts);

      if (!lTop || !lBot || !lLeft || !lRight) return defaultFallback;

      function intersect(lineY, lineX) {
        var denom = 1 - lineX.m * lineY.m;
        if (Math.abs(denom) < 1e-5) return null;
        var x = (lineX.m * lineY.b + lineX.b) / denom;
        var y = lineY.m * x + lineY.b;
        return { x: x / W, y: y / H };
      }

      var tl = intersect(lTop, lLeft);
      var tr = intersect(lTop, lRight);
      var br = intersect(lBot, lRight);
      var bl = intersect(lBot, lLeft);

      if (!tl || !tr || !br || !bl) return defaultFallback;

      var clamp = function(v) { return Math.max(0, Math.min(1, v)); };
      var cTL = { x: clamp(tl.x), y: clamp(tl.y) };
      var cTR = { x: clamp(tr.x), y: clamp(tr.y) };
      var cBR = { x: clamp(br.x), y: clamp(br.y) };
      var cBL = { x: clamp(bl.x), y: clamp(bl.y) };

      // Validate dimensions & convexity
      if ((cTR.x - cTL.x) < 0.2 || (cBR.x - cBL.x) < 0.2 || (cBL.y - cTL.y) < 0.2 || (cBR.y - cTR.y) < 0.2) {
        return defaultFallback;
      }

      return { tl: cTL, tr: cTR, br: cBR, bl: cBL, confidence: 'high' };
    }

    /**
     * WebGL Perspective Transform Engine
     */
    function warpPerspective(img, corners, destW, destH) {
      var canvas = document.getElementById('glCanvas');
      canvas.width = destW;
      canvas.height = destH;

      var gl = canvas.getContext('webgl', { preserveDrawingBuffer: true, antialias: true }) ||
               canvas.getContext('experimental-webgl', { preserveDrawingBuffer: true, antialias: true });

      if (!gl) {
        throw new Error('WebGL is not supported on this device.');
      }

      var vsSource = [
        'attribute vec2 a_position;',
        'varying vec2 v_texCoord;',
        'void main() {',
        '  gl_Position = vec4(a_position, 0.0, 1.0);',
        '  v_texCoord = vec2((a_position.x + 1.0) * 0.5, (1.0 - a_position.y) * 0.5);',
        '}'
      ].join('\\n');

      var fsSource = [
        'precision highp float;',
        'varying vec2 v_texCoord;',
        'uniform sampler2D u_image;',
        'uniform mat3 u_homography;',
        'void main() {',
        '  vec3 src = u_homography * vec3(v_texCoord.x, v_texCoord.y, 1.0);',
        '  vec2 uv = src.xy / src.z;',
        '  if (uv.x >= 0.0 && uv.x <= 1.0 && uv.y >= 0.0 && uv.y <= 1.0) {',
        '    gl_FragColor = texture2D(u_image, uv);',
        '  } else {',
        '    gl_FragColor = vec4(1.0, 1.0, 1.0, 1.0);',
        '  }',
        '}'
      ].join('\\n');

      function createShader(gl, type, source) {
        var shader = gl.createShader(type);
        gl.shaderSource(shader, source);
        gl.compileShader(shader);
        if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
          var err = gl.getShaderInfoLog(shader);
          gl.deleteShader(shader);
          throw new Error('Shader compile failed: ' + err);
        }
        return shader;
      }

      var vs = createShader(gl, gl.VERTEX_SHADER, vsSource);
      var fs = createShader(gl, gl.FRAGMENT_SHADER, fsSource);
      var program = gl.createProgram();
      gl.attachShader(program, vs);
      gl.attachShader(program, fs);
      gl.linkProgram(program);
      if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
        throw new Error('Program link failed: ' + gl.getProgramInfoLog(program));
      }
      gl.useProgram(program);

      // Full viewport quad strip: TL, TR, BL, BR
      var posBuffer = gl.createBuffer();
      gl.bindBuffer(gl.ARRAY_BUFFER, posBuffer);
      gl.bufferData(
        gl.ARRAY_BUFFER,
        new Float32Array([
          -1,  1,
           1,  1,
          -1, -1,
           1, -1
        ]),
        gl.STATIC_DRAW
      );

      var aPos = gl.getAttribLocation(program, 'a_position');
      gl.enableVertexAttribArray(aPos);
      gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0);

      // Texture setup
      var texture = gl.createTexture();
      gl.bindTexture(gl.TEXTURE_2D, texture);
      gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, img);

      // Calculate Homography Matrix
      var H = getUnitSquareToQuadHomography(
        corners.tl.x, corners.tl.y,
        corners.tr.x, corners.tr.y,
        corners.br.x, corners.br.y,
        corners.bl.x, corners.bl.y
      );

      var uH = gl.getUniformLocation(program, 'u_homography');
      gl.uniformMatrix3fv(uH, false, new Float32Array(H));

      // Draw
      gl.viewport(0, 0, destW, destH);
      gl.clearColor(1.0, 1.0, 1.0, 1.0);
      gl.clear(gl.COLOR_BUFFER_BIT);
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);

      return canvas.toDataURL('image/jpeg', 0.92);
    }

    // Message dispatcher from React Native
    function handleMessage(event) {
      try {
        var rawData = event.data;
        if (!rawData) return;
        var msg = typeof rawData === 'string' ? JSON.parse(rawData) : rawData;

        if (msg.type === 'PING') {
          postToRN({ type: 'PONG' });
        } else if (msg.type === 'DETECT_CORNERS') {
          var img = new Image();
          img.crossOrigin = 'anonymous';
          img.onload = function() {
            var result = detectCorners(img);
            postToRN({
              type: 'CORNERS_DETECTED',
              corners: result,
              requestId: msg.requestId
            });
          };
          img.onerror = function(err) {
            postToRN({
              type: 'CORNERS_ERROR',
              error: 'Failed to load image for edge detection',
              requestId: msg.requestId
            });
          };
          img.src = msg.imageBase64.startsWith('data:') ? msg.imageBase64 : ('data:image/jpeg;base64,' + msg.imageBase64);
        } else if (msg.type === 'WARP_PERSPECTIVE') {
          var imgWarp = new Image();
          imgWarp.crossOrigin = 'anonymous';
          imgWarp.onload = function() {
            try {
              var base64Result = warpPerspective(imgWarp, msg.corners, msg.destWidth, msg.destHeight);
              postToRN({
                type: 'WARP_SUCCESS',
                base64: base64Result,
                destWidth: msg.destWidth,
                destHeight: msg.destHeight,
                requestId: msg.requestId
              });
            } catch (warpErr) {
              postToRN({
                type: 'WARP_ERROR',
                error: warpErr.message || 'Error executing perspective warp',
                requestId: msg.requestId
              });
            }
          };
          imgWarp.onerror = function() {
            postToRN({
              type: 'WARP_ERROR',
              error: 'Failed to load full image for perspective warp',
              requestId: msg.requestId
            });
          };
          imgWarp.src = msg.imageBase64.startsWith('data:') ? msg.imageBase64 : ('data:image/jpeg;base64,' + msg.imageBase64);
        }
      } catch (e) {
        postToRN({ type: 'ENGINE_ERROR', error: e.message || 'General engine error' });
      }
    }

    window.addEventListener('message', handleMessage);
    document.addEventListener('message', handleMessage);

    // Initial ready ping
    postToRN({ type: 'ENGINE_READY' });
  </script>
</body>
</html>
`;
