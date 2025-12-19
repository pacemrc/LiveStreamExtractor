// 直播流管理功能
class StreamManager {
    constructor(platform) {
        this.platform = platform;
        this.init();
    }

    // 初始化
    async init() {
        this.bindEvents();
    }

    // 绑定事件
    bindEvents() {
        // 添加刷新按钮事件
        this.setupRefreshButton();
        
        // 添加过滤控件事件
        this.setupFilterControls();
        
        // 添加一键复制按钮事件
        this.setupCopyAllStreamsButton();
    }
    
    // 添加一键复制按钮事件监听
    setupCopyAllStreamsButton() {
        const copyBtn = document.getElementById(`copyAllStreamsBtn-${this.platform}`);
        if (copyBtn) {
            copyBtn.addEventListener('click', () => this.copyAllLiveStreams());
        }
    }
    
    // 一键复制
    async copyAllLiveStreams() {
        try {
            const copyBtn = document.getElementById(`copyAllStreamsBtn-${this.platform}`);
            const originalText = copyBtn.textContent;
            
            // 确保有流数据
            if (!this.filteredStreams || this.filteredStreams.length === 0) {
                copyBtn.textContent = '无数据可复制';
                copyBtn.style.background = 'linear-gradient(135deg, #f6e05e 0%, #d69e2e 100%)';
                showNotification('没有可复制的直播流链接', 'error');
                
                setTimeout(() => {
                    copyBtn.textContent = originalText;
                    copyBtn.style.background = '';
                }, 2000);
                return;
            }
            
            // 格式化直播流链接，一个URL一行
            const streamsText = this.filteredStreams.map(stream => stream.url).join('\n');
            
            try {
                // 尝试使用Clipboard API复制
                await navigator.clipboard.writeText(streamsText);
                
                // 显示成功反馈
                copyBtn.textContent = '复制成功';
                copyBtn.style.background = 'linear-gradient(135deg, #48bb78 0%, #38a169 100%)';
                
                // 显示通知
                showNotification(`已成功复制 ${this.filteredStreams.length} 个直播流链接到剪贴板`);
            } catch (clipboardError) {
                console.error('Clipboard API复制失败:', clipboardError);
                
                // 降级方案：使用textarea复制
                try {
                    const textArea = document.createElement('textarea');
                    textArea.value = streamsText;
                    textArea.style.position = 'fixed';
                    textArea.style.opacity = '0';
                    document.body.appendChild(textArea);
                    textArea.select();
                    document.execCommand('copy');
                    document.body.removeChild(textArea);
                    
                    // 显示成功反馈
                    copyBtn.textContent = '复制成功';
                    copyBtn.style.background = 'linear-gradient(135deg, #48bb78 0%, #38a169 100%)';
                    
                    // 显示通知
                    showNotification(`已成功复制 ${this.filteredStreams.length} 个直播流链接到剪贴板`);
                } catch (fallbackError) {
                    console.error('降级复制方案失败:', fallbackError);
                    
                    // 显示失败反馈
                    copyBtn.textContent = '复制失败';
                    copyBtn.style.background = 'linear-gradient(135deg, #f56565 0%, #e53e3e 100%)';
                    
                    // 显示失败通知
                    showNotification('复制失败，请手动复制链接', 'error');
                    
                    // 提供手动复制选项
                    const shouldOpenPrompt = confirm(`复制失败，是否显示 ${this.filteredStreams.length} 个链接以便手动复制？`);
                    if (shouldOpenPrompt) {
                        prompt(`请手动复制 ${this.filteredStreams.length} 个链接:`, streamsText);
                    }
                }
            } finally {
                // 恢复按钮原始状态
                setTimeout(() => {
                    copyBtn.textContent = originalText;
                    copyBtn.style.background = '';
                }, 2000);
            }
        } catch (error) {
            console.error('一键复制失败:', error);
            showNotification('复制失败，请手动复制链接', 'error');
        }
    }
    
    // 添加刷新按钮事件监听
    setupRefreshButton() {
        const refreshBtn = document.getElementById('refreshBtn');
        if (refreshBtn) {
            refreshBtn.addEventListener('click', () => {
                // 只刷新当前活动标签页的数据
                const activePlatform = document.querySelector('.tab-btn.active').dataset.platform;
                streamManagers[activePlatform].refreshLiveStreamData();
            });
        }
    }
    
    // 刷新直播流数据
    refreshLiveStreamData() {
        // 清空动态表格
        const tableBody = document.querySelector(`#dynamicTable-${this.platform} tbody`);
        if (tableBody) {
            tableBody.innerHTML = '';
        }
        
        // 重新设置直播流提取
        this.setupLiveStreamExtraction();
        
        // 显示刷新提示
        showNotification(`正在刷新${this.platform === 'douyin' ? '抖音' : '哔哩哔哩'}数据...`);
    }

    // 设置直播流提取
    setupLiveStreamExtraction() {
        // 清空表格
        const tableBody = document.querySelector(`#dynamicTable-${this.platform} tbody`);
        if (tableBody) {
            tableBody.innerHTML = '';
        }
        
        // 添加加载提示
        if (tableBody) {
            const loadingRow = document.createElement("tr");
            const loadingCell = document.createElement("td");
            const colSpan = this.platform === 'douyin' ? 5 : 6;
            loadingCell.colSpan = colSpan;
            loadingCell.textContent = "正在提取直播流链接...";
            loadingCell.style.textAlign = "center";
            loadingRow.appendChild(loadingCell);
            tableBody.appendChild(loadingRow);
        }
        
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
            // 检查tabs数组是否有元素
            if (!tabs || tabs.length === 0) {
                console.error("未找到活动标签页");
                if (tableBody) {
                tableBody.innerHTML = `<tr><td colspan="${this.platform === 'douyin' ? 5 : 6}" style="text-align: center; color: red;">未找到活动标签页</td></tr>`;
            }
                return;
            }
            
            const activeTab = tabs[0];
            if (!activeTab || !activeTab.id) {
                console.error("活动标签页无效");
                if (tableBody) {
                tableBody.innerHTML = `<tr><td colspan="${this.platform === 'douyin' ? 5 : 6}" style="text-align: center; color: red;">活动标签页无效</td></tr>`;
            }
                return;
            }
            
            // 发送消息，移除自动重试机制
            const action = this.platform === 'douyin' ? "extractDyLiveList" : "extractLiveList";
            chrome.tabs.sendMessage(activeTab.id, { action: action }, (response) => {
                if (chrome.runtime.lastError) {

                    if (tableBody) {
                        tableBody.innerHTML = `<tr><td colspan="${this.platform === 'douyin' ? 5 : 6}" style="text-align: center; color: red;">提取直播流链接失败，请点击刷新按钮重试</td></tr>`;
                    }
                    return;
                }
                
                // 确保response是数组
                const validResponse = Array.isArray(response) ? response : [];
                if (validResponse.length > 0) {
                // 清空加载提示
                if (tableBody) {
                    tableBody.innerHTML = '';
                }
                
                // 收集所有流数据
                let allStreamsData = [];
                
                // 检查是否是结构化流数据
                const isStructuredData = validResponse.length > 0 && typeof validResponse[0] === 'object';
                
                if (isStructuredData) {
                    // 处理结构化流数据，过滤掉其他平台的数据
                    allStreamsData = validResponse.filter(stream => 
                        stream && stream.url && stream.url !== '-' && 
                        (stream.platform.toLowerCase() === this.platform || 
                         (this.platform === 'douyin' && stream.platform === '抖音') ||
                         (this.platform === 'bilibili' && stream.platform === '哔哩哔哩'))
                    );
                } else {
                    // 处理旧格式数据（兼容）
                    for (let i = 0; i < validResponse.length; i += 2) {
                        // 确保索引有效
                        if (typeof validResponse[i] === 'undefined') {
                            continue;
                        }
                        
                        // 获取有效的URL
                        const streamUrl = validResponse[i + 1] || "";
                        if (streamUrl && streamUrl !== "-") {
                            allStreamsData.push({
                                type: "视频",
                                quality: "--",
                                format: "FLV",
                                url: streamUrl
                            });
                        }
                    }
                }
                
                // 更新所有流数据
                this.allStreams = allStreamsData;
                // 初始化过滤后的流
                this.filteredStreams = [...allStreamsData];
                
                // 更新过滤选项
                this.updateFilterOptions();
                
                // 显示过滤后的流
                this.displayFilteredStreams();
                
                // 更新活动筛选指示器
                this.updateActiveFilters();
                
            } else {
                // 没有返回数据，显示提示
                if (tableBody) {
                    tableBody.innerHTML = `<tr><td colspan="${this.platform === 'douyin' ? 5 : 6}" style="text-align: center; color: red;">未提取到直播流链接</td></tr>`;
                }
            }
            });
        });
    }
    
    // 设置过滤控件
    setupFilterControls() {
        // 初始化过滤控件
        this.filteredStreams = [];
        this.allStreams = [];
        
        // 类型过滤
        const typeFilter = document.getElementById(`typeFilter-${this.platform}`);
        if (typeFilter) {
            typeFilter.addEventListener('change', () => this.applyFilters());
        }
        
        // 清晰度过滤
        const clarityFilter = document.getElementById(`clarityFilter-${this.platform}`);
        if (clarityFilter) {
            clarityFilter.addEventListener('change', () => this.applyFilters());
        }
        
        // 媒体协议过滤
        const mediaProtocolFilter = document.getElementById(`mediaProtocolFilter-${this.platform}`);
        if (mediaProtocolFilter) {
            mediaProtocolFilter.addEventListener('change', () => this.applyFilters());
        }
        
        // 视频编码过滤
        const codecFilter = document.getElementById(`codecFilter-${this.platform}`);
        if (codecFilter) {
            codecFilter.addEventListener('change', () => this.applyFilters());
        }
        
        // 状态过滤
        const statusFilter = document.getElementById(`statusFilter-${this.platform}`);
        if (statusFilter) {
            statusFilter.addEventListener('change', () => this.applyFilters());
        }
        
        // 重置筛选按钮
        const resetBtn = document.getElementById(`resetFiltersBtn-${this.platform}`);
        if (resetBtn) {
            resetBtn.addEventListener('click', () => this.resetFilters());
        }
        
        // 一键测试按钮
        const testAllBtn = document.getElementById(`testAllLinksBtn-${this.platform}`);
        if (testAllBtn) {
            testAllBtn.addEventListener('click', () => this.testAllLinks());
        }
    }
    
    // 更新过滤选项
    updateFilterOptions() {
        // 收集所有唯一值并排序
        const types = [...new Set(this.allStreams.map(stream => stream.type))].sort();
        const mediaProtocols = [...new Set(this.allStreams.map(stream => stream.mediaProtocol))].sort();
        const codecs = [...new Set(this.allStreams.map(stream => stream.codec))].sort();
        
        // 更新类型过滤选项
        const typeFilter = document.getElementById(`typeFilter-${this.platform}`);
        if (typeFilter) {
            // 清空现有选项（保留第一个"所有类型"选项）
            while (typeFilter.options.length > 1) {
                typeFilter.remove(1);
            }
            
            // 添加新选项
            types.forEach(type => {
                const option = document.createElement('option');
                option.value = type;
                option.textContent = type;
                // 添加选项时添加淡入动画
                option.style.opacity = '0';
                option.style.transform = 'translateY(-5px)';
                option.style.transition = 'opacity 0.2s ease, transform 0.2s ease';
                typeFilter.appendChild(option);
                // 触发重排后设置最终样式
                setTimeout(() => {
                    option.style.opacity = '1';
                    option.style.transform = 'translateY(0)';
                }, 10);
            });
        }
        
        // 更新清晰度过滤选项
        const clarityFilter = document.getElementById(`clarityFilter-${this.platform}`);
        if (clarityFilter) {
            // 清空现有选项（保留第一个"所有清晰度"选项）
            while (clarityFilter.options.length > 1) {
                clarityFilter.remove(1);
            }
            
            // 动态收集所有清晰度选项，包括抖音平台
            let clarities = [...new Set(this.allStreams.map(stream => stream.quality))].sort();
            
            // 清晰度优先级排序（标清 < 高清 < 超清 < 蓝光 < 原画 < 其他）
            const qualityPriority = {
                '标清': 1,
                '高清': 2,
                '超清': 3,
                '蓝光': 4,
                '原画': 5
            };
            
            // 按照优先级排序
            clarities.sort((a, b) => {
                // 如果a和b都在优先级列表中，按照优先级排序
                if (qualityPriority[a] && qualityPriority[b]) {
                    return qualityPriority[a] - qualityPriority[b];
                }
                // 如果只有a在优先级列表中，a排在前面
                if (qualityPriority[a]) {
                    return -1;
                }
                // 如果只有b在优先级列表中，b排在前面
                if (qualityPriority[b]) {
                    return 1;
                }
                // 如果都不在优先级列表中，按照字母顺序排序
                return a.localeCompare(b, 'zh-CN');
            });
            
            // 添加新选项
            clarities.forEach(clarity => {
                const option = document.createElement('option');
                option.value = clarity;
                option.textContent = clarity;
                // 添加选项时添加淡入动画
                option.style.opacity = '0';
                option.style.transform = 'translateY(-5px)';
                option.style.transition = 'opacity 0.2s ease, transform 0.2s ease';
                clarityFilter.appendChild(option);
                // 触发重排后设置最终样式
                setTimeout(() => {
                    option.style.opacity = '1';
                    option.style.transform = 'translateY(0)';
                }, 10);
            });
        }
        
        // 更新媒体协议过滤选项
        const mediaProtocolFilter = document.getElementById(`mediaProtocolFilter-${this.platform}`);
        if (mediaProtocolFilter) {
            // 清空现有选项（保留第一个"所有协议"选项）
            while (mediaProtocolFilter.options.length > 1) {
                mediaProtocolFilter.remove(1);
            }
            
            // 添加新选项
            mediaProtocols.forEach(mediaProtocol => {
                const option = document.createElement('option');
                option.value = mediaProtocol;
                option.textContent = mediaProtocol;
                // 添加选项时添加淡入动画
                option.style.opacity = '0';
                option.style.transform = 'translateY(-5px)';
                option.style.transition = 'opacity 0.2s ease, transform 0.2s ease';
                mediaProtocolFilter.appendChild(option);
                // 触发重排后设置最终样式
                setTimeout(() => {
                    option.style.opacity = '1';
                    option.style.transform = 'translateY(0)';
                }, 10);
            });
        }
        
        // 更新视频编码过滤选项
        const codecFilter = document.getElementById(`codecFilter-${this.platform}`);
        if (codecFilter) {
            // 清空现有选项（保留第一个"所有编码"选项）
            while (codecFilter.options.length > 1) {
                codecFilter.remove(1);
            }
            
            // 添加新选项
            codecs.forEach(codec => {
                const option = document.createElement('option');
                option.value = codec;
                option.textContent = codec;
                // 添加选项时添加淡入动画
                option.style.opacity = '0';
                option.style.transform = 'translateY(-5px)';
                option.style.transition = 'opacity 0.2s ease, transform 0.2s ease';
                codecFilter.appendChild(option);
                // 触发重排后设置最终样式
                setTimeout(() => {
                    option.style.opacity = '1';
                    option.style.transform = 'translateY(0)';
                }, 10);
            });
        }
    }
    
    // 应用过滤
    applyFilters() {
        let filtered = [...this.allStreams];
        
        // 类型过滤
        const typeFilter = document.getElementById(`typeFilter-${this.platform}`);
        if (typeFilter) {
            const selectedType = typeFilter.value;
            if (selectedType) {
                filtered = filtered.filter(stream => stream.type && stream.type === selectedType);
            }
        }
        
        // 清晰度过滤
        const clarityFilter = document.getElementById(`clarityFilter-${this.platform}`);
        if (clarityFilter) {
            const selectedClarity = clarityFilter.value;
            if (selectedClarity) {
                filtered = filtered.filter(stream => stream.quality && stream.quality === selectedClarity);
            }
        }
        
        // 媒体协议过滤
        const mediaProtocolFilter = document.getElementById(`mediaProtocolFilter-${this.platform}`);
        if (mediaProtocolFilter) {
            const selectedMediaProtocol = mediaProtocolFilter.value;
            if (selectedMediaProtocol) {
                filtered = filtered.filter(stream => stream.mediaProtocol && stream.mediaProtocol === selectedMediaProtocol);
            }
        }
        
        // 视频编码过滤
        const codecFilter = document.getElementById(`codecFilter-${this.platform}`);
        if (codecFilter) {
            const selectedCodec = codecFilter.value;
            if (selectedCodec) {
                filtered = filtered.filter(stream => stream.codec && stream.codec === selectedCodec);
            }
        }
        
        // 状态过滤
        const statusFilter = document.getElementById(`statusFilter-${this.platform}`);
        if (statusFilter) {
            const selectedStatus = statusFilter.value;
            if (selectedStatus) {
                filtered = filtered.filter(stream => stream.status && stream.status === selectedStatus);
            }
        }
        
        // 更新过滤后的流
        this.filteredStreams = filtered;
        
        // 添加表格过渡动画
        const table = document.getElementById(`dynamicTable-${this.platform}`);
        if (table) {
            table.style.opacity = '0.6';
            table.style.transform = 'translateY(5px)';
            table.style.transition = 'opacity 0.3s ease, transform 0.3s ease';
        }
        
        // 更新表格显示
        this.displayFilteredStreams();
        
        // 恢复表格样式
        setTimeout(() => {
            if (table) {
                table.style.opacity = '1';
                table.style.transform = 'translateY(0)';
            }
        }, 100);
        
        // 更新活动筛选指示器
        this.updateActiveFilters();
    }
    
    // 重置过滤
    resetFilters() {
        // 重置所有过滤控件
        const filters = [`typeFilter-${this.platform}`, `clarityFilter-${this.platform}`, `mediaProtocolFilter-${this.platform}`, `codecFilter-${this.platform}`, `statusFilter-${this.platform}`];
        filters.forEach(filterId => {
            const filter = document.getElementById(filterId);
            if (filter) {
                // 添加重置动画
                filter.style.transform = 'scale(0.98)';
                filter.style.transition = 'transform 0.15s ease';
                
                // 重置选择
                Array.from(filter.options).forEach(option => {
                    option.selected = false;
                });
                filter.options[0].selected = true;
                
                // 恢复原始大小
                setTimeout(() => {
                    filter.style.transform = 'scale(1)';
                }, 150);
            }
        });
        
        // 重置过滤后的流
        this.filteredStreams = [...this.allStreams];
        
        // 添加表格过渡动画
        const table = document.getElementById(`dynamicTable-${this.platform}`);
        if (table) {
            table.style.opacity = '0.6';
            table.style.transform = 'translateY(5px)';
            table.style.transition = 'opacity 0.3s ease, transform 0.3s ease';
        }
        
        // 更新表格显示
        this.displayFilteredStreams();
        
        // 恢复表格样式
        setTimeout(() => {
            if (table) {
                table.style.opacity = '1';
                table.style.transform = 'translateY(0)';
            }
        }, 100);
        
        // 更新活动筛选指示器
        this.updateActiveFilters();
        
        // 显示重置成功提示
        showNotification(`${this.platform === 'douyin' ? '抖音' : '哔哩哔哩'}筛选条件已重置`);
    }
    
    // 一键测试
    testAllLinks() {
        if (this.filteredStreams.length === 0) {
            showNotification('没有可测试的直播流链接', 'error');
            return;
        }
        
        // 显示测试开始提示
        showNotification(`正在测试 ${this.filteredStreams.length} 个链接...`);
        
        // 初始化测试统计
        let testedCount = 0;
        let successCount = 0;
        let failCount = 0;
        
        // 批量测试所有链接
        this.filteredStreams.forEach((stream, index) => {
            if (stream && stream.url && stream.url !== '-') {
                // 更新状态为测试中
                this.updateStreamStatus(stream.url, 'testing');
                
                // 使用setTimeout避免请求过多导致浏览器阻塞
                setTimeout(() => {
                    testLiveStream(stream.url, (isSuccess) => {
                        testedCount++;
                        if (isSuccess) {
                            successCount++;
                            this.updateStreamStatus(stream.url, 'success');
                        } else {
                            failCount++;
                            this.updateStreamStatus(stream.url, 'error');
                        }
                        
                        // 显示测试进度
                        showNotification(`测试进度: ${testedCount}/${this.filteredStreams.length} (成功: ${successCount}, 失败: ${failCount})`);
                        
                        // 所有测试完成后显示最终结果
                        if (testedCount === this.filteredStreams.length) {
                            showNotification(`测试完成: 共测试 ${testedCount} 个链接，成功 ${successCount} 个，失败 ${failCount} 个`);
                        }
                    });
                }, index * 500); // 每个请求间隔500毫秒
            } else {
                testedCount++;
                failCount++;
                this.updateStreamStatus(stream.url, 'error');
                
                // 所有测试完成后显示最终结果
                if (testedCount === this.filteredStreams.length) {
                    showNotification(`测试完成: 共测试 ${testedCount} 个链接，成功 ${successCount} 个，失败 ${failCount} 个`);
                }
            }
        });
    }
    
    // 更新活动筛选指示器
    updateActiveFilters() {
        const activeFiltersDiv = document.getElementById(`activeFilters-${this.platform}`);
        if (!activeFiltersDiv) return;
        
        // 收集所有选中的过滤条件
        const activeFilters = [];
        
        // 类型过滤
        const typeFilter = document.getElementById(`typeFilter-${this.platform}`);
        if (typeFilter && typeFilter.value) {
            activeFilters.push(`类型: ${typeFilter.value}`);
        }
        
        // 清晰度过滤
        const clarityFilter = document.getElementById(`clarityFilter-${this.platform}`);
        if (clarityFilter && clarityFilter.value) {
            activeFilters.push(`清晰度: ${clarityFilter.value}`);
        }
        
        // 媒体协议过滤
        const mediaProtocolFilter = document.getElementById(`mediaProtocolFilter-${this.platform}`);
        if (mediaProtocolFilter && mediaProtocolFilter.value) {
            activeFilters.push(`媒体协议: ${mediaProtocolFilter.value}`);
        }
        
        // 状态过滤
        const statusFilter = document.getElementById(`statusFilter-${this.platform}`);
        if (statusFilter && statusFilter.value) {
            const statusText = statusFilter.value === 'success' ? '有效' : '无效';
            activeFilters.push(`状态: ${statusText}`);
        }
        
        // 视频编码过滤（仅哔哩哔哩显示）
        if (this.platform === 'bilibili') {
            const codecFilter = document.getElementById(`codecFilter-${this.platform}`);
            if (codecFilter && codecFilter.value) {
                activeFilters.push(`视频编码: ${codecFilter.value}`);
            }
        }
        
        // 更新显示
        if (activeFilters.length > 0) {
            activeFiltersDiv.innerHTML = `<strong>活动筛选:</strong> ${activeFilters.join(' | ')}`;
            activeFiltersDiv.style.display = 'block';
        } else {
            activeFiltersDiv.innerHTML = '';
            activeFiltersDiv.style.display = 'none';
        }
    }
    
    // 显示过滤后的流
    displayFilteredStreams() {
        const tableBody = document.querySelector(`#dynamicTable-${this.platform} tbody`);
        if (!tableBody) return;
        
        // 清空表格
        tableBody.innerHTML = '';
        
        if (this.filteredStreams.length === 0) {
            const emptyRow = document.createElement('tr');
            const emptyCell = document.createElement('td');
            const colSpan = this.platform === 'douyin' ? 5 : 6;
            emptyCell.colSpan = colSpan;
            emptyCell.textContent = '没有符合条件的直播流链接';
            emptyCell.style.textAlign = 'center';
            emptyRow.appendChild(emptyCell);
            tableBody.appendChild(emptyRow);
            return;
        }
        
        // 显示过滤后的流
        this.filteredStreams.forEach(stream => {
            if (stream && stream.url && stream.url !== '-') {
                const row = document.createElement("tr");
                row.dataset.url = stream.url;
                
                // 类型列
                const typeCell = document.createElement("td");
                typeCell.textContent = stream.type || '--';
                row.appendChild(typeCell);
                
                // 清晰度列
                const qualityCell = document.createElement("td");
                qualityCell.textContent = stream.quality || '--';
                row.appendChild(qualityCell);
                
                // 媒体协议列
                const mediaProtocolCell = document.createElement("td");
                mediaProtocolCell.textContent = stream.mediaProtocol || '--';
                row.appendChild(mediaProtocolCell);
                
                // 视频编码列（仅哔哩哔哩显示）
                if (this.platform === 'bilibili') {
                    const codecCell = document.createElement("td");
                    codecCell.textContent = stream.codec || '--';
                    row.appendChild(codecCell);
                }
                
                // 链接状态列
                const statusCell = document.createElement("td");
                statusCell.className = 'status-cell';
                statusCell.dataset.streamUrl = stream.url;
                statusCell.style.padding = '8px 12px';
                
                // 显示链接状态
                if (stream.status) {
                    if (stream.status === 'success') {
                        statusCell.innerHTML = '<span class="status-dot green" title="有效"></span>';
                    } else if (stream.status === 'error') {
                        statusCell.innerHTML = '<span class="status-dot red" title="无效"></span>';
                    } else if (stream.status === 'testing') {
                        statusCell.innerHTML = '<span class="status-dot testing" title="测试中"></span>';
                    }
                } else {
                    statusCell.innerHTML = '<span class="status-dot gray" title="未测试"></span>';
                }
                
                row.appendChild(statusCell);
                
                // 操作列
                const actionCell = document.createElement("td");
                
                // 复制链接按钮
                const copyBtn = document.createElement("button");
                copyBtn.textContent = "复制链接";
                copyBtn.className = "btn copy-btn";
                copyBtn.style.marginRight = "5px";
                copyBtn.title = stream.url; // 添加title属性，显示完整链接
                
                // 创建链接提示元素
                const linkTooltip = document.createElement("div");
                linkTooltip.className = "link-tooltip";
                linkTooltip.textContent = stream.url;
                linkTooltip.style.cssText = `
                    position: absolute;
                    background: rgba(0, 0, 0, 0.8);
                    color: white;
                    padding: 8px 12px;
                    border-radius: 4px;
                    font-size: 12px;
                    white-space: nowrap;
                    pointer-events: none;
                    opacity: 0;
                    transition: opacity 0.2s ease;
                    z-index: 1000;
                    max-width: 300px;
                    overflow: hidden;
                    text-overflow: ellipsis;
                `;
                document.body.appendChild(linkTooltip);
                
                // 添加鼠标事件
                copyBtn.addEventListener("mouseenter", (e) => {
                    const rect = e.target.getBoundingClientRect();
                    linkTooltip.style.left = `${rect.left}px`;
                    linkTooltip.style.top = `${rect.bottom + 5}px`;
                    linkTooltip.style.opacity = "1";
                });
                
                copyBtn.addEventListener("mouseleave", () => {
                    linkTooltip.style.opacity = "0";
                });
                
                copyBtn.onclick = () => {
                    if (!stream.url || stream.url === "-") {
                        showNotification("没有可复制的链接", "error");
                        return;
                    }
                    
                    navigator.clipboard.writeText(stream.url).then(() => {
                        showNotification("链接已复制到剪贴板");
                    }).catch((err) => {
                        console.error("复制失败:", err);
                        showNotification("复制失败，请手动复制", "error");
                    });
                };
                actionCell.appendChild(copyBtn);
                
                // 测试连接按钮
                const testBtn = document.createElement("button");
                testBtn.textContent = "测试连接";
                testBtn.className = "btn test-btn";
                
                testBtn.onclick = () => {
                    if (!stream.url || stream.url === "-") {
                        showNotification("没有可测试的链接", "error");
                        return;
                    }
                    
                    // 更新状态为测试中
                    this.updateStreamStatus(stream.url, 'testing');
                    
                    // 执行测试
                    testLiveStream(stream.url, (isSuccess) => {
                        // 更新状态
                        this.updateStreamStatus(stream.url, isSuccess ? 'success' : 'error');
                        
                        // 单个测试时显示结果通知
                        if (isSuccess) {
                            showNotification("直播流链接有效");
                        } else {
                            showNotification("直播流链接无效", "error");
                        }
                    });
                };
                actionCell.appendChild(testBtn);
                
                row.appendChild(actionCell);
                tableBody.appendChild(row);
            }
        });
    }
    
    // 更新流状态
    updateStreamStatus(url, status) {
        // 更新流对象的状态
        this.allStreams.forEach(stream => {
            if (stream.url === url) {
                stream.status = status;
            }
        });
        
        this.filteredStreams.forEach(stream => {
            if (stream.url === url) {
                stream.status = status;
            }
        });
        
        // 更新表格中的状态显示，只更新当前平台的表格
        const tableBody = document.querySelector(`#dynamicTable-${this.platform} tbody`);
        if (tableBody) {
            const statusCells = tableBody.querySelectorAll('.status-cell');
            statusCells.forEach(cell => {
                if (cell.dataset.streamUrl === url) {
                    // 添加淡出动画效果
                    cell.style.opacity = '0';
                    cell.style.transform = 'scale(0.9)';
                    
                    // 短暂延迟后更新内容并添加淡入效果
                    setTimeout(() => {
                        if (status === 'success') {
                            cell.innerHTML = '<span class="status-dot green" title="有效"></span>';
                        } else if (status === 'error') {
                            cell.innerHTML = '<span class="status-dot red" title="无效"></span>';
                        } else if (status === 'testing') {
                            cell.innerHTML = '<span class="status-dot testing" title="测试中"></span>';
                        } else {
                            cell.innerHTML = '<span class="status-dot gray" title="未测试"></span>';
                        }
                        
                        // 应用淡入动画
                        cell.style.transition = 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)';
                        cell.style.opacity = '1';
                        cell.style.transform = 'scale(1)';
                    }, 150);
                }
            });
        }
    }
}

// 页面加载完成后初始化
let streamManagers = {};

window.addEventListener('DOMContentLoaded', () => {
    // 初始化标签页切换
    setupTabs();
    
    // 初始化各个平台的StreamManager
    streamManagers['douyin'] = new StreamManager('douyin');
    streamManagers['bilibili'] = new StreamManager('bilibili');
    
    // 当打开插件面板时，自动刷新当前浏览器页面
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        if (tabs && tabs.length > 0 && tabs[0].id) {
            chrome.tabs.reload(tabs[0].id, {}, () => {
                // 页面刷新后，重新提取直播流
                setTimeout(() => {
                    // 为当前活动标签页的平台提取数据
                    const activePlatform = document.querySelector('.tab-btn.active').dataset.platform;
                    streamManagers[activePlatform].setupLiveStreamExtraction();
                }, 1000); // 1秒延迟，确保页面已加载
            });
        }
    });
});

// 标签页切换功能
function setupTabs() {
    const tabButtons = document.querySelectorAll('.tab-btn');
    const tabContents = document.querySelectorAll('.tab-content');
    
    tabButtons.forEach(button => {
        button.addEventListener('click', () => {
            const platform = button.dataset.platform;
            
            // 移除所有活动状态
            tabButtons.forEach(btn => btn.classList.remove('active'));
            tabContents.forEach(content => content.classList.remove('active'));
            
            // 添加当前活动状态
            button.classList.add('active');
            document.getElementById(`${platform}Tab`).classList.add('active');
            
            // 初始化当前平台的数据
            if (!streamManagers[platform]) {
                streamManagers[platform] = new StreamManager(platform);
            }
            
            // 刷新当前平台的数据
            streamManagers[platform].setupLiveStreamExtraction();
        });
    });
}

// 显示通知
function showNotification(message, type = "success") {
    // 创建通知元素
    const notification = document.createElement("div");
    notification.className = `notification ${type}`;
    notification.textContent = message;
    
    // 添加到页面
    document.body.appendChild(notification);
    
    // 3秒后移除
    setTimeout(() => {
        notification.remove();
    }, 3000);
}

// 测试直播流链接
function testLiveStream(url, callback) {
    // 简单测试：发送HEAD请求检查链接是否可达
    fetch(url, { method: "HEAD" })
        .then(response => {
            const isSuccess = response.ok;
            if (isSuccess) {
                // 单个测试时显示通知，批量测试时不显示
                if (!callback) {
                    showNotification("直播流链接有效");
                }
            } else {
                // 单个测试时显示通知，批量测试时不显示
                if (!callback) {
                    showNotification("直播流链接无效，状态码: " + response.status, "error");
                }
            }
            // 调用回调函数
            if (callback) {
                callback(isSuccess);
            }
        })
        .catch(err => {
            console.error("测试失败:", err);
            // 单个测试时显示通知，批量测试时不显示
            if (!callback) {
                showNotification("测试失败: " + err.message, "error");
            }
            // 调用回调函数
            if (callback) {
                callback(false);
            }
        });
}