const fs = require('fs');

// 读取HTML文件
const htmlContent = fs.readFileSync('./data/douyin.html', 'utf8');

// 模拟extractDyLiveList函数的核心逻辑
function testCodecExtraction() {
    const streams = [];
    
    // 测试策略1: 从window.__RENDER_DATA__中提取直播流URL
    const renderDataPattern = /window\.__RENDER_DATA__\s*=\s*({[^;]+});/gs;
    const renderDataMatch = renderDataPattern.exec(htmlContent);
    
    if (renderDataMatch && renderDataMatch[1]) {
        try {
            let renderData = JSON.parse(renderDataMatch[1]);
            
            // 遍历renderData中的所有属性，查找直播流相关数据
            function findLiveStreams(obj, path = '') {
                if (typeof obj === 'object' && obj !== null) {
                    // 检查是否包含直播流URL
                    if (obj.url && typeof obj.url === 'string' && 
                        (obj.url.includes('.flv') || obj.url.includes('.m3u8') || obj.url.includes('.hls'))) {
                        console.log(`\n找到流: ${obj.url}`);
                        console.log(`  原始obj: ${JSON.stringify(obj, null, 2)}`);
                        
                        // 提取清晰度信息
                        let quality = '未知';
                        const urlPath = obj.url.split('?')[0];
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
                            quality = '原画';
                        } else if (urlPath.includes('/timeshift.m3u8')) {
                            quality = '时移流';
                        }
                        
                        // 提取5个维度数据
                        let codec = '未知';
                        let hdrType = 'SDR';
                        let resolution = '未知';
                        let bitrate = 0;
                        
                        // 1. 优先从sdk_params中提取编码信息（最准确）
                        if (obj.sdk_params && typeof obj.sdk_params === 'string') {
                            try {
                                const sdkParams = JSON.parse(obj.sdk_params);
                                console.log(`  sdk_params解析结果: ${JSON.stringify(sdkParams)}`);
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
                                console.log(`  sdk_params解析失败: ${parseError.message}`);
                            }
                        }
                        
                        // 2. 如果sdk_params中没有编码信息，从URL中提取视频编码
                        if (codec === '未知') {
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
                        
                        console.log(`  提取结果: codec=${codec}, resolution=${resolution}, hdrType=${hdrType}, bitrate=${bitrate}`);
                        
                        streams.push({
                            url: obj.url,
                            codec: codec,
                            resolution: resolution,
                            hdrType: hdrType,
                            bitrate: bitrate
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
    
    return streams;
}

// 运行测试
const result = testCodecExtraction();

console.log('\n=== 测试结果总结 ===');
console.log(`共提取到 ${result.length} 个直播流`);

// 统计编码分布
const codecStats = {};
result.forEach(stream => {
    codecStats[stream.codec] = (codecStats[stream.codec] || 0) + 1;
});

console.log('\n编码分布:');
for (const [codec, count] of Object.entries(codecStats)) {
    console.log(`${codec}: ${count} 个流`);
}

// 检查是否还有未知编码
const unknownCount = codecStats['未知'] || 0;
console.log(`\n未知编码流数量: ${unknownCount}`);
if (unknownCount === 0) {
    console.log('✓ 所有流都成功提取到编码信息！');
} else {
    console.log('✗ 还有流无法提取编码信息！');
    // 显示未知编码的流
    const unknownStreams = result.filter(stream => stream.codec === '未知');
    console.log('未知编码的流:');
    unknownStreams.forEach(stream => {
        console.log(`  - ${stream.url}`);
    });
}
