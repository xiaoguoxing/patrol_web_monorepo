/**
 * 浏览器原生语音播报工具函数
 * 基于 Web Speech API (window.speechSynthesis)
 */

export interface SpeakOptions {
  /** 语速，范围 0.1 到 10，默认为 1 (建议正常范围 0.8 - 1.2) */
  rate?: number;
  /** 音调，范围 0 到 2，默认为 1 */
  pitch?: number;
  /** 音量，范围 0 到 1，默认为 1 */
  volume?: number;
  /** 语言代码，默认为 'zh-CN' */
  lang?: string;
  /** 是否立即打断正在播报的语音，默认为 true */
  immediate?: boolean;
  /** 播报开始时的回调 */
  onStart?: () => void;
  /** 播报结束时的回调 */
  onEnd?: () => void;
  /** 播报出错时的回调 */
  onError?: (event: SpeechSynthesisErrorEvent) => void;
}

/**
 * 检查当前浏览器环境是否支持语音播报
 */
export function isSpeechSupported(): boolean {
  return (
    typeof window !== 'undefined' && 'speechSynthesis' in window && typeof SpeechSynthesisUtterance !== 'undefined'
  );
}

/**
 * 获取可用的中文声音列表
 */
export function getChineseVoices(): SpeechSynthesisVoice[] {
  if (!isSpeechSupported()) return [];
  const voices = window.speechSynthesis.getVoices();
  return voices.filter((v) => v.lang.includes('zh') || v.lang.includes('cmn') || /chinese/i.test(v.name));
}

// 维持对当前 Utterance 实例的全局引用，防止部分浏览器（如 Chrome）的垃圾回收导致长音频中途被切断
let currentUtterance: SpeechSynthesisUtterance | null = null;

/**
 * 语音播报方法
 * @param text 需要播报的文本内容
 * @param options 可选配置（语速、音调、音量、打断行为及回调事件等）
 * @returns Promise<boolean> 播报完成返回 true，不支持或播报失败返回 false
 *
 * @example
 * // 基础用法
 * speak('设备发生告警，请及时处理');
 *
 * @example
 * // 自定义语速、音调与回调
 * speak('正在执行巡检任务', {
 *   rate: 1.1,
 *   onEnd: () => console.log('播报结束')
 * });
 */
export function speak(text: string, options: SpeakOptions = {}): Promise<boolean> {
  return new Promise((resolve) => {
    if (!isSpeechSupported()) {
      console.warn('[Speech] 当前浏览器不支持 Web Speech API 语音合成功能');
      resolve(false);
      return;
    }

    if (!text || typeof text !== 'string' || !text.trim()) {
      console.warn('[Speech] 播报文本为空，已跳过');
      resolve(false);
      return;
    }

    const { rate = 1, pitch = 1, volume = 1, lang = 'zh-CN', immediate = true, onStart, onEnd, onError } = options;

    const synth = window.speechSynthesis;

    // 如果需要立即播放，打断前序正在播放的语音
    if (immediate) {
      synth.cancel();
    }

    // 解决部分 Chromium 浏览器长时间暂停或后台唤醒后假死问题
    if (synth.paused) {
      synth.resume();
    }

    const utterance = new SpeechSynthesisUtterance(text);
    currentUtterance = utterance;

    utterance.rate = rate;
    utterance.pitch = pitch;
    utterance.volume = volume;
    utterance.lang = lang;

    // 匹配中文声音
    const matchVoice = () => {
      const zhVoices = getChineseVoices();
      if (zhVoices.length > 0) {
        utterance.voice = zhVoices.find((v) => v.default) || zhVoices[0];
      }
    };

    matchVoice();

    // 如果声音列表尚未加载完毕，尝试监听 voiceschanged
    if (!utterance.voice && synth.onvoiceschanged !== undefined) {
      synth.onvoiceschanged = () => {
        matchVoice();
      };
    }

    utterance.onstart = () => {
      onStart?.();
    };

    utterance.onend = () => {
      if (currentUtterance === utterance) {
        currentUtterance = null;
      }
      onEnd?.();
      resolve(true);
    };

    utterance.onerror = (event) => {
      if (currentUtterance === utterance) {
        currentUtterance = null;
      }
      // 'canceled' 或 'interrupted' 通常是由主动调用 cancel() 触发的打断，无需按错误报错
      if (event.error !== 'canceled' && event.error !== 'interrupted') {
        console.error('[Speech] 语音播报错误:', event.error);
        onError?.(event);
      }
      resolve(false);
    };

    synth.speak(utterance);
  });
}

/**
 * 停止/打断当前的语音播报
 */
export function stopSpeak(): void {
  if (isSpeechSupported()) {
    currentUtterance = null;
    window.speechSynthesis.cancel();
  }
}

/**
 * 暂停当前语音播报
 */
export function pauseSpeak(): void {
  if (isSpeechSupported()) {
    window.speechSynthesis.pause();
  }
}

/**
 * 恢复当前暂停的语音播报
 */
export function resumeSpeak(): void {
  if (isSpeechSupported()) {
    window.speechSynthesis.resume();
  }
}

/**
 * 检查当前是否正在播报中
 */
export function isSpeaking(): boolean {
  return isSpeechSupported() ? window.speechSynthesis.speaking : false;
}

export default speak;
