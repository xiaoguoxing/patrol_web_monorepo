<template>
  <el-badge :value="nums" class="item mr24" type="warning" @click="goPath">
    <!--          <i :class="'iconfont icon-xiaoxi'" class="toolBar-icon" title="消息提醒"></i>-->
    <img src="@/assets/images/alarmIcon/dialogIcon2.png" alt="消息提醒" />
  </el-badge>
  <!--  <el-popover ref="messagePopover" placement="bottom" popper-class="message-alarm" :width="400" trigger="hover">
    <template #reference>
      <el-badge :value="nums" class="item mr24" type="warning" @click="goPath">
        &lt;!&ndash;          <i :class="'iconfont icon-xiaoxi'" class="toolBar-icon" title="消息提醒"></i>&ndash;&gt;
        <img src="@/assets/images/alarmIcon/dialogIcon2.png" alt="消息提醒" />
      </el-badge>
    </template>
    <div class="message-alarm__content">
      <div class="title">
        <div class="title__left kr-font-medium">最新告警</div>
        <div class="title__right" @click="gotoAlarm(null)">
          <span>查看全部</span>
          <el-icon class="title__right__icon"><ArrowRight /></el-icon>
        </div>
      </div>
      <div class="item-content">
        <div class="item-content__items" :key="index" v-for="(item, index) in arr" @click="gotoAlarm(item)">
          &lt;!&ndash; <i
              :class="{ 'iconfont icon-xiaoxi item-content__items__icon': true, active: index === 2 }"
              class="toolBar-icon"
              title="消息提醒"
            ></i> &ndash;&gt;
          <div class="item-content__items__center">
            &lt;!&ndash; :class="{ active: index === 2 }" &ndash;&gt;
            <div class="item-content__items__center_top">{{ item.alarmName }}</div>
            <div class="item-content__items__center_bottom">{{ item.cameraName }}</div>
          </div>
          <div class="item-content__items__ago">{{ item.alarmTime?.split(' ')[0] }}</div>
        </div>
        <div v-if="empty" class="item-content__items__empty">暂无最新告警消息</div>
      </div>
    </div>
  </el-popover>-->
</template>
<script setup lang="ts">
import { ref, computed } from 'vue';
import { getAlarmListApiV2 } from '@/api/modules/appCenter/alarm';
import { useRouter } from 'vue-router';
const router = useRouter();
let { data } = await getAlarmListApiV2({ alarmStatus: 'in_alert', page: 1, pageSize: 10 });
let arr = [...data.list];
const nums = data.total;
const empty = computed(() => !arr.length);
const messagePopover = ref();
const gotoAlarm = (params: any) => {
  let url = '/patrolInspection/appCenter/appCenterAlarm';
  let queryObj = {
    id: params?.id,
    pageType: params ? 'detail' : 'list',
  };
  if (!params) {
    delete queryObj.id;
  }
  router.push({
    path: url,
    query: queryObj,
  });

  messagePopover.value?.hide();
};
function goPath() {
  router.replace(`/patrolInspection/appCenter/appCenterAlarm`);
}
</script>
<style lang="scss">
.el-popper.message-alarm {
  --messagealarm-height: 56px;
  --messagealarm-padding: 20px;
  --messagealarm-maxheight: 360px;

  padding: 0;
  border: none;
  border-radius: 0;
}
</style>
<style scoped lang="scss">
.item {
  cursor: pointer;
  :deep(.el-badge__content) {
    border: none;
  }
}
.message-alarm {
  &__content {
    width: 100%;
    .title {
      display: flex;
      align-items: center;
      justify-content: space-between;
      height: var(--messagealarm-height);
      padding: 0 var(--messagealarm-padding);
      &__left {
        font-size: 16px;
        color: #333333;
        cursor: pointer;
      }
      &__right {
        display: flex;
        align-items: center;
        height: 100%;
        margin-right: -5px;
        color: var(--el-color-primary);
        cursor: pointer;
        &__icon {
          margin-top: -4px;
        }
      }
    }
    .item-content {
      max-height: calc(var(--messagealarm-maxheight) - 56px);
      overflow-y: auto;
      &__items {
        box-sizing: border-box;
        display: flex;
        height: auto;
        padding: 10px var(--messagealarm-padding);
        margin-left: -1px;
        cursor: pointer;
        &:hover {
          background: #f8f8f8;
          .item-content__items__center {
            .item-content__items__center_top:not(.active) {
              color: var(--el-color-primary);
            }
          }
        }
        &__icon {
          margin-top: -5px;
          color: #fa802f;
          &.active {
            color: #cccccc;
          }
        }
        &__center {
          flex: 1;
          margin-left: 5px;
          &_top {
            color: #666666;
            &.active {
              color: #999999;
            }
          }
          &_bottom {
            font-size: 12px;
            color: #999999;
          }
        }
        &__ago {
          font-size: 12px;
          color: #999999;
        }
      }
      &__items__empty {
        padding: 10px var(--messagealarm-padding) 40px;
        color: #999999;
      }
    }
  }
}
</style>
