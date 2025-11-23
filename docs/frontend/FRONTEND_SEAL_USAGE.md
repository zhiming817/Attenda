# 前端 Seal 访问控制使用指南

## ✅ 已完成的更新

### 1. 配置文件更新 (`seal.config.js`)

```javascript
// 分离了 Attenda 和 Seal Package ID
export const ATTENDA_PACKAGE_ID = '0x2422d12c4da1bc9e216abc4444cd54ed9ae457b4187c035e0b3606c70cb36800';
export const SEAL_PACKAGE_ID = ATTENDA_PACKAGE_ID; // 使用 Attenda 自带的 ticket_seal

// 更新模块名称
export const TICKET_SEAL_MODULE_NAME = 'ticket_seal';

// getSealTarget 现在指向 ticket_seal 模块
export function getSealTarget(functionName) {
  return `${ATTENDA_PACKAGE_ID}::${TICKET_SEAL_MODULE_NAME}::${functionName}`;
}
```

### 2. 创建活动流程 (`CreateEvent.jsx`)

**更新内容：**
- ✅ 创建活动后提取并显示 `PolicyCap` ID
- ✅ 提示用户保存 PolicyCap ID（铸造门票时需要）

**创建活动时的对象：**
```javascript
// 创建活动会生成 3 个对象：
1. EventInfo (shared) - 活动信息
2. TicketPolicy (shared) - Seal 访问策略
3. PolicyCap (owned) - 策略管理权限，转移给活动组织者
```

**用户体验：**
```
创建活动成功后会弹窗显示：
✅ Event created successfully! 🎉

⚠️ Important: Save your PolicyCap ID:
0x1234567890abcdef...

You will need this to mint tickets.
```

### 3. 购买门票流程 (`EventDetail.jsx`)

**更新内容：**
- ✅ 从 EventInfo 读取 `policy_id` 字段
- ✅ 提示用户输入 `PolicyCap` ID
- ✅ 调用 `mint_ticket` 时传入 `policy` 和 `cap` 参数

**铸造门票参数：**
```javascript
tx.moveCall({
  target: `${PACKAGE_ID}::ticket_nft::mint_ticket`,
  arguments: [
    tx.object(eventId),      // event: &mut EventInfo
    tx.object(policyId),     // policy: &mut TicketPolicy (从 event.policy_id 获取)
    tx.object(policyCapId),  // cap: &PolicyCap (用户输入或存储)
    tx.pure.address(to),     // to: address
    // ... 其他参数
  ],
});
```

## 📋 完整工作流程

### 第一步：创建活动

1. **组织者操作**：
   ```bash
   访问 /events/create
   填写活动信息
   点击 "Create Event"
   ```

2. **系统行为**：
   ```javascript
   // 调用合约
   create_event(walrus_blob_id, capacity, clock)
   
   // 返回对象
   - EventInfo (shared object) → eventId
   - TicketPolicy (shared object) → policyId  
   - PolicyCap (owned by organizer) → policyCapId ✨
   ```

3. **重要提示**：
   ```
   ⚠️ 组织者必须保存 PolicyCap ID！
   
   建议：
   - 复制 PolicyCap ID 到安全的地方
   - 或者保存到数据库中
   - 铸造门票和转移门票都需要它
   ```

### 第二步：查看活动详情

1. **系统读取 EventInfo**：
   ```javascript
   const event = {
     id: eventId,
     organizer: fields.organizer,
     policyId: fields.policy_id, // ✨ 新增：Seal 策略 ID
     // ... 其他字段
   };
   ```

2. **显示活动信息**：
   - 活动名称、描述、地点、时间
   - 容量和已售票数
   - 购买按钮（如果活动 active）

### 第三步：购买门票

1. **用户点击购买**：
   ```javascript
   handlePurchaseTicket()
   ```

2. **系统加密元数据**：
   ```javascript
   // 生成 QR 码
   const qrCode = await generateQRCode({
     ticketId,
     eventId,
     holder: userAddress,
     timestamp: Date.now(),
   });
   
   // 准备敏感数据
   const sensitiveData = {
     location: "活动地点",
     qrCode: qrCodeBase64,
     verificationCode: "ABC12345",
     accessLink: "https://...",
   };
   
   // 使用 Seal 加密
   const policyId = event.policyId; // 从 EventInfo 获取
   const encryptionId = `${policyId}${ticketId}${nonce}`;
   const encrypted = await sealClient.encrypt({
     threshold: 2,
     packageId: SEAL_PACKAGE_ID,
     id: encryptionId,
     data: sensitiveDataBytes,
   });
   
   // 上传到 Walrus
   const { blobId } = await uploadToWalrus(encrypted);
   ```

3. **系统提示输入 PolicyCap**：
   ```javascript
   // 方式 1: 弹窗输入
   const policyCapId = prompt('请输入 PolicyCap ID:');
   
   // 方式 2: 从数据库获取（推荐）
   const policyCapId = await fetchPolicyCapFromDB(eventId);
   ```

4. **调用合约铸造**：
   ```javascript
   tx.moveCall({
     target: `${PACKAGE_ID}::ticket_nft::mint_ticket`,
     arguments: [
       tx.object(eventId),
       tx.object(event.policyId),    // TicketPolicy
       tx.object(policyCapId),        // PolicyCap ✨
       tx.pure.address(buyer),
       tx.pure.vector('u8', blobIdBytes),
       // ... 其他参数
     ],
   });
   ```

5. **合约执行**：
   ```move
   // ticket_nft.move
   public entry fun mint_ticket(
       event: &mut EventInfo,
       policy: &mut TicketPolicy,  // Seal 策略
       cap: &PolicyCap,            // 验证权限
       to: address,
       // ...
   ) {
       // 铸造门票
       let ticket = Ticket { ... };
       
       // 添加持票人到 Seal 策略
       ticket_seal::add_ticket_holder(policy, cap, ticket_id, to, ctx);
       
       // 转移门票
       transfer::public_transfer(ticket, to);
   }
   ```

### 第四步：解密门票（查看详情）

1. **用户访问门票详情页**：
   ```javascript
   // /tickets/:ticketId
   ```

2. **点击解密按钮**：
   ```javascript
   handleDecrypt()
   ```

3. **系统解密流程**：
   ```javascript
   // 创建 SessionKey
   const sessionKey = new SessionKey(SEAL_PACKAGE_ID);
   
   // 下载加密数据
   const encryptedBlob = await downloadFromWalrus(blobId);
   
   // 构建访问控制交易
   const tx = new Transaction();
   tx.moveCall({
     target: `${PACKAGE_ID}::ticket_seal::seal_approve`,
     arguments: [
       tx.pure.vector('u8', Array.from(fromHex(encryptionId))),
       tx.object(policyId), // 从 event.policy_id 获取
     ],
   });
   
   // 获取解密密钥
   const txBytes = await tx.build({ client: suiClient });
   await sealClient.fetchKeys({
     ids: [encryptionId],
     txBytes,
     sessionKey,
     threshold: 2,
   });
   
   // 解密
   const decryptedData = await sealClient.decrypt({
     data: encryptedBytes,
     sessionKey,
     txBytes,
   });
   ```

4. **显示解密后的内容**：
   - 活动地点
   - QR 码图片
   - 验证码
   - 访问链接

## ⚠️ 当前限制和待改进

### 1. PolicyCap 管理

**当前方式：**
- 用户手动输入 PolicyCap ID ❌

**改进方案：**
```javascript
// 方案 A: 本地存储（简单但不安全）
localStorage.setItem(`policyCap_${eventId}`, policyCapId);

// 方案 B: 后端数据库（推荐）
await api.saveEventPolicyCap(eventId, policyCapId);

// 方案 C: 多签钱包（最安全）
// 使用 Sui 的多签功能，多个管理员共同管理 PolicyCap
```

### 2. 门票转移功能

**需要实现：**
```javascript
// transfer_ticket 也需要 PolicyCap
public entry fun transfer_ticket(
    ticket: Ticket,
    policy: &mut TicketPolicy,
    cap: &PolicyCap,  // 需要
    to: address,
    ctx: &mut TxContext
)
```

**实现建议：**
- 只允许组织者或授权方转移门票
- 用户发起转移请求，组织者审批并执行

### 3. Seal 密钥服务器

**当前配置：**
```javascript
export const SEAL_SERVER_CONFIGS = [
  { objectId: '0x73d05d62...', weight: 1 },
  { objectId: '0xf5d14a81...', weight: 1 },
];
```

**说明：**
- 这些是测试网的密钥服务器
- 主网部署时需要更新
- 或者部署自己的密钥服务器

## 🔧 故障排查

### 问题 1：铸造门票失败

**错误信息：**
```
Error: Invalid PolicyCap
```

**解决方案：**
1. 检查 PolicyCap ID 是否正确
2. 确认 PolicyCap 由活动组织者持有
3. 验证 PolicyCap 对应的 policy_id 与 EventInfo 中的一致

### 问题 2：解密失败

**错误信息：**
```
NoAccessError: No access to decrypt
```

**解决方案：**
1. 确认用户是门票持有者
2. 检查 policy_id 是否正确
3. 验证 Seal 密钥服务器配置

### 问题 3：PolicyCap 丢失

**解决方案：**
```bash
# 查询组织者持有的所有 PolicyCap
sui client objects --owner <ORGANIZER_ADDRESS> | grep PolicyCap

# 或通过 sui client call 查询
sui client call \
  --package $PACKAGE_ID \
  --module ticket_seal \
  --function get_policy_id \
  --args $POLICY_CAP_ID
```

## 📝 下一步计划

1. **实现 PolicyCap 管理系统**
   - [ ] 创建后端 API 保存 PolicyCap
   - [ ] 前端自动查询和使用 PolicyCap
   - [ ] 支持多个管理员

2. **完善门票转移功能**
   - [ ] 实现转移请求和审批流程
   - [ ] 更新 Seal 访问控制
   - [ ] 测试转移后的解密

3. **优化用户体验**
   - [ ] 自动保存 PolicyCap ID
   - [ ] 隐藏技术细节
   - [ ] 添加更好的错误提示

4. **安全加固**
   - [ ] 部署自己的 Seal 密钥服务器
   - [ ] 实现多签 PolicyCap 管理
   - [ ] 添加访问日志和审计

## 📚 参考文档

- `/docs/contract/SEAL_INTEGRATION.md` - 合约 Seal 集成详细文档
- `/docs/contract/SEAL_INTEGRATION_CHANGES.md` - 合约修改摘要
- `/contract/sources/ticket_seal.move` - Seal 模块源码
- [Sui Seal 文档](https://docs.sui.io/guides/developer/cryptography/sealed-objects)
