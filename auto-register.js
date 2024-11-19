import { coday, start } from './scripts.js'; 
import readline from 'readline/promises'; 
import fs from 'fs/promises';
import crypto from 'crypto'; 
import { logger } from './logger.js'; 
import { banner } from './banner.js'; 
import Mailjs from "@cemalgnlts/mailjs"; 

const mailjs = new Mailjs(); 

let headers = {
    'Content-Type': 'application/json',
};


async function register(name, email, password, referral_code) {
    const payloadReg = {
        full_name: name,
        email: email, 
        password: password, 
        referral_code: referral_code, 
    };
    const response = await coday(
        'https://api.meshchain.ai/meshmain/auth/email-signup', 
        'POST',
        headers,
        payloadReg
    );
    return response.message || "未返回任何信息";
}

// 登录用户函数
async function login(email, password) {
    const payloadLogin = {
        email: email, 
        password: password, 
    };
    const response = await coday(
        'https://api.meshchain.ai/meshmain/auth/email-signin', 
        'POST',
        headers,
        payloadLogin
    );

    if (response.access_token) {
        logger('登录成功！', "success");
        return response;
    }
    logger('登录失败，请检查您的凭证。', "error");
    return null;
}


async function verify(email, otp) {
    const payloadVerify = {
        email: email, 
        code: otp, 
    };
    const response = await coday(
        'https://api.meshchain.ai/meshmain/auth/verify-email', 
        'POST',
        headers,
        payloadVerify
    );
    return response.message || "验证失败";
}


async function claimBnb(headers) {
    const payloadClaim = { mission_id: "ACCOUNT_VERIFICATION" }; 
    const response = await coday(
        'https://api.meshchain.ai/meshmain/mission/claim', 
        'POST',
        headers,
        payloadClaim
    );
    return response.status || "领取失败";
}


function generateHex() {
    return crypto.randomBytes(16).toString('hex');
}


async function init(randomHex, headers) {
    const url = "https://api.meshchain.ai/meshmain/nodes/link"; 
    const payload = { 
        "unique_id": randomHex, 
        "node_type": "browser", 
        "name": "Extension" 
    };

    const response = await coday(url, 'POST', headers, payload);
    if (response.id) {
        try {
           
            await fs.appendFile('unique_id.txt', `${response.unique_id}\n`, 'utf-8');
            logger(`ID 已保存到 unique_id.txt: ${response.unique_id}`, "success");
        } catch (err) {
            logger('无法保存唯一 ID 到文件:', "error", err.message);
        }
    }
    return response;
}

async function saveAccountToFile(email, password) {
    try {
        const accountData = `Email: ${email}, Password: ${password}\n`;
        await fs.appendFile('accounts.txt', accountData, 'utf-8');
        logger("账户凭证已保存到 accounts.txt");
    } catch (error) {
        console.error("保存账户凭证失败:", error);
    }
}


async function manageMailAndRegister() {
    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout,
    });

    try {
        logger(banner, "debug");
        const input = await rl.question("您想创建多少个账户：");
        const number = parseFloat(input);
        let refCode;
        const ref = await rl.question("是否使用邀请码 (y/N)：");
        if (ref === 'N') {
            refCode = await rl.question("请输入邀请码：");
        } else {
            refCode = "XW37QRUE51P7"; // 默认邀请码
        }
        logger(`使用邀请码注册账户：${refCode}`, "info");

        for (let i = 0; i < number; i++) {
            try {
              
                const account = await mailjs.createOneAccount();
                const email = account.data.username;
                const password = account.data.password;
                const name = email;

                if (email && password) {
                    logger(`账户 #${i + 1} 创建成功。用户名: ${name}, 邮箱: ${email}`, "debug");

                   
                    await saveAccountToFile(email, password);

                 
                    const registerMessage = await register(name, email, password, refCode);
                    logger(`注册响应：${registerMessage}`);

                  
                    const loginData = await login(email, password);
                    if (!loginData) throw new Error("登录失败。");
                    
                    const accountHeaders = {
                        ...headers,
                        'Authorization': `Bearer ${loginData.access_token}`,
                    };

                 
                    await mailjs.login(email, password);

                    logger("等待验证码...");
                    const otp = await new Promise((resolve, reject) => {
                        mailjs.on("arrive", async (msg) => {
                            try {
                                logger(`消息 ID: ${msg.id} 已到达。`);
                                const fullMessage = await mailjs.getMessage(msg.id);
                                const messageText = fullMessage.data.text;

                             
                                const regex = /Your verification code is:\s*(\d+)/;
                                const match = messageText.match(regex);

                                if (match) {
                                    resolve(match[1]);
                                    mailjs.off();
                                } else {
                                    reject(new Error("未找到验证码。"));
                                    mailjs.off();
                                }
                            } catch (err) {
                                reject(err);
                            }
                        });
                    });

                    logger(`验证码为：${otp}`);
                    await new Promise(resolve => setTimeout(resolve, 1000));

                 
                    const verifyMessage = await verify(email, otp);
                    logger("邮箱验证成功", "success");

                
                    const claimMessage = await claimBnb(accountHeaders);
                    logger("成功领取 0.01 BNB", "success");

                 
                    const randomHex = generateHex();
                    logger(`为账户创建扩展 ID 并初始化：${randomHex}`, "info");
                    const linkResponse = await init(randomHex, accountHeaders);

                    await fs.appendFile(
                        'token.txt',
                        `${loginData.access_token}|${loginData.refresh_token}\n`,
                        'utf-8'
                    );
                    logger('令牌已保存到 token.txt', "success");
                    await new Promise(resolve => setTimeout(resolve, 1000));

                  
                    logger(`启动扩展 ID：${randomHex}`);
                    const starting = await start(randomHex, accountHeaders);
                    if (starting) {
                        logger(`扩展 ID：${randomHex} 已激活`, "success");
                    }
                } else {
                    logger(`账户 #${i + 1} 创建失败，重试中...`, "error");
                    i--;
                }
                
            } catch (error) {
                logger(`账户 #${i + 1} 出现错误：${error.message}`, "error");
            }
            await new Promise(resolve => setTimeout(resolve, 3000));
        }
    } catch (error) {
        console.error("发生错误：", error);
    } finally {
        rl.close();
    }
}


manageMailAndRegister();
