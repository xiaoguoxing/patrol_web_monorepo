<template>
  <div class="flex-1">
    <kr-card class="flex-1" header="告警配置" header-border>
      <template #headerRight>
        <el-button v-auth="'indexSet'" icon="DataLine" type="primary" link @click="openDrawer">告警指标设置</el-button>
      </template>
      <kr-pro-table
        ref="proTable"
        :columns="columns"
        :requestApi="getTableList"
        :initParam="initParam"
        :dataCallback="dataCallback"
        :searchCol="{ xs: 1, sm: 1, md: 3, lg: 3, xl: 3 }"
        selectId="id"
        colSetAble
      >
        <!-- 表格 header 按钮 -->
        <template #tableHeader="scope">
          <el-button v-auth="'add'" icon="CirclePlus" type="primary" @click="openForm('新建')">新建告警</el-button>
          <el-button
            v-auth="'batchOn'"
            icon="Unlock"
            type="primary"
            @click="batchOn(scope.selectedListIds)"
            :disabled="!scope.isSelected"
            >开启弹窗推送</el-button
          >
          <el-button
            v-auth="'batchOff'"
            icon="CircleClose"
            type="primary"
            @click="batchOff(scope.selectedListIds)"
            :disabled="!scope.isSelected"
            >关闭弹框推送</el-button
          >
          <el-button
            v-auth="'batchDelete'"
            icon="Delete"
            @click="batchDelete(scope.selectedListIds)"
            :disabled="!scope.isSelected"
            >删除</el-button
          >
        </template>
        <!-- 表格操作 -->
        <template #operation="scope">
          <el-button v-auth="'edit'" type="primary" link @click="openForm('编辑', scope.row)">编辑</el-button>
          <el-button v-auth="'delete'" type="primary" link @click="deleteData(scope.row)">删除</el-button>
        </template>
      </kr-pro-table>
    </kr-card>
    <!-- 新增，编辑表单弹窗 -->
    <formDialog
      ref="formDialogRef"
      :levelDictList="levelDictList"
      :typeDictlist="typeDictlist"
      @openDrawer="openDrawer"
    />
    <!-- 告警指标设置 -->
    <alarmDrawer ref="alarmDrawerRef" />
  </div>
</template>
<script setup lang="tsx" name="AlarmIndex">
import { ref, reactive, onBeforeMount } from 'vue';
import { ElMessage } from 'element-plus';
import { ColumnProps } from '@/components/znxj-components/znxj-ui';
import { useHandleData } from '@/hooks/useHandleData';
import {
  getDict,
  getDictObj,
  getDictForColumnFilters as dictForFilters,
  DefaultDict,
  FilterDict,
} from '@/utils/serviceDict';
import formDialog from './formDialog.vue';
import alarmDrawer from '../../aiPatrolManage/inspection/alarmDrawer.vue';
import { getListApi, deleteApi, turnApi, editApi, addApi } from '@/api/modules/optCenter/inspectionSet/alarm';
import type { Alarm } from '@/api/modules/optCenter/inspectionSet/alarm';
import { Warning } from '@element-plus/icons-vue';
import { isJSON } from '@/utils/is';
/*
  告警配置功能

*/

//获取数据字典
const typeDictlist = (await getDict('alarm_type')) as DefaultDict;
const levelDictList = (await getDict('alarm_level')) as DefaultDict;
const levelDictObj = getDictObj(levelDictList, 'value');
// 表格配置项
const columns: ColumnProps[] = [
  { type: 'selection', width: 60 },

  { type: 'index', label: '序号', width: 60 },
  {
    prop: 'alarmName',
    label: '告警名称',
    search: {
      el: 'input',
      props: {
        placeholder: '请输入您想搜索的告警名称',
      },
    },
  },
  {
    prop: 'alarmType',
    label: '告警类型',
    filters: dictForFilters(typeDictlist),
    enum: typeDictlist /* [
      { label: '设备安全隐患告警', value: '1' },
      { label: '设备温度异常告警', value: '2' },
      { label: '设备状态异常告警', value: '3' },
      { label: '人员行为异常告警', value: '4' },
      { label: '环境风险识别告警', value: '5' },
    ] */,
  },
  {
    prop: 'alarmLevel',
    label: '告警等级',
    filters: dictForFilters(levelDictList),
    enum: levelDictList,
    render: (scope) => {
      let targetItem = levelDictObj[scope.row.alarmLevel];
      let { background, color } = {
        background: '#f4f4f5',
        color: '#909399',
      };
      let label = '--';
      if (targetItem) {
        if (isJSON(targetItem.remark) && JSON.parse(targetItem.remark)) {
          let remark = JSON.parse(targetItem.remark);
          background = remark.background;
          color = remark.color;
        }

        label = targetItem.label;
      }
      let style = `--el-tag-bg-color:${background};--el-tag-border-color:${background};--el-tag-text-color:${color}`;
      return (
        <el-tag style={style} effect="light">
          {label}
        </el-tag>
      );
    },
  },
  {
    prop: 'alarmIndexName',
    label: '告警指标',
  },
  {
    prop: 'isPopup',
    label: '弹框推送',
    headerRender: (scope) => {
      return (
        <span>
          弹框推送
          <el-tooltip
            content="弹框推送关闭，则告警发生时默认仅推送消息提醒；弹框推送开启，则告警发生时同步推送消息提醒和告警弹框。"
            effect="light"
            placement="right"
          >
            <el-icon>
              <Warning />
            </el-icon>
          </el-tooltip>
        </span>
      );
    },
    render: (scope) => {
      let loading = false;
      let { row } = scope;
      const change = () => {
        loading = true;
        return turnApi({ ids: row.id, isPopup: !row.isPopup })
          .then((res) => {
            loading = false;
            row.isPopup = !row.isPopup;
            return Promise.resolve(true);
          })
          .catch((error) => {
            loading = false;
            return Promise.reject(false);
          });
      };
      return (
        <el-switch model-value={scope.row.isPopup} active-value={true} inactive-value={false} beforeChange={change} />
      );
    },
  },
  {
    prop: 'createByName',
    label: '创建人',
  },
  {
    prop: 'createTime',
    label: '创建时间',
  },
  { prop: 'operation', label: '操作', width: 200, fixed: 'right' },
];
const proTable = ref();
const initParam = reactive({});
const dataCallback = (data: any) => {
  return {
    datalist: data.list,
    total: data.total,
    pageNum: data.page,
    pageSize: data.pageSize,
  };
};

const changeStatus = (row: Alarm.ResList) => {
  turnApi({ ids: row.id, isPopup: row.isPopup });
};
// 获取表格数据
const getTableList = (params: any) => {
  let newParams = { ...params };
  newParams.page = newParams.pageNum;
  delete newParams.pageNum;
  return getListApi(newParams);
};
// 新增告警
const formDialogRef = ref();
const openForm = (title: string, rowData: Partial<Alarm.ResList> = { isPopup: false, alarmMentList: [] }) => {
  let params = {
    title,
    rowData: { ...rowData },
    isView: title === '详情',
    api: title === '新建' ? addApi : title === '编辑' ? editApi : '',
    getTableList: proTable.value.getTableList,
  };
  formDialogRef.value.acceptParams(params);
};
// 批量删除表格数据
const batchDelete = async (id: string[]) => {
  await useHandleData(deleteApi, { ids: id.join() }, '删除所选告警');
  proTable.value.clearSelection();
  proTable.value.getTableList();
};
// 批量开启弹窗推送
const batchOn = async (id: string[]) => {
  await useHandleData(turnApi, { ids: id.join(), isPopup: true }, '开启所选告警弹窗推送');
  proTable.value.clearSelection();
  proTable.value.getTableList();
};
// 批量关闭弹窗推送
const batchOff = async (id: string[]) => {
  await useHandleData(turnApi, { ids: id.join(), isPopup: false }, '关闭所选告警弹窗推送');
  proTable.value.clearSelection();
  proTable.value.getTableList();
};
//删除表格数据
const deleteData = async (row: any) => {
  await useHandleData(deleteApi, { ids: row.id }, `删除该告警`);
  proTable.value.getTableList();
};

//打开告警指标配置弹窗
const alarmDrawerRef = ref();
const openDrawer = () => {
  alarmDrawerRef.value.acceptParams({
    title: '告警指标设置',
  });
};
</script>
<style lang="scss" scoped></style>
