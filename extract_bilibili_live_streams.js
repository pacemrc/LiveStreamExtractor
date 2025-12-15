// 提取哔哩哔哩直播流脚本
const fs = require('fs');

// 读取bilibili.json文件
const filePath = '/Users/pacemrc/WebstormProjects/douyin_live_url/data/bilibili.html';
const outputPath = '/Users/pacemrc/WebstormProjects/douyin_live_url/data/bilibili_live_streams.html';

try {
    // 读取文件内容
    const fileContent = fs.readFileSync(filePath, 'utf8');
    
    // 使用更可靠的方式提取playurl_info
    // 首先找到playurl_info的起始位置
    const playurlInfoStart = fileContent.indexOf('"playurl_info"');
    
    if (playurlInfoStart === -1) {
        console.error('未找到playurl_info数据');
        process.exit(1);
    }
    
    // 跳过冒号和空格，找到playurl_info对象的开始位置
    let startIndex = fileContent.indexOf('{', playurlInfoStart);
    if (startIndex === -1) {
        console.error('未找到playurl_info对象的开始位置');
        process.exit(1);
    }
    
    // 从playurl_info开始，找到匹配的闭合括号
    let openBraces = 0;
    let closeBraces = 0;
    let endIndex = startIndex;
    
    for (let i = startIndex; i < fileContent.length; i++) {
        if (fileContent[i] === '{') {
            openBraces++;
        } else if (fileContent[i] === '}') {
            closeBraces++;
            if (openBraces === closeBraces) {
                endIndex = i + 1;
                break;
            }
        }
    }
    
    if (openBraces !== closeBraces) {
        console.error('未找到完整的playurl_info数据，括号不匹配');
        process.exit(1);
    }
    
    let playurlInfo = null;
    
    try {
        // 提取playurl_info字符串
        const playurlInfoStr = fileContent.substring(startIndex, endIndex);
        
        // 确保JSON格式正确，移除可能的 trailing 逗号
        const cleanedPlayurlInfoStr = playurlInfoStr.replace(/,\s*([}\]])/g, '$1');
        
        // 解析playurl_info
        playurlInfo = JSON.parse(cleanedPlayurlInfoStr);
    } catch (parseError) {
        console.error('解析playurl_info失败:', parseError.message);
        process.exit(1);
    }
    
    if (!playurlInfo) {
        console.error('未找到完整的playurl_info数据');
        process.exit(1);
    }
    
    // 提取g_qn_desc
    const gQnDesc = playurlInfo.playurl?.g_qn_desc || [];
    
    // 提取stream
    const streams = playurlInfo.playurl?.stream || [];
    
    // 提取完整的直播流信息
    const liveStreams = [];
    const clarityInfo = [];
    
    // 处理清晰度信息
    gQnDesc.forEach(clarity => {
        clarityInfo.push({
            qn: clarity.qn,
            desc: clarity.desc,
            hdr_type: clarity.hdr_type,
            full_desc: `${clarity.desc}${clarity.hdr_type === 1 ? '/HDR' : ''}`
        });
    });
    
    // 处理直播流数据
    streams.forEach(stream => {
        const protocol = stream.protocol_name;
        
        // 处理format
        stream.format?.forEach(format => {
            const formatName = format.format_name;
            
            // 处理codec
            format.codec?.forEach(codec => {
                const codecName = codec.codec_name;
                const currentQn = codec.current_qn;
                const baseUrl = codec.base_url;
                
                // 处理url_info
                codec.url_info?.forEach((urlInfo, index) => {
                    const host = urlInfo.host;
                    const extra = urlInfo.extra;
                    
                    // 拼接完整URL
                    const fullUrl = `${host}${baseUrl}${extra}`;
                    
                    // 获取清晰度描述
                    const clarity = clarityInfo.find(c => c.qn === currentQn) || {
                        qn: currentQn,
                        desc: '--',
                        hdr_type: 0,
                        full_desc: '--清晰度'
                    };
                    
                    // 收集直播流信息
                    liveStreams.push({
                        id: `${protocol}_${formatName}_${codecName}_${currentQn}_${index}`,
                        protocol: protocol,
                        format: formatName,
                        codec: codecName,
                        clarity: clarity.full_desc,
                        qn: currentQn,
                        hdr_type: clarity.hdr_type,
                        base_url: baseUrl,
                        host: host,
                        extra: extra,
                        full_url: fullUrl,
                        stream_ttl: urlInfo.stream_ttl || 0
                    });
                });
            });
        });
    });
    
    // 将提取到的数据输出到文件
    fs.writeFileSync(outputPath, JSON.stringify(liveStreams, null, 2), 'utf8');
    
    // 打印提取结果
    console.log('=== 哔哩哔哩直播流提取结果 ===');
    console.log(`共提取到 ${liveStreams.length} 条直播流数据`);
    console.log('\n=== 支持的清晰度 ===');
    clarityInfo.forEach(clarity => {
        console.log(`- ${clarity.full_desc} (qn: ${clarity.qn}, hdr_type: ${clarity.hdr_type})`);
    });
    
    console.log('\n=== 支持的直播流类型 ===');
    const streamTypes = [...new Set(liveStreams.map(stream => `${stream.protocol} + ${stream.format}`))];
    streamTypes.forEach(type => {
        console.log(`- ${type}`);
    });
    
    console.log('\n=== 部分直播流URL示例 ===');
    const sampleStreams = liveStreams.slice(0, 3);
    sampleStreams.forEach((stream, index) => {
        console.log(`\n${index + 1}. ${stream.clarity} (${stream.format})`);
        console.log(`   URL: ${stream.full_url}`);
    });
    
    console.log('\n=== 提取结果已保存到文件 ===');
    console.log(`文件路径: ${outputPath}`);
    
    // 输出详细统计信息
    console.log('\n=== 详细统计信息 ===');
    console.log(`总直播流数量: ${liveStreams.length}`);
    console.log(`清晰度类型数量: ${clarityInfo.length}`);
    console.log(`协议类型数量: ${new Set(liveStreams.map(stream => stream.protocol)).size}`);
    console.log(`格式类型数量: ${new Set(liveStreams.map(stream => stream.format)).size}`);
    console.log(`编码类型数量: ${new Set(liveStreams.map(stream => stream.codec)).size}`);
    
    // 输出各清晰度的流数量
    console.log('\n=== 各清晰度流数量 ===');
    const clarityStats = {};
    liveStreams.forEach(stream => {
        clarityStats[stream.clarity] = (clarityStats[stream.clarity] || 0) + 1;
    });
    Object.entries(clarityStats).forEach(([clarity, count]) => {
        console.log(`- ${clarity}: ${count}条`);
    });
    
} catch (error) {
    console.error('提取失败:', error.message);
    process.exit(1);
}