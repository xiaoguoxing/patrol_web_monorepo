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
      :highlightCurrent="true"
      :defaultValue="defaultData.id"
      @change="changeTreeFilter"
      ref="treeRef"
    >
    </kr-filter-tree>
    <collapseBar v-model="isCollapse" :treeWidth="treeWidth"></collapseBar>
    <div class="two-col-page-rt" style="overflow: hidden">
      <div class="watching-container">
        <videoControls
          class="watching-container-video"
          ref="videoRef"
          :is-canvas="false"
          :show-controls="false"
          v-if="defaultData.id"
          :key="defaultData.id"
          :cameraId="defaultData.id"
          @err="errPlay"
          @success="playLine"
          :start-time="playbackStartTime"
          :play-type="2"
        ></videoControls>
        <el-icon v-if="defaultData.id" class="del-icon" size="24" :color="delColor" @click="del">
          <CircleClose />
        </el-icon>
      </div>
    </div>
  </kr-card>
</template>
<script setup lang="ts">
import { computed, Ref, ref } from 'vue';
import { useElementSize } from '@vueuse/core';
import { useRoute } from 'vue-router';
import { getCameraTreeApi, Tree } from '@/api/modules/camera';
import videoControls from '@optCenter/videoRealTime.vue';
import { treeFirst } from '@/api/modules/optCenter/aiPatrolManage/position';
import CollapseBar from '@appCenter/components/collapseBar.vue';
let cardTitle = useRoute().meta?.title || '';
//树操作
const dataSource = ref<Tree[]>([]);
const defaultData = ref<Tree>();
const getTreeList = async () => {
  let { data } = await getCameraTreeApi();
  dataSource.value = data;
  defaultData.value = treeFirst(data) as Tree;
};
await getTreeList();
function changeTreeFilter(val: string, data: Tree) {
  if (data.nodeType === 3) {
    playbackStartTime.value = new Date(new Date().toLocaleDateString()).getTime();
    defaultData.value = data;
  }
}
//伸缩
let treeRef = ref();
let delColor = ref<string>('#fff');
const { width } = useElementSize(treeRef);
let treeWidth = computed(() => width.value + 'px');
let isCollapse = ref(true);
//视频
let videoRef = ref();
let playbackStartTime = ref(new Date(new Date().toLocaleDateString()).getTime());
function playLine() {
  setVideoDelColor();
}
function errPlay() {
  setVideoDelColor('#000');
}
function setVideoDelColor(color: string = '#fff') {
  delColor.value = color;
}
function del() {
  defaultData.value = {} as Tree;
}
</script>
<style scoped lang="scss">
.watchCard {
  .watching-container {
    position: relative;
    width: 100%;
    height: 100%;
    overflow: hidden;
    background: var(--el-fill-color-light);
    .del-icon {
      position: absolute;
      top: 10px;
      right: 10px;
      z-index: 2;
      cursor: pointer;
    }
    .watching-container-video {
      height: calc(100%);
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
}
</style>
