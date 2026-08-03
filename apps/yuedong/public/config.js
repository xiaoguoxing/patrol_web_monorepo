const serviceConfig =
  {
    // 开发环境配置
    development: {
      // 本地环境接口地址
      VITE_API_URL: '/api',
      // WebSocket、在线文档等
      VITE_ONLINE_URL: 'http://10.11.3.123:30001',
      // 本地环境流媒体服务器
      VITE_API_STREAM_URL: '/stream',
      // 字体文件地址
      VITE_API_FONT_URL: 'http://10.11.3.123:31010',
      // 算法视频流
      VITE_API_AI_STREAM_URL: 'ws://10.11.229.252:5003',
      // 榄核黄阁系统地址
      VITE_SYS_URL: 'http://10.11.3.123:9000',
      // 榄核黄阁系统名称
      VITE_SYS_NAME: '榄核'
    },
    //  打包之后的测试环境配置
    test: {
      // 接口地址
      VITE_API_URL: '/api',
      // WebSocket、在线文档等
      VITE_ONLINE_URL: 'http://10.11.3.123:30001',
      // 本地环境流媒体服务器
      VITE_API_STREAM_URL: 'http://10.11.3.123:30010',
      // 字体文件地址
      VITE_API_FONT_URL: 'http://10.11.3.123:31010',
      // 算法视频流
      VITE_API_AI_STREAM_URL: 'ws://10.11.229.238:5000',
      // 榄核黄阁系统地址
      VITE_SYS_URL: 'http://10.11.228.118:3301',
      // 榄核黄阁系统名称
      VITE_SYS_NAME: '榄核'
    },
    // 打包之后的生产环境配置
    production: {
      // 接口地址
      VITE_API_URL: '/api',
      // WebSocket、在线文档等
      VITE_ONLINE_URL: 'http://10.12.127.3:30001',
      // 本地环境流媒体服务器
      VITE_API_STREAM_URL: 'http://10.12.127.3:30010',
      // 字体文件地址
      VITE_API_FONT_URL: 'http://10.12.127.3:31010',
      // 算法视频流
      VITE_API_AI_STREAM_URL: 'ws://10.12.127.3:5000',
      // 榄核黄阁系统地址
      VITE_SYS_URL: 'http://10.12.127.3:8080',
      // 榄核黄阁系统名称
      VITE_SYS_NAME: 'xx'
    }
  }
