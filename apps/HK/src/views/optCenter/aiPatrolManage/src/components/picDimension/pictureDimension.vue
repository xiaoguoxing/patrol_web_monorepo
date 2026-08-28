<script setup lang="ts">
import { fabric } from 'fabric';
import { nextTick, onMounted, onUnmounted, ref, watch } from 'vue';
import type { Canvas, IEvent, Image, IPoint, Object as FObject, Transform, ICircleOptions } from 'fabric/fabric-impl';
import deleteImg from '@/assets/images/videoControls/gqd.png';
import { dataURLtoFile } from '@/utils/util';
import { ElMessage } from 'element-plus';
import { useI18n } from 'vue-i18n';
const { t } = useI18n();
interface Position {
  top: number;
  left: number;
  width: number;
  height: number;
  imgWidth: number;
  imgHeight: number;
}
interface Props {
  backgroundUrl?: string;
  title?: string;
  formJson?: string;
  init?: Boolean;
}

const props = withDefaults(defineProps<Props>(), {
  title: 'download.png',
  init: () => true,
});

interface eId extends ICircleOptions {
  id: string;
}

let canvasRef = ref();
let pictureDimensionRef = ref();
let canvas: Canvas;
let currentType = ref('default'); // 当前操作模式（默认 || 创建圆形）
let mouseFrom: IPoint; // 按下鼠标时的坐标
let mouseTo: IPoint; // 按下鼠标时的坐标
let doDrawing: boolean = false; // 松开鼠标时的坐标
let drawingObject: FObject | null; // 松开鼠标时的坐标
let drawingArray: FObject[]; // 松开鼠标时的坐标
let moveCount: number = 1; // 松开鼠标时的坐标
let historyArr: string[] = [];
let historyCount: number = 0;
let img: Image;
let imgUrl: string;
let functionBtn = [
  { label: t('position.rect'), value: 'rect' },
  /*  { label: '圆形', value: 'circle' },
  { label: '不规则', value: 'pencil' },*/
];
let position = ref<Position>({ top: 0, left: 0, width: 0, height: 0, imgWidth: 0, imgHeight: 0 });

onMounted(() => {
  initCanvas();
  initCanvasControls();
});
onUnmounted(() => {
  dispose(); // 清空画布
});

/*watch(
  () => props.formJson,
  () => {
    initCanvas();
  }
);
watch(
  () => props.url,
  () => {
    initCanvas();
  }
);*/
async function initCanvas() {
  await nextTick();
  let { width, height } = pictureDimensionRef.value.getBoundingClientRect();
  canvas = new fabric.Canvas(canvasRef.value, {
    width: width,
    height: height - 60,
    isDrawingMode: false, //设置是否可以自由绘制
    selection: false, // 是否允许框选 默认true  true允许  false不允许
    skipTargetFind: false,
    selectionFullyContained: true,
  });
  canvas.on('mouse:down', canvasMouseDown); // 鼠标在画布上按下
  canvas.on('mouse:move', canvasMouseMove); // 鼠标在画布上移动
  canvas.on('mouse:up', canvasMouseUp); // 鼠标在画布上松开
  canvas.on('selection:created', selectionCreated);
  canvas.on('selection:cleared', selectionCleared);
  canvas.on('object:modified', objectModified);
  canvas.on('object:moving', function (e) {
    let obj = e.target as fabric.Object;
    // 如果对象宽度/高度大于画布，则不允许移动
    obj.setCoords();

    // 边界检查
    if (obj.left! < 0) {
      obj.left = 0;
    }
    if (obj.top! < 0) {
      obj.top = 0;
    }
    if (obj.left! + obj.width! > canvas.width!) {
      obj.left = canvas.width! - obj.width! - 4;
    }
    if (obj.top! + obj.height! > canvas.height!) {
      obj.top = canvas.height! - obj.height! - 4;
    }
  });
  typeChange(currentType.value);
  setBgImg(props.backgroundUrl);
  setFormJson();
}

function setBgImg(Url: any) {
  if (Url)
    fabric.Image.fromURL(Url, function (image) {
      // canvas.setWidth(image.width as number); //设置画布的宽度
      // canvas.setHeight(image.height as number); //设置画布的高度
      image.scaleX = (canvas.width as number) / (image.width as number);
      image.scaleY = (canvas.height as number) / (image.height as number);
      if (!props.formJson) {
        image.crossOrigin = 'anonymous';
        let imgBase64 = image.toDataURL({
          format: 'png',
          multiplier: 1, // 倍数
        });
        canvas.setBackgroundImage(imgBase64, canvas.renderAll.bind(canvas));
      }
    });
}

function setFormJson() {
  if (props.formJson) {
    canvas.clear();
    canvas.loadFromJSON(props.formJson, canvas.renderAll.bind(canvas));
  }
}

function initCanvasControls() {
  /*let img = document.createElement('img');
  img.src = deleteImg;*/
  fabric.Object.prototype.transparentCorners = false;
  fabric.Object.prototype.cornerColor = '#000000';
  fabric.Object.prototype.borderColor = '#000000';
  fabric.Object.prototype.padding = 0;
  fabric.Object.prototype.cornerStyle = 'rect';
  fabric.Object.prototype.cornerSize = 5;
  fabric.Object.prototype.setControlVisible('mtr', false);

  /*  fabric.Object.prototype.controls.deleteControl = new fabric.Control({
    x: 0.5,
    y: -0.5,
    offsetY: 16,
    cursorStyle: 'pointer',
    mouseUpHandler: deleteObject,
    render: renderIcon,
  });

  function deleteObject(eventData: MouseEvent, transform: Transform, x: number, y: number) {
    let target = transform.target;
    let canvas = target.canvas as Canvas;
    canvas.remove(target);
    canvas.requestRenderAll();
    return true;
  }

  function renderIcon(
    ctx: CanvasRenderingContext2D,
    left: number,
    top: number,
    styleOverride: any,
    fabricObject: FObject
  ) {
    let size = 24;
    ctx.save();
    ctx.translate(left, top);
    ctx.rotate(fabric.util.degreesToRadians(fabricObject.angle as number));
    ctx.drawImage(img, -size / 2, -size / 2, size, size);
    ctx.restore();
  }*/
}
// 设置图形
function setCurrentType(value: string) {
  if (canvas._objects.length >= 1) {
    return ElMessage.warning(t('msg4'));
  }
  currentType.value = value;
  typeChange(value);
}
// 切换图形
function typeChange(opt: string) {
  canvas.isDrawingMode = false;
  canvas.selection = false;
  canvas.skipTargetFind = false;
  switch (opt) {
    case 'pencil':
      canvas.isDrawingMode = true;
      canvas.freeDrawingBrush.color = '#007FFF'; // 设置绘画笔的颜色
      canvas.freeDrawingBrush.width = 4; // 设置绘画笔的宽度
      break;
    case 'default':
      canvas.selection = true;
      break;
    default:
      break;
  }
}
// 鼠标在画布上按下
function canvasMouseDown(e: IEvent) {
  mouseFrom = e.absolutePointer as IPoint;
  doDrawing = true;
  drawingObject = null;
  if (currentType.value === 'bgz') {
    if (str && str.indexOf('z') !== -1) {
      removePoint();
      // addPoint(e);
      console.log('结束了');
      //@ts-ignore
    } else if (e.target && pointArray[0] && e.target.id == pointArray[0].id) {
      // 目标点和第一个点id相等时,说明绘画动作已经完成,此时开始最后一步绘画
      finishDrawing(e);
      console.log('最后一步');
    } else {
      if (canvas.getActiveObject()) return;
      addPoint(e);
      console.log('正常加');
    }
  }
}
// 鼠标在画布上移动
function canvasMouseMove(e: IEvent) {
  if (moveCount % 2 && !doDrawing) return;

  mouseTo = e.absolutePointer as IPoint;
  moveCount++;
  if (!canvas.getActiveObject()) {
    drawing();
  }
}
// 鼠标在画布上松开
function canvasMouseUp(e: IEvent) {
  mouseTo = e.absolutePointer as IPoint;
  moveCount = 1;
  doDrawing = false;
  if (e.target || drawingObject) {
    canvas.discardActiveObject();
    canvas.setActiveObject(e.target || (drawingObject as FObject));
    canvas.requestRenderAll();
    // updateModifications(true);
  }
  currentType.value = 'default';
  typeChange('default');
}
// 选中
function selectionCreated(e: IEvent) {
  drawingArray = e.selected!;
}
// 取消选中
function selectionCleared(e: IEvent) {
  drawingArray = e.selected!;
}
// 对象缩放
function objectModified(e: IEvent) {
  // updateModifications(true);
}
//画图形
function drawing() {
  let fabricObject: FObject | null = null;
  if (drawingObject) {
    canvas.remove(drawingObject);
  }
  switch (currentType.value) {
    case 'circle':
      let radius =
        Math.sqrt(
          (mouseTo.x - mouseFrom.x) * (mouseTo.x - mouseFrom.x) + (mouseTo.y - mouseFrom.y) * (mouseTo.y - mouseFrom.y)
        ) / 2;
      fabricObject = new fabric.Circle({
        left: mouseFrom.x,
        top: mouseFrom.y,
        radius: radius,
      });
      break;
    case 'rect': //矩形
      fabricObject = new fabric.Rect({
        top: Math.min(mouseFrom.y, mouseTo.y),
        left: Math.min(mouseFrom.x, mouseTo.x),
        width: Math.abs(mouseFrom.x - mouseTo.x),
        height: Math.abs(mouseFrom.y - mouseTo.y),
      });
      break;
    case 'arrow': // 箭头
      fabricObject = new fabric.Path(drawArrow(mouseFrom.x, mouseFrom.y, mouseTo.x, mouseTo.y, 17.5, 17.5));
      break;
    case 'bgz':
      break;
  }
  if (fabricObject) {
    // 设置Object其它属性
    fabricObject.set({
      stroke: '#007FFF',
      strokeWidth: 4,
      strokeUniform: true,
      fill: 'transparent', //绘制空心图形时fill为透明，绘制实心图形时fill需要设置颜色
      // hasControls: false, // 是否显示控制器  false不显示
    });
    canvas.add(fabricObject);
    drawingObject = fabricObject;
  }
}
// 画箭头
function drawArrow(fromX: number, fromY: number, toX: number, toY: number, theta: number, handle: number) {
  theta = typeof theta != 'undefined' ? theta : 30;
  handle = typeof theta != 'undefined' ? handle : 10;
  // 计算各角度和对应的P2,P3坐标
  let angle = (Math.atan2(fromY - toY, fromX - toX) * 180) / Math.PI,
    angle1 = ((angle + theta) * Math.PI) / 180,
    angle2 = ((angle - theta) * Math.PI) / 180,
    topX = handle * Math.cos(angle1),
    topY = handle * Math.sin(angle1),
    botX = handle * Math.cos(angle2),
    botY = handle * Math.sin(angle2);
  let arrowX = fromX - topX,
    arrowY = fromY - topY;
  let path = '';
  path = 'M ' + fromX + ' ' + fromY;
  path += ' L ' + toX + ' ' + toY;
  arrowX = toX + topX;
  arrowY = toY + topY;
  path += ' M ' + arrowX + ' ' + arrowY;
  path += ' L ' + toX + ' ' + toY;
  arrowX = toX + botX;
  arrowY = toY + botY;
  path += ' L ' + arrowX + ' ' + arrowY;
  return path;
}
// 销毁
function dispose() {
  canvas.clear(); // 清空画布
  canvas.dispose();
}
// 删除图形
function removeObj() {
  if (drawingArray) {
    for (const drawingArrayElement of drawingArray as FObject[]) {
      canvas.remove(drawingArrayElement);
    }
  } else {
  }
}
//储存历史记录
function updateModifications(saveHistory: boolean) {
  if (saveHistory) {
    historyArr.push(JSON.stringify(canvas));
  }
}
//上一步
function prev() {
  let state = historyArr;
  if (historyCount < state.length) {
    canvas.clear().renderAll();
    canvas.loadFromJSON(state[state.length - 1 - historyCount - 1], canvas.renderAll.bind(canvas));
    historyCount += 1;
  }
}
//下载图片
function exportLoadImage(download: boolean = false): {
  imgUrl: string;
  dataURLtoFile: File;
  position: Position;
} {
  //生成双倍像素比的图片
  imgUrl = canvas.toDataURL({
    format: 'png',
    multiplier: 1, // 倍数
  });
  if (download) {
    let a = document.createElement('a');
    a.href = imgUrl;
    a.download = props.title;
    a.click();
  }
  let p = canvas._objects?.[0] ?? {};
  position.value = {
    top: p.top!,
    left: p.left!,
    width: p.getBoundingRect?.().width! || 0,
    height: p.getBoundingRect?.().height! || 0,
    imgWidth: canvas.width!,
    imgHeight: canvas.height!,
  };
  console.log(position.value);
  return {
    imgUrl,
    dataURLtoFile: dataURLtoFile(imgUrl, props.title),
    position: position.value,
  };
}

function ImgToJson(): string {
  return JSON.stringify(canvas.toJSON());
}

let path: fabric.Object, str: string; // path是绘制的对象,str是其路径
let pointPosition: any[] = []; // 点的位置坐标信息
let pointArray: any[] = []; // 点的对象组合

// 增加点,和路径,开始绘画
function addPoint(e: IEvent) {
  let id = new Date().getTime() + Math.random(); // id用来识别每个点
  let circle = new fabric.Circle({
    radius: 5,
    fill: '#007FFF',
    left: (e.absolutePointer as IPoint).x,
    top: (e.absolutePointer as IPoint).y,
    selectable: false,
    hasBorders: false,
    hasControls: false,
    originX: 'center',
    originY: 'center',
    //@ts-ignore
    id: id,
  });
  canvas.add(circle);
  pointPosition.push({
    x: (e.absolutePointer as IPoint).x,
    y: (e.absolutePointer as IPoint).y,
  });
  // pointPosition.length == 1 说明是第一个点
  // 这里用fabric.js里的path对象来绘制我们需要的图形对象
  // 此时往路径里面添加'M','M'的意思是开始绘画,后面的两个数字是开始点的x,y的坐标
  if (pointPosition.length === 1) {
    str = 'M' + pointPosition[0].x + ' ' + pointPosition[0].y;
    path = new fabric.Path(str);
    path.set({
      fill: '#007FFF',

      // opacity: 0.5,
      selectable: false,
      hasBorders: false,
      hasControls: false,
      evented: false,
    });
    canvas.add(path);
    pointArray.push(circle);
    return;
  }
  // 增加第二个点时再执行下面的逻辑,这里开始绘制直线
  if (pointPosition.length <= 1) return;
  let length = pointPosition.length - 1;
  canvas.remove(path); // 先移除之前的对象
  // L在path里面就是线段的意思
  str = str + 'L' + pointPosition[length].x + ' ' + pointPosition[length].y; // 路径拼接
  path = new fabric.Path(str);
  path.set({
    fill: 'transparent',
    // opacity: 0.5,
    strokeWidth: 4,
    stroke: '#007FFF',
    selectable: true,
    hasBorders: false,
    hasControls: false,
    evented: false,
  });
  canvas.add(path); // 重新添加

  canvas.renderAll();
  pointArray.push(circle);
}

function finishDrawing(e: IEvent) {
  canvas.remove(path);
  // 最后一个点的坐标就是第一个点的坐标
  pointPosition.push({
    x: pointPosition[0].x,
    y: pointPosition[0].y,
  });
  // 给路径加'z','z'说明整个path路径已经完结
  str = str + 'z';
  path = new fabric.Path(str);
  path.set({
    fill: 'transparent',
    // opacity: 0.5,
    strokeWidth: 4,
    stroke: '#007FFF',
    // selectable: true,
    // hasBorders: true,
    // hasControls: true,
    // evented: true
  });
  canvas.add(path);
  canvas.renderAll();
}

function removePoint() {
  for (let item of pointArray) {
    canvas.remove(item);
  }
  str = '';
  pointArray = [];
  pointPosition = [];
  path.set({
    //stroke: undefined,  路径完成后讲path的边框去掉
  });
  canvas.renderAll();
}

function clearCanvas() {
  canvas.remove(canvas._objects[0]);
}

defineExpose({
  exportLoadImage,
  ImgToJson,
  dispose,
  clearCanvas,
  canvasIns() {
    return canvas;
  },
});
</script>

<template>
  <div class="pictureDimension" ref="pictureDimensionRef">
    <div class="operationArea">
      <div class="area-left">
        <div
          class="operationArea-Btn"
          :class="{ active: currentType === item.value }"
          :key="item.value"
          v-for="(item, index) in functionBtn"
          @click="setCurrentType(item.value)"
        >
          <div class="icon" :class="{ [`icon${index + 1}`]: true, active: currentType === item.value }"></div>
          <span>{{ item.label }}</span>
        </div>
      </div>
      <div class="area-right">
        <div class="area-right-btn" v-if="false" @click="removeObj">
          <div class="icon icon1"></div>
          <span>{{ $t('ui.reloadMsg') }}</span>
        </div>
        <div class="area-right-btn" @click="clearCanvas">
          <div class="icon icon2"></div>
          <span>{{ $t('ui.clear') }}</span>
        </div>
      </div>
    </div>
    <div class="flx-center canvas-content">
      <canvas ref="canvasRef"></canvas>
    </div>
  </div>
</template>

<style scoped lang="scss">
.canvas-content {
  position: relative;
}
.operationArea {
  --text-color-p: #007fff;

  display: flex;
  justify-content: space-between;
  height: 40px;
  margin-bottom: 20px;
  .area-left {
    display: flex;
    box-shadow: 0 0 12px 0 rgb(0 0 0 / 10%);
    .operationArea-Btn {
      position: relative;
      display: flex;
      gap: 5px;
      align-items: center;
      padding: 0 20px;
      cursor: pointer;
      .icon {
        width: 32px;
        height: 32px;
        background-size: 100% 100%;
      }
      .icon1 {
        background-image: url('@/assets/images/videoControls/rect.png');
        &.active {
          background-image: url('@/assets/images/videoControls/rect-active.png');
        }
      }
      .icon2 {
        background-image: url('@/assets/images/videoControls/circle.png');
        &.active {
          background-image: url('@/assets/images/videoControls/circle-active.png');
        }
      }
      .icon3 {
        background-image: url('@/assets/images/videoControls/bgz.png');
        &.active {
          background-image: url('@/assets/images/videoControls/bgz-active.png');
        }
      }
      &.active {
        color: var(--text-color-p);
      }
      &::after {
        position: absolute;
        top: calc(50% - (16px / 2));
        right: 0;
        width: 1px;
        height: 16px;
        content: ' ';
        background: #e6e6e6;
      }
      &:last-child::after {
        display: none;
      }
    }
  }
  .area-right {
    display: flex;
    gap: 20px;
    .area-right-btn {
      display: flex;
      gap: 6px;
      align-items: center;
      padding: 0 20px;
      font-size: 16px;
      cursor: pointer;
      box-shadow: 0 0 12px 0 rgb(0 0 0 / 10%);
      .icon {
        width: 20px;
        height: 20px;
        background-size: 100% 100%;
      }
      .icon1 {
        background-image: url('@/assets/images/videoControls/back.png');
      }
      .icon2 {
        background-image: url('@/assets/images/videoControls/clear.png');
      }
      &:hover,
      &:active {
        color: var(--el-color-primary);
        .icon1 {
          background-image: url('@/assets/images/videoControls/back-active.png');
        }
        .icon2 {
          background-image: url('@/assets/images/videoControls/clear-active.png');
        }
      }
    }
  }
}
.pictureDimension {
  width: 100%;
  height: 100%;
}
</style>
