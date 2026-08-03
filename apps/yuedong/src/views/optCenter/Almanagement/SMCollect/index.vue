<template>
  <div class="flex-1">
    <kr-card class="flex-1" :header="cardTitle" header-border>
      <kr-pro-table
        ref="proTable"
        :columns="columns"
        :requestApi="getTableList"
        :initParam="initParam"
        :dataCallback="dataCallback"
        :searchCol="{ xs: 1, sm: 1, md: 2, lg: 4, xl: 4 }"
        selectId="id"
        title="素材收集"
        titleBorder
        :outBorder="false"
        :colSetAble="false"
      >
        <template #tableHeader>
          <div class="operationBtn">
            <el-button v-auth="'download'" icon="download" type="primary" :disabled="!citiesLength" @click="download"
              >下载</el-button
            >
            <el-button v-auth="'delete'" icon="delete" :disabled="!citiesLength" @click="deleteList">删除</el-button>
            <el-checkbox
              v-auth="'select'"
              class="selectAll"
              :disabled="!list.length"
              v-model="checkedAllPage"
              :indeterminate="isIndeterminate"
              @change="handleCheckAllChange"
            />
            <el-dropdown v-auth="'select'" trigger="click" :disabled="!list.length">
              <span class="selectText">
                {{ selectLabel }}<el-icon class="el-icon--right"><arrow-down /></el-icon>
              </span>
              <template #dropdown>
                <el-dropdown-menu>
                  <el-dropdown-item link @click="changeSelect('勾选本页')">勾选本页</el-dropdown-item>
                  <el-dropdown-item link @click="changeSelect('勾选全部')">勾选全部</el-dropdown-item>
                </el-dropdown-menu>
              </template>
            </el-dropdown>
            <span class="selectCount">已选{{ citiesLength }}条</span>
          </div>
        </template>
        <template #table="{ tableData, total }">
          <div class="defaultTable">
            <el-scrollbar v-if="total">
              <el-checkbox-group class="items" v-model="checkedList" @change="handleCheckedCitiesChange">
                <div class="item" v-for="item in tableData" :key="item.id">
                  <div class="item_image">
                    <el-image
                      class="img"
                      :src="item.imgPath"
                      :alt="item.algorithmName"
                      @load="() => imgSuccess(item.imgPath)"
                    >
                      <template #error>
                        <img class="errorImg" :src="urlError" alt="图片占位符" />
                        <div class="el-image__error">加载失败</div>
                      </template>
                    </el-image>
                    <el-checkbox v-auth="'select'" class="selectItem" :key="item.id" :value="item.id" />
                  </div>
                  <div class="item_title">
                    <span>
                      <el-tooltip :content="item.algorithmName">{{ item.algorithmName }}</el-tooltip>
                    </span>
                    <div class="title_state" :class="item.stateClassName">
                      {{ item.stateLabel }}
                    </div>
                  </div>
                  <div class="item_infos">
                    <div class="item_info_item">
                      <div class="item_info_label">回收时间：</div>
                      <div class="item_info_value">
                        <el-tooltip effect="light" :content="item.recoveryTime">
                          {{ item.recoveryTime }}
                        </el-tooltip>
                      </div>
                    </div>
                    <div class="item_info_item">
                      <div class="item_info_label">识别结果：</div>
                      <div class="item_info_value">
                        <el-tooltip effect="light" :content="item.recognitionResult">
                          {{ item.recognitionResult }}
                        </el-tooltip>
                      </div>
                    </div>
                    <div class="item_info_item">
                      <div class="item_info_label">实际结果：</div>
                      <div class="item_info_value">
                        <el-tooltip effect="light" :content="item.realityResult">
                          {{ item.realityResult }}
                        </el-tooltip>
                      </div>
                    </div>
                  </div>
                </div>
              </el-checkbox-group>
            </el-scrollbar>
            <div class="noData flx-center" v-else>暂无数据</div>
          </div>
        </template>
      </kr-pro-table>
    </kr-card>
  </div>
</template>
<script setup lang="tsx">
import { ref, reactive, computed, ComputedRef } from 'vue';
import { tableProps } from '@/api/modules/optCenter/aiPatrolManage/inspection';
import { useRoute } from 'vue-router';
import {
  SMCollectList,
  List,
  Search,
  SMCollectDel,
  SMCollectDownload,
} from '@/api/modules/optCenter/Almanagement/SMCollect';
import { getCameraTreeApi } from '@/api/modules/camera';
import { useBackFileUrl, useRemoveURLObject } from '@optCenter/hooks/use-file-utils';
import { useHandleData } from '@/hooks/useHandleData';
import { getDataURL } from '@/utils/util';
import { algorithmList } from '@/api/modules/optCenter/Almanagement/AIModelManagement';

const route = useRoute();
let cardTitle: ComputedRef<any> = computed(() => route.meta?.title!);
//无用 但不能删
const getTreeList = async () => {
  try {
    await getCameraTreeApi();
  } catch (e) {}
};
await getTreeList();
let aimodelList = ref([]);
async function getAIModelList() {
  let res = (await algorithmList({ algorithmName: '', page: 1, pageSize: 60 })) as any;
  aimodelList.value = res.data.list;
}
await getAIModelList();

// 无用 但不能删
//列表
const stateOption = {
  todo: {
    className: 'title_state1',
    label: '未使用',
  },
  finish: {
    className: 'title_state2',
    label: '已使用',
  },
};
const proTable = ref();
const pageSize = ref(10);
const urlArr = useRemoveURLObject();

const initParam = reactive<Partial<Search>>({});
const searchDataLocal = ref({});
const columns: tableProps<any>[] = [
  {
    prop: 'algorithmCodeList',
    label: '算法模型',
    isShowInputLabel: false,
    search: {
      el: 'input',
      key: 'algorithmCodeList',
      props: { placeholder: '请选择您需要搜索的算法模型' },
      render(attr) {
        return (
          <el-select {...attr} multiple collapse-tags={true}>
            {aimodelList.value.map((i: { algorithmName: string; algorithmCode: string }) => {
              return <el-option label={i.algorithmName} value={i.algorithmCode} />;
            })}
          </el-select>
        );
      },
    },
  },
  {
    prop: 'collectionStatus',
    label: '技能名称',
    isShowInputLabel: false,
    enum: [
      { label: '全部状态', value: ' ' },
      { label: '未使用', value: 'todo' },
      { label: '已使用', value: 'finish' },
    ],
    search: {
      defaultValue: ' ',
      key: 'collectionStatus',
      el: 'select',
      props: { placeholder: '请输入您需要搜索的技能名称' },
      /*render(attr) {
        return (
          <el-select {...attr} v-model={initParam.collectionStatus}>
            <el-option label="全部状态" value={' '} />
            <el-option label="未使用" value={'todo'} />
            <el-option label="已使用" value={'finish'} />
          </el-select>
        );
      },*/
    },
  },
];
const dataCallback = (data: any) => {
  pageSize.value = Math.ceil(data.list.length / 5);
  return {
    datalist: data.list,
    total: data.total,
    pageNum: data.page,
    pageSize: data.pageSize,
  };
};
let list = ref<List[]>([]);
const getTableList = async (params: any) => {
  let { pageNum, ...searchData } = params;
  searchData.page = pageNum;
  if (searchData.collectionStatus === ' ') {
    Reflect.deleteProperty(searchData, 'collectionStatus');
  }
  searchDataLocal.value = searchData;
  let res = await SMCollectList(searchData);
  list.value = res.data.list;
  for (const valueElement of list.value) {
    useBackFileUrl(valueElement.attachmentImage, undefined, true).then((res) => {
      valueElement.imgPath = res || '';
      urlArr.add(res!);
    });
    valueElement.stateClassName = stateOption[valueElement.collectionStatus].className;
    valueElement.stateLabel = stateOption[valueElement.collectionStatus].label;
  }
  return {
    data: {
      ...res.data,
      list: list.value,
    },
  };
};
const deleteList = async () => {
  try {
    await useHandleData<{ ids: string }>(SMCollectDel, { ids: checkedList.value.toString() }, '删除');
    proTable.value.getTableList();
    handleCheckAllChange(false);
    checkedAllPage.value = false;
  } catch (e) {
    proTable.value.getTableList();
    handleCheckAllChange(false);
    checkedAllPage.value = false;
  }
};
const download = async () => {
  try {
    let res = await SMCollectDownload(
      selectLabel.value === '勾选全部'
        ? {
            ids: '',
            ...searchDataLocal.value,
          }
        : {
            ids: checkedList.value.toString(),
          }
    );
    let { blobUrl: res1 } = await getDataURL(res as unknown as Blob, 'application/zip');
    let a = document.createElement('a');
    a.href = res1;
    urlArr.add(res1);
    a.download = '素材下载';
    a.click();
    proTable.value.getTableList();
    handleCheckAllChange(false);
    checkedAllPage.value = false;
  } catch (e) {
    proTable.value.getTableList();
    handleCheckAllChange(false);
    checkedAllPage.value = false;
  }
};
// checked
let checkedAllPage = ref(false);

let selectLabel = ref('勾选本页');
let isIndeterminate = ref(false);
let checkedList = ref<any[]>([]);
let listIds = computed(() => list.value.map((i) => i.id));
let citiesLength = computed(() => checkedList.value.length);
function changeSelect(text: string) {
  selectLabel.value = text;
}
function handleCheckAllChange(val: boolean) {
  checkedList.value = val ? listIds.value : [];
  isIndeterminate.value = false;
}
function handleCheckedCitiesChange(value: string[]) {
  const checkedCount = value.length;
  checkedAllPage.value = checkedCount === listIds.value.length;
  isIndeterminate.value = checkedCount > 0 && checkedCount < listIds.value.length;
}
let urlError = ref('');
function imgSuccess(blobUrl: string) {
  urlError.value = blobUrl;
}
</script>
<style scoped lang="scss">
.operationBtn {
  display: flex;
  align-items: center;
  height: 100%;
  .selectAll {
    margin-right: 5px;
    margin-left: 16px;
  }
  .selectText {
    font-size: 14px;
    color: var(--el-text-color-regular);
    cursor: pointer;
  }
  .selectCount {
    margin-left: 16px;
    font-size: 14px;
    color: var(--el-text-color-regular);
  }
}
.defaultTable {
  flex: 1;
  padding-top: 5px;
  margin: -16px -24px;
  overflow-y: hidden;
  :deep(.items) {
    box-sizing: border-box;
    display: grid;
    grid-template-rows: repeat(v-bind(pageSize), auto);
    grid-template-columns: repeat(5, 1fr);
    grid-gap: 17px;
    padding: 16px 24px;
    .item {
      box-sizing: border-box;
      padding: 16px;
      overflow: hidden;
      box-shadow: 0 0 17px 0 rgb(0 0 0 / 6%);
      .item_image {
        position: relative;
        overflow: hidden;
        border-radius: 4px;
        .img {
          display: block;
          width: 100%;
          height: auto;
          object-fit: cover;
          .errorImg {
            display: block;
            width: 100%;
            height: 100%;
            opacity: 0;
          }
          .el-image__error {
            position: absolute;
            top: 0;
            left: 0;
          }
        }
        .selectItem {
          position: absolute;
          top: -2px;
          left: 8px;
        }
      }
      .item_title {
        display: flex;
        align-items: center;
        height: 28px;
        margin-top: 5px;
        font-size: 14px;
        color: var(--el-text-color-regular);
        & > span {
          flex: 1;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }
        .title_state {
          box-sizing: border-box;
          display: flex;
          align-items: center;
          justify-content: center;
          height: 100%;
          padding: 7px;
          border-radius: 4px;
          &.title_state1 {
            color: #fa802f;
            background: #ffebde;
          }
          &.title_state2 {
            color: #2ebc5d;
            background: #defce8;
          }
        }
      }
      .item_infos {
        display: flex;
        flex-direction: column;
        gap: 5px;
        margin-top: 5px;
        .item_info_item {
          display: flex;
          gap: 5px;
          font-size: 12px;
          .item_info_label {
            color: var(--el-text-color-placeholder);
          }
          .item_info_value {
            flex: 1;
            overflow: hidden;
            color: var(--el-text-color-secondary);
            text-overflow: ellipsis;
            white-space: nowrap;
          }
        }
      }
      &:hover {
        box-shadow: 0 5px 17px 0 rgb(0 0 0 / 8%);
      }
    }
  }
  .noData {
    width: 100%;
    height: 100%;
    font-size: 14px;
    color: var(--el-text-color-secondary);
  }
}
.kr-protable {
  overflow: initial;
}
.el-checkbox-group {
  font-size: initial;
  line-height: initial;
}
</style>
