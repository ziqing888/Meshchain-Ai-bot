import { coday, start } from './scripts.js';
import readline from 'readline/promises';
import fs from 'fs/promises';
import crypto from 'crypto';
import { logger } from './logger.js';
import { banner } from './banner.js';

// 初始化 readline 接口
const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
});

// 设置默认请求头
let headers = {
    'Content-Type': 'application/json',
};

// 注册函数
async function register(name, email, password) {
    const payloadReg = {
        full_name: name, // 用户全名
        email: email, // 用户邮箱
        password: password, // 用户密码
        referral_code: "XW37QRUE51P7", // 替换为你的推荐码
    };
    const response = await coday(
        'https://api.meshchain.ai/meshmain/auth/email-signup', // 注册 API 地址
        'POST', // 使用 POST 方法
        headers, // 请求头
        payloadReg // 请求参数
    );
    return response.message || "未返回消息"; // 返回结果中的消息
}

// 登录函数
async function login(email, password) {
    const payloadLogin = {
        email: email, // 用户邮箱
        password: password, // 用户密码
    };
    const response = await coday(
        'https://api.meshchain.ai/meshmain/auth/email-signin', // 登录 API 地址
        'POST',
        headers,
        payloadLogin
    );

    if (response.access_token) {
        logger('登录成功!', "success");
        return response;
    }
    logger('登录失败，请检查您的账号和密码。', "error");
    return null;
}

// 验证邮箱函数
async function verify(email, otp) {
    const payloadVerify = {
        email: email, // 用户邮箱
        code: otp, // 验证码 (OTP)
    };
    const response = await coday(
        'https://api.meshchain.ai/meshmain/auth/verify-email', // 邮箱验证 API 地址
        'POST',
        headers,
        payloadVerify
    );
    return response.message || "邮箱验证失败";
}

// 领取奖励函数
async function claimBnb() {
    const payloadClaim = { mission_id: "ACCOUNT_VERIFICATION" }; // 验证任务的 ID
    const response = await coday(
        'https://api.meshchain.ai/meshmain/mission/claim', // 领取奖励 API 地址
        'POST',
        headers,
        payloadClaim
    );
    return response.status || "奖励领取失败";
}

// 生成 16 字节的十六进制字符串
function generateHex() {
    return crypto.randomBytes(16).toString('hex');
}

// 初始化节点并保存唯一 ID
async function init(randomHex) {
    const url = "https://api.meshchain.ai/meshmain/nodes/link"; // 节点链接 API 地址
    const payload = { 
        "unique_id": randomHex, // 唯一 ID
        "node_type": "browser", // 节点类型
        "name": "Extension" // 节点名称
    };

    const response = await coday(url, 'POST', headers, payload);
    if (response.id) {
        try {
            // 将唯一 ID 追加保存到 unique_id.txt 文件中
            await fs.appendFile('unique_id.txt', `${response.unique_id}\n`, 'utf-8');
            logger(`唯一 ID 已保存到 unique_id.txt: ${response.unique_id}`, "success");
        } catch (err) {
            logger('保存唯一 ID 到文件失败:', "error", err.message);
        }
    }
    return response;
}

// 主函数
async function main() {
    try {
        logger(banner, "debug"); // 打印横幅信息

        // 提示用户依次输入信息
        const name = await rl.question("请输入您的姓名: ");
        const email = await rl.question("请输入您的邮箱: ");
        const password = await rl.question("请输入您的密码: ");

        // 注册账户
        const registerMessage = await register(name, email, password);
        logger(`注册结果: ${registerMessage}`);

        // 登录账户
        const loginData = await login(email, password);
        if (!loginData) return; // 如果登录失败，退出程序

        // 将 access token 添加到请求头
        headers = {
            ...headers,
            'Authorization': `Bearer ${loginData.access_token}`, // 添加授权头
        };

        // 验证邮箱
        const otp = await rl.question("请输入您收到的邮箱验证码 (OTP): ");
        const verifyMessage = await verify(email, otp);
        logger(`邮箱验证结果: ${verifyMessage}`);

        // 领取奖励
        const claimMessage = await claimBnb();
        logger(`奖励领取成功: ${claimMessage}`, "success");

        // 生成并链接唯一 ID
        const randomHex = generateHex();
        const linkResponse = await init(randomHex);

        // 保存令牌和唯一 ID
        try {
            // 将令牌追加保存到 token.txt 文件中
            await fs.appendFile(
                'token.txt',
                `${loginData.access_token}|${loginData.refresh_token}\n`,
                'utf-8'
            );
            logger('令牌已保存到 token.txt', "success");

            // 启动节点
            const starting = await start(linkResponse.unique_id, headers);
            if (starting) {
                logger(`扩展 ID: ${linkResponse.unique_id} 已激活`, "success");
            }
        } catch (err) {
            logger('保存数据到文件失败:', "error", err.message);
        }
    } catch (error) {
        logger("程序运行时发生错误:", "error", error.message);
    } finally {
        rl.close(); // 关闭 readline 接口
    }
}

// 启动程序
main();
