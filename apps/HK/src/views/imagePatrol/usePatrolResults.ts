import { computed, shallowRef } from 'vue';
import { useTimeoutFn } from '@vueuse/core';
import type { PatrolTaskItem } from './types';

// 与 demo 一致，每条完成结果至少展示 4.8 秒；后端巡检和实时进度不受这个时间影响。
export const RESULT_DISPLAY_MS = 4800;

interface ResultEntry {
  taskId: string;
  item: PatrolTaskItem;
}

function copyEntry(taskId: string, item: PatrolTaskItem): ResultEntry {
  return {
    taskId,
    item: {
      ...item,
      imagePoint: item.imagePoint && typeof item.imagePoint === 'object' ? { ...item.imagePoint } : item.imagePoint,
    },
  };
}

export function usePatrolResults() {
  const liveEntry = shallowRef<ResultEntry>();
  const heldEntry = shallowRef<ResultEntry>();
  const lastEntry = shallowRef<ResultEntry>();
  const manualEntry = shallowRef<ResultEntry>();
  const queue: ResultEntry[] = [];
  const previousStatuses = new Map<string, string>();
  let previousTaskId = '';

  const displayEntry = computed(() => manualEntry.value || heldEntry.value || liveEntry.value || lastEntry.value);
  const resultItem = computed(() => displayEntry.value?.item);
  const resultKey = computed(() => {
    const entry = displayEntry.value;
    return entry ? JSON.stringify([entry.taskId, entry.item.itemId]) : '';
  });

  // 使用 VueUse 管理计时器，组件卸载时自动清理。
  const { start, stop } = useTimeoutFn(
    () => {
      if (manualEntry.value) {
        manualEntry.value = undefined;
        // 手动查看历史结果后，恢复自动展示；被暂停的完成结果重新获得完整展示时间。
        if (heldEntry.value) {
          start();
          return;
        }
      } else if (heldEntry.value) {
        lastEntry.value = heldEntry.value;
        heldEntry.value = undefined;
      }
      showNextResult();
    },
    RESULT_DISPLAY_MS,
    { immediate: false }
  );

  function showNextResult() {
    if (heldEntry.value || manualEntry.value) return;
    const next = queue.shift();
    if (!next) return;
    heldEntry.value = next;
    start();
  }

  function updateSnapshot(taskId: string, items: PatrolTaskItem[]) {
    const isFirstSnapshot = taskId !== previousTaskId;
    if (isFirstSnapshot) {
      previousTaskId = taskId;
      previousStatuses.clear();
    }

    const current = items.find((item) => item.itemStatus === 'during');
    const latestFinished = items
      .slice()
      .reverse()
      .find((item) => item.itemStatus === 'finished');
    const liveItem = current || latestFinished;
    liveEntry.value = liveItem ? copyEntry(taskId, liveItem) : undefined;

    items.forEach((item) => {
      const itemId = String(item.itemId);
      // 首次进入只记录历史状态，不补播整轮旧结果；后续新完成的任务项按巡检顺序入队。
      if (!isFirstSnapshot && item.itemStatus === 'finished' && previousStatuses.get(itemId) !== 'finished') {
        queue.push(copyEntry(taskId, item));
      }
      previousStatuses.set(itemId, item.itemStatus);

      // 后续快照可补充同一结果的数据，但不会重置停留时间，也不会覆盖成下一个任务项。
      const matches = (entry: ResultEntry | undefined) =>
        entry?.taskId === taskId && String(entry.item.itemId) === itemId;
      if (matches(heldEntry.value) && item.itemStatus === 'finished') heldEntry.value = copyEntry(taskId, item);
      if (matches(manualEntry.value)) manualEntry.value = copyEntry(taskId, item);
      const queuedIndex = queue.findIndex(matches);
      if (queuedIndex >= 0 && item.itemStatus === 'finished') queue[queuedIndex] = copyEntry(taskId, item);
    });
    showNextResult();
  }

  function selectResult(taskId: string, item: PatrolTaskItem) {
    manualEntry.value = copyEntry(taskId, item);
    // 用户主动点击可以切换卡片，但自动队列暂停，不消耗尚未展示的结果。
    start();
  }

  function resetResults() {
    stop();
    queue.length = 0;
    previousStatuses.clear();
    previousTaskId = '';
    liveEntry.value = undefined;
    heldEntry.value = undefined;
    manualEntry.value = undefined;
    lastEntry.value = undefined;
  }

  return { resultItem, resultKey, updateSnapshot, selectResult, resetResults };
}
