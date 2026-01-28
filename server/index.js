/**
 * EchoAI 安全代理服务器 v2.0
 *
 * 功能：
 * 1. 用户认证和会话管理
 * 2. API 密钥安全存储（环境变量）
 * 3. 多层防刷机制：
 *    - IP 级别限制
 *    - 用户级别限制
 *    - 设备指纹验证
 *    - 行为分析检测
 *    - 黑名单机制
 * 4. Token 消耗监控和预警
 * 5. 请求加密传输
 */

const express = require('express');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const helmet = require('helmet');
const crypto = require('crypto');
const path = require('path');
const jwt = require('jsonwebtoken');
require('dotenv').config();

const app = express();

// ============ 配置 ============
const CONFIG = {
    PORT: process.env.PORT || 3001,
    JWT_SECRET: process.env.JWT_SECRET || crypto.randomBytes(64).toString('hex'),
    API_KEY: process.env.API_KEY,
    API_URL: process.env.API_URL || 'https://ai.shuaihong.fun/v1/chat/completions',
    
    // IP 级别速率限制
    IP_RATE_LIMIT: {
        WINDOW_MS: 60 * 1000,           // 1 分钟窗口
        MAX_REQUESTS: 60,               // IP 每分钟最大请求数
        BLOCK_DURATION: 15 * 60 * 1000, // IP 封禁时长 15 分钟
    },
    
    // 用户级别速率限制
    USER_RATE_LIMIT: {
        WINDOW_MS: 60 * 1000,           // 1 分钟窗口
        MAX_REQUESTS: 20,               // 每用户每分钟最大请求数
        MAX_TOKENS_PER_MINUTE: 50000,   // 每分钟最大 Token 数
        MAX_TOKENS_PER_DAY: 500000,     // 每天最大 Token 数
    },
    
    // 注册限制
    REGISTER_LIMIT: {
        MAX_PER_IP_PER_HOUR: 5,         // 同一 IP 每小时最多注册 5 个用户
        MAX_PER_IP_PER_DAY: 10,         // 同一 IP 每天最多注册 10 个用户
    },
    
    // 行为分析配置
    BEHAVIOR: {
        MIN_REQUEST_INTERVAL: 500,      // 最小请求间隔（毫秒）
        SUSPICIOUS_BURST_COUNT: 10,     // 短时间内请求数超过此值视为可疑
        SUSPICIOUS_BURST_WINDOW: 10000, // 短时间窗口（10秒）
        MAX_IDENTICAL_REQUESTS: 5,      // 相同内容请求最大次数
    },
    
    // Token 预警阈值
    ALERT_THRESHOLDS: {
        SINGLE_REQUEST_TOKENS: 10000,
        MINUTE_TOKENS: 30000,
        DAY_TOKENS: 300000,
    }
};

// ============ 中间件 ============

// 安全头
app.use(helmet({
    contentSecurityPolicy: false, // 禁用 Helmet 的 CSP，由前端 HTML meta 标签控制
}));

// 获取真实 IP
app.set('trust proxy', true);

// CORS 配置
app.use(cors({
    origin: process.env.ALLOWED_ORIGINS?.split(',') || '*',
    credentials: true
}));

// JSON 解析
app.use(express.json({ limit: '1mb' }));

// ============ 数据存储 ============

// 用户数据存储
const users = new Map();

// 用户 Token 使用统计
const tokenUsage = new Map();

// 用户速率限制追踪
const userRateLimitTracker = new Map();

// IP 速率限制追踪
const ipRateLimitTracker = new Map();

// IP 注册追踪
const ipRegisterTracker = new Map();

// 设备指纹追踪
const deviceFingerprints = new Map();

// 黑名单（IP 和用户 ID）
const blacklist = {
    ips: new Map(),      // IP -> { until: timestamp, reason: string }
    users: new Map(),    // userId -> { until: timestamp, reason: string }
    fingerprints: new Map() // fingerprint -> { until: timestamp, reason: string }
};

// 行为分析数据
const behaviorData = new Map();

// 预警日志
const alerts = [];

// 请求日志（用于行为分析）
const requestLogs = new Map();

// ============ 工具函数 ============

/**
 * 获取客户端真实 IP
 */
function getClientIP(req) {
    return req.ip || 
           req.headers['x-real-ip'] || 
           req.headers['x-forwarded-for']?.split(',')[0]?.trim() || 
           req.connection?.remoteAddress ||
           'unknown';
}

/**
 * 生成用户 ID
 */
function generateUserId() {
    return crypto.randomBytes(16).toString('hex');
}

/**
 * 生成设备指纹
 */
function generateDeviceFingerprint(req) {
    const components = [
        req.headers['user-agent'] || '',
        req.headers['accept-language'] || '',
        req.headers['accept-encoding'] || '',
        getClientIP(req)
    ];
    return crypto.createHash('sha256').update(components.join('|')).digest('hex').substring(0, 32);
}

/**
 * 生成请求内容哈希
 */
function hashRequestContent(messages) {
    const content = messages.map(m => m.content).join('');
    return crypto.createHash('md5').update(content).digest('hex');
}

/**
 * 估算 Token 数量
 */
function estimateTokens(messages) {
    let totalChars = 0;
    for (const msg of messages) {
        totalChars += (msg.content || '').length;
    }
    return Math.ceil(totalChars / 2.5);
}

/**
 * 记录预警
 */
function logAlert(identifier, type, details, severity = 'warning') {
    const alert = {
        timestamp: new Date().toISOString(),
        identifier,
        type,
        severity,
        details
    };
    alerts.push(alert);
    
    const icon = severity === 'critical' ? '🚨' : '⚠️';
    console.warn(`${icon} 安全预警 [${severity.toUpperCase()}]:`, JSON.stringify(alert));
    
    if (alerts.length > 1000) {
        alerts.shift();
    }
    
    return alert;
}

/**
 * 添加到黑名单
 */
function addToBlacklist(type, identifier, duration, reason) {
    const until = Date.now() + duration;
    
    switch (type) {
        case 'ip':
            blacklist.ips.set(identifier, { until, reason, addedAt: Date.now() });
            break;
        case 'user':
            blacklist.users.set(identifier, { until, reason, addedAt: Date.now() });
            break;
        case 'fingerprint':
            blacklist.fingerprints.set(identifier, { until, reason, addedAt: Date.now() });
            break;
    }
    
    logAlert(identifier, 'BLACKLISTED', { type, duration, reason }, 'critical');
}

/**
 * 检查是否在黑名单中
 */
function isBlacklisted(type, identifier) {
    let blacklistMap;
    switch (type) {
        case 'ip': blacklistMap = blacklist.ips; break;
        case 'user': blacklistMap = blacklist.users; break;
        case 'fingerprint': blacklistMap = blacklist.fingerprints; break;
        default: return false;
    }
    
    const entry = blacklistMap.get(identifier);
    if (!entry) return false;
    
    if (Date.now() > entry.until) {
        blacklistMap.delete(identifier);
        return false;
    }
    
    return true;
}

/**
 * IP 级别速率限制检查
 */
function checkIPRateLimit(ip) {
    const now = Date.now();
    const windowStart = now - CONFIG.IP_RATE_LIMIT.WINDOW_MS;
    
    if (!ipRateLimitTracker.has(ip)) {
        ipRateLimitTracker.set(ip, []);
    }
    
    const requests = ipRateLimitTracker.get(ip);
    const validRequests = requests.filter(ts => ts > windowStart);
    ipRateLimitTracker.set(ip, validRequests);
    
    if (validRequests.length >= CONFIG.IP_RATE_LIMIT.MAX_REQUESTS) {
        // 超限，加入临时黑名单
        addToBlacklist('ip', ip, CONFIG.IP_RATE_LIMIT.BLOCK_DURATION, 'IP速率限制超限');
        return { allowed: false, error: 'IP 请求过于频繁，已被临时限制' };
    }
    
    validRequests.push(now);
    return { allowed: true };
}

/**
 * IP 注册限制检查
 */
function checkIPRegisterLimit(ip) {
    const now = Date.now();
    const hourStart = now - 60 * 60 * 1000;
    const dayStart = now - 24 * 60 * 60 * 1000;
    
    if (!ipRegisterTracker.has(ip)) {
        ipRegisterTracker.set(ip, []);
    }
    
    const registers = ipRegisterTracker.get(ip);
    const validRegisters = registers.filter(ts => ts > dayStart);
    ipRegisterTracker.set(ip, validRegisters);
    
    const hourCount = validRegisters.filter(ts => ts > hourStart).length;
    const dayCount = validRegisters.length;
    
    if (hourCount >= CONFIG.REGISTER_LIMIT.MAX_PER_IP_PER_HOUR) {
        return { allowed: false, error: '该 IP 注册过于频繁，请稍后再试' };
    }
    
    if (dayCount >= CONFIG.REGISTER_LIMIT.MAX_PER_IP_PER_DAY) {
        return { allowed: false, error: '该 IP 今日注册次数已达上限' };
    }
    
    return { allowed: true };
}

/**
 * 记录 IP 注册
 */
function recordIPRegister(ip) {
    if (!ipRegisterTracker.has(ip)) {
        ipRegisterTracker.set(ip, []);
    }
    ipRegisterTracker.get(ip).push(Date.now());
}

/**
 * 用户速率限制检查
 */
function checkUserRateLimit(userId) {
    const now = Date.now();
    const windowStart = now - CONFIG.USER_RATE_LIMIT.WINDOW_MS;
    
    if (!userRateLimitTracker.has(userId)) {
        userRateLimitTracker.set(userId, []);
    }
    
    const requests = userRateLimitTracker.get(userId);
    const validRequests = requests.filter(ts => ts > windowStart);
    userRateLimitTracker.set(userId, validRequests);
    
    if (validRequests.length >= CONFIG.USER_RATE_LIMIT.MAX_REQUESTS) {
        return {
            allowed: false,
            retryAfter: Math.ceil((validRequests[0] + CONFIG.USER_RATE_LIMIT.WINDOW_MS - now) / 1000)
        };
    }
    
    validRequests.push(now);
    return { allowed: true };
}

/**
 * 行为分析检测
 */
function analyzeBehavior(userId, ip, fingerprint, requestHash) {
    const now = Date.now();
    const key = `${userId}:${ip}`;
    
    if (!behaviorData.has(key)) {
        behaviorData.set(key, {
            lastRequestTime: 0,
            burstRequests: [],
            identicalRequests: new Map(),
            suspiciousScore: 0
        });
    }
    
    const data = behaviorData.get(key);
    const issues = [];
    
    // 1. 检查请求间隔
    const interval = now - data.lastRequestTime;
    if (data.lastRequestTime > 0 && interval < CONFIG.BEHAVIOR.MIN_REQUEST_INTERVAL) {
        data.suspiciousScore += 2;
        issues.push(`请求间隔过短: ${interval}ms`);
    }
    data.lastRequestTime = now;
    
    // 2. 检查短时间内的请求爆发
    const burstWindow = now - CONFIG.BEHAVIOR.SUSPICIOUS_BURST_WINDOW;
    data.burstRequests = data.burstRequests.filter(ts => ts > burstWindow);
    data.burstRequests.push(now);
    
    if (data.burstRequests.length > CONFIG.BEHAVIOR.SUSPICIOUS_BURST_COUNT) {
        data.suspiciousScore += 5;
        issues.push(`短时间请求过多: ${data.burstRequests.length}次/10秒`);
    }
    
    // 3. 检查相同内容请求
    const identicalCount = (data.identicalRequests.get(requestHash) || 0) + 1;
    data.identicalRequests.set(requestHash, identicalCount);
    
    if (identicalCount > CONFIG.BEHAVIOR.MAX_IDENTICAL_REQUESTS) {
        data.suspiciousScore += 3;
        issues.push(`相同内容请求过多: ${identicalCount}次`);
    }
    
    // 4. 清理过期的相同请求记录（每 100 次请求清理一次）
    if (data.burstRequests.length % 100 === 0) {
        data.identicalRequests.clear();
    }
    
    // 5. 评估可疑分数
    let result = { allowed: true };
    
    if (data.suspiciousScore >= 20) {
        // 严重可疑，加入黑名单
        addToBlacklist('user', userId, 30 * 60 * 1000, '行为异常'); // 30分钟
        addToBlacklist('ip', ip, 15 * 60 * 1000, '关联用户行为异常');
        result = { allowed: false, error: '检测到异常行为，账户已被临时限制' };
    } else if (data.suspiciousScore >= 10) {
        // 中度可疑，记录预警
        logAlert(userId, 'SUSPICIOUS_BEHAVIOR', {
            score: data.suspiciousScore,
            issues,
            ip,
            fingerprint
        }, 'warning');
    }
    
    // 分数随时间衰减
    data.suspiciousScore = Math.max(0, data.suspiciousScore - 0.1);
    
    return result;
}

/**
 * Token 使用限制检查
 */
function checkTokenLimit(userId, estimatedTokens) {
    const now = Date.now();
    const minuteStart = now - 60 * 1000;
    const dayStart = now - 24 * 60 * 60 * 1000;
    
    if (!tokenUsage.has(userId)) {
        tokenUsage.set(userId, []);
    }
    
    const usage = tokenUsage.get(userId);
    
    const minuteUsage = usage
        .filter(u => u.timestamp > minuteStart)
        .reduce((sum, u) => sum + u.tokens, 0);
    
    const dayUsage = usage
        .filter(u => u.timestamp > dayStart)
        .reduce((sum, u) => sum + u.tokens, 0);
    
    if (minuteUsage + estimatedTokens > CONFIG.USER_RATE_LIMIT.MAX_TOKENS_PER_MINUTE) {
        return { allowed: false, error: '每分钟 Token 使用量已达上限' };
    }
    
    if (dayUsage + estimatedTokens > CONFIG.USER_RATE_LIMIT.MAX_TOKENS_PER_DAY) {
        return { allowed: false, error: '今日 Token 使用量已达上限' };
    }
    
    // 预警检查
    if (estimatedTokens > CONFIG.ALERT_THRESHOLDS.SINGLE_REQUEST_TOKENS) {
        logAlert(userId, 'HIGH_SINGLE_REQUEST', { tokens: estimatedTokens });
    }
    
    if (minuteUsage > CONFIG.ALERT_THRESHOLDS.MINUTE_TOKENS) {
        logAlert(userId, 'HIGH_MINUTE_USAGE', { tokens: minuteUsage });
    }
    
    if (dayUsage > CONFIG.ALERT_THRESHOLDS.DAY_TOKENS) {
        logAlert(userId, 'HIGH_DAY_USAGE', { tokens: dayUsage });
    }
    
    return { allowed: true, minuteUsage, dayUsage };
}

/**
 * 记录 Token 使用
 */
function recordTokenUsage(userId, tokens) {
    if (!tokenUsage.has(userId)) {
        tokenUsage.set(userId, []);
    }
    
    const usage = tokenUsage.get(userId);
    usage.push({ timestamp: Date.now(), tokens });
    
    // 清理超过 24 小时的记录
    const dayStart = Date.now() - 24 * 60 * 60 * 1000;
    const validUsage = usage.filter(u => u.timestamp > dayStart);
    tokenUsage.set(userId, validUsage);
}

/**
 * 验证设备指纹一致性
 */
function validateDeviceFingerprint(userId, currentFingerprint) {
    if (!deviceFingerprints.has(userId)) {
        deviceFingerprints.set(userId, {
            primary: currentFingerprint,
            seen: new Set([currentFingerprint]),
            lastSeen: Date.now()
        });
        return { valid: true };
    }
    
    const data = deviceFingerprints.get(userId);
    data.lastSeen = Date.now();
    
    if (data.seen.has(currentFingerprint)) {
        return { valid: true };
    }
    
    // 新的设备指纹
    if (data.seen.size >= 5) {
        // 太多不同的设备，可能是账号共享或攻击
        logAlert(userId, 'TOO_MANY_DEVICES', {
            deviceCount: data.seen.size,
            newFingerprint: currentFingerprint
        }, 'warning');
        
        if (data.seen.size >= 10) {
            return { valid: false, error: '检测到异常设备访问' };
        }
    }
    
    data.seen.add(currentFingerprint);
    return { valid: true };
}

// ============ 防刷中间件 ============

function antiBrushMiddleware(req, res, next) {
    const ip = getClientIP(req);
    const fingerprint = generateDeviceFingerprint(req);
    
    // 1. 检查 IP 黑名单
    if (isBlacklisted('ip', ip)) {
        return res.status(403).json({ error: '您的 IP 已被临时限制访问' });
    }
    
    // 2. 检查设备指纹黑名单
    if (isBlacklisted('fingerprint', fingerprint)) {
        return res.status(403).json({ error: '您的设备已被临时限制访问' });
    }
    
    // 3. IP 速率限制
    const ipCheck = checkIPRateLimit(ip);
    if (!ipCheck.allowed) {
        return res.status(429).json({ error: ipCheck.error });
    }
    
    // 附加信息到请求对象
    req.clientIP = ip;
    req.deviceFingerprint = fingerprint;
    
    next();
}

// 前端静态文件（仓库根目录：index.html / style.css / utils.js 等）
// 静态资源不走防刷中间件，避免加载页面/资源时被限流
const WEB_ROOT = path.join(__dirname, '..');
app.use(express.static(WEB_ROOT));

// 应用防刷中间件（仅保护 API 与健康检查）
app.use(['/api', '/health'], antiBrushMiddleware);

// ============ JWT 认证中间件 ============

function authenticateToken(req, res, next) {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    
    if (!token) {
        return res.status(401).json({ error: '未提供认证令牌' });
    }
    
    // 尝试验证 JWT
    jwt.verify(token, CONFIG.JWT_SECRET, (err, user) => {
        if (err) {
            // 如果 JWT 验证失败，检查是否可能是 API Key（例如 sk- 开头）
            // 或者我们允许直接透传 Key 的模式
            // 在这种情况下，我们创建一个临时用户身份
            
            // 简单的启发式检查：如果 token 包含点号且分为三部分，可能是 JWT 但过期了
            // 如果不包含点号，或者明显是 API Key 格式
            
            // 为了支持用户直接填 Key，我们在这里放行，
            // 并将 token 标记为可能的 API Key，存入 headers 供后续使用
            req.headers['x-custom-api-key'] = token;
            
            // 生成一个基于 IP 的临时用户 ID，用于限流
            const ip = getClientIP(req);
            const tempUserId = crypto.createHash('md5').update(ip).digest('hex');
            
            req.user = {
                userId: `guest_${tempUserId}`,
                type: 'guest'
            };
            
            // 检查黑名单（使用 IP 或临时 ID）
            if (isBlacklisted('user', req.user.userId) || isBlacklisted('ip', ip)) {
                return res.status(403).json({ error: '您的访问已被限制' });
            }
            
            return next();
        }
        
        // JWT 验证成功
        // 检查用户黑名单
        if (isBlacklisted('user', user.userId)) {
            return res.status(403).json({ error: '您的账户已被临时限制' });
        }
        
        req.user = user;
        next();
    });
}

// ============ API 路由 ============

/**
 * 健康检查
 */
app.get('/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

/**
 * 用户注册/登录
 */
app.post('/api/auth/login', (req, res) => {
    try {
        const ip = req.clientIP;
        const fingerprint = req.deviceFingerprint;
        const { deviceId } = req.body;
        
        // 检查设备指纹黑名单
        if (isBlacklisted('fingerprint', fingerprint)) {
            return res.status(403).json({ error: '设备已被限制' });
        }
        
        let userId = deviceId;
        let isNewUser = false;
        
        if (!userId || !users.has(userId)) {
            // 检查 IP 注册限制
            const registerCheck = checkIPRegisterLimit(ip);
            if (!registerCheck.allowed) {
                return res.status(429).json({ error: registerCheck.error });
            }
            
            userId = generateUserId();
            isNewUser = true;
        }
        
        // 创建或更新用户
        const existingUser = users.get(userId);
        users.set(userId, {
            id: userId,
            createdAt: existingUser?.createdAt || Date.now(),
            lastActive: Date.now(),
            registrationIP: existingUser?.registrationIP || ip,
            fingerprint: fingerprint
        });
        
        // 记录注册
        if (isNewUser) {
            recordIPRegister(ip);
        }
        
        // 验证设备指纹
        const fpCheck = validateDeviceFingerprint(userId, fingerprint);
        if (!fpCheck.valid) {
            return res.status(403).json({ error: fpCheck.error });
        }
        
        // 生成 JWT
        const token = jwt.sign(
            { userId, type: 'access', fingerprint },
            CONFIG.JWT_SECRET,
            { expiresIn: '24h' }
        );
        
        res.json({
            success: true,
            userId,
            token,
            expiresIn: 24 * 60 * 60,
            isNewUser
        });
        
    } catch (error) {
        console.error('登录错误:', error);
        res.status(500).json({ error: '服务器错误' });
    }
});

/**
 * AI 对话代理（加强防刷版本）
 */
app.post('/api/chat', authenticateToken, async (req, res) => {
    const userId = req.user.userId;
    const ip = req.clientIP;
    const fingerprint = req.deviceFingerprint;
    
    try {
        // 1. 用户速率限制
        const userRateCheck = checkUserRateLimit(userId);
        if (!userRateCheck.allowed) {
            return res.status(429).json({
                error: '请求过于频繁',
                retryAfter: userRateCheck.retryAfter
            });
        }
        
        // 2. 验证请求体
        const { messages, model, temperature, max_tokens, stream } = req.body;
        
        if (!messages || !Array.isArray(messages) || messages.length === 0) {
            return res.status(400).json({ error: '消息列表不能为空' });
        }
        
        // 3. 消息内容验证
        for (const msg of messages) {
            if (!msg.content || typeof msg.content !== 'string') {
                return res.status(400).json({ error: '消息内容无效' });
            }
            if (msg.content.length > 50000) {
                return res.status(400).json({ error: '单条消息内容过长' });
            }
        }
        
        // 4. 行为分析
        const requestHash = hashRequestContent(messages);
        const behaviorCheck = analyzeBehavior(userId, ip, fingerprint, requestHash);
        if (!behaviorCheck.allowed) {
            return res.status(403).json({ error: behaviorCheck.error });
        }
        
        // 5. Token 限制检查
        const estimatedTokens = estimateTokens(messages);
        const tokenCheck = checkTokenLimit(userId, estimatedTokens);
        if (!tokenCheck.allowed) {
            return res.status(429).json({ error: tokenCheck.error });
        }
        
        // 6. 验证设备指纹一致性
        const fpCheck = validateDeviceFingerprint(userId, fingerprint);
        if (!fpCheck.valid) {
            return res.status(403).json({ error: fpCheck.error });
        }
        
        // 7. 确定使用的 API Key（优先使用请求头中的 Key，其次使用环境变量）
        // 注意：authenticateToken 中间件会校验 Authorization 头是 JWT，
        // 但这里我们需要支持用户透传 API Key。
        // 前端传来的 Authorization 头目前被用作 JWT 用户认证，
        // 我们约定：用户自定义的 API Key 放在 'X-Custom-Api-Key' 头中，
        // 或者如果后端未开启强制登录，则 Authorization 头就是 API Key。
        
        let targetApiKey = CONFIG.API_KEY;
        
        // 检查请求头中是否有自定义 Key
        const customKey = req.headers['x-custom-api-key'] || req.headers['x-api-key'];
        if (customKey) {
            targetApiKey = customKey;
        }
        
        if (!targetApiKey) {
            return res.status(500).json({ error: '未配置 API Key，请在设置中填写您的 Key' });
        }
        
        // 8. 构建请求
        const payload = {
            model: model || 'deepseek-v3.2',
            messages,
            temperature: temperature || 0.7,
            stream: stream || false
        };
        
        if (max_tokens) {
            payload.max_tokens = Math.min(max_tokens, 8192); // 限制最大 token
        }
        
        // 9. 发送请求
        const fetch = (await import('node-fetch')).default;
        const response = await fetch(CONFIG.API_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${targetApiKey}`
            },
            body: JSON.stringify(payload)
        });
        
        if (!response.ok) {
            const errData = await response.json().catch(() => ({}));
            return res.status(response.status).json({
                error: errData.error?.message || `API 错误: ${response.status}`
            });
        }
        
        // 10. 处理响应
        if (stream) {
            res.setHeader('Content-Type', 'text/event-stream');
            res.setHeader('Cache-Control', 'no-cache');
            res.setHeader('Connection', 'keep-alive');
            
            let totalTokens = 0;
            
            response.body.on('data', (chunk) => {
                res.write(chunk);
                totalTokens += chunk.toString().length / 4;
            });
            
            response.body.on('end', () => {
                recordTokenUsage(userId, Math.max(estimatedTokens, totalTokens));
                res.end();
            });
            
            response.body.on('error', (err) => {
                console.error('流式响应错误:', err);
                res.end();
            });
            
        } else {
            const data = await response.json();
            const actualTokens = data.usage?.total_tokens || estimatedTokens;
            recordTokenUsage(userId, actualTokens);
            res.json(data);
        }
        
    } catch (error) {
        console.error('对话请求错误:', error);
        res.status(500).json({ error: '服务器错误' });
    }
});

/**
 * 获取模型列表
 */
app.get('/api/models', authenticateToken, async (req, res) => {
    try {
        if (!CONFIG.API_KEY) {
            return res.status(500).json({ error: 'API 密钥未配置' });
        }
        
        const modelsUrl = CONFIG.API_URL.replace(/\/chat\/completions\/?$/, '/models');
        
        const fetch = (await import('node-fetch')).default;
        const response = await fetch(modelsUrl, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${CONFIG.API_KEY}`
            }
        });
        
        if (!response.ok) {
            return res.status(response.status).json({ error: '获取模型列表失败' });
        }
        
        const data = await response.json();
        res.json(data);
        
    } catch (error) {
        console.error('获取模型列表错误:', error);
        res.status(500).json({ error: '服务器错误' });
    }
});

/**
 * 获取用户使用统计
 */
app.get('/api/usage', authenticateToken, (req, res) => {
    const userId = req.user.userId;
    
    const now = Date.now();
    const minuteStart = now - 60 * 1000;
    const dayStart = now - 24 * 60 * 60 * 1000;
    
    const usage = tokenUsage.get(userId) || [];
    
    const minuteUsage = usage
        .filter(u => u.timestamp > minuteStart)
        .reduce((sum, u) => sum + u.tokens, 0);
    
    const dayUsage = usage
        .filter(u => u.timestamp > dayStart)
        .reduce((sum, u) => sum + u.tokens, 0);
    
    res.json({
        userId,
        usage: {
            minute: {
                tokens: minuteUsage,
                limit: CONFIG.USER_RATE_LIMIT.MAX_TOKENS_PER_MINUTE,
                remaining: CONFIG.USER_RATE_LIMIT.MAX_TOKENS_PER_MINUTE - minuteUsage
            },
            day: {
                tokens: dayUsage,
                limit: CONFIG.USER_RATE_LIMIT.MAX_TOKENS_PER_DAY,
                remaining: CONFIG.USER_RATE_LIMIT.MAX_TOKENS_PER_DAY - dayUsage
            }
        }
    });
});

/**
 * 管理端点：获取预警日志
 */
app.get('/api/admin/alerts', (req, res) => {
    const adminKey = req.headers['x-admin-key'];
    
    if (!adminKey || adminKey !== process.env.ADMIN_KEY) {
        return res.status(403).json({ error: '无权访问' });
    }
    
    res.json({
        total: alerts.length,
        alerts: alerts.slice(-100)
    });
});

/**
 * 管理端点：获取黑名单
 */
app.get('/api/admin/blacklist', (req, res) => {
    const adminKey = req.headers['x-admin-key'];
    
    if (!adminKey || adminKey !== process.env.ADMIN_KEY) {
        return res.status(403).json({ error: '无权访问' });
    }
    
    const now = Date.now();
    
    res.json({
        ips: Array.from(blacklist.ips.entries())
            .filter(([_, v]) => v.until > now)
            .map(([ip, data]) => ({ ip, ...data })),
        users: Array.from(blacklist.users.entries())
            .filter(([_, v]) => v.until > now)
            .map(([userId, data]) => ({ userId, ...data })),
        fingerprints: Array.from(blacklist.fingerprints.entries())
            .filter(([_, v]) => v.until > now)
            .map(([fp, data]) => ({ fingerprint: fp, ...data }))
    });
});

/**
 * 管理端点：手动添加黑名单
 */
app.post('/api/admin/blacklist', (req, res) => {
    const adminKey = req.headers['x-admin-key'];
    
    if (!adminKey || adminKey !== process.env.ADMIN_KEY) {
        return res.status(403).json({ error: '无权访问' });
    }
    
    const { type, identifier, duration, reason } = req.body;
    
    if (!['ip', 'user', 'fingerprint'].includes(type)) {
        return res.status(400).json({ error: '无效的黑名单类型' });
    }
    
    if (!identifier) {
        return res.status(400).json({ error: '缺少标识符' });
    }
    
    addToBlacklist(type, identifier, duration || 3600000, reason || '管理员手动添加');
    
    res.json({ success: true, message: '已添加到黑名单' });
});

/**
 * 管理端点：移除黑名单
 */
app.delete('/api/admin/blacklist', (req, res) => {
    const adminKey = req.headers['x-admin-key'];
    
    if (!adminKey || adminKey !== process.env.ADMIN_KEY) {
        return res.status(403).json({ error: '无权访问' });
    }
    
    const { type, identifier } = req.body;
    
    switch (type) {
        case 'ip': blacklist.ips.delete(identifier); break;
        case 'user': blacklist.users.delete(identifier); break;
        case 'fingerprint': blacklist.fingerprints.delete(identifier); break;
        default: return res.status(400).json({ error: '无效的黑名单类型' });
    }
    
    res.json({ success: true, message: '已从黑名单移除' });
});

/**
 * 管理端点：获取系统统计
 */
app.get('/api/admin/stats', (req, res) => {
    const adminKey = req.headers['x-admin-key'];
    
    if (!adminKey || adminKey !== process.env.ADMIN_KEY) {
        return res.status(403).json({ error: '无权访问' });
    }
    
    const now = Date.now();
    const hourAgo = now - 60 * 60 * 1000;
    
    res.json({
        users: {
            total: users.size,
            activeLastHour: Array.from(users.values()).filter(u => u.lastActive > hourAgo).length
        },
        blacklist: {
            ips: Array.from(blacklist.ips.values()).filter(v => v.until > now).length,
            users: Array.from(blacklist.users.values()).filter(v => v.until > now).length,
            fingerprints: Array.from(blacklist.fingerprints.values()).filter(v => v.until > now).length
        },
        alerts: {
            total: alerts.length,
            lastHour: alerts.filter(a => new Date(a.timestamp).getTime() > hourAgo).length
        }
    });
});

// ============ 启动服务器 ============

app.listen(CONFIG.PORT, () => {
    console.log(`
🚀 EchoAI 安全代理服务器 v2.0 已启动
📍 端口: ${CONFIG.PORT}
🔐 API 密钥: ${CONFIG.API_KEY ? '已配置' : '❌ 未配置！请设置 API_KEY 环境变量'}
🌐 API 地址: ${CONFIG.API_URL}

🛡️ 多层防刷机制：
✅ IP 级别限制 (${CONFIG.IP_RATE_LIMIT.MAX_REQUESTS} 请求/分钟)
✅ 用户级别限制 (${CONFIG.USER_RATE_LIMIT.MAX_REQUESTS} 请求/分钟)
✅ Token 使用限制 (${CONFIG.USER_RATE_LIMIT.MAX_TOKENS_PER_MINUTE}/分钟, ${CONFIG.USER_RATE_LIMIT.MAX_TOKENS_PER_DAY}/天)
✅ IP 注册限制 (${CONFIG.REGISTER_LIMIT.MAX_PER_IP_PER_HOUR}/小时, ${CONFIG.REGISTER_LIMIT.MAX_PER_IP_PER_DAY}/天)
✅ 设备指纹验证
✅ 行为分析检测
✅ 自动黑名单机制
✅ 异常消耗预警
    `);
});

module.exports = app;
