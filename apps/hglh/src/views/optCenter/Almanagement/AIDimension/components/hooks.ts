import { Ref, ref } from 'vue';

export function useMyCycleList<T>(list: Ref<T[]>, change: () => void = () => {}) {
  let index = ref(0);
  function prev() {
    if (index.value === 0) {
      index.value = list.value.length - 1;
    } else {
      index.value--;
    }
    change();
  }
  function next() {
    if (index.value === list.value.length - 1) {
      index.value = 0;
    } else {
      index.value++;
    }
    change();
  }
  function go(_index: number) {
    index.value = _index;
    change();
  }
  return {
    prev,
    index,
    next,
    go,
  };
}
