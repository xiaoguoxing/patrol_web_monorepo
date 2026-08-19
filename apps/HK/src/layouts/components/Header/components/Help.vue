<template>
  <el-icon class="toolBar-icon" :title="$t('header.helpChangeTitle')" @click="handleOpen"><QuestionFilled /></el-icon>
</template>
<script setup>
import { getConfigDetailHTML } from '@/api/modules/help';
import { getDataURL } from '@/utils/util';
import { useRemoveURLObject } from '@optCenter/hooks/use-file-utils';
let urlArr = useRemoveURLObject();
const handleOpen = async () => {
  let res = await getConfigDetailHTML();
  let { blobUrl } = await getDataURL(res, 'text/html');
  urlArr.add(blobUrl);
  window.open(blobUrl, '_blank');
};
</script>
