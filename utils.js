/**
 * 帅红AI - 工具函数库
 * 提供 API 请求封装、错误处理、数据存储等功能
 */

// ============ 全局错误处理 ============

window.onerror = function(message, source, lineno, colno, error) {
    console.error('🔴 全局错误:', { message, source, lineno, colno, error });
    // 可以在这里添加错误上报逻辑
    return false;
};

window.addEventListener('unhandledrejection', function(event) {
    console.error('🔴 未处理的 Promise 拒绝:', event.reason);
    // 可以在这里添加错误上报逻辑
});

// ============ 配置常量 ============

const CONFIG = {
    REQUEST_TIMEOUT: 60000,      // 请求超时时间 (60秒)
    MAX_RETRY_ATTEMPTS: 2,       // 最大重试次数
    RETRY_DELAY: 1000,           // 重试延迟 (1秒)
    DEBOUNCE_DELAY: 300,         // 防抖延迟 (300毫秒)
    STORAGE_PREFIX: 'shai_',     // localStorage 键前缀
};

// ============ API 请求封装 ============

class ApiClient {
    constructor(options = {}) {
        this.timeout = options.timeout || CONFIG.REQUEST_TIMEOUT;
        this.maxRetries = options.maxRetries || CONFIG.MAX_RETRY_ATTEMPTS;
        this.retryDelay = options.retryDelay || CONFIG.RETRY_DELAY;
    }

    /**
     * 发送请求，支持超时和重试
     */
    async request(url, options = {}, retryCount = 0) {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), this.timeout);

        try {
            const response = await fetch(url, {
                ...options,
                signal: controller.signal,
            });

            clearTimeout(timeoutId);

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new ApiError(
                    errorData.error?.message || `HTTP ${response.status}: ${response.statusText}`,
                    response.status,
                    errorData
                );
            }

            return response;

        } catch (error) {
            clearTimeout(timeoutId);

            // 处理超时
            if (error.name === 'AbortError') {
                throw new ApiError('请求超时，请检查网络连接', 408);
            }

            // 处理网络错误，尝试重试
            if (this.shouldRetry(error, retryCount)) {
                console.warn(`⚠️ 请求失败，${this.retryDelay / 1000}秒后重试 (${retryCount + 1}/${this.maxRetries})...`);
                await this.delay(this.retryDelay);
                return this.request(url, options, retryCount + 1);
            }

            // 包装错误
            if (!(error instanceof ApiError)) {
                throw new ApiError(error.message || '网络请求失败', 0, null, error);
            }

            throw error;
        }
    }

    /**
     * 发送 JSON 请求
     */
    async json(url, options = {}) {
        const response = await this.request(url, {
            ...options,
            headers: {
                'Content-Type': 'application/json',
                ...options.headers,
            },
        });
        return response.json();
    }

    /**
     * 发送流式请求
     */
    async stream(url, options = {}) {
        const response = await this.request(url, {
            ...options,
            headers: {
                'Content-Type': 'application/json',
                ...options.headers,
            },
        });
        return response;
    }

    /**
     * 判断是否应该重试
     */
    shouldRetry(error, retryCount) {
        if (retryCount >= this.maxRetries) return false;
        
        // 网络错误可以重试
        if (error.name === 'TypeError' && error.message.includes('fetch')) return true;
        
        // 5xx 服务器错误可以重试
        if (error instanceof ApiError && error.status >= 500) return true;
        
        // 429 Too Many Requests 可以重试
        if (error instanceof ApiError && error.status === 429) return true;

        return false;
    }

    /**
     * 延迟函数
     */
    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}

/**
 * 自定义 API 错误类
 */
class ApiError extends Error {
    constructor(message, status = 0, data = null, cause = null) {
        super(message);
        this.name = 'ApiError';
        this.status = status;
        this.data = data;
        this.cause = cause;
    }

    /**
     * 获取用户友好的错误信息
     */
    getUserMessage() {
        if (this.status === 401) return '认证失败，请检查 API Key 是否正确';
        if (this.status === 403) return '权限不足，请检查 API Key 权限';
        if (this.status === 404) return 'API 地址不存在，请检查配置';
        if (this.status === 408) return '请求超时，请检查网络连接';
        if (this.status === 429) return '请求过于频繁，请稍后再试';
        if (this.status >= 500) return '服务器繁忙，请稍后重试';
        if (this.message.includes('System is really busy')) return '服务器繁忙，请稍后重试';
        return this.message || '请求失败，请稍后重试';
    }
}

// 创建全局 API 客户端实例
const apiClient = new ApiClient();

// ============ 数据存储封装 ============

class Storage {
    constructor(prefix = CONFIG.STORAGE_PREFIX) {
        this.prefix = prefix;
    }

    /**
     * 生成带前缀的键名
     */
    key(name) {
        return this.prefix + name;
    }

    /**
     * 获取数据
     */
    get(name, defaultValue = null) {
        try {
            const raw = localStorage.getItem(this.key(name));
            if (raw === null) return defaultValue;
            return JSON.parse(raw);
        } catch (error) {
            console.warn(`⚠️ 读取存储失败 [${name}]:`, error);
            return defaultValue;
        }
    }

    /**
     * 设置数据
     */
    set(name, value) {
        try {
            localStorage.setItem(this.key(name), JSON.stringify(value));
            return true;
        } catch (error) {
            console.error(`🔴 写入存储失败 [${name}]:`, error);
            // 可能是存储空间不足
            if (error.name === 'QuotaExceededError') {
                alert('存储空间不足，请清理部分历史对话');
            }
            return false;
        }
    }

    /**
     * 删除数据
     */
    remove(name) {
        try {
            localStorage.removeItem(this.key(name));
            return true;
        } catch (error) {
            console.warn(`⚠️ 删除存储失败 [${name}]:`, error);
            return false;
        }
    }

    /**
     * 检查数据完整性并修复
     */
    validateAndRepair(name, validator, defaultValue) {
        const data = this.get(name);
        if (data === null) {
            this.set(name, defaultValue);
            return defaultValue;
        }
        
        if (!validator(data)) {
            console.warn(`⚠️ 数据验证失败 [${name}]，已重置为默认值`);
            this.set(name, defaultValue);
            return defaultValue;
        }
        
        return data;
    }
}

// 创建全局存储实例（使用旧的键名以保持兼容性）
const storage = new Storage('');

// ============ 工具函数 ============

/**
 * 防抖函数
 */
function debounce(func, delay = CONFIG.DEBOUNCE_DELAY) {
    let timeoutId;
    return function(...args) {
        clearTimeout(timeoutId);
        timeoutId = setTimeout(() => func.apply(this, args), delay);
    };
}

/**
 * 节流函数
 */
function throttle(func, limit = 1000) {
    let inThrottle;
    return function(...args) {
        if (!inThrottle) {
            func.apply(this, args);
            inThrottle = true;
            setTimeout(() => inThrottle = false, limit);
        }
    };
}

/**
 * 安全的 JSON 解析
 */
function safeJsonParse(str, defaultValue = null) {
    try {
        return JSON.parse(str);
    } catch (e) {
        return defaultValue;
    }
}

/**
 * 生成唯一 ID
 */
function generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2, 9);
}

/**
 * 格式化日期
 */
function formatDate(timestamp, format = 'YYYY-MM-DD HH:mm') {
    const date = new Date(timestamp);
    const pad = (n) => n.toString().padStart(2, '0');
    
    return format
        .replace('YYYY', date.getFullYear())
        .replace('MM', pad(date.getMonth() + 1))
        .replace('DD', pad(date.getDate()))
        .replace('HH', pad(date.getHours()))
        .replace('mm', pad(date.getMinutes()))
        .replace('ss', pad(date.getSeconds()));
}

/**
 * 估算 Token 数量
 * 中文约 1.5 字符/token，英文约 4 字符/token
 */
function estimateTokens(text) {
    if (!text) return 0;
    
    // 分离中文和非中文字符
    const chineseChars = (text.match(/[\u4e00-\u9fa5]/g) || []).length;
    const otherChars = text.length - chineseChars;
    
    // 中文约 1.5 字符/token，其他约 4 字符/token
    return Math.round(chineseChars / 1.5 + otherChars / 4);
}

/**
 * 截断文本
 */
function truncateText(text, maxLength = 100, suffix = '...') {
    if (!text || text.length <= maxLength) return text;
    return text.substring(0, maxLength - suffix.length) + suffix;
}

/**
 * 复制文本到剪贴板
 */
async function copyToClipboard(text) {
    try {
        await navigator.clipboard.writeText(text);
        return true;
    } catch (error) {
        // 降级方案
        try {
            const textarea = document.createElement('textarea');
            textarea.value = text;
            textarea.style.position = 'fixed';
            textarea.style.opacity = '0';
            document.body.appendChild(textarea);
            textarea.select();
            document.execCommand('copy');
            document.body.removeChild(textarea);
            return true;
        } catch (e) {
            console.error('复制失败:', error);
            return false;
        }
    }
}

// ============ 导出（如果需要模块化） ============

// 挂载到全局对象，供 HTML 中的脚本使用
window.ShaiUtils = {
    CONFIG,
    ApiClient,
    ApiError,
    apiClient,
    Storage,
    storage,
    debounce,
    throttle,
    safeJsonParse,
    generateId,
    formatDate,
    estimateTokens,
    truncateText,
    copyToClipboard,
};

console.log('✅ 帅红AI 工具库已加载');
