// src/utils/fingerprint.ts
// 设备指纹生成工具 - Canvas、WebGL、Audio多维度采集

export interface FingerprintData {
  fingerprint: string;
  ipAddress: string;
  userAgent: string;
  platform: string;
  language: string;
  timezone: string;
  screenRes: string;
  plugins: string;
}

/**
 * 生成Canvas指纹
 */
function getCanvasFingerprint(): string {
  try {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) return 'no-canvas';

    canvas.width = 200;
    canvas.height = 50;

    // 绘制文本
    ctx.textBaseline = 'top';
    ctx.font = '14px "Arial"';
    ctx.fillStyle = '#f60';
    ctx.fillRect(125, 1, 62, 20);
    ctx.fillStyle = '#069';
    ctx.fillText('DeviceFingerprint 🔒', 2, 15);
    ctx.fillStyle = 'rgba(102, 204, 0, 0.7)';
    ctx.fillText('DeviceFingerprint 🔒', 4, 17);

    return canvas.toDataURL();
  } catch {
    return 'canvas-error';
  }
}

/**
 * 生成WebGL指纹
 */
function getWebGLFingerprint(): string {
  try {
    const canvas = document.createElement('canvas');
    const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
    if (!gl) return 'no-webgl';

    const debugInfo = (gl as any).getExtension('WEBGL_debug_renderer_info');
    if (!debugInfo) return 'no-debug-info';

    const vendor = (gl as any).getParameter(debugInfo.UNMASKED_VENDOR_WEBGL);
    const renderer = (gl as any).getParameter(debugInfo.UNMASKED_RENDERER_WEBGL);

    return `${vendor}~${renderer}`;
  } catch {
    return 'webgl-error';
  }
}

/**
 * 生成Audio指纹
 */
function getAudioFingerprint(): Promise<string> {
  return new Promise((resolve) => {
    try {
      const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioContext) {
        resolve('no-audio');
        return;
      }

      const context = new AudioContext();
      const oscillator = context.createOscillator();
      const analyser = context.createAnalyser();
      const gainNode = context.createGain();
      const scriptProcessor = context.createScriptProcessor(4096, 1, 1);

      gainNode.gain.value = 0; // 静音
      oscillator.type = 'triangle';
      oscillator.connect(analyser);
      analyser.connect(scriptProcessor);
      scriptProcessor.connect(gainNode);
      gainNode.connect(context.destination);

      scriptProcessor.onaudioprocess = (event) => {
        const output = event.outputBuffer.getChannelData(0);
        const hash = Array.from(output.slice(0, 30))
          .reduce((acc, val) => acc + Math.abs(val), 0)
          .toFixed(6);

        oscillator.disconnect();
        scriptProcessor.disconnect();
        context.close();
        resolve(hash);
      };

      oscillator.start(0);
    } catch {
      resolve('audio-error');
    }
  });
}

/**
 * 获取插件列表
 */
function getPlugins(): string {
  if (!navigator.plugins || navigator.plugins.length === 0) {
    return 'no-plugins';
  }

  return Array.from(navigator.plugins)
    .map((p) => p.name)
    .sort()
    .join(',');
}

/**
 * 简单哈希函数
 */
function simpleHash(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  return Math.abs(hash).toString(36);
}

/**
 * 生成完整设备指纹
 */
export async function generateDeviceFingerprint(): Promise<FingerprintData> {
  const canvasFingerprint = getCanvasFingerprint();
  const webglFingerprint = getWebGLFingerprint();
  const audioFingerprint = await getAudioFingerprint();
  const plugins = getPlugins();

  const userAgent = navigator.userAgent;
  const platform = navigator.platform;
  const language = navigator.language;
  const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  const screenRes = `${screen.width}x${screen.height}x${screen.colorDepth}`;

  // 组合所有指纹数据
  const combinedFingerprint = [
    canvasFingerprint,
    webglFingerprint,
    audioFingerprint,
    userAgent,
    platform,
    language,
    timezone,
    screenRes,
    plugins,
    navigator.hardwareConcurrency || 'unknown',
    (navigator as any).deviceMemory || 'unknown',
  ].join('|');

  const fingerprint = simpleHash(combinedFingerprint);

  return {
    fingerprint,
    ipAddress: '', // 将由服务器填充
    userAgent,
    platform,
    language,
    timezone,
    screenRes,
    plugins,
  };
}

/**
 * 持久化指纹到 localStorage
 */
export function getCachedFingerprint(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('device_fingerprint');
}

export function setCachedFingerprint(fingerprint: string): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem('device_fingerprint', fingerprint);
}
