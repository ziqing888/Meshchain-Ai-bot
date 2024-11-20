# MESHCHAIN 网络

**MeshChain** 是一个去中心化网络，旨在为 AI 工作负载提供经济且可扩展的计算能力。它解决了 AI 资源的高成本和有限访问问题，使每个人都能够轻松地贡献并受益于 AI 的力量。

- [https://app.meshchain.ai/](https://app.meshchain.ai?ref=XW37QRUE51P7)



---

## MeshChain 自动化脚本

本仓库包含一组自动化脚本，用于在 MeshChain 上完成以下任务：
-支持多账户操作。
-自动注册新账户。
-使用 OTP 验证邮箱。
-领取 BNB 奖励。
-初始化并链接独特节点。


---

## 环境要求

1. **Node.js 版本：**
   - 需要 Node.js 16 及以上版本。

2. **依赖安装：**
   - 使用 `npm install` 安装所需依赖。

3. **邮箱要求：**
   - 每个账户需要一个新的邮箱（用于邮箱验证和领取奖励）。

4. **账户与节点限制：**
   - 每个账户只能链接一个节点。如果需要大量挖矿，请创建多个账户。

---

## 文件说明

1. **自动生成文件：**
   - 使用脚本注册账户后，系统会自动生成以下文件：
     - **`token.txt`**：存储账户的令牌，每行一个账户，格式为 `access_token|refresh_token`。
     - **`unique_id.txt`**：存储每个账户对应的节点唯一 ID，每行一个账户。

2. **手动创建文件（如果账户已存在）：**
   - 如果你已有账户，可以手动创建文件：
     - **`token.txt` 示例：**
       ```
       abc123def456|xyz789ghi012
     
       ```
     - **`unique_id.txt` 示例：**
       ```
       unique_id_1
  
       ```

---

## 使用方法

### 1. 克隆仓库
将代码克隆到本地：
```bash
git clone https://github.com/ziqing888/Meshchain-Ai-bot.git
cd Meshchain-Ai-bot
```
### 2安装依赖
运行以下命令安装项目所需的依赖
```
npm install
```
### 3注册账户
运行以下命令启动注册脚本，按提示完成账户注册：
```
npm run register
```
输入姓名、邮箱和密码，脚本会自动保存令牌到 token.txt，并将唯一 ID 保存到 unique_id.txt。
### 4启动脚本
运行以下命令启动主脚本，完成奖励领取和挖矿任务
```
npm run start
```
## 附加功能
使用临时邮箱自动注册和验证
通过临时邮箱自动完成账户注册和验证：
```
npm run autoreg
```
![image](https://github.com/user-attachments/assets/f6c43c52-8b00-4330-8c1c-a6260c9d335d)
