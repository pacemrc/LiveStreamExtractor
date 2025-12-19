function extractDyLiveList() {
  const streams = [];
  
  // 统一的清晰度判断函数
  function determineQualityByStreamId(url) {
    // 从URL中提取stream-xxx_or4部分
    const streamIdMatch = url.match(/stream-\d+[_-][a-zA-Z0-9]+/);
    let streamId = streamIdMatch ? streamIdMatch[0] : '';
    
    // 检查是否为音频流
    if (url.includes('only_audio=1')) {
      return '音频流';
    }
    
    // 检查是否为时移流
    if (url.includes('/timeshift.m3u8')) {
      return '时移流';
    }
    
    // 按照优先级顺序判断清晰度
    if (streamId.includes('ld') || streamId.includes('ld5')) {
      return '标清';
    } else if (streamId.includes('sd') || streamId.includes('sd5')) {
      return '高清';
    } else if (streamId.includes('hd') || streamId.includes('hd5')) {
      return '超清';
    } else if (streamId.includes('uhd') || streamId.includes('uhd5')) {
      return '蓝光';
    } else if (streamId.includes('or4') || streamId === '') {
      return '原画';
    } else {
      return '原画';
    }
  }
  
  try {
    var html_content = document.documentElement.outerHTML;
    
    // 策略1: 从window.__RENDER_DATA__中提取直播流URL
    const renderDataPattern = /window\.__RENDER_DATA__\s*=\s*({[^;]+});/gs;
    const renderDataMatch = renderDataPattern.exec(html_content);
    
    if (renderDataMatch && renderDataMatch[1]) {
      try {
        let renderData = JSON.parse(renderDataMatch[1]);
        
        // 遍历renderData中的所有属性，查找直播流相关数据
        function findLiveStreams(obj, path = '') {
          if (typeof obj === 'object' && obj !== null) {
            // 检查是否包含直播流URL
            if (obj.url && typeof obj.url === 'string' && 
                (obj.url.includes('.flv') || obj.url.includes('.m3u8') || obj.url.includes('.hls'))) {
              // 提取清晰度信息
              let quality = '--';
              if (obj.quality_name) {
                quality = obj.quality_name;
              } else if (obj.name) {
                quality = obj.name;
              } else {
                quality = determineQualityByStreamId(obj.url);
              }
              
              // 确定媒体协议
              let mediaProtocol = '--';
              if (obj.url.includes('.flv')) {
                mediaProtocol = 'HTTP-FLV';
              } else if (obj.url.includes('.m3u8') || obj.url.includes('.hls')) {
                mediaProtocol = 'HTTP-HLS';
              }
              
              // 检查是否为音频链接
              const isAudio = obj.url.includes('only_audio=1');
              
              streams.push({
                platform: '抖音',
                quality: quality,
                mediaProtocol: mediaProtocol,
                type: isAudio ? '音频' : '视频',
                url: obj.url
              });
            }
            
            // 递归搜索
            for (let key in obj) {
              if (obj.hasOwnProperty(key)) {
                findLiveStreams(obj[key], `${path}.${key}`);
              }
            }
          }
        }
        
        findLiveStreams(renderData);
      } catch (parseError) {
        console.error('解析window.__RENDER_DATA__失败:', parseError.message);
      }
    }
    
    // 策略2: 从data-config属性中提取直播流URL
    const configPattern = /data-config="(.*?)"/g;
    const configMatches = html_content.match(configPattern);
    
    if (configMatches && configMatches.length > 0) {
      for (let match of configMatches) {
        try {
          // 提取JSON字符串
          let jsonStr = match.match(/data-config="(.*?)"/)[1];
          // 替换HTML实体
          jsonStr = jsonStr.replace(/&quot;/g, '"').replace(/&amp;/g, '&');
          // 解析JSON
          let configData = JSON.parse(jsonStr);
          
          // 提取FLV链接
          if (configData.playerConfig && configData.playerConfig.baseConfig && configData.playerConfig.baseConfig.url) {
            const flvUrl = configData.playerConfig.baseConfig.url;
            if (flvUrl.includes('.flv') || flvUrl.includes('.m3u8') || flvUrl.includes('.hls')) {
              // 检查是否为音频链接
              const isAudio = flvUrl.includes('only_audio=1');
              // 确定媒体协议
              let mediaProtocol = '--';
              if (flvUrl.includes('.flv')) {
                mediaProtocol = 'HTTP-FLV';
              } else if (flvUrl.includes('.m3u8') || flvUrl.includes('.hls')) {
                mediaProtocol = 'HTTP-HLS';
              }
              // 确定清晰度
              let quality = determineQualityByStreamId(flvUrl);
              
              streams.push({
                platform: '抖音',
                quality: quality,
                mediaProtocol: mediaProtocol,
                type: isAudio ? '音频' : '视频',
                url: flvUrl
              });
            }
          }
          
          // 提取备份链接
          if (configData.basicPlayerProps && configData.basicPlayerProps.playerAction && configData.basicPlayerProps.playerAction.inlineEnterOptInfo) {
            const optInfo = configData.basicPlayerProps.playerAction.inlineEnterOptInfo;
            
            // 使用统一的清晰度判断函数
            function determineQuality(url) {
              return determineQualityByStreamId(url);
            }
            
            const urlProps = ['backupUrl', 'H264Url', 'lowUrl', 'mainUrl'];
            
            urlProps.forEach(prop => {
              if (optInfo[prop] && typeof optInfo[prop] === 'string') {
                const url = optInfo[prop];
                if (url.includes('.flv') || url.includes('.m3u8') || url.includes('.hls')) {
                  // 检查是否为音频链接
                  const isAudio = url.includes('only_audio=1');
                  // 确定媒体协议
                  let mediaProtocol = '--';
                  if (url.includes('.flv')) {
                    mediaProtocol = 'HTTP-FLV';
                  } else if (url.includes('.m3u8') || url.includes('.hls')) {
                    mediaProtocol = 'HTTP-HLS';
                  }
                  // 确定清晰度
                  let quality = determineQuality(url);
                  if (prop === 'backupUrl') quality += '(备份)';
                  else if (prop === 'H264Url') quality += '(H264)';
                  
                  streams.push({
                    platform: '抖音',
                    quality: quality,
                    mediaProtocol: mediaProtocol,
                    type: isAudio ? '音频' : '视频',
                    url: url
                  });
                }
              }
            });
          }
        } catch (innerError) {
          // 跳过无效的JSON
          continue;
        }
      }
    }
    
    // 策略3: 从window.__INITIAL_STATE__中提取直播流URL
    const initialStatePattern = /window\.__INITIAL_STATE__\s*=\s*({[^;]+});/gs;
    const initialStateMatch = initialStatePattern.exec(html_content);
    
    if (initialStateMatch && initialStateMatch[1]) {
      try {
        let initialState = JSON.parse(initialStateMatch[1]);
        
        // 递归搜索直播流URL
        function searchLiveStreams(obj) {
          if (typeof obj === 'object' && obj !== null) {
            // 检查是否包含直播流相关数据
            if (obj.pull_data && obj.pull_data.stream_data) {
              const streamData = obj.pull_data.stream_data;
              if (streamData.options && Array.isArray(streamData.options)) {
                streamData.options.forEach(option => {
                  if (option.url) {
                    // 提取清晰度
                    let quality = option.name || '--';
                    
                    // 确定媒体协议
                    let mediaProtocol = '--';
                    if (option.url.includes('.flv')) {
                      mediaProtocol = 'HTTP-FLV';
                    } else if (option.url.includes('.m3u8') || option.url.includes('.hls')) {
                      mediaProtocol = 'HTTP-HLS';
                    }
                    
                    // 检查是否为音频链接
                    const isAudio = option.url.includes('only_audio=1');
                    
                    streams.push({
                      platform: '抖音',
                      quality: quality,
                      mediaProtocol: mediaProtocol,
                      type: isAudio ? '音频' : '视频',
                      url: option.url
                    });
                  }
                });
              }
            }
            
            // 递归搜索
            for (let key in obj) {
              if (obj.hasOwnProperty(key)) {
                searchLiveStreams(obj[key]);
              }
            }
          }
        }
        
        searchLiveStreams(initialState);
      } catch (parseError) {
        console.error('解析window.__INITIAL_STATE__失败:', parseError.message);
      }
    }
    
    // 策略4: 从self.__pace_f.push中提取直播流数据
    const pacePattern = /self\.__pace_f\.push\(\[1,\s*"(.*?)"\]\)/g;
    let paceMatch;
    
    while ((paceMatch = pacePattern.exec(html_content)) !== null) {
        const jsonStr = paceMatch[1];
        
        try {
            // 尝试解析JSON
            const paceData = JSON.parse(jsonStr);
            if (paceData.data) {
                // 遍历所有清晰度的流
                const data = paceData.data;
                for (const qualityKey in data) {
                    if (data.hasOwnProperty(qualityKey)) {
                        const qualityData = data[qualityKey];
                        
                        // 处理主备线路
                        for (const lineKey in qualityData) {
                            if (qualityData.hasOwnProperty(lineKey)) {
                                const lineData = qualityData[lineKey];
                                
                                // 处理不同格式的流
                                for (const formatKey in lineData) {
                                    if (formatKey !== 'sdk_params' && formatKey !== 'enableEncryption' && formatKey !== 'templateRealTimeInfo' && lineData.hasOwnProperty(formatKey)) {
                                        const streamUrl = lineData[formatKey];
                                        if (streamUrl && typeof streamUrl === 'string') {
                                            // 检查是否为音频链接
                                            const isAudio = streamUrl.includes('only_audio=1');
                                            
                                            // 确定清晰度名称
                                let qualityName = qualityKey;
                                switch (qualityKey) {
                                    case 'hd':
                                        qualityName = '高清';
                                        break;
                                    case 'sd':
                                        qualityName = '标清';
                                        break;
                                    case 'md':
                                        qualityName = '流畅';
                                        break;
                                    case 'origin':
                                        qualityName = '原画';
                                        break;
                                    case 'ld':
                                        qualityName = '流畅';
                                        break;
                                    case 'ao':
                                        qualityName = '音频流';
                                        break;
                                }
                                
                                // 确定媒体协议名称
                                let protocolName = formatKey.toUpperCase();
                                // 统一格式显示，转换为标准媒体协议
                                if (protocolName === 'FLV') {
                                    protocolName = 'HTTP-FLV';
                                } else if (protocolName === 'M3U8' || protocolName === 'HLS') {
                                    protocolName = 'HTTP-HLS';
                                }
                                
                                // 避免重复添加
                                if (!streams.some(s => s.url === streamUrl)) {
                                    streams.push({
                                        platform: '抖音',
                                        quality: qualityName,
                                        mediaProtocol: protocolName,
                                        type: isAudio ? '音频' : '视频',
                                        url: streamUrl
                                    });
                                }
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            }
        } catch (parseError) {
            // 跳过无法解析的JSON
            continue;
        }
    }
    
    // 策略5: 直接提取所有FLV、HLS和m3u8链接
    const streamPattern = /(https?:\/\/[^\s"']+\.(flv|m3u8|hls)[^"']*)/g;
    let streamMatch;
    
    while ((streamMatch = streamPattern.exec(html_content)) !== null) {
      let streamUrl = streamMatch[1];
      // 清理URL
      streamUrl = streamUrl.replace(/\\u0026/g, '&');
      
      // 确定清晰度
      let quality = determineQualityByStreamId(streamUrl);
      
      // 确定媒体协议
      let mediaProtocol = '--';
      if (streamMatch[2] === 'flv') {
        mediaProtocol = 'HTTP-FLV';
      } else if (streamMatch[2] === 'm3u8' || streamMatch[2] === 'hls') {
        mediaProtocol = 'HTTP-HLS';
      }
      
      // 检查是否为音频链接
      const isAudio = streamUrl.includes('only_audio=1');
      
      // 避免重复添加
      if (!streams.some(stream => stream.url === streamUrl)) {
        streams.push({
          platform: '抖音',
          quality: quality,
          mediaProtocol: mediaProtocol,
          type: isAudio ? '音频' : '视频',
          url: streamUrl
        });
      }
    }
    
    // 去重处理
    const uniqueStreams = [];
    const urlSet = new Set();
    for (let stream of streams) {
      if (!urlSet.has(stream.url)) {
        urlSet.add(stream.url);
        uniqueStreams.push(stream);
      }
    }
    
    return uniqueStreams;
  } catch (error) {
    console.error("提取抖音直播流失败:", error);
    return [];
  }
}