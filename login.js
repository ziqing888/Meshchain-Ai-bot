import { coday } from './scripts.js';
import fs from 'fs/promises';
import readline from 'readline/promises';
import crypto from 'crypto';
import { logger } from './logger.js';

function generateUniqueId() {
    return crypto.randomBytes(16).toString('hex');
}

async function saveUniqueIdToFile(unique_id) {
    await fs.appendFile('unique_id.txt', `${unique_id}\n`, 'utf-8');
    logger("唯一 ID 已成功保存到 unique_id.txt 文件！", "success");
}

async function linkNode(unique_id) {
    const url = "https://api.meshchain.ai/meshmain/nodes/link";
    const payload = {
        unique_id,
        node_type: "browser",
        name: "Extension"
    };

    const response = await coday(url, 'POST', {
        'Content-Type': 'application/json'
    }, payload);

    if (response && response.id) {
        logger(`节点已成功链接！ID: ${unique_id}`, "success");
        return response;
    } else {
        logger("节点链接失败，请检查网络或账户信息。", "error");
    }
}

async function login(email, password) {
    const payloadLogin = {
        email: email,
        password: password
    };

    const response = await coday(
        'https://api.meshchain.ai/meshmain/auth/email-signin',
        'POST',
        {
            'Content-Type': 'application/json'
        },
        payloadLogin
    );

    if (response.access_token) {
        logger("登录成功！", "success");
        logger(`Access Token: ${response.access_token}`);
        logger(`Refresh Token: ${response.refresh_token}`);
        return response;
    } else {
        logger("登录失败，请检查邮箱和密码。", "error");
        return null;
    }
}

async function saveTokenToFile(access_token, refresh_token) {
    const tokenLine = `${access_token}|${refresh_token}\n`;
    await fs.appendFile('token.txt', tokenLine, 'utf-8');
    logger("令牌已成功保存到 token.txt 文件！", "success");
}

async function main() {
    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
    });

    try {
        const email = await rl.question("请输入您的邮箱: ");
        const password = await rl.question("请输入您的密码: ", { hideEchoBack: true });

        const tokens = await login(email, password);

        if (tokens) {
            await saveTokenToFile(tokens.access_token, tokens.refresh_token);

            const unique_id = generateUniqueId();
            await saveUniqueIdToFile(unique_id);

            await linkNode(unique_id);
        }
    } catch (error) {
        logger(`发生错误: ${error.message}`, "error");
    } finally {
        rl.close();
    }
}

main();
