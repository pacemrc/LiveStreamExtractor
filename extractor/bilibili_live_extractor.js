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
                full_desc: `${clarity.desc}`
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
                              full_desc: '--清晰度'
                            };
                              
                            // 确定媒体协议
                            let mediaProtocol = '--';
                            if (fullUrl.includes('.flv')) {
                              mediaProtocol = 'HTTP-FLV';
                            } else if (fullUrl.includes('.m3u8')) {
                              mediaProtocol = 'HTTP-HLS';
                            } else if (fullUrl.includes('.ts')) {
                              mediaProtocol = 'HTTP-TS';
                            } else if (fullUrl.includes('.fmp4')) {
                              mediaProtocol = 'HTTP-fMP4';
                            }
                              
                            // 避免重复添加
                            if (!streams.some(s => s.url === fullUrl)) {
                              streams.push({
                                platform: '哔哩哔哩',
                                quality: clarity.full_desc,
                                mediaProtocol: mediaProtocol,
                                type: '视频',
                                url: fullUrl,
                                codec: codecName // 视频编码
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
                          
                          // 确定媒体协议
                          let mediaProtocol = '--';
                          if (fullUrl.includes('.flv')) {
                            mediaProtocol = 'HTTP-FLV';
                          } else if (fullUrl.includes('.m3u8')) {
                            mediaProtocol = 'HTTP-HLS';
                          }
                          
                          // 避免重复添加
                          if (!streams.some(s => s.url === fullUrl)) {
                            streams.push({
                              platform: '哔哩哔哩',
                              quality: qualityName,
                              mediaProtocol: mediaProtocol,
                              type: '视频', // 哔哩哔哩当前数据中未明确区分音频/视频
                              url: fullUrl,
                              codec: codec.codec_name || '--'
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
      
      // 避免重复添加
      if (!streams.some(stream => stream.url === url)) {
        streams.push({
          platform: '哔哩哔哩',
          quality: '--',
          mediaProtocol: format,
          type: '视频',
          url: url,
          // 添加完整的筛选字段
          codec: '--',
          hdrType: 'SDR',
          resolution: '--',
          clarity: '--'
        });
      }
    }
    
    let flvMatch;
    while ((flvMatch = flvPattern.exec(html_content)) !== null) {
      processBackupLink(flvMatch[1], 'HTTP-FLV');
    }
    
    let hlsMatch;
    while ((hlsMatch = hlsPattern.exec(html_content)) !== null) {
      processBackupLink(hlsMatch[1], 'HTTP-HLS');
    }
    
    let tsMatch;
    while ((tsMatch = tsPattern.exec(html_content)) !== null) {
      processBackupLink(tsMatch[1], 'HTTP-TS');
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
