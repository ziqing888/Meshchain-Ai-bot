import { coday, estimate, claim, start, info } from './scripts.js';
import { logger } from './logger.js';
import fs from 'fs/promises';
import { banner } from './banner.js';

// 请求头设置
let headers = {
    'Content-Type': 'application/json',
};

// 读取令牌和唯一 ID
async function readTokensAndIds() {
    try {
        // 读取 token 文件
        const tokenData = await fs.readFile('token.txt', 'utf-8');
        const tokens = tokenData.split('\n').filter(line => line.trim());

        // 读取唯一 ID 文件
        const idsData = await fs.readFile('unique_id.txt', 'utf-8');
        const uniqueIds = idsData.split('\n').filter(line => line.trim());

        // 检查 token 和唯一 ID 的行数是否匹配
        if (tokens.length !== uniqueIds.length) {
            logger("Token 和唯一 ID 的行数不匹配。", "error");
            return [];
        }

        // 组合账户信息
        const accounts = tokens.map((line, index) => {
            const [access_token, refresh_token] = line.split('|').map(token => token.trim());
            const ids = uniqueIds[index].split('|').map(id => id.trim());
            return { access_token, refresh_token, unique_ids: ids };
        });

        return accounts;
    } catch (err) {
        logger("读取 token 或唯一 ID 文件失败:", "error", err.message);
        return [];
    }
}

// 刷新令牌功能
async function refreshToken(refresh_token, accountIndex) {
    logger(`正在刷新账户 ${accountIndex + 1} 的访问令牌...`, "info");
    const payloadData = { refresh_token };
    const response = await coday("https://api.meshchain.ai/meshmain/auth/refresh-token", 'POST', headers, payloadData);

    if (response && response.access_token) {
        // 更新 token 文件
        const tokenLines = (await fs.readFile('token.txt', 'utf-8')).split('\n');
        tokenLines[accountIndex] = `${response.access_token}|${response.refresh_token}`;
        await fs.writeFile('token.txt', tokenLines.join('\n'), 'utf-8');
        logger(`账户 ${accountIndex + 1} 的令牌刷新成功`, "success");
        return response.access_token;
    }
    logger(`账户 ${accountIndex + 1} 的令牌刷新失败`, "error");
    return null;
}

// 单个账户的主要处理流程
async function processAccount({ access_token, refresh_token, unique_ids }, accountIndex) {
    headers = {
        ...headers,
        Authorization: `Bearer ${access_token}`,
    };

    for (const unique_id of unique_ids) {
        // 获取用户信息
        const profile = await info(unique_id, headers);

        if (profile.error) {
            logger(`账户 ${accountIndex + 1} | ${unique_id}: 获取用户信息失败，尝试刷新令牌...`, "error");
            const newAccessToken = await refreshToken(refresh_token, accountIndex);
            if (!newAccessToken) return;
            headers.Authorization = `Bearer ${newAccessToken}`;
        } else {
            const { name, total_reward } = profile;
            logger(`账户 ${accountIndex + 1} | ${unique_id}: ${name} | 余额: ${total_reward}`, "success");
        }

        // 获取奖励估算
        const filled = await estimate(unique_id, headers);
        if (!filled) {
            logger(`账户 ${accountIndex + 1} | ${unique_id}: 获取估算值失败。`, "error");
            continue;
        }

        if (filled.value > 10) {
            logger(`账户 ${accountIndex + 1} | ${unique_id}: 尝试领取奖励...`);
            const reward = await claim(unique_id, headers);
            if (reward) {
                logger(`账户 ${accountIndex + 1} | ${unique_id}: 奖励领取成功！新余额: ${reward}`, "success");
                await start(unique_id, headers);
                logger(`账户 ${accountIndex + 1} | ${unique_id}: 重新开始挖矿。`, "info");
            } else {
                logger(`账户 ${accountIndex + 1} | ${unique_id}: 领取奖励失败。`, "error");
            }
        } else {
            logger(`账户 ${accountIndex + 1} | ${unique_id}: 已经在挖矿中，当前值: ${filled.value}`, "info");
        }
    }
}

// 主流程处理所有账户
async function main() {
    logger(banner, "debug");

    while (true) {
        const accounts = await readTokensAndIds();

        if (accounts.length === 0) {
            logger("没有账户可处理。", "error");
            return;
        }
        for (let i = 0; i < accounts.length; i++) {
            const account = accounts[i];
            logger(`正在处理账户 ${i + 1}...`, "info");
            await processAccount(account, i);
        }
        await new Promise(resolve => setTimeout(resolve, 60000)); // 每 60 秒运行一次
    }
}

// 运行主流程
main();
