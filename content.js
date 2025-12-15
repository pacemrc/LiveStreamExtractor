// content.js


function extractDyLiveList() {
  const streams = [];
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
              const urlPath = obj.url.split('?')[0]; // 只取URL路径部分
              if (obj.quality_name) {
                quality = obj.quality_name;
              } else if (obj.name) {
                quality = obj.name;
              } else if (obj.url.includes('_ld') || obj.url.includes('_ld5') || obj.url.includes('_Stage0T000ld')) {
                quality = '流畅';
              } else if (obj.url.includes('_md') || obj.url.includes('_sd') || obj.url.includes('_sd5')) {
                quality = '标清';
              } else if (obj.url.includes('_hd') || obj.url.includes('_hd5') || obj.url.includes('_Stage0T000sd') || obj.url.includes('_h2-zhd5')) {
                quality = '高清';
              } else if (obj.url.includes('_origin')) {
                quality = '超清';
              } else if (obj.url.includes('_or4')) {
                quality = '原画';
              } else if (obj.url.includes('_uhd') || obj.url.includes('_uhd5')) {
                quality = '超高清';
              } else if (obj.url.includes('only_audio=1')) {
                quality = '音频流';
              } else if ((urlPath.includes('/stream-') || urlPath.includes('/media/stream-') || urlPath.includes('/third/stream-')) && !urlPath.includes('_')) {
                // 基础流链接，没有任何清晰度标识，标记为原画
                quality = '原画';
              } else if (urlPath.includes('/timeshift.m3u8')) {
                // 时移流链接
                quality = '时移流';
              }
              
              // 确定格式
              let format = '--';
              if (obj.url.includes('.flv')) {
                format = 'FLV';
              } else if (obj.url.includes('.m3u8') || obj.url.includes('.hls')) {
                format = 'HLS';
              }
              
              // 检查是否为音频链接
              const isAudio = obj.url.includes('only_audio=1');
              
              // 提取5个维度数据
              let codec = '--';
              let hdrType = 'SDR';
              let resolution = '--';
              let bitrate = 0;
              
              // 1. 优先从sdk_params中提取编码信息（最准确）
              if (obj.sdk_params && typeof obj.sdk_params === 'string') {
                try {
                  const sdkParams = JSON.parse(obj.sdk_params);
                  if (sdkParams.VCodec) {
                    if (sdkParams.VCodec.toLowerCase() === 'h264') {
                      codec = 'avc (H.264)';
                    } else if (sdkParams.VCodec.toLowerCase() === 'h265' || sdkParams.VCodec.toLowerCase() === 'hevc') {
                      codec = 'hevc (H.265)';
                    } else if (sdkParams.VCodec.toLowerCase() === 'av1') {
                      codec = 'av1';
                    } else {
                      codec = sdkParams.VCodec;
                    }
                  }
                  
                  // 从sdk_params中提取分辨率
                  if (sdkParams.resolution) {
                    resolution = sdkParams.resolution;
                  }
                  
                  // 从sdk_params中提取HDR类型
                  if (sdkParams.drType && sdkParams.drType.toLowerCase() === 'hdr') {
                    hdrType = 'HDR';
                  }
                  
                  // 从sdk_params中提取码率
                  if (sdkParams.vbitrate && sdkParams.vbitrate > 0) {
                    bitrate = Math.round(sdkParams.vbitrate / 1000); // 转换为kbps
                  }
                } catch (parseError) {
                  // sdk_params解析失败，继续使用URL推断
                }
              }
              
              // 2. 如果sdk_params中没有编码信息，从URL中提取视频编码
              if (codec === '--') {
                // 抖音特定逻辑：H264Url标识使用H.264编码
                if (path.includes('H264Url') || obj.url.includes('H264Url') || obj.url.includes('_sd.flv') && !obj.url.includes('_sd5.flv')) {
                  codec = 'avc (H.264)';
                } else if (obj.url.includes('_sd5.flv') || obj.url.includes('_hd5.flv') || obj.url.includes('_uhd5.flv') || obj.url.includes('_ld5.flv')) {
                  // 抖音的5系列URL通常使用H.265编码
                  codec = 'hevc (H.265)';
                } else if (obj.url.includes('codec=avc') || obj.url.includes('h264') || obj.url.includes('H264')) {
                  codec = 'avc (H.264)';
                } else if (obj.url.includes('codec=hevc') || obj.url.includes('h265') || obj.url.includes('H265')) {
                  codec = 'hevc (H.265)';
                } else if (obj.url.includes('av1') || obj.url.includes('AV1')) {
                  codec = 'av1';
                } else {
                  // 基于URL模式推断编码
                  if (obj.url.includes('.flv')) {
                    if (obj.url.includes('_sd') || obj.url.includes('_md') || obj.url.includes('_ld')) {
                      // 标清、流畅通常使用H.264
                      codec = 'avc (H.264)';
                    } else {
                      // 高清、超清、原画可能使用H.265
                      codec = 'hevc (H.265)';
                    }
                  }
                }
              }
              
              // 从URL中提取HDR类型
              if (obj.url.includes('hdr=1') || obj.url.includes('HDR=1') || obj.url.includes('_hdr')) {
                hdrType = 'HDR';
              }
              
              // 根据清晰度映射分辨率
              switch (quality) {
                case '流畅':
                  resolution = '360P';
                  break;
                case '标清':
                  resolution = '480P';
                  break;
                case '高清':
                  resolution = '720P';
                  break;
                case '超清':
                  resolution = '1080P';
                  break;
                case '原画':
                  resolution = '1080P+';
                  break;
                case '超高清':
                  resolution = '4K';
                  break;
              }
              
              // 提取码率 - 抖音特定逻辑：基于清晰度推断码率
              if (bitrate === 0) {
                switch (quality) {
                  case '流畅':
                    bitrate = 500;
                    break;
                  case '标清':
                    bitrate = 1000;
                    break;
                  case '高清':
                    bitrate = 2000;
                    break;
                  case '超清':
                    bitrate = 3000;
                    break;
                  case '原画':
                    bitrate = 5000;
                    break;
                  case '超高清':
                    bitrate = 8000;
                    break;
                  default:
                    bitrate = 2000;
                }
              } else {
                // 从URL中提取码率
                const bitrateMatch = obj.url.match(/bitrate=(\d+)/);
                if (bitrateMatch) {
                  bitrate = parseInt(bitrateMatch[1]);
                }
              }
              
              streams.push({
                platform: '抖音',
                quality: quality,
                format: format,
                type: isAudio ? '音频' : '视频',
                url: obj.url,
                // 5个维度数据
                codec: codec,
                hdrType: hdrType,
                resolution: resolution,
                bitrate: bitrate,
                clarity: quality
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
              // 确定格式
              let format = '--';
              if (flvUrl.includes('.flv')) {
                format = 'FLV';
              } else if (flvUrl.includes('.m3u8') || flvUrl.includes('.hls')) {
                format = 'HLS';
              }
              // 确定清晰度
              let quality = '--';
              const urlPath = flvUrl.split('?')[0]; // 只取URL路径部分
              if (flvUrl.includes('_ld') || flvUrl.includes('_ld5') || flvUrl.includes('_Stage0T000ld')) {
                quality = '流畅';
              } else if (flvUrl.includes('_md') || flvUrl.includes('_sd') || flvUrl.includes('_sd5')) {
                quality = '标清';
              } else if (flvUrl.includes('_hd') || flvUrl.includes('_hd5') || flvUrl.includes('_Stage0T000sd') || flvUrl.includes('_h2-zhd5')) {
                quality = '高清';
              } else if (flvUrl.includes('_origin')) {
                quality = '超清';
              } else if (flvUrl.includes('_or4')) {
                quality = '原画';
              } else if (flvUrl.includes('_uhd') || flvUrl.includes('_uhd5')) {
                quality = '超高清';
              } else if (flvUrl.includes('only_audio=1')) {
                quality = '音频流';
              } else if ((urlPath.includes('/stream-') || urlPath.includes('/media/stream-') || urlPath.includes('/third/stream-')) && !urlPath.includes('_')) {
                quality = '原画';
              }
              // 提取5个维度数据
              let codec = '--';
              let hdrType = 'SDR';
              let resolution = '--';
              let bitrate = 0;
              
              // 从URL中提取视频编码
              // 抖音特定逻辑：H264Url标识使用H.264编码
              if (flvUrl.includes('_sd.flv') && !flvUrl.includes('_sd5.flv')) {
                codec = 'avc (H.264)';
              } else if (flvUrl.includes('_sd5.flv') || flvUrl.includes('_hd5.flv') || flvUrl.includes('_uhd5.flv') || flvUrl.includes('_ld5.flv')) {
                // 抖音的5系列URL通常使用H.265编码
                codec = 'hevc (H.265)';
              } else if (flvUrl.includes('codec=avc') || flvUrl.includes('h264') || flvUrl.includes('H264')) {
                codec = 'avc (H.264)';
              } else if (flvUrl.includes('codec=hevc') || flvUrl.includes('h265') || flvUrl.includes('H265')) {
                codec = 'hevc (H.265)';
              } else if (flvUrl.includes('av1') || flvUrl.includes('AV1')) {
                codec = 'av1';
              } else {
                // 基于URL模式推断编码
                if (flvUrl.includes('.flv')) {
                  if (flvUrl.includes('_sd') || flvUrl.includes('_md') || flvUrl.includes('_ld')) {
                    // 标清、流畅通常使用H.264
                    codec = 'avc (H.264)';
                  } else {
                    // 高清、超清、原画可能使用H.265
                    codec = 'hevc (H.265)';
                  }
                }
              }
              
              // 从URL中提取HDR类型
              if (flvUrl.includes('hdr=1') || flvUrl.includes('HDR=1') || flvUrl.includes('_hdr')) {
                hdrType = 'HDR';
              }
              
              // 根据清晰度映射分辨率
              switch (quality) {
                case '流畅':
                  resolution = '360P';
                  break;
                case '标清':
                  resolution = '480P';
                  break;
                case '高清':
                  resolution = '720P';
                  break;
                case '超清':
                  resolution = '1080P';
                  break;
                case '原画':
                  resolution = '1080P+';
                  break;
                case '超高清':
                  resolution = '4K';
                  break;
              }
              
              // 提取码率 - 抖音特定逻辑：基于清晰度推断码率
              if (bitrate === 0) {
                switch (quality) {
                  case '流畅':
                    bitrate = 500;
                    break;
                  case '标清':
                    bitrate = 1000;
                    break;
                  case '高清':
                    bitrate = 2000;
                    break;
                  case '超清':
                    bitrate = 3000;
                    break;
                  case '原画':
                    bitrate = 5000;
                    break;
                  case '超高清':
                    bitrate = 8000;
                    break;
                  default:
                    bitrate = 2000;
                }
              } else {
                // 从URL中提取码率
                const bitrateMatch = flvUrl.match(/bitrate=(\d+)/);
                if (bitrateMatch) {
                  bitrate = parseInt(bitrateMatch[1]);
                }
              }
              
              streams.push({
                platform: '抖音',
                quality: quality,
                format: format,
                type: isAudio ? '音频' : '视频',
                url: flvUrl,
                // 5个维度数据
                codec: codec,
                hdrType: hdrType,
                resolution: resolution,
                bitrate: bitrate,
                clarity: quality
              });
            }
          }
          
          // 提取备份链接
          if (configData.basicPlayerProps && configData.basicPlayerProps.playerAction && configData.basicPlayerProps.playerAction.inlineEnterOptInfo) {
            const optInfo = configData.basicPlayerProps.playerAction.inlineEnterOptInfo;
            
            // 通用清晰度判断函数
            function determineQuality(url) {
              let quality = '--';
              const urlPath = url.split('?')[0]; // 只取URL路径部分
              if (url.includes('_ld') || url.includes('_ld5') || url.includes('_Stage0T000ld')) {
                quality = '流畅';
              } else if (url.includes('_md') || url.includes('_sd') || url.includes('_sd5')) {
                quality = '标清';
              } else if (url.includes('_hd') || url.includes('_hd5') || url.includes('_Stage0T000sd') || url.includes('_h2-zhd5')) {
                quality = '高清';
              } else if (url.includes('_origin')) {
                quality = '超清';
              } else if (url.includes('_or4')) {
                quality = '原画';
              } else if (url.includes('_uhd') || url.includes('_uhd5')) {
                quality = '超高清';
              } else if (url.includes('only_audio=1')) {
                quality = '音频流';
              } else if ((urlPath.includes('/stream-') || urlPath.includes('/media/stream-') || urlPath.includes('/third/stream-')) && !urlPath.includes('_')) {
                quality = '原画';
              }
              return quality;
            }
            
            const urlProps = ['backupUrl', 'H264Url', 'lowUrl', 'mainUrl'];
            
            urlProps.forEach(prop => {
              if (optInfo[prop] && typeof optInfo[prop] === 'string') {
                const url = optInfo[prop];
                if (url.includes('.flv') || url.includes('.m3u8') || url.includes('.hls')) {
                  // 检查是否为音频链接
                  const isAudio = url.includes('only_audio=1');
                  // 确定格式
                  let format = '--';
                  if (url.includes('.flv')) {
                    format = 'FLV';
                  } else if (url.includes('.m3u8') || url.includes('.hls')) {
                    format = 'HLS';
                  }
                  // 确定清晰度
                  let quality = determineQuality(url);
                  if (prop === 'backupUrl') quality += '(备份)';
                  else if (prop === 'H264Url') quality += '(H264)';
                  
                  // 提取5个维度数据
                  let codec = '--';
                  let hdrType = 'SDR';
                  let resolution = '--';
                  let bitrate = 0;
                  
                  // 从URL中提取视频编码
                  // 抖音特定逻辑：H264Url标识使用H.264编码
                  if (prop === 'H264Url' || url.includes('_sd.flv') && !url.includes('_sd5.flv')) {
                    codec = 'avc (H.264)';
                  } else if (url.includes('_sd5.flv') || url.includes('_hd5.flv') || url.includes('_uhd5.flv') || url.includes('_ld5.flv')) {
                    // 抖音的5系列URL通常使用H.265编码
                    codec = 'hevc (H.265)';
                  } else if (url.includes('codec=avc') || url.includes('h264') || url.includes('H264')) {
                    codec = 'avc (H.264)';
                  } else if (url.includes('codec=hevc') || url.includes('h265') || url.includes('H265')) {
                    codec = 'hevc (H.265)';
                  } else if (url.includes('av1') || url.includes('AV1')) {
                    codec = 'av1';
                  } else {
                    // 基于URL模式推断编码
                    if (url.includes('.flv')) {
                      if (url.includes('_sd') || url.includes('_md') || url.includes('_ld')) {
                        // 标清、流畅通常使用H.264
                        codec = 'avc (H.264)';
                      } else {
                        // 高清、超清、原画可能使用H.265
                        codec = 'hevc (H.265)';
                      }
                    }
                  }
                  
                  // 从URL中提取HDR类型
                  if (url.includes('hdr=1') || url.includes('HDR=1') || url.includes('_hdr')) {
                    hdrType = 'HDR';
                  }
                  
                  // 根据清晰度映射分辨率
                  const baseQuality = quality.replace(/\(备份\)|\(H264\)/g, '').trim();
                  switch (baseQuality) {
                    case '流畅':
                      resolution = '360P';
                      break;
                    case '标清':
                      resolution = '480P';
                      break;
                    case '高清':
                      resolution = '720P';
                      break;
                    case '超清':
                      resolution = '1080P';
                      break;
                    case '原画':
                      resolution = '1080P+';
                      break;
                    case '超高清':
                      resolution = '4K';
                      break;
                  }
                  
                  // 提取码率 - 抖音特定逻辑：基于清晰度推断码率
                  if (bitrate === 0) {
                    switch (baseQuality) {
                      case '流畅':
                        bitrate = 500;
                        break;
                      case '标清':
                        bitrate = 1000;
                        break;
                      case '高清':
                        bitrate = 2000;
                        break;
                      case '超清':
                        bitrate = 3000;
                        break;
                      case '原画':
                        bitrate = 5000;
                        break;
                      case '超高清':
                        bitrate = 8000;
                        break;
                      default:
                        bitrate = 2000;
                    }
                  } else {
                    // 从URL中提取码率
                    const bitrateMatch = url.match(/bitrate=(\d+)/);
                    if (bitrateMatch) {
                      bitrate = parseInt(bitrateMatch[1]);
                    }
                  }
                  
                  streams.push({
                    platform: '抖音',
                    quality: quality,
                    format: format,
                    type: isAudio ? '音频' : '视频',
                    url: url,
                    // 5个维度数据
                    codec: codec,
                    hdrType: hdrType,
                    resolution: resolution,
                    bitrate: bitrate,
                    clarity: quality
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
                    
                    // 确定格式
                    let format = '--';
                    if (option.url.includes('.flv')) {
                      format = 'FLV';
                    } else if (option.url.includes('.m3u8') || option.url.includes('.hls')) {
                      format = 'HLS';
                    }
                    
                    // 检查是否为音频链接
                    const isAudio = option.url.includes('only_audio=1');
                    
                    // 提取5个维度数据
                    let codec = '--';
                    let hdrType = 'SDR';
                    let resolution = '--';
                    let bitrate = 0;
                    
                    // 从URL中提取视频编码
                    // 抖音特定逻辑：H264Url标识使用H.264编码
                    if (option.url.includes('_sd.flv') && !option.url.includes('_sd5.flv')) {
                      codec = 'avc (H.264)';
                    } else if (option.url.includes('_sd5.flv') || option.url.includes('_hd5.flv') || option.url.includes('_uhd5.flv') || option.url.includes('_ld5.flv')) {
                      // 抖音的5系列URL通常使用H.265编码
                      codec = 'hevc (H.265)';
                    } else if (option.url.includes('codec=avc') || option.url.includes('h264') || option.url.includes('H264')) {
                      codec = 'avc (H.264)';
                    } else if (option.url.includes('codec=hevc') || option.url.includes('h265') || option.url.includes('H265')) {
                      codec = 'hevc (H.265)';
                    } else if (option.url.includes('av1') || option.url.includes('AV1')) {
                      codec = 'av1';
                    } else {
                      // 基于URL模式推断编码
                      if (option.url.includes('.flv')) {
                        if (option.url.includes('_sd') || option.url.includes('_md') || option.url.includes('_ld')) {
                          // 标清、流畅通常使用H.264
                          codec = 'avc (H.264)';
                        } else {
                          // 高清、超清、原画可能使用H.265
                          codec = 'hevc (H.265)';
                        }
                      }
                    }
                    
                    // 从URL中提取HDR类型
                    if (option.url.includes('hdr=1') || option.url.includes('HDR=1') || option.url.includes('_hdr')) {
                      hdrType = 'HDR';
                    }
                    
                    // 根据清晰度映射分辨率
                    switch (quality) {
                      case '流畅':
                        resolution = '360P';
                        break;
                      case '标清':
                        resolution = '480P';
                        break;
                      case '高清':
                        resolution = '720P';
                        break;
                      case '超清':
                        resolution = '1080P';
                        break;
                      case '原画':
                        resolution = '1080P+';
                        break;
                      case '超高清':
                        resolution = '4K';
                        break;
                    }
                    
                    // 提取码率 - 抖音特定逻辑：基于清晰度推断码率
                    if (bitrate === 0) {
                      switch (quality) {
                        case '流畅':
                          bitrate = 500;
                          break;
                        case '标清':
                          bitrate = 1000;
                          break;
                        case '高清':
                          bitrate = 2000;
                          break;
                        case '超清':
                          bitrate = 3000;
                          break;
                        case '原画':
                          bitrate = 5000;
                          break;
                        case '超高清':
                          bitrate = 8000;
                          break;
                        default:
                          bitrate = 2000;
                      }
                    } else {
                      // 从URL中提取码率
                      const bitrateMatch = option.url.match(/bitrate=(\d+)/);
                      if (bitrateMatch) {
                        bitrate = parseInt(bitrateMatch[1]);
                      }
                    }
                    
                    streams.push({
                      platform: '抖音',
                      quality: quality,
                      format: format,
                      type: isAudio ? '音频' : '视频',
                      url: option.url,
                      // 5个维度数据
                      codec: codec,
                      hdrType: hdrType,
                      resolution: resolution,
                      bitrate: bitrate,
                      clarity: quality
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
                                            
                                            // 提取5个维度数据
                                            let codec = '--';
                                            let hdrType = 'SDR';
                                            let resolution = '--';
                                            let bitrate = 0;
                                            
                                            // 从sdk_params中提取编码信息
                                            if (lineData.sdk_params) {
                                                try {
                                                    const sdkParams = JSON.parse(lineData.sdk_params);
                                                    if (sdkParams.VCodec) {
                                                        if (sdkParams.VCodec.toLowerCase() === 'h264') {
                                                            codec = 'avc (H.264)';
                                                        } else if (sdkParams.VCodec.toLowerCase() === 'h265' || sdkParams.VCodec.toLowerCase() === 'hevc') {
                                                            codec = 'hevc (H.265)';
                                                        } else if (sdkParams.VCodec.toLowerCase() === 'av1') {
                                                            codec = 'av1';
                                                        } else {
                                                            codec = sdkParams.VCodec;
                                                        }
                                                    }
                                                    
                                                    // 从sdk_params中提取分辨率
                                                    if (sdkParams.resolution) {
                                                        resolution = sdkParams.resolution;
                                                    }
                                                    
                                                    // 从sdk_params中提取HDR类型
                                                    if (sdkParams.drType && sdkParams.drType.toLowerCase() === 'hdr') {
                                                        hdrType = 'HDR';
                                                    }
                                                    
                                                    // 从sdk_params中提取码率
                                                    if (sdkParams.vbitrate && sdkParams.vbitrate > 0) {
                                                        bitrate = Math.round(sdkParams.vbitrate / 1000); // 转换为kbps
                                                    }
                                                } catch (parseError) {
                                                    console.error('解析sdk_params失败:', parseError.message);
                                                }
                                            }
                                            
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
                                            
                                            // 确定格式名称
                                            let formatName = formatKey.toUpperCase();
                                            
                                            // 避免重复添加
                                            if (!streams.some(s => s.url === streamUrl)) {
                                                streams.push({
                                                    platform: '抖音',
                                                    quality: qualityName,
                                                    format: formatName,
                                                    type: isAudio ? '音频' : '视频',
                                                    url: streamUrl,
                                                    // 5个维度数据
                                                    codec: codec,
                                                    hdrType: hdrType,
                                                    resolution: resolution,
                                                    bitrate: bitrate,
                                                    clarity: qualityName
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
      let quality = '--';
      const urlPath = streamUrl.split('?')[0]; // 只取URL路径部分
      if (streamUrl.includes('_ld') || streamUrl.includes('_ld5') || streamUrl.includes('_Stage0T000ld')) {
        quality = '流畅';
      } else if (streamUrl.includes('_md') || streamUrl.includes('_sd') || streamUrl.includes('_sd5')) {
        quality = '标清';
      } else if (streamUrl.includes('_hd') || streamUrl.includes('_hd5') || streamUrl.includes('_Stage0T000sd') || streamUrl.includes('_h2-zhd5')) {
        quality = '高清';
      } else if (streamUrl.includes('_origin')) {
        quality = '超清';
      } else if (streamUrl.includes('_or4')) {
        quality = '原画';
      } else if (streamUrl.includes('_uhd') || streamUrl.includes('_uhd5')) {
        quality = '超高清';
      } else if (streamUrl.includes('only_audio=1')) {
        quality = '音频流';
      } else if ((urlPath.includes('/stream-') || urlPath.includes('/media/stream-') || urlPath.includes('/third/stream-')) && !urlPath.includes('_')) {
        // 基础流链接，没有任何清晰度标识，标记为原画
        quality = '原画';
      } else if (urlPath.includes('/timeshift.m3u8')) {
        // 时移流链接
        quality = '时移流';
      }
      
      // 确定格式
      let format = streamMatch[2].toUpperCase();
      
      // 检查是否为音频链接
      const isAudio = streamUrl.includes('only_audio=1');
      
      // 避免重复添加
      if (!streams.some(stream => stream.url === streamUrl)) {
        // 提取5个维度数据
        let codec = '--';
        let hdrType = 'SDR';
        let resolution = '--';
        let bitrate = 0;
        
        // 从URL中提取视频编码
        // 抖音特定逻辑：H264Url标识使用H.264编码
        if (streamUrl.includes('_sd.flv') && !streamUrl.includes('_sd5.flv')) {
          codec = 'avc (H.264)';
        } else if (streamUrl.includes('_sd5.flv') || streamUrl.includes('_hd5.flv') || streamUrl.includes('_uhd5.flv') || streamUrl.includes('_ld5.flv')) {
          // 抖音的5系列URL通常使用H.265编码
          codec = 'hevc (H.265)';
        } else if (streamUrl.includes('codec=avc') || streamUrl.includes('h264') || streamUrl.includes('H264')) {
          codec = 'avc (H.264)';
        } else if (streamUrl.includes('codec=hevc') || streamUrl.includes('h265') || streamUrl.includes('H265')) {
          codec = 'hevc (H.265)';
        } else if (streamUrl.includes('av1') || streamUrl.includes('AV1')) {
          codec = 'av1';
        } else {
          // 基于URL模式推断编码
          if (streamUrl.includes('.flv')) {
            if (streamUrl.includes('_sd') || streamUrl.includes('_md') || streamUrl.includes('_ld')) {
              // 标清、流畅通常使用H.264
              codec = 'avc (H.264)';
            } else {
              // 高清、超清、原画可能使用H.265
              codec = 'hevc (H.265)';
            }
          }
        }
        
        // 从URL中提取HDR类型
        if (streamUrl.includes('hdr=1') || streamUrl.includes('HDR=1') || streamUrl.includes('_hdr')) {
          hdrType = 'HDR';
        }
        
        // 根据清晰度映射分辨率
        switch (quality) {
          case '流畅':
            resolution = '360P';
            break;
          case '标清':
            resolution = '480P';
            break;
          case '高清':
            resolution = '720P';
            break;
          case '超清':
            resolution = '1080P';
            break;
          case '原画':
            resolution = '1080P+';
            break;
          case '超高清':
            resolution = '4K';
            break;
          case '时移流':
            resolution = '--';
            break;
        }
        
        // 提取码率 - 抖音特定逻辑：基于清晰度推断码率
        if (bitrate === 0) {
          switch (quality) {
            case '流畅':
              bitrate = 500;
              break;
            case '标清':
              bitrate = 1000;
              break;
            case '高清':
              bitrate = 2000;
              break;
            case '超清':
              bitrate = 3000;
              break;
            case '原画':
              bitrate = 5000;
              break;
            case '超高清':
              bitrate = 8000;
              break;
            case '时移流':
              bitrate = 2000;
              break;
            default:
              bitrate = 2000;
          }
        } else {
          // 从URL中提取码率
          const bitrateMatch = streamUrl.match(/bitrate=(\d+)/);
          if (bitrateMatch) {
            bitrate = parseInt(bitrateMatch[1]);
          }
        }
        
        streams.push({
          platform: '抖音',
          quality: quality,
          format: format,
          type: isAudio ? '音频' : '视频',
          url: streamUrl,
          // 5个维度数据
          codec: codec,
          hdrType: hdrType,
          resolution: resolution,
          bitrate: bitrate,
          clarity: quality
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

// 提取哔哩哔哩直播流
function extractBilibiliLiveList() {
  const streams = [];
  try {
    var html_content = document.documentElement.outerHTML;
    
    // 策略1: 使用更可靠的方式提取playurl_info
    // 直接搜索playurl_info，不依赖于__INITIAL_STATE__
    const playurlInfoStart = html_content.indexOf('"playurl_info"');
    
    if (playurlInfoStart !== -1) {
      // 跳过冒号和空格，找到playurl_info对象的开始位置
      let startIndex = html_content.indexOf('{', playurlInfoStart);
      if (startIndex !== -1) {
        // 从playurl_info开始，找到匹配的闭合括号
        let openBraces = 0;
        let closeBraces = 0;
        let endIndex = startIndex;
        
        for (let i = startIndex; i < html_content.length; i++) {
          if (html_content[i] === '{') {
            openBraces++;
          } else if (html_content[i] === '}') {
            closeBraces++;
            if (openBraces === closeBraces) {
              endIndex = i + 1;
              break;
            }
          }
        }
        
        if (openBraces === closeBraces) {
          let playurlInfo = null;
          
          try {
            // 提取playurl_info字符串
            const playurlInfoStr = html_content.substring(startIndex, endIndex);
            
            // 确保JSON格式正确，移除可能的 trailing 逗号
            const cleanedPlayurlInfoStr = playurlInfoStr.replace(/,\s*([}\]])/g, '$1');
            
            // 解析playurl_info
            playurlInfo = JSON.parse(cleanedPlayurlInfoStr);
          } catch (parseError) {
            console.error('解析playurl_info失败:', parseError.message);
          }
          
          if (playurlInfo) {
            // 提取g_qn_desc
            const gQnDesc = playurlInfo.playurl?.g_qn_desc || [];
            
            // 提取stream
            const streamsData = playurlInfo.playurl?.stream || [];
            
            // 处理清晰度信息
            const clarityInfo = [];
            gQnDesc.forEach(clarity => {
              clarityInfo.push({
                qn: clarity.qn,
                desc: clarity.desc,
                hdr_type: clarity.hdr_type,
                full_desc: `${clarity.desc}${clarity.hdr_type === 1 ? '/HDR' : ''}`
              });
            });
            
            // 处理直播流数据
            streamsData.forEach(stream => {
              const protocol = stream.protocol_name;
              
              // 处理format
              if (stream.format && Array.isArray(stream.format)) {
                stream.format.forEach(format => {
                  const formatName = format.format_name;
                  
                  // 处理codec
                  if (format.codec && Array.isArray(format.codec)) {
                    format.codec.forEach(codec => {
                      const codecName = codec.codec_name;
                      const currentQn = codec.current_qn;
                      const acceptQnList = codec.accept_qn || [currentQn]; // 获取所有可用清晰度
                      const baseUrl = codec.base_url;
                       
                      // 处理url_info
                      if (codec.url_info && Array.isArray(codec.url_info)) {
                        codec.url_info.forEach((urlInfo, index) => {
                          const host = urlInfo.host;
                          
                          // 为每个可用清晰度生成流链接
                          acceptQnList.forEach(qn => {
                            // 复制extra并替换qn参数
                            let extra = urlInfo.extra;
                            // 替换URL中的qn参数
                            extra = extra.replace(/qn=\d+/g, `qn=${qn}`);
                            
                            // 拼接完整URL
                            const fullUrl = `${host}${baseUrl}${extra}`;
                              
                            // 获取清晰度描述
                            const clarity = clarityInfo.find(c => c.qn === qn) || {
                              qn: qn,
                              desc: '--',
                              hdr_type: 0,
                              full_desc: '--清晰度'
                            };
                             
                            // 确定格式
                            let streamFormat = '--格式';
                            if (fullUrl.includes('.flv')) {
                              streamFormat = 'FLV';
                            } else if (fullUrl.includes('.m3u8')) {
                              streamFormat = 'HLS';
                            } else if (fullUrl.includes('.ts')) {
                              streamFormat = 'TS';
                            } else if (fullUrl.includes('.fmp4')) {
                              streamFormat = 'fMP4';
                            }
                             
                            // 提取码率信息
                            let bitrate = 0;
                            const bitrateMatch = extra.match(/origin_bitrate=(\d+)/);
                            if (bitrateMatch) {
                              bitrate = parseInt(bitrateMatch[1]);
                            }
                             
                            // 确定分辨率
                            let resolution = '--';
                            if (qn === 80) {
                              resolution = '360P';
                            } else if (qn === 150) {
                              resolution = '480P';
                            } else if (qn === 250) {
                              resolution = '720P';
                            } else if (qn === 400) {
                              resolution = '1080P';
                            } else if (qn === 10000) {
                              resolution = '1080P';
                            } else if (qn === 15000) {
                              resolution = '2K';
                            } else if (qn === 20000) {
                              resolution = '4K';
                            } else if (qn === 25000) {
                              resolution = '4K';
                            } else if (qn === 30000) {
                              resolution = '4K';
                            }
                             
                            // 确定HDR类型
                            let hdrType = 'SDR';
                            if (clarity.hdr_type === 1) {
                              hdrType = 'HDR10';
                            } else if (clarity.hdr_type === 6) {
                              hdrType = '其他HDR';
                            }
                             
                            // 避免重复添加
                            if (!streams.some(s => s.url === fullUrl)) {
                              streams.push({
                platform: '哔哩哔哩',
                quality: clarity.full_desc,
                format: streamFormat,
                type: '视频',
                url: fullUrl,
                // 5个维度数据
                codec: codecName, // 视频编码
                hdrType: hdrType, // HDR类型
                resolution: resolution, // 分辨率
                bitrate: bitrate, // 码率
                clarity: clarity.full_desc // 清晰度
              });
                            }
                          });
                        });
                      }
                    });
                  }
                });
              }
            });
          }
        }
      }
    }
    
    // 策略2: 从__INITIAL_STATE__中提取直播流URL（兼容旧版本）
    const statePattern = /window\.__INITIAL_STATE__\s*=\s*({[^;]+});/;
    const stateMatch = html_content.match(statePattern);
    
    if (stateMatch && stateMatch[1]) {
      try {
        let initialState = JSON.parse(stateMatch[1]);
        
        // 提取直播流数据
        if (initialState.roomInitDataV2 && initialState.roomInitDataV2.data && initialState.roomInitDataV2.data.playurl_info) {
          const playurlInfo = initialState.roomInitDataV2.data.playurl_info;
          
          if (playurlInfo.playurl && playurlInfo.playurl.stream) {
            const streamsData = playurlInfo.playurl.stream;
            
            // 遍历所有流
            streamsData.forEach(stream => {
              if (stream.format && stream.format.codec) {
                // 处理codec
                stream.format.codec.forEach(codec => {
                  if (codec.url_info && Array.isArray(codec.url_info) && codec.url_info.length > 0) {
                    const acceptQnList = codec.accept_qn || [codec.current_qn || 400]; // 获取所有可用清晰度
                    
                    // 遍历所有URL信息
                    codec.url_info.forEach(urlInfo => {
                      if (urlInfo.host && codec.base_url && urlInfo.extra) {
                        // 为每个可用清晰度生成流链接
                        acceptQnList.forEach(qn => {
                          // 复制extra并替换qn参数
                          let extra = urlInfo.extra;
                          // 替换URL中的qn参数
                          extra = extra.replace(/qn=\d+/g, `qn=${qn}`);
                          
                          // 构建完整URL
                          const fullUrl = `${urlInfo.host}${codec.base_url}${extra}`;
                          
                          // 确定清晰度名称
                          let qualityName = codec.codec_name || '--清晰度';
                          // 根据qn值映射清晰度名称
                          if (qn === 80) {
                            qualityName = '流畅';
                          } else if (qn === 150) {
                            qualityName = '高清';
                          } else if (qn === 250) {
                            qualityName = '超清';
                          } else if (qn === 400) {
                            qualityName = '蓝光';
                          } else if (qn === 10000) {
                            qualityName = '原画';
                          } else if (qn === 15000) {
                            qualityName = '2K';
                          } else if (qn === 20000) {
                            qualityName = '4K';
                          } else if (qn === 25000) {
                            qualityName = '原画真彩';
                          } else if (qn === 30000) {
                            qualityName = '杜比';
                          }
                          
                          // 确定格式
                          let format = '--格式';
                          if (fullUrl.includes('.flv')) {
                            format = 'FLV';
                          } else if (fullUrl.includes('.m3u8')) {
                            format = 'HLS';
                          }
                          
                          // 提取码率信息
                          let bitrate = 0;
                          const bitrateMatch = extra.match(/origin_bitrate=(\d+)/);
                          if (bitrateMatch) {
                            bitrate = parseInt(bitrateMatch[1]);
                          }
                          
                          // 确定分辨率
                          let resolution = '--';
                          if (qn === 80) {
                            resolution = '360P';
                          } else if (qn === 150) {
                            resolution = '480P';
                          } else if (qn === 250) {
                            resolution = '720P';
                          } else if (qn === 400) {
                            resolution = '1080P';
                          } else if (qn === 10000) {
                            resolution = '1080P+';
                          } else if (qn === 15000) {
                            resolution = '2K';
                          } else if (qn === 20000 || qn === 25000 || qn === 30000) {
                            resolution = '4K';
                          }
                          
                          // 确定HDR类型
                          let hdrType = 'SDR';
                          
                          // 避免重复添加
                          if (!streams.some(s => s.url === fullUrl)) {
                            streams.push({
                              platform: '哔哩哔哩',
                              quality: qualityName,
                              format: format,
                              type: '视频', // 哔哩哔哩当前数据中未明确区分音频/视频
                              url: fullUrl,
                              // 添加完整的筛选字段
                              codec: codec.codec_name || '--',
                              hdrType: hdrType,
                              resolution: resolution,
                              bitrate: bitrate,
                              clarity: qualityName
                            });
                          }
                        });
                      }
                    });
                  }
                });
              }
            });
          }
        }
      } catch (innerError) {
        console.error("解析哔哩哔哩初始状态失败:", innerError);
      }
    }
    
    // 策略3: 直接提取所有FLV和HLS链接作为备份
    const flvPattern = /(https?:\/\/[^\s"']+\.flv[^"']*)/g;
    const hlsPattern = /(https?:\/\/[^\s"']+\.(m3u8|hls)[^"']*)/g;
    const tsPattern = /(https?:\/\/[^\s"']+\.ts[^"']*)/g;
    
    // 通用处理备份链接的函数
    function processBackupLink(url, format) {
      // 清理URL
      url = url.replace(/\\u0026/g, '&');
      
      // 提取码率信息
      let bitrate = 0;
      const bitrateMatch = url.match(/origin_bitrate=(\d+)/);
      if (bitrateMatch) {
        bitrate = parseInt(bitrateMatch[1]);
      }
      
      // 避免重复添加
      if (!streams.some(stream => stream.url === url)) {
        streams.push({
          platform: '哔哩哔哩',
          quality: '--',
          format: format,
          type: '视频',
          url: url,
          // 添加完整的筛选字段
          codec: '--',
          hdrType: 'SDR',
          resolution: '--',
          bitrate: bitrate,
          clarity: '--'
        });
      }
    }
    
    let flvMatch;
    while ((flvMatch = flvPattern.exec(html_content)) !== null) {
      processBackupLink(flvMatch[1], 'FLV');
    }
    
    let hlsMatch;
    while ((hlsMatch = hlsPattern.exec(html_content)) !== null) {
      processBackupLink(hlsMatch[1], 'HLS');
    }
    
    let tsMatch;
    while ((tsMatch = tsPattern.exec(html_content)) !== null) {
      processBackupLink(tsMatch[1], 'TS');
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
    console.error("提取哔哩哔哩直播流失败:", error);
    return [];
  }
}

// 通用直播流提取函数
function extractLiveList() {
  const hostname = window.location.hostname;
  
  if (hostname.includes('douyin.com')) {
    return extractDyLiveList();
  } else if (hostname.includes('bilibili.com')) {
    return extractBilibiliLiveList();
  }
  
  return [];
}


// Send extracted URLs to the popup
chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
  try {
    if (request.action === "extractLiveList") {
      // 通用直播流提取
      var liveList = extractLiveList();
      sendResponse(liveList);
      return true; // 表示会异步响应
    } else if (request.action === "extractDyLiveList") {
      // 兼容原有抖音直播流提取
      var dyList = extractDyLiveList();
      sendResponse(dyList);
      return true; // 表示会异步响应
    }
    // 如果没有匹配的action，返回默认响应
    sendResponse([]);
    return true;
  } catch (error) {
    console.error("处理消息失败:", error);
    sendResponse([]);
    return true;
  }
});