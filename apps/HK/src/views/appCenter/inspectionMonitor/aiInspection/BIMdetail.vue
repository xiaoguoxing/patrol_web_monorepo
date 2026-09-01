<template>
  <div class="flex-1 app-inspection">
    <kr-card class="flex-1" header-border>
      <template #header>
        <div>
          <el-icon @click="goBack" class="mr8 page-back"><Back /></el-icon>
          <span class="title kr-font-medium">{{ $t('aiInspection.detail') }}</span>
        </div>
      </template>
      <div class="flex-1">
        <ThreeRectangle :active-item="activeItem" />
      </div>
    </kr-card>
  </div>
</template>
<script setup lang="ts">
import ThreeRectangle from '@appCenter/components/threeRectangle.vue';
import { useRouter } from 'vue-router';

const router = useRouter();
function goBack() {
  router.replace(`/patrolInspection/appCenter/inspectionMonitor/aiInspection?detail=`);
}
</script>
<style lang="scss" scoped></style>
