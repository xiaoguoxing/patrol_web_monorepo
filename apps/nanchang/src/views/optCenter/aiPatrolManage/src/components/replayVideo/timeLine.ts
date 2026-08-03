import { useElementSize, useDateFormat, useEventListener } from '@vueuse/core';
import { Ref } from 'vue';

export default function TimeLine(
  emitChange: (t: number) => void,
  canvasRect: ReturnType<typeof useElementSize>,
  timeLineRef: Ref<HTMLCanvasElement | undefined>,
  emitMove: (t: number) => void
) {
  //初始化
  let { width: timeLineWidth, height: timeLineHeight } = canvasRect;
  let timeLineRefCtx: CanvasRenderingContext2D;
  let timeLineGraduationsLinesCtx: CanvasRenderingContext2D;
  let timeLinePlayPointerCtx: CanvasRenderingContext2D;
  let pxPerMs: number;
  let zoomHours = 24;
  let graduationMinStep = 10;
  let minutesPerStep = [1, 2, 5, 10, 15, 20, 30, 60, 120, 180, 240, 360, 720, 1440];
  let date: number;
  let top = 8;
  let font_size = '12px SourceHanSansCN-Regular';
  let pointerOptions = {
    beginX: 0,
    beginY: 0,
    endX: 0,
    endY: 40,
    color: '#007FFF',
    width: 2,
  };
  let times = [
    {
      begin: new Date(new Date('2022-04-12').toLocaleDateString()).getTime(),
      end: new Date().getTime(),
      background: '#0D56A2',
    },
    {
      begin: new Date().getTime(),
      end: new Date(new Date('2062-04-12').toLocaleDateString()).getTime(),
      background: '#666666',
    },
  ];
  function initCanvasCtx() {
    timeLineRefCtx = timeLineRef.value?.getContext('2d')!;
    timeLineGraduationsLinesCtx = timeLineRef.value?.getContext('2d')!;
    timeLinePlayPointerCtx = timeLineRef.value?.getContext('2d')!;
    timeLineRefCtx.globalAlpha = 1;
    timeLineGraduationsLinesCtx.globalAlpha = 1;
    timeLinePlayPointerCtx.globalAlpha = 1;
    initEvent();
  }
  function initTime(dateModelParent?: number) {
    pxPerMs = timeLineWidth.value / (zoomHours * 60 * 60 * 1000);
    //初始时间在left=0的地方，想要拉到中间需要初始时间减去一半以此达到中间位置
    if (dateModelParent) date = dateModelParent! - (zoomHours / 2) * 60 * 60 * 1000;
    initBackground();
    initGraduationsLines(date);
    initTimeCells(times);
    initBorders();
    initPointer();
  }
  function initBackground() {
    timeLineRefCtx.beginPath();
    timeLineRefCtx.rect(0, 0, timeLineWidth.value, timeLineHeight.value);
    timeLineRefCtx.fillStyle = '#333333';
    timeLineRefCtx.fill();
  }
  function initPointer() {
    let x = timeLineWidth.value / 2;
    timeLinePlayPointerCtx.beginPath();
    timeLinePlayPointerCtx.moveTo(x, 0);
    timeLinePlayPointerCtx.lineTo(x, timeLineHeight.value - 5);
    timeLinePlayPointerCtx.strokeStyle = pointerOptions.color;
    timeLinePlayPointerCtx.lineWidth = pointerOptions.width;
    timeLinePlayPointerCtx.stroke();
    timeLinePlayPointerCtx.beginPath();
    timeLinePlayPointerCtx.rect(x - 8 / 2, 0, 8, 3);
    timeLinePlayPointerCtx.fillStyle = pointerOptions.color;
    timeLinePlayPointerCtx.fill();
    // 三角箭头
    timeLinePlayPointerCtx.beginPath();
    let height = 7 / Math.sin(Math.PI / 3.5); //计算等边三角形的高
    timeLinePlayPointerCtx.moveTo(x, 8);
    timeLinePlayPointerCtx.lineTo(x - height / 2, 3);
    timeLinePlayPointerCtx.lineTo(x + height / 2, 3);
    timeLinePlayPointerCtx.fillStyle = pointerOptions.color;
    timeLinePlayPointerCtx.fill();
    timeLinePlayPointerCtx.closePath();
  }
  function initBorders() {
    let borderColor = '#ffffff';
    //顶线
    drawLine({
      beginX: 0,
      beginY: top,
      endX: timeLineWidth.value,
      endY: top,
      color: borderColor,
      width: 1,
    });
  }
  function initTimeCells(datas: any[]) {
    // 分段填充时间段
    datas.forEach((cell, index) => {
      drawCell(cell);
    });
  }
  function drawCell(data: { begin: number; end: number; background: string }) {
    let fillColor = data.background;
    let cellBeginX = pxPerMs * (data.begin - date);
    let cellWidth = (data.end - data.begin) * pxPerMs;
    timeLineRefCtx.fillStyle = fillColor;
    timeLineRefCtx.fillRect(cellBeginX, 0, cellWidth, 8);
    timeLineRefCtx.fillStyle = '#fff';
  }
  function initGraduationsLines(date: number) {
    let widthTotal = timeLineWidth.value;
    // 宽度 / 1440分钟 = 1分钟多少占多少像素
    let pxPerMinute = widthTotal / (zoomHours * 60);
    // 宽度 / 86400000毫秒 = 1毫秒多少像素
    let pxPerMs = widthTotal / (zoomHours * 60 * 60 * 1000);
    // 一格转换为分钟
    let StepPerMinute = graduationMinStep / pxPerMinute;
    let minutePerStep = minutesPerStep.find((item) => item > StepPerMinute);
    // 每格的宽度：10分钟要用13.3333像素才能表示完成
    let stepPerPx = minutePerStep! * pxPerMinute;
    //总格数(每格{minutePerStep}分钟)
    let stepTotalNum = widthTotal / stepPerPx;

    let msOffset = ms_to_next_step(date, minutePerStep! * 60 * 1000); //开始的偏移时间 ms
    let pxOffset = msOffset * pxPerMs; //开始的偏移距离 px
    for (let i = 0; i <= stepTotalNum; i++) {
      let graduationTime = date + msOffset + i * (stepPerPx / pxPerMs); //时间=左侧开始时间+偏移时间+格数*ms/格
      let leftPx = pxOffset + i * stepPerPx;
      let lineH = 10;
      let width = 1;
      if (useDateFormat(graduationTime, 'HH:mm:ss').value === '00:00:00') {
        // 0点
        lineH = 9;
        width = 3;
        let bigDateTitle = useDateFormat(graduationTime, 'MM-DD').value;
        timeLineGraduationsLinesCtx.textAlign = 'center';
        timeLineGraduationsLinesCtx.fillStyle = '#CCCCCC';
        timeLineGraduationsLinesCtx.font = `normal normal ${font_size},sans-serif`;
        timeLineGraduationsLinesCtx.fillText(bigDateTitle, leftPx, 12 + lineH + top);
      } else if ((graduationTime / (60 * 6 * 1000)) % minutePerStep! === 0) {
        // 整小时
        lineH = 6;
        width = 2;
        let middleDateTitle = useDateFormat(graduationTime, 'HH:mm').value;
        timeLineGraduationsLinesCtx.fillStyle = '#CCCCCC';
        timeLineGraduationsLinesCtx.textAlign = 'center';
        timeLineGraduationsLinesCtx.font = `normal normal ${font_size},sans-serif`;
        timeLineGraduationsLinesCtx.fillText(middleDateTitle, leftPx, 12 + lineH + top);
      } else {
        lineH = 3;
        width = 1;
      }
      let options = {
        beginX: leftPx,
        beginY: top + 1,
        endX: leftPx,
        endY: lineH + top,
        color: '#ffffff',
        width: 1,
      };
      // 刻度线
      drawLine(options);
    }
  }
  //事件
  let isPressDown = false;
  let isMove = false;
  let g_mousedownCursor: number;
  function initEvent() {
    //禁止右键
    useEventListener(timeLineRef, 'contextmenu', (e) => {
      e.preventDefault();
    });
    useEventListener(timeLineRef, 'wheel', mouseWheelFunc);
    useEventListener(timeLineRef, 'mousedown', mousedownFunc);
    // useEventListener(timeLineRef, 'mousemove', canvasMousemoveFunc);
    useEventListener(timeLineRef, 'mouseup', mouseupFunc);
    useEventListener(timeLineRef, 'mouseout', mouseoutFunc);
  }
  function canvasMousemoveFunc(e: MouseEvent) {
    let posX = getCursorPositionX(e);
    let timestamp = date + posX / pxPerMs;
    clearCanvas();
    drawLine({
      beginX: posX,
      beginY: 0,
      endX: posX,
      endY: timeLineHeight.value,
      color: 'rgb(194, 202, 215)',
      width: 1,
    });
    initTime();
    timeLineRefCtx.fillStyle = 'rgb(0, 255, 0)';
    timeLineRefCtx.textAlign = 'center';
    timeLineRefCtx.fillText(useDateFormat(timestamp, 'YYYY-MM-DD HH:mm:ss').value, posX, timeLineHeight.value - 10);
  }
  function mouseWheelFunc(e: WheelEvent) {
    e.preventDefault();
    let delta = Math.max(-1, Math.min(1, e.deltaY));
    let posX = timeLineWidth.value / 2;
    let middle_time = date + (posX * (zoomHours * 3600 * 1000)) / timeLineWidth.value; //ms 记住当前中间的时间
    if (delta < 0) {
      zoomHours = zoomHours - delta;
      if (zoomHours >= 24) {
        zoomHours = 24; //放大最大24小时
      }
    } else if (delta > 0) {
      zoomHours = zoomHours - delta;
      if (zoomHours <= 1) {
        zoomHours = 1; //缩小最小1小时
      }
    }
    clearCanvas();
    date = middle_time - (posX * (zoomHours * 3600 * 1000)) / timeLineWidth.value;
    initTime();
  }
  function mousedownFunc(e: MouseEvent) {
    isPressDown = true;
    document.onmousemove = (e) => {
      mousemoveFunc(e);
    };
    document.onmouseup = (e) => {
      mouseupFunc(e);
      document.onmousemove = null;
      document.onmouseup = null;
    };
    g_mousedownCursor = getCursorPositionX(e); // 记住mousedown的位置
  }
  function mousemoveFunc(e: MouseEvent) {
    let posX = getCursorPositionX(e);
    let x = timeLineWidth.value / 2;
    setPointer();
    isMove = true;
    clearCanvas();
    // 拖动时间轴
    let diffX = posX - g_mousedownCursor;
    date = date - Math.round(diffX / pxPerMs);
    g_mousedownCursor = posX;
    emitMove(date + x / pxPerMs);
    initTime();
  }
  function mouseupFunc(e: MouseEvent) {
    if (isPressDown) {
      isPressDown = false;
      if (isMove) {
        isMove = false;
        let x = timeLineWidth.value / 2;
        changeTime(date + x / pxPerMs);
        setPointer();
      }
    }
  }
  function mouseoutFunc() {
    clearCanvas();
    initTime();
  }
  type DrawLine = { beginX: number; beginY: number; endX: number; endY: number; color: string; width: number };
  function drawLine({ beginX, beginY, endX, endY, color, width }: DrawLine) {
    timeLineRefCtx.beginPath();
    timeLineRefCtx.moveTo(beginX, beginY);
    timeLineRefCtx.lineTo(endX, endY);
    timeLineRefCtx.strokeStyle = color;
    timeLineRefCtx.lineWidth = width;
    timeLineRefCtx.stroke();
  }
  function ms_to_next_step(timestamp: number, step: number) {
    let remainder = timestamp % step;
    return remainder ? step - remainder : 0;
  }
  function getCursorPositionX(e: MouseEvent) {
    let posx = 0;
    if (e.pageX || e.pageY) {
      posx = e.pageX;
    } else if (e.clientX || e.clientY) {
      posx = e.clientX + document.body.scrollLeft + document.documentElement.scrollLeft;
    }
    posx -= timeLineRef.value?.getBoundingClientRect().left!;
    return posx;
  }
  function setPointer() {
    if (isPressDown) {
      setHtmlCursor('grabbing');
    } else {
      setHtmlCursor('grab');
    }
  }
  function setHtmlCursor(cursor: string | null) {
    timeLineRef.value?.style.setProperty('cursor', cursor, 'important');
  }
  function clearCanvas() {
    timeLineRefCtx.clearRect(0, 0, timeLineWidth.value, timeLineHeight.value);
  }
  function changeTime(time: number) {
    emitChange(time);
  }
  return {
    initCanvasCtx,
    setTime(time: number) {
      clearCanvas();
      initTime(time);
    },
  };
}
