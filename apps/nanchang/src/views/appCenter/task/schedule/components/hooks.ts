export function formatNum(num: number) {
  let res = Number(num);
  return res < 10 ? '0' + res : res;
}
export function getToday() {
  let date = new Date();
  let y = date.getFullYear();
  let m = date.getMonth();
  let d = date.getDate();
  let week = new Date().getDay();
  let weekText = ['日', '一', '二', '三', '四', '五', '六'];
  let formatWeek = '星期' + weekText[week];
  return {
    date: y + '-' + formatNum(m + 1) + '-' + formatNum(d),
    week: formatWeek,
    year: y,
    month: m + 1,
    day: d,
  };
}
export function isWorkDay(y: number, m: number, d: number) {
  //是否工作日
  let ymd = `${y}/${m}/${d}`;
  let formatDY = new Date(ymd.replace(/-/g, '/'));
  let week = formatDY.getDay();
  if (week == 0 || week == 6) {
    return false;
  } else {
    return true;
  }
}
export function isToday(y: number, m: number, d: number) {
  let checkD = y + '-' + m + '-' + d;
  let today = getToday().date;
  if (checkD == today) {
    return true;
  } else {
    return false;
  }
}
