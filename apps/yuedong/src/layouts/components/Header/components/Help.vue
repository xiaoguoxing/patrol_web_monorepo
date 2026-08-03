<template>
  <el-icon class="toolBar-icon" title="帮助" @click="handleOpen"><QuestionFilled /></el-icon>
</template>
<script setup>
import { getConfigDetailList } from '@/api/modules/help';
const handleOpen = () => {
  // 打开用户手册
  // http.get('/eam-service-system/sys/ConfigDetail/getList', params, { headers: { noLoading: true } });
  let href = '';
  // 操作手册配置id
  let configId = '1505076693788921856';
  getConfigDetailList({ configId }).then((res) => {
    res.data.map((i) => {
      if (i.key == 'url') {
        href = i.value;
      }
    });
    window.open(href, '_blank');
  });
};
</script>
