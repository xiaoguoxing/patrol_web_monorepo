import type { DeviceType, InspectionItem, InspectionResult, PlantDevice } from './types';

interface DeviceSeed {
  type: DeviceType;
  prefix: string;
  name: string;
  model: string;
  area: string;
  points: Array<[number, number]>;
  alarms?: number[];
}

const seeds: DeviceSeed[] = [
  {
    type: 'pump',
    prefix: 'PMP',
    name: '号泵',
    model: '离心泵 · 380V',
    area: '泵房',
    points: [
      [195, 130],
      [240, 130],
      [285, 130],
      [330, 130],
    ],
  },
  {
    type: 'cabinet',
    prefix: 'MCC',
    name: '号电机柜',
    model: 'MNS 抽出式开关柜',
    area: '配电房',
    points: [
      [-285, 15],
      [-250, 15],
      [-215, 15],
      [-180, 15],
    ],
  },
  {
    type: 'meter',
    prefix: 'MET',
    name: '号仪表盘',
    model: '就地指示仪表',
    area: '储罐区',
    points: [
      [205, -95],
      [245, -95],
      [285, -95],
      [325, -95],
    ],
  },
  {
    type: 'light',
    prefix: 'LGT',
    name: '号电源指示灯',
    model: '运行指示灯',
    area: '配电房',
    points: [
      [-285, 50],
      [-250, 50],
      [-215, 50],
      [-180, 50],
    ],
    alarms: [1],
  },
  {
    type: 'doser',
    prefix: 'DOS',
    name: '号加药装置',
    model: '计量泵加药装置',
    area: '车间A',
    points: [
      [-265, -140],
      [-215, -140],
      [-165, -140],
      [-115, -140],
      [-265, -190],
      [-215, -190],
      [-165, -190],
      [-115, -190],
    ],
  },
  {
    type: 'blower',
    prefix: 'BLW',
    name: '号鼓风机',
    model: '罗茨鼓风机 · 380V',
    area: '车间B',
    points: [
      [-20, 140],
      [30, 140],
      [80, 140],
      [130, 140],
    ],
    alarms: [3],
  },
];

export const DEVICE_TYPE_NAMES: Record<DeviceType, string> = {
  pump: '水泵',
  cabinet: '电机柜',
  meter: '仪表盘',
  light: '指示灯',
  doser: '加药装置',
  blower: '鼓风机',
};

export const DEVICES: PlantDevice[] = seeds.flatMap((seed) =>
  seed.points.map(([x, z], index) => {
    const number = index + 1;
    return {
      type: seed.type,
      key: `${seed.prefix}-${String(number).padStart(2, '0')}`,
      name: `${number}${seed.name}`,
      model: seed.model,
      area: seed.area,
      x,
      z,
      floor: 1,
      alarm: seed.alarms?.includes(number) ?? false,
    };
  })
);

export const PATROL_ORDER = DEVICES.map((device) => device.key);

const resultItems: Record<DeviceType, InspectionItem[]> = {
  pump: [
    { name: '泵体振动', status: '正常', detail: '振动值 2.3 mm/s' },
    { name: '出口压力', status: '正常', detail: '0.62 MPa' },
    { name: '轴承温度', status: '正常', detail: '58℃' },
  ],
  cabinet: [
    { name: '柜内温度', status: '正常', detail: '28.5℃' },
    { name: '母线电压', status: '正常', detail: '380 V' },
    { name: '断路器状态', status: '正常', detail: '合闸' },
  ],
  meter: [
    { name: '表盘示值', status: '正常', detail: '0.68 MPa' },
    { name: '指针摆动', status: '正常', detail: '无卡滞' },
    { name: '表盘玻璃', status: '正常', detail: '完好' },
  ],
  light: [
    { name: '指示灯状态', status: '正常', detail: '红黄绿灯显示正常' },
    { name: '供电电压', status: '正常', detail: 'DC 24 V' },
    { name: '接线端子', status: '正常', detail: '无松动' },
  ],
  doser: [
    { name: '药液液位', status: '正常', detail: '78%' },
    { name: '加药流量', status: '正常', detail: '1.6 m³/h' },
    { name: '管道压力', status: '正常', detail: '0.35 MPa' },
  ],
  blower: [
    { name: '出口风压', status: '正常', detail: '68 kPa' },
    { name: '风机转速', status: '正常', detail: '1450 rpm' },
    { name: '轴承温度', status: '正常', detail: '52℃' },
  ],
};

export const PATROL_RESULTS: Record<string, InspectionResult> = DEVICES.reduce<Record<string, InspectionResult>>(
  (results, device, index) => {
    const abnormal = device.alarm === true;
    const items = resultItems[device.type].map((item, itemIndex) => {
      if (!abnormal || itemIndex !== 0) return { ...item };
      return {
        ...item,
        status: '异常' as const,
        detail: device.type === 'blower' ? '52 kPa（偏低）' : '红色故障灯常亮',
      };
    });
    results[device.key] = {
      duration: `${(2 + (index % 7) * 0.1).toFixed(1)}s`,
      confidence: abnormal ? 93 : 96 + (index % 3),
      status: abnormal ? 'abnormal' : 'ok',
      items,
    };
    return results;
  },
  {}
);
