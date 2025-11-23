# Attenda Seal 集成说明

## 概述

Attenda 现在已集成 Sui Seal 加密访问控制，用于保护门票的敏感元数据。参考了 `cotract-demo/move` 中的 `allowlist.move` 和 `subscription.move` 实现。

## 架构设计

### 核心模块：`attenda::ticket_seal`

新增的 `ticket_seal.move` 模块提供基于 Seal 的门票访问控制功能，主要包括：

1. **TicketPolicy** - 活动级别的访问策略
   - 每个活动创建一个 TicketPolicy
   - 管理该活动下所有门票的访问控制
   - 存储 `ticket_id -> holder_address` 映射

2. **PolicyCap** - 管理员权限凭证
   - 用于添加/移除持票人
   - 发布加密 Blob
   - 确保只有授权者可以管理策略

3. **Seal 访问控制** - 基于前缀匹配的加密 ID 验证
   - 加密 ID 格式：`[policy_id][ticket_id][nonce]`
   - 只有持票人可以解密对应门票的元数据

## 工作流程

### 1. 活动创建时
```move
// 创建活动的同时创建 TicketPolicy
let policy_cap = ticket_seal::create_policy(event_id, ctx);
// 将 PolicyCap 转移给活动组织者
transfer::transfer(policy_cap, organizer_address);
```

### 2. 门票铸造时
```move
// 铸造门票后，添加持票人到策略
ticket_seal::add_ticket_holder(
    policy, 
    cap, 
    ticket_id, 
    holder_address, 
    ctx
);
```

### 3. 前端加密流程
```javascript
// 1. 生成加密 ID
const policyId = '0x...'; // TicketPolicy 对象 ID
const ticketId = '0x...'; // 门票 ID
const nonce = crypto.getRandomValues(new Uint8Array(5));
const encryptionId = [policyId, ticketId, nonce].join('');

// 2. 使用 Seal 加密
const { encryptedObject } = await sealClient.encrypt({
    threshold: 2,
    packageId: SEAL_PACKAGE_ID,
    id: encryptionId,
    data: metadataBytes,
});

// 3. 上传到 Walrus
const { blobId } = await uploadToWalrus(encryptedObject);

// 4. 铸造门票时传入 blobId
```

### 4. 前端解密流程
```javascript
// 1. 从 Walrus 下载加密数据
const encryptedBlob = await downloadFromWalrus(blobId);

// 2. 创建 SessionKey
const sessionKey = new SessionKey(SEAL_PACKAGE_ID);

// 3. 构建访问控制交易
const tx = new Transaction();
tx.moveCall({
    target: `${PACKAGE_ID}::ticket_seal::seal_approve`,
    arguments: [
        tx.pure.vector('u8', Array.from(encryptionId)),
        tx.object(policyId),
    ],
});

// 4. 从密钥服务器获取解密密钥
await sealClient.fetchKeys({
    ids: [encryptionId],
    txBytes: await tx.build({ client: suiClient }),
    sessionKey,
    threshold: 2,
});

// 5. 解密数据
const decryptedData = await sealClient.decrypt({
    data: encryptedBytes,
    sessionKey,
    txBytes,
});
```

## 关键函数

### `create_policy(event_id, ctx)`
- 创建活动的访问策略
- 返回 PolicyCap 给活动组织者
- 发出 `TicketPolicyCreated` 事件

### `add_ticket_holder(policy, cap, ticket_id, holder, ctx)`
- 将持票人添加到策略
- 门票铸造时调用
- 发出 `TicketHolderAdded` 事件

### `remove_ticket_holder(policy, cap, ticket_id)`
- 移除持票人（门票转让时）
- 使用 `filter!` 宏移除

### `seal_approve(id, policy, ctx)`
- **核心访问控制函数**
- 客户端解密时调用
- 验证：
  1. 加密 ID 是否有正确的 policy_id 前缀
  2. 调用者是否是持票人
- 如果验证失败，抛出 `ENoAccess` 错误

### `publish_blob(policy, cap, ticket_id, blob_id, ctx)`
- 将 Walrus blob_id 关联到策略
- 发出 `TicketBlobPublished` 事件

## 与原有合约的集成

### 修改 `event_registry.move`
```move
// 创建活动时同时创建 TicketPolicy
public entry fun create_event(...) {
    // ... 原有逻辑 ...
    
    // 创建 Seal 策略
    let policy_cap = ticket_seal::create_policy(event_id, ctx);
    transfer::transfer(policy_cap, ctx.sender());
}
```

### 修改 `ticket_nft.move`
```move
public entry fun mint_ticket(
    event: &mut EventInfo,
    policy: &mut TicketPolicy,  // 新增
    cap: &PolicyCap,            // 新增
    to: address,
    ...
) {
    // ... 原有铸造逻辑 ...
    
    // 添加持票人到策略
    ticket_seal::add_ticket_holder(policy, cap, ticket_id, to, ctx);
}

public entry fun transfer_ticket(
    ticket: Ticket,
    policy: &mut TicketPolicy,  // 新增
    cap: &PolicyCap,            // 新增
    to: address,
    ...
) {
    // 更新策略中的持票人
    let ticket_id = object::uid_to_address(&ticket.id);
    ticket_seal::remove_ticket_holder(policy, cap, ticket_id);
    ticket_seal::add_ticket_holder(policy, cap, ticket_id, to, ctx);
    
    // ... 原有转移逻辑 ...
}
```

## 前端配置

### `seal.config.js` 需要配置
```javascript
// Attenda 合约包 ID
export const ATTENDA_PACKAGE_ID = '0x...';

// Seal 合约包 ID（需要部署或使用官方部署）
export const SEAL_PACKAGE_ID = '0x...';

// Seal 密钥服务器配置
export const SEAL_SERVER_CONFIGS = [
    { objectId: '0x...', weight: 1 },
    { objectId: '0x...', weight: 1 },
];

export const SEAL_CONFIG = {
    threshold: 2,
    verifyKeyServers: false,
    packageId: SEAL_PACKAGE_ID,
};
```

## 加密 ID 格式

```
[policy_id (32 bytes)][ticket_id (32 bytes)][nonce (5 bytes)]
总共 69 字节，hex 编码后 138 字符
```

- **policy_id**: TicketPolicy 对象的 ID，作为命名空间前缀
- **ticket_id**: 具体门票的 ID，用于区分同一活动的不同门票
- **nonce**: 随机数，确保每次加密都不同

## 事件

### TicketPolicyCreated
```move
{
    policy_id: ID,
    event_id: address,
    creator: address,
}
```

### TicketHolderAdded
```move
{
    policy_id: ID,
    ticket_id: address,
    holder: address,
    operator: address,
}
```

### TicketBlobPublished
```move
{
    policy_id: ID,
    ticket_id: address,
    blob_id: String,
    publisher: address,
}
```

## 安全考虑

1. **访问控制**
   - 只有持票人可以解密门票元数据
   - PolicyCap 确保只有授权者可以管理策略

2. **门票转让**
   - 转让时必须同步更新 TicketPolicy
   - 防止旧持票人继续访问

3. **前缀验证**
   - 通过 policy_id 前缀确保加密 ID 属于正确的策略
   - 防止跨活动访问

4. **阈值签名**
   - 需要至少 threshold 个密钥服务器同意才能解密
   - 防止单点故障

## 测试

```move
#[test]
fun test_ticket_policy() {
    let ctx = &mut tx_context::dummy();
    let event_id = @0x1;
    
    // 创建策略
    let cap = ticket_seal::create_policy(event_id, ctx);
    let policy = ticket_seal::new_policy_for_testing(event_id, ctx);
    
    // 添加持票人
    let ticket_id = @0x2;
    let holder = @0x3;
    ticket_seal::add_ticket_holder(&mut policy, &cap, ticket_id, holder, ctx);
    
    // 验证
    assert!(ticket_seal::is_ticket_holder(&policy, holder), 0);
    
    // 清理
    ticket_seal::destroy_for_testing(policy, cap);
}
```

## 部署步骤

1. **部署 Seal 合约**（如果测试网没有可用的）
```bash
cd cotract-demo/move
sui client publish --gas-budget 100000000
# 记录 Package ID
```

2. **部署 Attenda 合约**
```bash
cd contract
sui move build
sui client publish --gas-budget 100000000
```

3. **更新前端配置**
```bash
# 更新 .env
VITE_PACKAGE_ID=<Attenda Package ID>
VITE_SEAL_PACKAGE_ID=<Seal Package ID>
```

## 参考

- `cotract-demo/move/sources/allowlist.move` - Allowlist 访问控制模式
- `cotract-demo/move/sources/subscription.move` - Subscription 订阅模式
- `cotract-demo/move/sources/utils.move` - 辅助函数
- [Sui Seal 文档](https://docs.sui.io/guides/developer/cryptography/sealed-objects)
