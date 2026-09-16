/**
 * 屏幕闪烁告警工具
 * 用于巡检告警、紧急通知等场景下的全屏视觉提醒
 */

import { speak, type SpeakOptions } from './speech';

export type FlashMode = 'border' | 'fullscreen' | 'strobe';
export type FlashLevel = 'danger' | 'warning' | 'primary' | string;

export interface FlashScreenOptions {
  /**
   * 闪烁总持续时间（毫秒），默认 3000ms。
   * 若传入 0 或负数，则会持续闪烁，直到手动调用 stopFlashScreen()
   */
  duration?: number;
  /**
   * 单次闪烁周期（毫秒），即一次明暗的时间，默认 600ms
   */
  interval?: number;
  /**
   * 闪烁模式：
   * - 'border': 四周向内发光的警示边框（推荐，不影响中间监控画面与操作）
   * - 'fullscreen': 全屏半透明蒙层呼吸闪烁（视觉更强烈）
   * - 'strobe': 紧急高频快闪/爆闪（适合特急事件）
   */
  mode?: FlashMode;
  /**
   * 告警颜色：支持预设 'danger' (红), 'warning' (橙黄), 'primary' (蓝)，或直接传入 Hex/RGB/RGBA
   */
  color?: FlashLevel;
  /**
   * 闪烁固定次数（可选，如果设置了 times，将以次数优先计算结束时间）
   */
  times?: number;
  /**
   * 最大不透明度 (0 ~ 1)，默认 0.45
   */
  maxOpacity?: number;
  /**
   * 闪烁结束时的回调
   */
  onEnd?: () => void;
}

const ELEMENT_ID = '__screen_flash_overlay__';
const STYLE_ID = '__screen_flash_styles__';

let timer: ReturnType<typeof setTimeout> | null = null;
let currentOnEnd: (() => void) | null = null;

// 预设告警颜色映射
const COLOR_MAP: Record<string, string> = {
  danger: 'rgba(245, 108, 108, 1)', // 红色告警
  warning: 'rgba(230, 162, 60, 1)', // 橙黄警告
  primary: 'rgba(64, 158, 255, 1)', // 蓝色提醒
};

/**
 * 注入闪烁所需的全局动画样式
 */
function ensureStyles() {
  if (typeof document === 'undefined') return;
  if (document.getElementById(STYLE_ID)) return;

  const styleEl = document.createElement('style');
  styleEl.id = STYLE_ID;
  styleEl.textContent = `
    @keyframes __screen_flash_pulse__ {
      0% {
        opacity: 0;
      }
      50% {
        opacity: var(--flash-max-opacity, 0.45);
      }
      100% {
        opacity: 0;
      }
    }

    @keyframes __screen_flash_strobe__ {
      0%, 49% {
        opacity: 0;
      }
      50%, 100% {
        opacity: var(--flash-max-opacity, 0.45);
      }
    }

    #${ELEMENT_ID} {
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      width: 100vw;
      height: 100vh;
      pointer-events: none !important; /* 关键：确保绝不拦截鼠标点击与页面操作 */
      z-index: 999999 !important;
      box-sizing: border-box;
      transition: opacity 0.2s ease-out;
    }
  `;
  document.head.appendChild(styleEl);
}

/**
 * 解析颜色值为 CSS 规范
 */
function resolveColor(color: FlashLevel): string {
  return COLOR_MAP[color] || color;
}

/**
 * 触发屏幕闪烁
 * @param options 配置参数，支持持续时间、单次周期、闪烁模式、颜色等
 * @returns Promise<void> 闪烁结束时 resolve
 *
 * @example
 * // 1. 默认闪烁 3 秒（四周边框红光呼吸）
 * flashScreen();
 *
 * @example
 * // 2. 指定闪烁 5 秒，全屏半透明模式，橙色预警
 * flashScreen({ duration: 5000, mode: 'fullscreen', color: 'warning' });
 *
 * @example
 * // 3. 闪烁 3 次后自动停止
 * flashScreen({ times: 3, interval: 500 });
 */
export function flashScreen(options: FlashScreenOptions = {}): Promise<void> {
  return new Promise((resolve) => {
    if (typeof document === 'undefined') {
      resolve();
      return;
    }

    ensureStyles();

    // 如果之前有正在进行的闪烁，先清除计时器与回调
    if (timer) {
      clearTimeout(timer);
      timer = null;
    }
    if (currentOnEnd) {
      currentOnEnd();
      currentOnEnd = null;
    }

    const {
      duration = 3000,
      interval = 600,
      mode = 'border',
      color = 'danger',
      times,
      maxOpacity = 0.45,
      onEnd,
    } = options;

    // 获取或创建遮罩 DOM 节点
    let overlay = document.getElementById(ELEMENT_ID);
    if (!overlay) {
      overlay = document.createElement('div');
      overlay.id = ELEMENT_ID;
      document.body.appendChild(overlay);
    }

    const parsedColor = resolveColor(color);

    // 设置最大透明度 CSS 变量
    overlay.style.setProperty('--flash-max-opacity', String(maxOpacity));

    // 根据模式设置样式表现
    if (mode === 'border') {
      // 四周发光光晕边框（大尺寸内阴影）
      overlay.style.backgroundColor = 'transparent';
      overlay.style.boxShadow = `inset 0 0 70px 25px ${parsedColor}, inset 0 0 15px 5px ${parsedColor}`;
    } else {
      // 全屏蒙层模式或爆闪模式
      overlay.style.boxShadow = 'none';
      overlay.style.backgroundColor = parsedColor;
    }

    // 绑定动画
    const animName = mode === 'strobe' ? '__screen_flash_strobe__' : '__screen_flash_pulse__';
    const animTiming = mode === 'strobe' ? 'steps(1, end)' : 'ease-in-out';
    overlay.style.animation = `${animName} ${interval}ms ${animTiming} infinite`;

    // 结束处理逻辑
    const finish = () => {
      stopFlashScreen();
      onEnd?.();
      resolve();
    };

    currentOnEnd = finish;

    // 计算实际持续时间：如果设置了 times，则按 (times * interval) 优先计算
    let totalDuration = duration;
    if (typeof times === 'number' && times > 0) {
      totalDuration = times * interval;
    }

    // 若持续时间 > 0，定时自动停止；若 <= 0 则代表常驻闪烁，等待外部调用 stopFlashScreen()
    if (totalDuration > 0) {
      timer = setTimeout(() => {
        timer = null;
        currentOnEnd = null;
        finish();
      }, totalDuration);
    }
  });
}

/**
 * 立即停止屏幕闪烁
 */
export function stopFlashScreen(): void {
  if (timer) {
    clearTimeout(timer);
    timer = null;
  }
  currentOnEnd = null;

  if (typeof document !== 'undefined') {
    const overlay = document.getElementById(ELEMENT_ID);
    if (overlay && overlay.parentNode) {
      overlay.parentNode.removeChild(overlay);
    }
  }
}

/**
 * 当前是否正在闪烁
 */
export function isFlashing(): boolean {
  if (typeof document === 'undefined') return false;
  return Boolean(document.getElementById(ELEMENT_ID));
}

/**
 * 组合联动：语音播报 + 屏幕闪烁告警
 * @param text 语音播报文本
 * @param flashOptions 闪烁参数（可直接传入闪烁时长毫秒，如 3000）
 * @param speakOptions 语音播报可选参数
 *
 * @example
 * // 一键触发：屏幕闪烁 3 秒并播报语音
 * alarmNotify('变电站1号变压器油温过高，请立即检查！', 3000);
 */
export function alarmNotify(
  text: string,
  flashOptions: FlashScreenOptions | number = 3000,
  speakOptions?: SpeakOptions
): Promise<boolean> {
  const fOpts: FlashScreenOptions = typeof flashOptions === 'number' ? { duration: flashOptions } : flashOptions;

  // 触发屏幕视觉闪烁
  flashScreen(fOpts);

  // 触发语音播报
  return speak(text, speakOptions);
}

export default flashScreen;
