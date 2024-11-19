import { coday, estimate, claim, start, info } from './scripts.js';
import { logger } from './logger.js';
import fs from 'fs/promises'; 
import { banner } from './banner.js';

let headers = {
    'Content-Type': 'application/json',
};

// 从文件中读取令牌和唯一 ID 的函数
async function readTokensAndIds() {
    try {
        const tokenData = await fs.readFile('token.txt', 'utf-8');
        const tokens = tokenData.split('\n').filter(line => line.trim());
        
        const idsData = await fs.readFile('unique_id.txt', 'utf-8');
        const uniqueIds = idsData.split('\n').filter(line => line.trim());
        
        if (tokens.length !== uniqueIds.length) {
            logger("令牌数量与唯一 ID 数量不匹配。", "error");
            return [];
        }

        const accounts = tokens.map((line, index) => {
            const [access_token, refresh_token] = line.split('|').map(token => token.trim());
            return { access_token, refresh_token, unique_id: uniqueIds[index].trim() };
        });

        return accounts;
    } catch (err) {
        logger("读取令牌或唯一 ID 文件失败:", "error", err.message);
        return [];
    }
}

// 刷新令牌的函数
async function refreshToken(refresh_token, accountIndex) {
    logger(`正在刷新第 ${accountIndex + 1} 个账户的访问令牌...`, "info");
    const payloadData = { refresh_token };
    const response = await coday("https://api.meshchain.ai/meshmain/auth/refresh-token", 'POST', headers, payloadData);

    if (response && response.access_token) {
        // 更新当前账户的令牌
        const tokenLines = (await fs.readFile('token.txt', 'utf-8')).split('\n');
        tokenLines[accountIndex] = `${response.access_token}|${response.refresh_token}`;
        await fs.writeFile('token.txt', tokenLines.join('\n'), 'utf-8');
        logger(`第 ${accountIndex + 1} 个账户的令牌刷新成功`, "success");
        return response.access_token;
    }
    logger(`第 ${accountIndex + 1} 个账户的令牌刷新失败`, "error");
    return null;
}

// 处理单个账户的主要逻辑
async function processAccount({ access_token, refresh_token, unique_id }, accountIndex) {
    headers = {
        ...headers,
        Authorization: `Bearer ${access_token}`,
    };

    const profile = await info(unique_id, headers);
    
    if (profile.error) {
        logger(`第 ${accountIndex + 1} 个账户 | ${unique_id}: 获取账户信息失败，尝试刷新令牌...`, "error");
        const newAccessToken = await refreshToken(refresh_token, accountIndex);
        if (!newAccessToken) return;
        headers.Authorization = `Bearer ${newAccessToken}`;
    } else {
        const { name, total_reward } = profile;
        logger(`第 ${accountIndex + 1} 个账户 | ${unique_id}: ${name} | 余额: ${total_reward}`, "success");
    }

    const filled = await estimate(unique_id, headers);
    if (!filled) {
        logger(`第 ${accountIndex + 1} 个账户 | ${unique_id}: 获取估算值失败。`, "error");
        return;
    }

    if (filled.value > 1) {
        logger(`第 ${accountIndex + 1} 个账户 | ${unique_id}: 尝试领取奖励...`);
        const reward = await claim(unique_id, headers);
        if (reward) {
            logger(`第 ${accountIndex + 1} 个账户 | ${unique_id}: 领取成功！新余额: ${reward}`, "success");
            await start(unique_id, headers);
            logger(`第 ${accountIndex + 1} 个账户 | ${unique_id}: 挖矿已重新启动。`, "info");
        } else {
            logger(`第 ${accountIndex + 1} 个账户 | ${unique_id}: 领取奖励失败。`, "error");
        }
    } else {
        logger(`第 ${accountIndex + 1} 个账户 | ${unique_id}: 挖矿已启动。当前矿值: ${filled.value}`, "info");
    }
}

// 主函数，处理所有账户
async function main() {
    logger(banner, "debug");
    
    while (true) {
        const accounts = await readTokensAndIds();

        if (accounts.length === 0) {
            logger("没有可以处理的账户。", "error");
            return;
        }
        for (let i = 0; i < accounts.length; i++) {
            const account = accounts[i];
            logger(`正在处理第 ${i + 1} 个账户...`, "info");
            await processAccount(account, i);
        }
        await new Promise(resolve => setTimeout(resolve, 60000)); // 每 60 秒运行一次
    }
}

// 启动主函数
main();
