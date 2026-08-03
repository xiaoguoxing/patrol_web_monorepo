<template>
  <kr-card
    class="flex-1 two-col-page watchCard"
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
      @change="changeTreeFilter"
    ></kr-filter-tree>
    <collapseBar v-model="isCollapse" :treeWidth="treeWidth"></collapseBar>
    <div class="two-col-page-rt">
      <div class="watching-title">
        <my-tabs v-model="tabValue" :options="tabOpt" @change="tabsChange"></my-tabs>
        <el-button @click="close">关闭</el-button>
        <el-button @click="closeAll">清空</el-button>
        <el-button @click="toggle" icon="FullScreen">{{ isFullscreen ? '退出全屏' : '全屏' }}</el-button>
      </div>
      <div class="watching-container">
        <videoRealTime
          ref="videoRef"
          :show-controls="true"
          :play-type="nodeTypeLabel[defaultData.nodeType]"
          class="watching-container-video"
          :is-canvas="false"
          @success="videoSuccess"
          :cameraId="defaultData!.id"
        ></videoRealTime>
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
//分屏
const tabOpt: Tabs[] = [
  { label: '单一屏', value: 1 },
  // { label: '1x2', value: 12 },
  // { label: '2x1', value: 21 },
  { label: '四分屏', value: 2 },
  { label: '九分屏', value: 3 },
  { label: '十六分屏', value: 4 },
];
let videoRef = ref();
let tabValue = ref<number>(1);
function tabsChange(val: Tabs) {
  videoRef.value.currentComponentName.changeWindowLayout(val.value);
}
function changeTreeFilter(val: string, data: Tree) {
  if (data.nodeType === 3) {
    videoRef.value.currentComponentName.setCamera(data.id);
  }
}
function close(val: string, data: Tree) {
  videoRef.value.currentComponentName.close();
}
function closeAll(val: string, data: Tree) {
  videoRef.value.currentComponentName.closeAll();
}
//树操作
let treeRef = ref();
const { width } = useElementSize(treeRef);
let treeWidth = computed(() => width.value + 'px');
let isCollapse = ref(true);
const dataSource = ref<Tree[]>([]);
const defaultData = ref<Tree>();
const getTreeList = async () => {
  let { data } = await getCameraTreeApi();
  dataSource.value = data;
  if (route.query.id) {
    defaultData.value = treeItem(data, route.query.id as string) as Tree;
  } else {
    defaultData.value = treeFirst(data, [3]) as Tree;
  }
};
await getTreeList();

function videoSuccess() {
  let p = eval(route.query.presetPositionInfo as string);

  if (p) {
    videoRef.value
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
    grid-template-rows: repeat(1, 1fr);
    grid-template-columns: repeat(1, 1fr);
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
