<script setup lang="ts">
import {
  algorithmDetail,
  algorithmGetAll,
  algorithmUpdate,
  ArcRow,
  ArcType,
  PageType,
  Row,
  RowState,
} from '@/api/modules/optCenter/Almanagement/AIDimension';
import { computed, ref, onBeforeMount, watch } from 'vue';
import { ElMessage } from 'element-plus';
import { useMyCycleList } from '@/views/optCenter/Almanagement/AIDimension/components/hooks';
import { useConfirmDialog, useRefHistory } from '@vueuse/core';
import pictureDimension from './components/pictureDimensionArc.vue';
import useArcChange from './components/useArcChange';
import { useBackFileUrl, useRemoveURLObject } from '@optCenter/hooks/use-file-utils';
import { Warning } from '@element-plus/icons-vue';

interface Prop {
  id: string;
  pageType: PageType;
  rowState: RowState;
}
const props = withDefaults(defineProps<Prop>(), {});

interface Emit {
  (e: 'getList', page: PageType): void;
}
const emit = defineEmits<Emit>();
//图片切换
onBeforeMount(async () => {
  if (props.pageType === 'edit' && props.rowState === 'todo') {
    await getImageList();
    imageGo(imgList.value.findIndex((i) => i.id === props.id));
  } else {
    await getImageDetail(props.id);
  }
});
const urlArr = useRemoveURLObject();
let imgList = ref<Row[]>([]);
let imgTotal = ref<number>(0);
let { prev, next, index: imageIndex, go: imageGo } = useMyCycleList(imgList, infoViewShow);
async function getImageList() {
  try {
    let { data } = await algorithmGetAll();
    imgList.value = data?.list ?? [];
    imgTotal.value = data.total ?? 0;
    imgList.value.forEach((i) => {
      if (i.markImage) {
        useBackFileUrl(i.markImage).then((res) => {
          Reflect.set(i, 'imgPath', res);
          urlArr.add(res!);
        });
      }
    });
    return data.total ?? 0;
  } catch (e) {}
}
const imageItemRef = ref<HTMLDivElement[]>();
function infoViewShow() {
  dimensionDisable.value = true;
  radio.value = 'default';
  getImageDetail(imgList.value[imageIndex.value].id);
  let target = imageItemRef.value?.at(imageIndex.value);
  target?.scrollIntoView(false);
}
//标注操作
let arcList = ref<ArcRow[]>([]);
let state = ref<Partial<Row>>({ pointNum: 1, markType: '1' });
let floatList = new Array(6).fill(1);
let { radio, dimensionDisable, arcCenterDisable, positionDisable, clearArc, changeArc, validate } =
  useArcChange(arcList);
//标注点的操作
async function getImageDetail(id: string) {
  try {
    arcList.value = [];
    let { data } = await algorithmDetail({ id: id });
    state.value = data;
    if (!data.pointNum) state.value.pointNum = 1;
    if (state.value.markImage) {
      useBackFileUrl(state.value.markImage).then((res) => {
        Reflect.set(state.value!, 'imgPath', res);
        urlArr.add(res!);
      });
    }
    let arr1 = JSON.parse(data.circle ?? '[]') as ArcRow[];
    let arr2 = data.markType != '3' ? (JSON.parse(data.points ?? '[]') as ArcRow[]) : [];
    let arr3 = data.markType === '3' ? (JSON.parse(data.points ?? '[]') as ArcRow[]) : [];
    let arr = [
      ...arr1.map((i: ArcRow): ArcRow => {
        return {
          ...i,
          type: 'arcCenter',
          isConfirm: true,
        };
      }),
      ...arr2.map((i: ArcRow): ArcRow => {
        return {
          ...i,
          type: 'arc',
          isConfirm: true,
        };
      }),
      ...arr3.map((i: ArcRow): ArcRow => {
        return {
          ...i,
          type: 'position',
          isConfirm: true,
        };
      }),
    ];
    if (arr.length !== 0) arcList.value = arr;
    clear();
  } catch (e) {}
}

let showArcDialog = ref(false);
let dimensionDialogData = ref(false);
let showArcDialogValue = ref('');
let currentArcNumber = ref<number>();
let isArcCenter = ref(false);
const { undo, redo, canUndo, canRedo, clear } = useRefHistory(arcList, { deep: true });
const { reveal, confirm, cancel } = useConfirmDialog(showArcDialog);
async function addArc(obj: ArcRow) {
  if (obj.type === 'arc') {
    let initDrawArc = pictureDimensionRef.value?.initDrawArc;
    showArcDialogValue.value = '';
    translate(obj.x, obj.y);
    const { data, isCanceled } = await reveal();
    if (!isCanceled) {
      obj.value = data;
      obj.isConfirm = true;
      arcList.value.push(obj);
    } else {
      initDrawArc();
    }
  } else if (obj.type === 'arcCenter' || obj.type === 'position') {
    obj.value = 'no';
    obj.isConfirm = true;
    arcList.value.push(obj);
  }
}
async function delArc() {
  arcList.value.splice(currentArcNumber.value!, 1);
  dimensionDialogData.value = false;
  showArcDialogValue.value = '';
}
async function editArc() {
  dimensionDialogData.value = false;
  let obj = arcList.value[currentArcNumber.value!];
  showArcDialogValue.value = obj.value;
  translate(obj.x, obj.y);
  const { data, isCanceled } = await reveal();
  if (!isCanceled) {
    obj.value = data;
    obj.isConfirm = true;
  }
}
function DialogConfirm() {
  if (showArcDialogValue.value) {
    confirm(showArcDialogValue.value);
  } else {
    ElMessage.error(`请输入刻度！`);
  }
}
function moveArc(row: ArcRow, index: number) {
  let aorp = row.type === 'arcCenter' || row.type === 'position';
  showArcDialogValue.value = row.value as string;
  currentArcNumber.value = index;
  dimensionDialogData.value = !(aorp && props.pageType === 'detail');
  translate(row.x, row.y);
  isArcCenter.value = aorp;
}
function leaveArc() {
  dimensionDialogData.value = false;
  showArcDialogValue.value = '';
  currentArcNumber.value = undefined;
}
let pictureDimensionRef = ref();
let dialogWH = ref({ x: 0, y: 0 });
function translate(x: number, y: number) {
  let canvasClientRect = pictureDimensionRef.value?.canvasClientRect;
  dialogWH.value.x = canvasClientRect.x.value + x * canvasClientRect.offset.value;
  dialogWH.value.y = canvasClientRect.y.value + y * canvasClientRect.offset.value;
}
//页面操作
function close() {
  emit('getList', 'list');
}
async function imgSave() {
  try {
    let resPointData = await validate(state.value.markType as '1' | '2' | '3');
    let backgroundCanvas = pictureDimensionRef.value?.backgroundCanvas;
    let res = await algorithmUpdate({
      ...resPointData,
      pointNum: state.value?.pointNum!,
      threshold: state.value?.threshold!,
      id: state.value?.id!,
      imageWidth: backgroundCanvas.width!,
      imageHigh: backgroundCanvas.height!,
    });
    ElMessage.success(`${res.description}`);
    if (state.value.markStatus === 'todo') {
      let count = await getImageList();
      if (count === 0) {
        close();
      } else {
        imageGo(0);
        dimensionDisable.value = true;
        radio.value = 'default';
      }
    } else {
      close();
    }
  } catch (e) {
    ElMessage.error((e as Error).message);
  }
}
</script>

<template>
  <div class="dimension-add">
    <div class="dimension-left">
      <div class="dimension-left-content">
        <div v-if="pageType === 'edit'" class="back-button">
          <el-button @click="undo" :disabled="!canUndo">
            <template #icon>
              <img
                class="back-icon-history"
                alt="1"
                src="@/assets/images/videoControls/back.png"
                width="18"
                height="18"
              />
            </template>
            上一步
          </el-button>
          <el-button @click="redo" :disabled="!canRedo">
            <template #icon>
              <img
                class="back-icon-history"
                src="@/assets/images/videoControls/back.png"
                style="transform: rotateY(180deg)"
                alt="123"
                width="18"
                height="18"
              />
            </template>
            下一步
          </el-button>
        </div>
        <pictureDimension
          v-if="state?.imgPath"
          ref="pictureDimensionRef"
          class="pic-dimension-canvas flx-center"
          :pic-url="state?.imgPath!"
          @addArc="addArc"
          @moveArc="moveArc"
          @leaveArc="leaveArc"
          :disabled="pageType === 'detail' || dimensionDisable"
          :arc-list="arcList"
          :arc-type="radio"
        />
        <el-empty v-else class="pic-empty" description="目前没有任何预览图">
          <template #image>
            <img src="@/assets/images/notData.png" alt="1" />
          </template>
        </el-empty>
      </div>
      <div class="dimension-left-image" v-if="pageType === 'edit' && state.markStatus === 'todo'">
        <div class="image-title">{{ state?.presetPositionName }}（{{ imgTotal }}）</div>
        <div class="image-carousel">
          <el-button icon="ArrowLeft" @click="prev" circle class="Arrow left" />
          <el-scrollbar view-class="image-carousel-scroll">
            <div class="image-carousel-scroll-content">
              <div
                class="image-item"
                ref="imageItemRef"
                :class="{ active: imageIndex === index }"
                v-for="(i, index) in imgList"
                :key="index"
                @click="imageGo(index)"
              >
                <img alt="23" :src="i.imgPath" style="width: 100%; height: 100%; object-fit: contain" />
              </div>
            </div>
          </el-scrollbar>
          <el-button icon="ArrowRight" @click="next" circle class="Arrow right" />
        </div>
      </div>
    </div>
    <div class="dimension-right">
      <div class="dimension-right-description-items">
        <div class="dimension-right-description-items-label">预置位名称：</div>
        <div class="dimension-right-description-items-value">{{ state?.presetPositionName }}</div>
      </div>
      <div class="dimension-right-description-items">
        <div class="dimension-right-description-items-label">预置位ID：</div>
        <div class="dimension-right-description-items-value">{{ state?.presetPositionId }}</div>
      </div>
      <div class="dimension-right-description-items">
        <div class="dimension-right-description-items-label">关联算法：</div>
        <div class="dimension-right-description-items-value">{{ state?.algorithmName }}</div>
      </div>
      <div
        class="dimension-right-description-items"
        v-if="pageType === 'detail' && (state.markType === '1' || state.markType === '2')"
      >
        <div class="dimension-right-description-items-label">保留小数位：</div>
        <div class="dimension-right-description-items-value">{{ state?.pointNum }}</div>
      </div>
      <div class="dimension-right-description-items" v-if="pageType === 'detail' && state.markType === '3'">
        <div class="dimension-right-description-items-label">阈值：</div>
        <div class="dimension-right-description-items-value">{{ state?.threshold }}</div>
      </div>
      <template v-if="pageType === 'edit'">
        <template v-if="state.markType === '2' || state.markType === '1'">
          <div class="dimension-right-description-items" v-if="state.markType === '1'">
            <div class="dimension-right-description-items-label">
              圆心：
              <el-tooltip effect="light" placement="bottom-end">
                <el-icon>
                  <Warning />
                </el-icon>
                <template #content>
                  <p>只能标注一个;</p>
                </template>
              </el-tooltip>
            </div>
            <div class="dimension-right-description-items-value flx-align-center">
              <div
                class="arvOperations flx-center"
                :title="arcCenterDisable ? '只允许有一个圆心' : ''"
                @click="arcCenterDisable ? undefined : changeArc('arcCenter')"
              >
                <img
                  v-if="radio === 'arcCenter'"
                  src="@/assets/images/AiDimension/arcCenter.png"
                  width="30"
                  height="30"
                />
                <img v-else src="@/assets/images/AiDimension/arcItem.png" width="20" height="20" />
              </div>
              <div class="arvOperationsDel flx-center" @click="clearArc('arcCenter')">
                <div class="arc-delete-icon"></div>
                <div class="arc-delete-text">清空所标圆心</div>
              </div>
            </div>
          </div>
          <div class="dimension-right-description-items">
            <div class="dimension-right-description-items-label">
              刻度：
              <el-tooltip effect="light" placement="bottom-end">
                <el-icon>
                  <Warning />
                </el-icon>
                <template #content>
                  <p>至少标注10个;</p>
                </template>
              </el-tooltip>
            </div>
            <div class="dimension-right-description-items-value flx-align-center">
              <div class="arvOperations flx-center" @click="changeArc('arc')">
                <img v-if="radio === 'arc'" src="@/assets/images/AiDimension/arcCenter.png" width="30" height="30" />
                <img v-else src="@/assets/images/AiDimension/arcItem.png" width="20" height="20" />
              </div>
              <div class="arvOperationsDel flx-center" @click="clearArc('arc')">
                <div class="arc-delete-icon"></div>
                <div class="arc-delete-text">清空所标刻度</div>
              </div>
            </div>
          </div>
          <div class="dimension-right-description-items">
            <div class="dimension-right-description-items-label">保留小数位：</div>
            <div class="dimension-right-description-items-value">
              <el-select v-model="state!.pointNum" style="width: 132px" clearable>
                <el-option
                  v-for="(i, index) in floatList"
                  :key="index"
                  :label="index + 1"
                  :value="index + 1"
                ></el-option>
              </el-select>
            </div>
          </div>
        </template>
        <template v-if="state.markType === '3'">
          <div class="dimension-right-description-items">
            <div class="dimension-right-description-items-label">
              点位：
              <el-tooltip effect="light" placement="bottom-end">
                <el-icon>
                  <Warning />
                </el-icon>
                <template #content>
                  <p>最多标注4个;</p>
                </template>
              </el-tooltip>
            </div>
            <div class="dimension-right-description-items-value flx-align-center">
              <div class="arvOperations flx-center" @click="positionDisable ? undefined : changeArc('position')">
                <img
                  v-if="radio === 'position'"
                  src="@/assets/images/AiDimension/arcCenter.png"
                  width="30"
                  height="30"
                />
                <img v-else src="@/assets/images/AiDimension/arcItem.png" width="20" height="20" />
              </div>
              <div class="arvOperationsDel flx-center" @click="clearArc('position')">
                <div class="arc-delete-icon"></div>
                <div class="arc-delete-text">清空所标点位</div>
              </div>
            </div>
          </div>
          <div class="dimension-right-description-items">
            <div class="dimension-right-description-items-label">阈值：</div>
            <div class="dimension-right-description-items-value">
              <el-input-number
                v-model="state!.threshold"
                style="width: 132px"
                clearable
                :max="1"
                :min="0"
                controls-position="right"
              ></el-input-number>
            </div>
          </div>
        </template>
        <div class="dimension-right-description-items">
          <div class="dimension-right-description-items-label"></div>
          <div class="dimension-right-description-items-value">
            <el-button @click="close">取消</el-button>
            <el-button @click="imgSave" type="primary">保存</el-button>
          </div>
        </div>
      </template>
    </div>
    <teleport to="body">
      <div class="AIDimension-dialog" v-if="showArcDialog">
        <div class="dimension-dialog-box" :style="{ transform: `translate(${dialogWH.x}px,${dialogWH.y}px)` }">
          <div class="dimension-dialog-title">刻度值</div>
          <div class="dimension-dialog-input">
            <el-input v-model="showArcDialogValue" type="number"></el-input>
          </div>
          <div class="dimension-dialog-button">
            <el-button @click="cancel">取消</el-button>
            <el-button @click="DialogConfirm" type="primary">确定</el-button>
          </div>
        </div>
      </div>
    </teleport>
    <teleport to="body">
      <div
        class="AIDimension-dialog-data flx-align-center"
        :style="{ transform: `translate(${dialogWH.x}px,${dialogWH.y}px)` }"
        v-if="dimensionDialogData"
      >
        <div
          class="dimension-dialog-title"
          :style="{ 'margin-right': pageType === 'edit' ? '50px' : '' }"
          v-if="!isArcCenter"
        >
          {{ showArcDialogValue }}
        </div>
        <div class="dimension-dialog-icon" v-if="pageType === 'edit'">
          <el-icon size="18" v-if="!isArcCenter" @click="editArc"><EditPen /></el-icon>
          <el-icon size="18" @click="delArc"><Delete /></el-icon>
        </div>
      </div>
    </teleport>
  </div>
</template>

<style scoped lang="scss">
.dimension-add {
  display: flex;
  gap: 20px;
  width: 100%;
  height: 100%;
  .dimension-left {
    display: flex;
    flex: 1;
    flex-direction: column;
    overflow: hidden;
    .dimension-left-content {
      position: relative;
      flex: 1;
      overflow: hidden;
      .pic-dimension-canvas {
        position: absolute;
        top: 0;
        left: 0;
        z-index: 1;
        width: 100%;
        height: 100%;
        background: var(--el-fill-color-light);
      }
      .back-button {
        position: absolute;
        top: 16px;
        left: 16px;
        z-index: 2;
        .is-disabled {
          .back-icon-history {
            opacity: 0.5;
          }
        }
      }
      .pic-empty {
        width: 100%;
        height: 100%;
        background: var(--el-fill-color-light);
      }
    }
    .dimension-left-image {
      .image-title {
        margin: 10px 0;
        font-size: 14px;
        color: var(--el-text-color-primary);
      }
      .image-carousel {
        position: relative;
        padding: 0 7px;
        :deep(.el-scrollbar__wrap) {
          .image-carousel-scroll-content {
            display: flex;
            gap: 10px;
            height: 68px;
            .image-item {
              box-sizing: border-box;
              display: flex;
              flex-shrink: 0;
              align-items: center;
              justify-content: center;
              width: 108px;
              height: inherit;
              background: var(--el-fill-color-light);
              border: 5px solid transparent;
              &.active {
                border: 5px solid #007fff;
              }
            }
          }
        }
        .Arrow {
          position: absolute;
          top: calc(50% - 24px / 2);
          z-index: 1;
          width: 24px;
          height: 24px;
          border: none;
          box-shadow: 0 0 5px 0 rgb(0 0 0 / 50%);
          &.left {
            left: 5px;
          }
          &.right {
            right: 5px;
          }
        }
      }
    }
  }
  .dimension-right {
    width: 360px;
    .dimension-right-description-items {
      display: flex;
      align-items: center;
      margin-bottom: 15px;
      .dimension-right-description-items-label {
        width: 85px;
        font-size: 14px;
        color: var(--el-text-color-secondary);
        text-align: right;
      }
      .dimension-right-description-items-value {
        flex: 1;
        margin-left: 15px;
        font-size: 14px;
        color: var(--el-text-color-regular);
        .arvOperations {
          width: 30px;
          height: 30px;
          margin-right: 20px;
          cursor: pointer;
        }
        .arvOperationsDel {
          gap: 2px;
          font-size: 12px;
          color: var(--el-text-color-secondary);
          cursor: pointer;
          .arc-delete-icon {
            width: 16px;
            height: 16px;
            background-image: url('@/assets/images/AiDimension/arc-center-default.png');
            background-size: 100%;
          }
          &:hover {
            color: var(--el-text-color-regular);
            .arc-delete-icon {
              background-image: url('@/assets/images/AiDimension/arc-center-hover.png');
            }
          }
        }
      }
    }
  }
}
</style>
<style lang="scss">
.AIDimension-dialog {
  position: fixed;
  top: 0;
  left: 0;
  z-index: 3;
  width: 100%;
  height: 100%;
  .dimension-dialog-box {
    position: absolute;
    width: 200px;
    padding: 10px;
    margin-top: -50px;
    margin-left: 20px;
    background: #ffffff;
    .dimension-dialog-title {
      font-size: 14px;
      color: var(--el-text-color-primary);
    }
    .dimension-dialog-input {
      margin: 10px 0;
    }
    .dimension-dialog-button {
      text-align: right;
    }
  }
}
.AIDimension-dialog-data {
  position: fixed;
  top: 0;
  left: 0;
  z-index: 3;
  justify-content: space-between;
  height: 32px;
  padding: 3px 5px;
  margin-top: -20px;
  margin-left: 20px;
  background: #ffffff;
  border-radius: 4px;
  .dimension-dialog-title {
    font-size: 16px;
    color: var(--el-text-color-regular);
  }
  .dimension-dialog-icon {
    display: flex;
    gap: 10px;
    align-items: center;
    color: var(--el-text-color-secondary);
    & .el-icon:hover {
      color: var(--el-text-color-regular);
      cursor: pointer;
    }
  }
}
</style>
