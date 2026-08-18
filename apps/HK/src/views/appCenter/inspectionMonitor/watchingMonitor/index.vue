<template>
  <kr-card
    class="flex-1 two-col-page watchCard"
    :class="{ drag: isDrag }"
    :bodyStyle="{ position: 'relative' }"
    ref="watchCard"
    :header="cardTitle"
    header-border
  >
    <kr-filter-tree
      v-if="isCollapse"
      class="two-col-page-lf"
      v-dragLine
      placeholder="请输入您想搜索的设备名称"
      :data="dataSource"
      label="nodeName"
      :highlightCurrent="false"
      ref="treeRef"
    >
      <template #default="{ node, data }">
        <span
          class="custom-tree-node"
          :class="{ move: nodeType.includes(data.nodeType) }"
          @mousedown="(e:MouseEvent) => (nodeType.includes(data.nodeType) ? nodeDragStart(data, e) : () => {})"
        >
          <span>{{ node.label }}</span>
        </span>
      </template>
    </kr-filter-tree>
    <collapseBar v-model="isCollapse" :treeWidth="treeWidth"></collapseBar>
    <div class="two-col-page-rt">
      <div class="watching-title">
        <my-tabs v-model="tabValue" :options="tabOpt" @change="tabsChange"></my-tabs>
        <el-button @click="toggle" icon="FullScreen">{{ isFullscreen ? '退出全屏' : '全屏' }}</el-button>
        <!--        <el-button @click="clearMonitor" :disabled="!monitorLen" icon="Delete">清空</el-button>-->
      </div>
      <div class="watching-container">
        <div
          class="watching-item"
          :class="{ active: index === watchingItemIndex, 'video-active': item.id }"
          ref="watchingItemRef"
          :data-index="index"
          :key="index"
          v-for="(item, index) in monitorItem"
          v-show="item.isShow"
        >
          <videoRealTime
            v-if="item.id"
            :dataIndex="index"
            :key="item.id"
            ref="videoRef"
            :is-canvas="false"
            :show-controls="tabValue === 1"
            :cameraId="item.id"
            :play-type="item.relatedAlgorithm ? 1 : nodeTypeLabel[item.nodeType]"
            @err="videoErr(item)"
            @success="videoSuccess(item)"
          ></videoRealTime>
          <el-icon v-if="item.id" class="del-icon" size="24" :color="delColor" @click="del(item)">
            <CircleClose />
          </el-icon>
        </div>
      </div>
      <div
        class="watching-tip"
        v-if="isDrag"
        :data-index="watchingItemIndex"
        :style="{ transform: `translate(${MouseX}px,${MouseY}px)` }"
      >
        {{ nodeRow?.nodeName }}（{{ watchingItemIndex != undefined ? '松开鼠标' : '请拖拽至👉' }}）
      </div>
    </div>
  </kr-card>
</template>
<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue';
import { MonitorItem, Tabs } from '@/api/modules/appCenter/inspectionMonitor/watchingMonitor';
import MyTabs from '@/components/Tabs/index.vue';
import { useFullscreen, useElementSize } from '@vueuse/core';
import { useRoute, useRouter } from 'vue-router';
import { getCameraTreeApi, Tree } from '@/api/modules/camera';
import videoRealTime from '@optCenter/videoRealTime.vue';
import { treeFirst, treeItem } from '@/api/modules/optCenter/aiPatrolManage/position';
import collapseBar from '@appCenter/components/collapseBar.vue';
import { ElMessage } from 'element-plus';
import { videoNodeType } from '@optCenter/hooks/use-video';
let route = useRoute();
let router = useRouter();
let { nodeType, nodeTypeLabel } = videoNodeType();
let cardTitle = route.meta?.title || '';
let watchCard = ref();
const { toggle, isFullscreen } = useFullscreen(watchCard);

onMounted(() => {
  setMonitor();
  setMonitorItem(0, defaultData.value!);
  window.addEventListener('mousemove', move);
  window.addEventListener('mouseup', mouseup);
});
onUnmounted(() => {
  window.removeEventListener('mousemove', move);
  window.removeEventListener('mouseup', mouseup);
});
//分屏
const tabOpt: Tabs[] = [
  { label: '单一屏', value: 1 },
  { label: '四分屏', value: 2 },
  { label: '九分屏', value: 3 },
  { label: '十六分屏', value: 4 },
  { label: '三十六分屏', value: 6 },
];
for (const argument of tabOpt) {
  argument.arrValue = argument.value * argument.value;
}
let monitorItem = ref<MonitorItem[]>([]);
let videoRef = ref<any[]>([]);
let treeRef = ref();
const AI = 2;
const RTC = 99;
let monitorLen = computed(() => monitorItem.value.filter((i) => i.id));
let AICount = computed(() => monitorLen.value.filter((i) => i.relatedAlgorithm).length);
let RTCCount = computed(() => monitorLen.value.filter((i) => !i.relatedAlgorithm).length);
let isAI = computed(() => AICount.value < AI);
let isRTC = computed(() => RTCCount.value < RTC);
let tabValue = ref<number>(1);
let watchingItemRef = ref<HTMLDivElement[]>([]);
let watchingItemIndex = ref<number>();
let delColor = ref<string>('#000');
const { width } = useElementSize(treeRef);
let treeWidth = computed(() => width.value + 'px');

function setMonitor() {
  for (const x of new Array(Math.max(...tabOpt.map((i) => i.arrValue!)))) {
    monitorItem.value.push({ isShow: false, relatedAlgorithm: false });
  }
  tabsChange(tabOpt[0]);
}

function clearMonitor() {
  monitorItem.value.map((i) => {
    Reflect.deleteProperty(i, 'id');
    Reflect.deleteProperty(i, 'nodeName');
  });
}

function setMonitorItem(index: number, node: Tree) {
  Reflect.set(monitorItem.value[index], 'id', node?.id);
  Reflect.set(monitorItem.value[index], 'nodeName', node?.nodeName);
  Reflect.set(monitorItem.value[index], 'nodeType', node?.nodeType);
  Reflect.set(monitorItem.value[index], 'relatedAlgorithm', node?.relatedAlgorithm);
  /*nextTick(() => {
    if (monitorItem.value[index]?.state === 'err') {
      videoRef.value[index]?.init();
    }
  });*/
}

function del(item: any) {
  Reflect.deleteProperty(item, 'id');
  Reflect.deleteProperty(item, 'nodeName');
}

function videoErr(item: MonitorItem) {
  setVideoDelColor('#000');
  Reflect.set(item, 'state', 'err');
}

function videoSuccess(item: MonitorItem) {
  setVideoDelColor();
  Reflect.set(item, 'state', 'success');
  let p = eval(route.query.presetPositionInfo as string);
  if (p) {
    videoRef.value[0]
      .rotate(p)
      .then(() => {
        if (route.query.presetPositionInfo) {
          router.push({
            path: route.path,
            query: {},
          });
        }
      })
      .catch(() => {});
  }
}

function setVideoDelColor(color: string = '#fff') {
  delColor.value = color;
}

function tabsChange(val: Tabs) {
  for (let [index, value] of monitorItem.value.entries()) {
    let l = index + 1;
    Reflect.set(value, 'isShow', l <= val.arrValue!);
  }
}

const nodeRow = ref<Tree>();
const isDrag = ref<boolean>(false);
const MouseY = ref<number>();
const MouseX = ref<number>();

function nodeDragStart(data: Tree, e: MouseEvent) {
  nodeRow.value = data;
  isDrag.value = true;
  setHtmlCursor('grabbing');
  setTipMouse(e);
}

function move(e: MouseEvent) {
  if (isDrag.value) {
    setTipMouse(e);
    let divDataSet = (e.target as HTMLDivElement).dataset;
    if (divDataSet.index) {
      watchingItemIndex.value = parseInt(divDataSet.index || '0');
      setHtmlCursor('grabbing');
    } else {
      watchingItemIndex.value = undefined;
      setHtmlCursor('no-drop');
    }
  }
}

function mouseup(e: MouseEvent) {
  if (watchingItemIndex.value !== undefined) {
    let a = monitorItem.value.findIndex((i) => i.id === nodeRow.value?.id);
    if (a === -1) {
      if (nodeRow.value?.relatedAlgorithm) {
        if (isAI.value) {
          setMonitorItem(watchingItemIndex.value, nodeRow.value!);
        } else {
          ElMessage.warning(`AI算法识别视频最多可放${AI}个`);
        }
      } else {
        if (isRTC.value) {
          setMonitorItem(watchingItemIndex.value, nodeRow.value!);
        } else {
          ElMessage.warning(`最多可放${RTC}个`);
        }
      }
      // setMonitorItem(watchingItemIndex.value, nodeRow.value!);
    } else {
      if (a !== watchingItemIndex.value) {
        setMonitorItem(a, { id: '', nodeName: '', nodeType: 3, relatedAlgorithm: false, syncData: false });
      }
      setMonitorItem(watchingItemIndex.value, nodeRow.value!);
    }
  }
  isDrag.value = false;
  nodeRow.value = undefined;
  watchingItemIndex.value = undefined;
  setHtmlCursor(null);
}

function setTipMouse(e: MouseEvent) {
  MouseX.value = e.x + 10;
  MouseY.value = e.y + 10;
}

function setHtmlCursor(cursor: string | null) {
  document.body.style.setProperty('cursor', cursor, 'important');
}

//树操作
//树操作
const dataSource = ref<Tree[]>([]);
const defaultData = ref<Tree>();
const getTreeList = async () => {
  let { data } = await getCameraTreeApi();
  dataSource.value = data;
  if (route.query.id) {
    defaultData.value = treeItem(data, route.query.id as string) as Tree;
  } else {
    defaultData.value = treeFirst(data, nodeType.value) as Tree;
  }
};
await getTreeList();

let isCollapse = ref(true);
</script>
<style scoped lang="scss">
.watchCard {
  .watching-title {
    display: flex;
    justify-content: space-between;
    margin-bottom: 20px;
  }
  .watching-container {
    display: grid;
    grid-template-rows: repeat(v-bind(tabValue), 1fr);
    grid-template-columns: repeat(v-bind(tabValue), 1fr);
    grid-gap: 8px;
    height: calc(100% - (var(--el-component-size) + 20px));
    .watching-item {
      position: relative;
      overflow: hidden;
      background: var(--el-fill-color-light);
      &.active {
        cursor: grabbing;
        background: #00000051;
      }
      &.video-active {
        background: #000000;
      }
      .del-icon {
        position: absolute;
        top: 10px;
        right: 10px;
        z-index: 2;
        cursor: pointer;
      }
    }
    .watching-container-tip {
      position: absolute;
      top: 0;
      left: 0;
      box-sizing: border-box;
      display: flex;
      align-items: center;
      justify-content: center;
      width: 100%;
      height: 100%;
      font-size: 50px;
      color: red;
      pointer-events: none;
    }
  }
  .custom-tree-node {
    display: flex;
    flex: 1;
    align-items: center;
    justify-content: space-between;
    padding-right: 10px;
    user-select: none;
    &.move {
      cursor: grab;
      &:active {
        cursor: grabbing;
      }
    }
  }
  .watching-tip {
    position: fixed;
    top: 0;
    left: 0;
    z-index: 3;
    padding: 0 5px;
    background: var(--el-fill-color-light);
  }
}
</style>
