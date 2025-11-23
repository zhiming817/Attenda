# Seal 集成完成摘要

## ✅ 已完成的修改

### 1. 新增模块：`ticket_seal.move`
创建了完整的 Seal 访问控制模块，包括：
- ✅ `TicketPolicy` - 活动级别的访问策略（共享对象）
- ✅ `PolicyCap` - 管理员权限凭证（有 store ability，可转移）
- ✅ `seal_approve()` - Seal 解密验证入口
- ✅ `add_ticket_holder()` / `remove_ticket_holder()` - 持票人管理
- ✅ `create_policy()` - 创建策略并返回 Cap
- ✅ `get_policy_id()` - 获取策略 ID

### 2. 修改：`event_registry.move`
```move
// 导入 ticket_seal 模块
use attenda::ticket_seal;

// EventInfo 新增字段
public struct EventInfo has key, store {
    // ... 原有字段 ...
    policy_id: ID,  // 新增：Seal 访问策略 ID
}

// create_event 修改
public entry fun create_event(...) {
    // 创建 UID
    let uid = object::new(ctx);
    let event_id = object::uid_to_address(&uid);
    
    // 创建 Seal 策略
    let policy_cap = ticket_seal::create_policy(event_id, ctx);
    let policy_id = ticket_seal::get_policy_id(&policy_cap);
    
    // 创建 EventInfo（包含 policy_id）
    let event_info = EventInfo { 
        id: uid,
        // ...
        policy_id,
    };
    
    // 转移 PolicyCap 给组织者
    transfer::public_transfer(policy_cap, organizer);
    transfer::share_object(event_info);
}

// 新增访问器
public fun get_policy_id(event: &EventInfo): ID {
    event.policy_id
}
```

### 3. 修改：`ticket_nft.move`
```move
// 导入 ticket_seal
use attenda::ticket_seal::{Self, TicketPolicy, PolicyCap};

// mint_ticket 新增参数
public entry fun mint_ticket(
    event: &mut EventInfo,
    policy: &mut TicketPolicy,  // 新增：Seal 策略
    cap: &PolicyCap,            // 新增：策略管理权限
    to: address,
    // ... 其他参数 ...
) {
    // ... 原有铸造逻辑 ...
    
    let ticket_id = sui::object::uid_to_address(&ticket.id);
    
    // 添加持票人到 Seal 策略
    ticket_seal::add_ticket_holder(policy, cap, ticket_id, to, ctx);
    
    // ... 发出事件和转移 ...
}

// transfer_ticket 新增参数
public entry fun transfer_ticket(
    ticket: Ticket,
    policy: &mut TicketPolicy,  // 新增
    cap: &PolicyCap,            // 新增
    to: address,
    ctx: &mut TxContext
) {
    // ... 验证逻辑 ...
    
    let ticket_id = sui::object::uid_to_address(&ticket.id);
    
    // 更新 Seal 访问控制
    ticket_seal::remove_ticket_holder(policy, cap, ticket_id);
    ticket_seal::add_ticket_holder(policy, cap, ticket_id, to, ctx);
    
    // ... 发出事件和转移 ...
}
```

## 📋 合约调用示例

### 创建活动
```bash
sui client call \
  --package $PACKAGE_ID \
  --module event_registry \
  --function create_event \
  --args "walrus://blob-id" 100 $CLOCK \
  --gas-budget 10000000
```
**返回**：
- EventInfo（共享对象）
- TicketPolicy（共享对象）
- PolicyCap（转移给组织者）

### 铸造门票
```bash
sui client call \
  --package $PACKAGE_ID \
  --module ticket_nft \
  --function mint_ticket \
  --args \
    $EVENT_ID \
    $POLICY_ID \
    $POLICY_CAP \
    $RECIPIENT \
    "walrus://ticket-blob" \
    "0x1234..." \
    0 \
    "Ticket Name" \
    "Description" \
    "https://image.url" \
    $CLOCK \
  --gas-budget 10000000
```
**前置条件**：
- 需要持有 PolicyCap
- Event 必须是 active 状态
- Recipient 未注册过该活动

### 转移门票
```bash
sui client call \
  --package $PACKAGE_ID \
  --module ticket_nft \
  --function transfer_ticket \
  --args \
    $TICKET_ID \
    $POLICY_ID \
    $POLICY_CAP \
    $NEW_OWNER \
  --gas-budget 10000000
```
**前置条件**：
- 需要持有 PolicyCap
- 调用者是门票当前持有者
- 门票状态为 VALID

## 🔐 前端集成变化

### 创建活动后
```javascript
// 创建活动的交易结果
const result = await signAndExecuteTransaction({ transaction: createEventTx });

// 需要保存的对象
const objects = result.objectChanges;
const eventInfo = objects.find(o => o.objectType.includes('EventInfo'));
const ticketPolicy = objects.find(o => o.objectType.includes('TicketPolicy'));
const policyCap = objects.find(o => o.objectType.includes('PolicyCap'));

// 保存到状态或数据库
saveEventData({
  eventId: eventInfo.objectId,
  policyId: ticketPolicy.objectId,
  policyCapId: policyCap.objectId, // 组织者持有
});
```

### 铸造门票
```javascript
const tx = new Transaction();

// 1. 加密门票元数据
const policyId = event.policy_id; // 从 EventInfo 读取
const ticketId = generateTicketId();
const encryptionId = `${policyId}${ticketId}${nonce}`;

const { encryptedObject } = await sealClient.encrypt({
  threshold: 2,
  packageId: SEAL_PACKAGE_ID,
  id: encryptionId,
  data: metadataBytes,
});

// 2. 上传到 Walrus
const { blobId } = await uploadToWalrus(encryptedObject);

// 3. 调用 mint_ticket
tx.moveCall({
  target: `${PACKAGE_ID}::ticket_nft::mint_ticket`,
  arguments: [
    tx.object(eventId),
    tx.object(policyId),      // 需要 TicketPolicy 对象
    tx.object(policyCapId),   // 需要持有 PolicyCap
    tx.pure.address(recipient),
    tx.pure.string(blobId),
    tx.pure.vector('u8', metadataHash),
    // ... 其他参数
  ],
});
```

### 解密门票
```javascript
// 1. 获取 policy_id（从 EventInfo 或 NFT 数据）
const policyId = ticket.event.policy_id;

// 2. 创建 SessionKey
const sessionKey = new SessionKey(SEAL_PACKAGE_ID);

// 3. 构建访问控制交易
const tx = new Transaction();
tx.moveCall({
  target: `${PACKAGE_ID}::ticket_seal::seal_approve`,
  arguments: [
    tx.pure.vector('u8', Array.from(fromHex(encryptionId))),
    tx.object(policyId),  // TicketPolicy 对象
  ],
});

// 4. 获取解密密钥
const txBytes = await tx.build({ client: suiClient, onlyTransactionKind: true });
await sealClient.fetchKeys({
  ids: [encryptionId],
  txBytes,
  sessionKey,
  threshold: 2,
});

// 5. 解密
const decryptedData = await sealClient.decrypt({
  data: encryptedBytes,
  sessionKey,
  txBytes,
});
```

## ⚠️ 重要说明

### PolicyCap 权限管理
- **PolicyCap** 由活动组织者持有
- 铸造门票和转移门票都需要 PolicyCap
- 建议：组织者可以创建后端服务持有 PolicyCap，前端通过 API 调用

### 门票转移流程
1. 持票人发起转移请求
2. 需要组织者（或其授权服务）提供 PolicyCap 签名
3. 合约更新 TicketPolicy 中的持票人映射
4. 转移 Ticket NFT 到新持有者

### 对象依赖关系
```
EventInfo (shared)
  ├── policy_id → TicketPolicy (shared)
  └── PolicyCap (owned by organizer)
       └── policy_id → TicketPolicy

Ticket (owned)
  ├── event_id → EventInfo
  └── ticket_id → TicketPolicy.tickets[i]
```

## 🚀 下一步

1. **部署合约**
   ```bash
   cd contract
   sui client publish --gas-budget 100000000
   ```

2. **获取/部署 Seal Package**
   - 使用官方测试网 Seal Package
   - 或自己部署 cotract-demo/move

3. **更新前端配置**
   ```javascript
   // .env
   VITE_PACKAGE_ID=<新部署的 Attenda Package ID>
   VITE_SEAL_PACKAGE_ID=<Seal Package ID>
   ```

4. **更新前端代码**
   - 修改创建活动页面：保存 PolicyCap
   - 修改铸造门票：传入 policy 和 cap 参数
   - 修改转移门票：传入 policy 和 cap 参数
   - 实现 Seal 解密逻辑

5. **测试流程**
   - 创建活动 → 验证 PolicyCap 转移
   - 铸造门票 → 验证持票人添加
   - 解密门票 → 验证访问控制
   - 转移门票 → 验证持票人更新

## 📚 参考文档

- `/docs/contract/SEAL_INTEGRATION.md` - 详细的 Seal 集成文档
- `/contract/sources/ticket_seal.move` - Seal 模块源码
- `/cotract-demo/move/sources/allowlist.move` - 参考实现
