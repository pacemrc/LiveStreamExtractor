const fs = require('fs');
const path = require('path');

// 读取HTML文件内容
const htmlContent = fs.readFileSync('./data/douyin.html', 'utf8');

console.log('开始分析抖音直播流数据...\n');

// 1. 尝试提取window.__RENDER_DATA__
console.log('1. 尝试提取window.__RENDER_DATA__:');
const renderDataPattern = /window\.__RENDER_DATA__\s*=\s*({[^;]+});/gs;
const renderDataMatch = renderDataPattern.exec(htmlContent);

if (renderDataMatch && renderDataMatch[1]) {
    try {
        const renderData = JSON.parse(renderDataMatch[1]);
        console.log('✓ window.__RENDER_DATA__ 提取成功！');
        
        // 搜索直播流相关数据
        function searchStreamData(obj, parentKey = '') {
            if (typeof obj === 'object' && obj !== null) {
                // 检查是否包含直播流URL
                if (obj.url && typeof obj.url === 'string' && 
                    (obj.url.includes('.flv') || obj.url.includes('.m3u8') || obj.url.includes('.hls'))) {
                    console.log('\n找到直播流数据:');
                    console.log('URL:', obj.url);
                    console.log('完整数据:', JSON.stringify(obj, null, 2));
                    return true;
                }
                
                // 递归搜索
                for (const key in obj) {
                    if (obj.hasOwnProperty(key)) {
                        if (searchStreamData(obj[key], key)) {
                            return true;
                        }
                    }
                }
            }
            return false;
        }
        
        if (!searchStreamData(renderData)) {
            console.log('✗ 在window.__RENDER_DATA__中未找到直播流数据');
        }
    } catch (parseError) {
        console.error('✗ 解析window.__RENDER_DATA__失败:', parseError.message);
    }
} else {
    console.log('✗ 未找到window.__RENDER_DATA__');
}

// 2. 尝试提取data-config属性
console.log('\n\n2. 尝试提取data-config属性:');
const configPattern = /data-config="(.*?)"/g;
let configMatches;
let foundConfigData = false;

while ((configMatches = configPattern.exec(htmlContent)) !== null) {
    try {
        const jsonStr = configMatches[1].replace(/&quot;/g, '"').replace(/&amp;/g, '&');
        const configData = JSON.parse(jsonStr);
        
        // 检查是否包含直播流URL
        function checkConfigForStreams(configObj) {
            if (configObj.playerConfig && configObj.playerConfig.baseConfig && configObj.playerConfig.baseConfig.url) {
                console.log('\n✓ 在data-config中找到直播流数据:');
                console.log('URL:', configObj.playerConfig.baseConfig.url);
                console.log('完整数据:', JSON.stringify(configObj, null, 2));
                return true;
            }
            if (configObj.basicPlayerProps && configObj.basicPlayerProps.playerAction && configObj.basicPlayerProps.playerAction.inlineEnterOptInfo) {
                const optInfo = configObj.basicPlayerProps.playerAction.inlineEnterOptInfo;
                console.log('\n✓ 在data-config中找到直播流数据:');
                console.log('inlineEnterOptInfo:', JSON.stringify(optInfo, null, 2));
                return true;
            }
            return false;
        }
        
        if (checkConfigForStreams(configData)) {
            foundConfigData = true;
            break;
        }
    } catch (error) {
        // 忽略无效的JSON
        continue;
    }
}

if (!foundConfigData) {
    console.log('✗ 在data-config中未找到直播流数据');
}

// 3. 尝试提取直接的直播流链接
console.log('\n\n3. 尝试提取直接的直播流链接:');
const streamPattern = /(https?:\/\/[^\s"']+\.(flv|m3u8|hls)[^"']*)/g;
let streamMatches;
let streamLinks = [];

while ((streamMatches = streamPattern.exec(htmlContent)) !== null) {
    streamLinks.push(streamMatches[1]);
}

if (streamLinks.length > 0) {
    console.log(`✓ 找到 ${streamLinks.length} 个直播流链接:`);
    streamLinks.slice(0, 5).forEach(link => {
        console.log(link);
        
        // 分析链接中的编码和码率信息
        console.log('  - 编码信息:', link.includes('h264') || link.includes('H264') ? 'H.264' : link.includes('h265') || link.includes('H265') ? 'H.265' : '未知');
        console.log('  - 码率信息:', link.match(/bitrate=(\d+)/) ? link.match(/bitrate=(\d+)/)[1] : '未知');
        console.log('  - 清晰度信息:', link.includes('_ld') ? '流畅' : link.includes('_md') || link.includes('_sd') ? '标清' : link.includes('_hd') ? '高清' : link.includes('_origin') ? '超清' : link.includes('_or4') ? '原画' : link.includes('_uhd') ? '超高清' : '未知');
    });
    if (streamLinks.length > 5) {
        console.log(`... 还有 ${streamLinks.length - 5} 个链接未显示`);
    }
} else {
    console.log('✗ 未找到直接的直播流链接');
}

// 4. 分析直播流链接的结构
console.log('\n\n4. 分析直播流链接的结构:');
if (streamLinks.length > 0) {
    const firstLink = streamLinks[0];
    console.log('第一个链接:', firstLink);
    console.log('链接结构分析:');
    console.log('  - 协议:', firstLink.split('://')[0]);
    console.log('  - 域名:', firstLink.split('://')[1].split('/')[0]);
    console.log('  - 路径:', '/' + firstLink.split('://')[1].split('/').slice(1).join('/').split('?')[0]);
    console.log('  - 参数:', firstLink.split('?')[1] || '无');
    
    // 分析URL参数
    if (firstLink.includes('?')) {
        const params = firstLink.split('?')[1].split('&');
        console.log('  - 详细参数:');
        params.forEach(param => {
            console.log('    ', param);
        });
    }
}

console.log('\n\n分析完成！');
