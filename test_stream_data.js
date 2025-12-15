const fs = require('fs');

// 读取HTML文件
const htmlContent = fs.readFileSync('./data/douyin.html', 'utf8');

// 测试直接从HTML中提取stream_data
function testStreamDataExtraction() {
    const streams = [];
    
    console.log('=== 开始测试直接提取stream_data ===');
    
    // 直接搜索__pace_f.push中的直播流数据
    const pacePattern = /self\.__pace_f\.push\(\[1,\s*"(.*?)"\]\)/g;
    let paceMatch;
    
    while ((paceMatch = pacePattern.exec(htmlContent)) !== null) {
        const jsonStr = paceMatch[1];
        
        try {
            // 尝试解析JSON
            const paceData = JSON.parse(jsonStr);
            if (paceData.data) {
                console.log('找到pace_f数据，包含data字段');
                
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
                                            console.log(`\n找到流: ${streamUrl}`);
                                            console.log(`  清晰度: ${qualityKey}, 线路: ${lineKey}, 格式: ${formatKey}`);
                                            console.log(`  sdk_params: ${JSON.stringify(lineData.sdk_params, null, 2)}`);
                                            
                                            // 提取编码信息
                                            let codec = '未知';
                                            
                                            // 从sdk_params中提取编码
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
                                                        console.log(`  从sdk_params提取到编码: ${codec}`);
                                                    }
                                                } catch (parseError) {
                                                    console.log(`  sdk_params解析失败: ${parseError.message}`);
                                                }
                                            }
                                            
                                            streams.push({
                                                url: streamUrl,
                                                codec: codec,
                                                quality: qualityKey,
                                                line: lineKey,
                                                format: formatKey
                                            });
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
                
                // 只处理第一个匹配项
                break;
            }
        } catch (parseError) {
            // 跳过无法解析的JSON
            continue;
        }
    }
    
    return streams;
}

// 运行测试
const result = testStreamDataExtraction();

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
