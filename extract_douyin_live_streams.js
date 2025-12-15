// 提取抖音直播间直播流链接的脚本
const fs = require('fs');

// 读取douyin.html文件
const douyinHtml = fs.readFileSync('/Users/pacemrc/WebstormProjects/douyin_live_url/data/douyin.html', 'utf8');

console.log('正在从douyin.html中提取直播流链接...');

// 使用更新后的提取逻辑
function extractLiveStreams(html_content) {
  const streams = [];
  try {
    // 策略1: 从data-config属性中提取直播流URL
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
            if (flvUrl.includes('.flv')) {
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
              streams.push({
                platform: '抖音',
                quality: quality,
                format: 'FLV',
                type: 'main',
                url: flvUrl
              });
            }
          }
          
          // 提取备份链接
          if (configData.basicPlayerProps && configData.basicPlayerProps.playerAction && configData.basicPlayerProps.playerAction.inlineEnterOptInfo) {
            const optInfo = configData.basicPlayerProps.playerAction.inlineEnterOptInfo;
            
            // 通用清晰度判断函数
            function getQuality(url) {
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
            
            if (optInfo.backupUrl && optInfo.backupUrl.includes('.flv')) {
              streams.push({
                platform: '抖音',
                quality: getQuality(optInfo.backupUrl) + '(备份)',
                format: 'FLV',
                type: 'backup',
                url: optInfo.backupUrl
              });
            }
            if (optInfo.H264Url && optInfo.H264Url.includes('.flv')) {
              streams.push({
                platform: '抖音',
                quality: getQuality(optInfo.H264Url) + '(H264)',
                format: 'FLV',
                type: 'h264',
                url: optInfo.H264Url
              });
            }
            if (optInfo.lowUrl && optInfo.lowUrl.includes('.flv')) {
              streams.push({
                platform: '抖音',
                quality: getQuality(optInfo.lowUrl),
                format: 'FLV',
                type: 'low',
                url: optInfo.lowUrl
              });
            }
          }
        } catch (innerError) {
          // 跳过无效的JSON
          continue;
        }
      }
    }
    
    // 策略2: 直接提取所有FLV和HLS链接
    const flvPattern = /(https?:\/\/[^\s"']+\.flv[^"']*)/g;
    const hlsPattern = /(https?:\/\/[^\s"']+\.(m3u8|hls)[^"']*)/g;
    
    let flvMatch;
    while ((flvMatch = flvPattern.exec(html_content)) !== null) {
      let flvUrl = flvMatch[1];
      // 清理URL
      flvUrl = flvUrl.replace(/\\u0026/g, '&');
      
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
        // 基础流链接，没有任何清晰度标识，标记为原画
        quality = '原画';
      } else if (urlPath.includes('/timeshift.m3u8')) {
        // 时移流链接
        quality = '时移流';
      }
      
      // 确定类型
      let type = 'unknown';
      if (flvUrl.includes('pull-flv-q3-admin') || flvUrl.includes('pull-q3.')) {
        type = 'main';
      } else if (flvUrl.includes('pull-flv-q6-admin') || flvUrl.includes('pull-q6.')) {
        type = 'backup';
      } else if (flvUrl.includes('pull-hls-q11.') || flvUrl.includes('pull-flv-q11.')) {
        type = 'hls_backup';
      }
      
      // 避免重复添加
      if (!streams.some(stream => stream.url === flvUrl)) {
        streams.push({
          platform: '抖音',
          quality: quality,
          format: 'FLV',
          type: type,
          url: flvUrl
        });
      }
    }
    
    let hlsMatch;
    while ((hlsMatch = hlsPattern.exec(html_content)) !== null) {
      let hlsUrl = hlsMatch[1];
      // 清理URL
      hlsUrl = hlsUrl.replace(/\\u0026/g, '&');
      
      // 确定清晰度
      let quality = '--';
      const urlPath = hlsUrl.split('?')[0]; // 只取URL路径部分
      if (hlsUrl.includes('_ld') || hlsUrl.includes('_ld5') || hlsUrl.includes('_Stage0T000ld')) {
        quality = '流畅';
      } else if (hlsUrl.includes('_md') || hlsUrl.includes('_sd') || hlsUrl.includes('_sd5')) {
        quality = '标清';
      } else if (hlsUrl.includes('_hd') || hlsUrl.includes('_hd5') || hlsUrl.includes('_Stage0T000sd') || hlsUrl.includes('_h2-zhd5')) {
        quality = '高清';
      } else if (hlsUrl.includes('_origin')) {
        quality = '超清';
      } else if (hlsUrl.includes('_or4')) {
        quality = '原画';
      } else if (hlsUrl.includes('_uhd') || hlsUrl.includes('_uhd5')) {
        quality = '超高清';
      } else if (hlsUrl.includes('only_audio=1')) {
        quality = '音频流';
      } else if ((urlPath.includes('/stream-') || urlPath.includes('/media/stream-') || urlPath.includes('/third/stream-')) && !urlPath.includes('_')) {
        // 基础流链接，没有任何清晰度标识，标记为原画
        quality = '原画';
      } else if (urlPath.includes('/timeshift.m3u8')) {
        // 时移流链接
        quality = '时移流';
      }
      
      // 确定类型
      let type = 'unknown';
      if (hlsUrl.includes('pull-q3.')) {
        type = 'main';
      } else if (hlsUrl.includes('pull-hls-q6.') || hlsUrl.includes('pull-q6.')) {
        type = 'backup';
      } else if (hlsUrl.includes('pull-hls-q11.')) {
        type = 'hls_backup';
      }
      
      // 避免重复添加
      if (!streams.some(stream => stream.url === hlsUrl)) {
        streams.push({
          platform: '抖音',
          quality: quality,
          format: 'HLS',
          type: type,
          url: hlsUrl
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

// 执行提取
const streams = extractLiveStreams(douyinHtml);

// 按清晰度和格式排序
streams.sort((a, b) => {
    // 清晰度优先级：流畅 < 标清 < 高清 < 超清 < 未知
    const qualityOrder = { '流畅': 1, '标清': 2, '高清': 3, '超清': 4, '--': 5 };
    
    // 格式优先级：FLV < HLS
    const formatOrder = { 'FLV': 1, 'HLS': 2 };
    
    // 类型优先级：main < backup < h264 < hls_backup < low < unknown
    const typeOrder = { 'main': 1, 'backup': 2, 'h264': 3, 'hls_backup': 4, 'low': 5, 'unknown': 6 };
    
    if (qualityOrder[a.quality] !== qualityOrder[b.quality]) {
        return qualityOrder[a.quality] - qualityOrder[b.quality];
    }
    
    if (formatOrder[a.format] !== formatOrder[b.format]) {
        return formatOrder[a.format] - formatOrder[b.format];
    }
    
    return typeOrder[a.type] - typeOrder[b.type];
});

// 输出结果
console.log('\n' + '=' .repeat(80));
console.log('抖音直播间直播流链接提取结果');
console.log('=' .repeat(80));

streams.forEach((stream, index) => {
    console.log(`\n${index + 1}. ${stream.quality} - ${stream.format} (${stream.type})`);
    console.log(stream.url);
});

console.log('\n' + '=' .repeat(80));
console.log(`共提取到 ${streams.length} 个直播流链接`);

// 保存到文件
fs.writeFileSync('/Users/pacemrc/WebstormProjects/douyin_live_url/data/live_streams.html', JSON.stringify(streams, null, 2));
console.log('\n直播流链接已保存到 data/live_streams.html 文件');