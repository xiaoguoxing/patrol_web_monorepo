import { computed, ref, Ref, watch } from 'vue';
import { ArcType, ArcRow } from '@/api/modules/optCenter/Almanagement/AIDimension';
import { ElMessage } from 'element-plus';
export default function useArcChange(arcList: Ref<ArcRow[]>) {
  let radio = ref<ArcType>('default');
  let dimensionDisable = ref<boolean>(true);
  let arcCenterDisable = ref<boolean>(false);
  let positionDisable = ref<boolean>(false);
  let arcCenter = computed(() => arcList.value.filter((i) => i.type === 'arcCenter'));
  let arc = computed(() => arcList.value.filter((i) => i.type === 'arc'));
  let position = computed(() => arcList.value.filter((i) => i.type === 'position'));
  //状态切换操作
  function changeArc(type: ArcType) {
    if (radio.value === type) {
      dimensionDisable.value = true;
      radio.value = 'default';
    } else {
      dimensionDisable.value = false;
      radio.value = type;
    }
  }
  //清除操作
  function clearArc(type: ArcType) {
    if (arc.value.length !== 0 || arcCenter.value.length !== 0 || position.value.length !== 0)
      arcList.value = arcList.value.filter((i) => !(i.type === type));
  }
  //判断是否可操作
  function ArcNumberChange() {
    arcCenterDisable.value = arcCenter.value.length >= 1;
    positionDisable.value = position.value.length >= 4;
    switch (radio.value) {
      case 'arcCenter':
        if (arcCenter.value.length >= 1) {
          dimensionDisable.value = true;
          radio.value = 'default';
        }
        break;
      case 'position':
        if (position.value.length >= 4) {
          dimensionDisable.value = true;
          radio.value = 'default';
        }
        break;
    }
  }
  //最后验证
  async function validate(markType: '1' | '2' | '3') {
    if (markType === '1' && arcCenter.value.length !== 1) {
      throw new Error(`圆心必须标注！`);
    }
    if ((markType === '2' || markType === '1') && arc.value.length < 10) {
      throw new Error(`刻度点位不能少于10个`);
    }
    if (markType === '3' && position.value.length !== 4) {
      throw new Error(`点位不能少于4个！`);
    }
    return {
      circle: (markType as '1' | '2') === '1' ? JSON.stringify(arcCenter.value.map((i) => ({ x: i.x, y: i.y }))) : '',
      points:
        (markType as '3') === '3'
          ? JSON.stringify(position.value.map((i) => ({ x: i.x, y: i.y })))
          : JSON.stringify(arc.value.map((i) => ({ x: i.x, y: i.y, value: i.value }))),
    };
  }
  watch(
    arcList,
    () => {
      ArcNumberChange();
    },
    {
      deep: true,
    }
  );
  return {
    radio,
    dimensionDisable,
    arcCenterDisable,
    positionDisable,
    arcCenter,
    arc,
    position,
    changeArc,
    clearArc,
    validate,
    ArcNumberChange,
  };
}
