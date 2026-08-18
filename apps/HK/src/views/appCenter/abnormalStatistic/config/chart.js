import * as echarts from 'echarts';
export default {
  lineOptions: (x1, yName, seriesList, chartTitle) => {
    let seriesListCopy = seriesList.map((v) => {
      return {
        name: v.name,
        type: 'line',
        // smooth: true,
        symbol: 'circle',
        symbolSize: 2,
        itemStyle: {
          color: v.color,
        },
        data: v.data || [],
      };
    });
    let legendList = seriesList.map((v) => {
      return {
        name: v.name,
      };
    });
    return {
      title: {
        text: '{a|' + chartTitle + '}',
        top: -5,
        left: -6,
        textStyle: {
          rich: {
            a: {
              fontFamily: 'SourceHanSansCN-Medium',
              fontSize: 20,
              color: '#333333',
            },
          },
        },
      },
      tooltip: {
        trigger: 'axis',
        formatter: function (params) {
          let str = '<div style="color:#666666;font-size:14px;width:130px">';
          params.forEach((item, index) => {
            let date = '';
            if (item.componentIndex == 0) {
              date = seriesList[index].dates[item.dataIndex].currentDate;
            } else date = seriesList[index].dates[item.dataIndex].lastDate;
            str +=
              '<div style="display:flex;justify-content:space-between;"><span>' +
              item.seriesName +
              ' ' +
              date +
              '</span><span style="font-size:16px;font-family:SourceHanSansCN-Bold;color:' +
              item.color +
              ';">' +
              item.value +
              '</span></div>';
          });
          return str + '</div>';
        },
      },
      grid: {
        left: '0px', // 网格左边距
        right: '10px', // 网格右边距
        top: '45px', // 网格上边距
        bottom: '0', // 网格下边距
        containLabel: true,
      },
      legend: {
        top: 0, // 图例距离顶部的距离
        icon: 'rect',
        itemWidth: 24,
        itemHeight: 2,
        itemGap: 13,
        data: legendList,
        textStyle: {
          color: '#666666', // 设置图例字体的颜色
        },
        //
      },
      xAxis: [
        {
          type: 'category',
          data: x1,
          axisPointer: {
            type: 'shadow',
          },
          axisLabel: {
            color: '#666666', // 设置刻度标签的颜色
          },
          splitLine: {
            show: false,
          },
          axisTick: {
            show: false,
          },
        },
      ],
      yAxis: [
        {
          nameTextStyle: {
            color: '#666666', // 设置 Y 轴名称的颜色
          },
          min: 0,
          type: 'value',
          name: yName,
          axisLabel: {
            color: '#666666', // 设置刻度标签的颜色
          },
          axisTick: {
            show: false, // 显示刻度线
            alignWithLabel: false, // 刻度线与刻度标签对齐
            lineStyle: {
              color: '#666666', // 刻度线的颜色
            },
          },
          axisLine: {
            show: false,
          },
          splitLine: {
            show: true,
            lineStyle: {
              type: 'dashed',
            },
          },
        },
      ],
      series: seriesListCopy,
    };
  },
  cotegoryStackOptions: (x1, yName, seriesList, chartTitle) => {
    let seriesListCopy = seriesList.map((v) => {
      return {
        name: v.name,
        type: 'bar',
        stack: 'aa',
        // smooth: true,
        // symbol: 'circle',
        // symbolSize: 2,
        itemStyle: {
          color: v.color,
        },
        data: v.data || [],
      };
    });
    let legendList = seriesList.map((v) => {
      return {
        name: v.name,
      };
    });
    return {
      title: {
        text: '{a|' + chartTitle + '}',
        top: -5,
        left: -6,
        textStyle: {
          rich: {
            a: {
              fontFamily: 'SourceHanSansCN-Medium',
              fontSize: 20,
              color: '#333333',
            },
          },
        },
      },
      barWidth: 15,
      tooltip: {
        trigger: 'axis',
        formatter: function (params) {
          let str =
            '<div style="color:#666666;font-size:14px;width:130px;><div style="font-size:16px;margin:15px 0;">' +
            params[0].axisValueLabel +
            '</div>';
          params.forEach((item, index) => {
            str +=
              '<div style="display:flex;justify-content:space-between;"><span>' +
              item.seriesName +
              '</span><span>' +
              item.value +
              '</span></div>';
          });
          return str + '</div>';
        },
      },
      grid: {
        left: '0px', // 网格左边距
        right: '10px', // 网格右边距
        top: '45px', // 网格上边距
        bottom: '0', // 网格下边距
        containLabel: true,
      },
      legend: {
        top: 0, // 图例距离顶部的距离
        icon: 'rect',
        itemWidth: 10,
        itemHeight: 10,
        itemGap: 13,
        data: legendList,
        textStyle: {
          color: '#666666', // 设置图例字体的颜色
        },
        //
      },
      xAxis: [
        {
          type: 'category',
          data: x1,
          axisPointer: {
            type: 'shadow',
          },
          axisLabel: {
            color: '#666666', // 设置刻度标签的颜色
          },
          splitLine: {
            show: false,
          },
          axisTick: {
            show: false,
          },
        },
      ],
      yAxis: [
        {
          nameTextStyle: {
            color: '#666666', // 设置 Y 轴名称的颜色
          },
          min: 0,
          type: 'value',
          name: yName,
          axisLabel: {
            color: '#666666', // 设置刻度标签的颜色
          },
          axisTick: {
            show: false, // 显示刻度线
            alignWithLabel: false, // 刻度线与刻度标签对齐
            lineStyle: {
              color: '#666666', // 刻度线的颜色
            },
          },
          axisLine: {
            show: false,
          },
          splitLine: {
            show: true,
            lineStyle: {
              type: 'dashed',
            },
          },
        },
      ],
      series: seriesListCopy,
    };
  },
  pieOptions: (title, title1, seriesList) => {
    let color = [];
    let seriesListCopy = seriesList.map((v) => {
      color.push(v.color);
      return {
        name: v.name,
        value: v.data,
        itemStyle: {
          normal: { color: v.color }, //正常颜色
          emphasis: { color: v.color }, //鼠标移入颜色
        },
        // type: 'pie',
        // itemStyle: {
        //   color: v.color,
        // },
        // data: v.data || 0,
      };
    });
    let legendList = seriesList.map((v) => {
      return {
        name: v.name,
      };
    });
    return {
      title: {
        // text: title,
        // top: 'center',
        // left: 'center',
        show: true,
        text: '{a|' + title + '}' + '\n' + '{b|' + title1 + '}',
        textStyle: {
          rich: {
            a: {
              color: '#333',
              fontSize: 16,
              // fontWeight: 'bold',
              align: 'center',
              lineHeight: 30,
              // width:'100%',
            },
            b: {
              color: '#333',
              fontSize: 24,
              fontWeight: '500',
              // lineHeight: 40
            },
          },
        },
        top: 'center',
        left: 'center',
        right: 'center',
      },
      tooltip: {
        trigger: 'item',
        // show: false,
      },
      color: color,
      grid: {
        left: 'center',
        top: 'center',
        // bottom: '0', // 网格下边距
        containLabel: false,
      },
      legend: {
        show: false,
        // top: 0, // 图例距离顶部的距离
        left: '80%',
        top: 'center',
        orient: 'vertical',
        icon: 'rect',
        itemWidth: 10,
        itemHeight: 10,
        itemGap: 13,
        data: legendList,
        textStyle: {
          color: '#666666', // 设置图例字体的颜色
        },
        //
      },
      series: [
        {
          type: 'pie',
          center: ['50%', '50%'],
          radius: ['70%', '95%'],
          avoidLabelOverlap: false,
          itemStyle: {
            // borderRadius: 10,
            borderColor: '#fff',
            borderWidth: 2,
          },
          label: {
            show: false,
          },
          emphasis: {
            label: {
              show: false,
              fontSize: 40,
              fontWeight: 'bold',
            },
          },
          data: seriesListCopy,
        },
      ],
    };
  },
};
