// @ts-ignore
import dragLine from './modules/DragLine.ts';
import { App } from 'vue';
import copy from './modules/copy';
import waterMarker from './modules/waterMarker';
import draggable from './modules/draggable';
import debounce from './modules/debounce';
import throttle from './modules/throttle';
import longpress from './modules/longpress';
import auth from './modules/auth';

const directivesList: any = {
  // Custom directives
  copy,
  waterMarker,
  draggable,
  debounce,
  throttle,
  longpress,
  auth,
  dragLine: dragLine(),
};

const directives = {
  install: function (app: App<Element>) {
    Object.keys(directivesList).forEach((key) => {
      // 注册所有自定义指令
      app.directive(key, directivesList[key]);
    });
  },
};
export * from './modules';
export default directives;
