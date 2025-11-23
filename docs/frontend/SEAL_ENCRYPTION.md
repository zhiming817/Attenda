# Seal 加密门票实现

## 概述

Attenda 使用 **Sui Seal** 技术对门票元数据进行端到端加密，确保敏感信息（活动地点、二维码、访问链接）只有门票持有者才能访问。

## 架构

```
用户购买门票
    ↓
1. 生成门票元数据（包含敏感信息）
    ↓
2. 使用 Seal 加密元数据
    ↓
3. 上传加密数据到 Walrus
    ↓
4. 铸造 NFT（存储 Walrus Blob ID）
    ↓
用户查看门票
    ↓
5. 从 Walrus 下载加密数据
    ↓
6. 使用 Seal 解密（验证所有权）
    ↓
7. 显示完整门票信息
```

## 门票元数据结构

### 公开信息（存储在 NFT）
- 门票名称
- 活动 ID
- 门票类型
- 铸造时间
- Walrus Blob ID

### 加密信息（Seal 加密后存储在 Walrus）
```json
{
  "location": "活动地点",
  "qrCode": "base64 编码的二维码图片",
  "accessLink": "https://attenda.app/events/{eventId}/access",
  "verificationCode": "随机验证码",
  "startTime": "2025-11-22T10:00:00Z",
  "secretNote": "加密备注"
}
```

## 实现细节

### 1. 加密流程 (ticketEncryption.js)

```javascript
// 生成门票元数据
const ticketMetadata = {
  eventId,
  ticketId,
  holder: userAddress,
  encryptedData: {
    location: "Event Venue",
    qrCode: generateQRCode(...),
    accessLink: "...",
    verificationCode: "ABC123"
  }
};

// 使用 Seal 加密
const encrypted = await sealClient.encrypt({
  threshold: 2,  // 需要 2 个密钥服务器
  packageId: SEAL_PACKAGE_ID,
  id: encryptionId,
  data: JSON.stringify(ticketMetadata)
});

// 上传到 Walrus
const { blobId } = await uploadToWalrus(encrypted);
```

### 2. 铸造 NFT (EventDetail.jsx)

```javascript
// 创建加密元数据
const encryptedData = await createEncryptedTicketMetadata({
  eventId,
  ticketId,
  location: "Venue Address",
  holderAddress: currentAccount.address
});

// 铸造门票 NFT
tx.moveCall({
  target: `${PACKAGE_ID}::ticket_nft::mint_ticket`,
  arguments: [
    tx.object(eventId),
    tx.pure.address(holderAddress),
    tx.pure.vector('u8', Array.from(new TextEncoder().encode(encryptedData.blobId))),
    tx.pure.vector('u8', encryptedData.metadataHash),
    // ... 其他参数
  ]
});
```

### 3. 解密流程 (TicketDetail.jsx)

```javascript
// 创建会话密钥
const sessionKey = SessionKey.generate();

// 从 Walrus 下载并解密
const decryptedData = await decryptTicketMetadata(
  walrusBlobId,
  sessionKey,
  holderAddress
);

// 显示敏感信息
console.log('Location:', decryptedData.encryptedData.location);
console.log('QR Code:', decryptedData.encryptedData.qrCode);
```

## 安全特性

### ✅ 端到端加密
- 敏感数据在客户端加密
- 只有密钥持有者可以解密
- Walrus 存储的是加密数据

### ✅ 访问控制
- 基于 Sui 链上 NFT 所有权
- 只有门票持有者可以解密
- 支持门票转移后访问权限自动转移

### ✅ 去中心化存储
- 加密数据存储在 Walrus
- 永久存储，不会丢失
- 无需中心化服务器

### ✅ 防篡改
- 元数据哈希存储在链上
- 任何修改都会被检测到
- 保证数据完整性

## 使用流程

### 购买门票
1. 用户连接钱包
2. 点击"Get Ticket"
3. 系统生成包含二维码的加密元数据
4. 上传到 Walrus
5. 铸造 NFT 门票

### 查看门票
1. 访问 `/tickets/{ticketId}`
2. 系统验证 NFT 所有权
3. 点击"Decrypt & View Ticket"
4. 显示完整门票信息（地点、二维码、验证码）

### 入场验证
1. 工作人员扫描 QR 码
2. 验证门票 ID 和验证码
3. 标记门票已使用

## 环境配置

在 `.env` 文件中配置：

```env
# Seal 合约包 ID
VITE_PACKAGE_ID=0x...

# Walrus 配置
VITE_WALRUS_AGGREGATOR=https://aggregator.walrus-testnet.walrus.space
VITE_WALRUS_PUBLISHER=https://publisher.walrus-testnet.walrus.space

# 门票图片 URL
VITE_WALRUS_TICKET_IMG_URL=https://aggregator.walrus-testnet.walrus.space/v1/blobs/...
VITE_WALRUS_EVENT_IMG_URL=https://aggregator.walrus-testnet.walrus.space/v1/blobs/...
```

## 依赖项

```json
{
  "@mysten/seal": "^latest",
  "@mysten/walrus": "^latest",
  "@mysten/sui": "^latest",
  "qrcode": "^1.5.3"
}
```

## 文件结构

```
src/
├── utils/
│   ├── ticketEncryption.js   # 门票加密/解密核心逻辑
│   ├── sealClient.js          # Seal 客户端封装
│   └── walrus.js              # Walrus 存储封装
├── pages/
│   ├── events/
│   │   └── EventDetail.jsx    # 购买门票页面
│   └── tickets/
│       └── TicketDetail.jsx   # 查看门票页面
└── config/
    └── seal.config.js         # Seal 配置
```

## 测试

### 本地测试
```bash
cd frontend/web
pnpm install
pnpm dev
```

### 购买测试门票
1. 访问 http://localhost:5173
2. 连接测试网钱包
3. 创建活动
4. 购买门票
5. 查看"My Tickets"

### 解密测试
1. 点击门票进入详情页
2. 点击"Decrypt & View Ticket"
3. 验证显示的敏感信息

## 故障排除

### 加密失败
- 检查 Seal 服务器配置
- 确认 threshold 设置正确
- 查看浏览器控制台错误

### 上传失败
- 检查 Walrus 网络连接
- 确认 VITE_WALRUS_PUBLISHER 配置
- 检查文件大小限制

### 解密失败
- 验证 NFT 所有权
- 检查会话密钥生成
- 确认 Blob ID 正确

## 参考资料

- [Sui Seal 文档](https://docs.sui.io/guides/seal)
- [Walrus 文档](https://docs.walrus.site)
- [QRCode.js](https://github.com/soldair/node-qrcode)
