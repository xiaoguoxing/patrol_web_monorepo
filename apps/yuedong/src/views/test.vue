<template>
  <div style="height: 500px"></div>
  <robotcloud
    :camera-id="'c2fdde706c834294b8814bbe15b74652'"
    :loginData="cameraData"
    :login-send-data="loginSendData"
  ></robotcloud>
</template>
<script setup lang="ts">
import robotcloud from '@optCenter/components/videocloud/robotcloud.vue';
</script>
<style scoped></style>
