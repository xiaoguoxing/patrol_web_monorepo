<template>
  <kr-card header="消息通知" :border="false" bodyClass="msgCardBody">
    <template #headerRight>
      <el-button type="primary" link @click="getMessageDetail">
        更多<el-icon style="font-size: 14px"><ArrowRight /></el-icon>
      </el-button>
    </template>
    <div class="msgCard">
      <div class="message" v-for="(item, index) in messageList" :key="index" @click="getTaskDetail(item, index)">
        <span class="messageCon">{{ item.messageContent }}</span>
        <span class="floatRight">{{ item.sendTime }}</span>
      </div>
    </div>
  </kr-card>
</template>

<script setup name="message">
import { ref, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { getMessage, getUpdateList } from '@/api/modules/workstand';

const messageList = ref([]);
const router = useRouter();
const getMessageDetail = () => {
  router.push('/patrolInspection/worktop/message');
};
const getTaskDetail = async (item, index) => {
  if (['InspectionTask', 'LinkageTask'].includes(item.taskType)) {
    await getUpdateList({ ids: item.id });
    let route = {
      InspectionTask: '/patrolInspection/appCenter/appCenterTask/taskReport',
      LinkageTask: '/patrolInspection/appCenter/linkage/linkageDetail',
    };
    router.push(`${route[item.taskType]}?id=${item.taskId}`);
  }
};
const getMessageData = async () => {
  let res = await getMessage();
  messageList.value = res.data;
};
onMounted(() => {
  getMessageData();
});
</script>

<style scoped lang="scss">
// @import './index.scss';
:deep(.msgCardBody) {
  padding: 16px var(--kr-card-horizen-padding);
  .msgCard {
    overflow-y: scroll;
    &::-webkit-scrollbar {
      display: none;
    }
  }
}
</style>
