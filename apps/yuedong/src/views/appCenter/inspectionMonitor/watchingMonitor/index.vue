<template>
  <kr-card
    class="flex-1 two-col-page watchCard"
    :bodyStyle="{ position: 'relative' }"
    ref="watchCard"
    :header="cardTitle"
    header-border
  >
    <el-collapse
      v-model="activeNames"
      ref="treeRef"
      v-if="isCollapse"
      class="two-col-page-lf"
      v-dragLine
      @change="handleChange"
      style="display: flex; flex-direction: column"
    >
      <el-collapse-item title="监控点位" name="1" class="topTree">
        <kr-filter-tree
          placeholder="请输入您想搜索的设备名称"
          :data="dataSource"
          label="nodeName"
          :highlightCurrent="true"
          :defaultValue="defaultData!.id"
          @change="changeTreeFilter"
        >
          <template #default="{ node, data }">
            <cameraTreeTemp :node="node" :data="data"></cameraTreeTemp>
          </template>
        </kr-filter-tree>
      </el-collapse-item>
      <div class="ptz-bottom-container">
        <el-collapse-item title="控制云台" name="2" class="ptz-collapse">
          <HKcloud :cameraId="cameraId" :abc="cameraId" />
        </el-collapse-item>
      </div>
    </el-collapse>
    <collapseBar v-model="isCollapse" :treeWidth="treeWidth"></collapseBar>
    <div class="two-col-page-rt" style="overflow: hidden">
      <div class="watching-container">
        <videoControls
          class="watching-container-video"
          ref="videoRef"
          :is-canvas="false"
          :show-controls="false"
          v-if="defaultData!.id"
          :cameraId="defaultData!.id"
          @err="errPlay"
          @success="playLine"
          :buttonType="2"
          :play-type="5"
        ></videoControls>
      </div>
    </div>
  </kr-card>
</template>
<script setup lang="ts">
import { computed, Ref, ref } from 'vue';
import { useElementSize } from '@vueuse/core';
import { useRoute, useRouter } from 'vue-router';
import { getCameraTreeApi, Tree } from '@/api/modules/camera';
import videoControls from '@optCenter/videoRealTime.vue';
import { treeFirst, treeItem } from '@/api/modules/optCenter/aiPatrolManage/position';
import CollapseBar from '@appCenter/components/collapseBar.vue';
import HKcloud from '@optCenter/components/videocloud/HKcloud.vue';
import cameraTreeTemp from '@optCenter/components/cameraTreeTemp/index.vue';
let route = useRoute();
let router = useRouter();
let cardTitle = useRoute().meta?.title || '';
//树操作
const dataSource = ref<Tree[]>([]);
const defaultData = ref<Tree>();
const cameraId = computed(() => videoRef.value?.currentCamera ?? '');
const getTreeList = async () => {
  let { data } = await getCameraTreeApi();
  dataSource.value = data;
  if (route.query.id) {
    defaultData.value = treeItem(data, route.query.id as string) as unknown as Tree;
  } else {
    defaultData.value = treeFirst(data) as Tree;
  }
};
await getTreeList();
function changeTreeFilter(val: string, data: Tree) {
  if (data.nodeType === 3) {
    videoRef.value.runPlay(data.id);
  }
}
//伸缩
let treeRef = ref();
let delColor = ref<string>('#fff');
const { width, height } = useElementSize(treeRef);
let treeWidth = computed(() => width.value + 'px');
let isCollapse = ref(true);
//视频
let videoRef = ref();
function playLine(code: string) {
  setVideoDelColor();
  let p = eval(route.query.presetPositionInfo as string);
  if (p) {
    if (code === route.query.id) {
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

let activeNames = ref(['1', '2']);
function handleChange() {}
</script>
<style scoped lang="scss">
.watchCard {
  .ptz-bottom-container {
    margin-top: auto; /* 利用Flex特性固定到底部 */
    /* stylelint-disable-next-line order/properties-order */
    width: 100%;
    /* stylelint-disable-next-line order/properties-order */
    position: relative;
  }
  .topTree {
    flex: 1;
    overflow: hidden;
    & > :deep(.el-collapse-item__wrap) {
      height: calc(100% - var(--el-collapse-header-height));
      & > .el-collapse-item__content {
        height: 100%;
      }
    }
  }
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
}
</style>
