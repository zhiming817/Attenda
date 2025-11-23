# 智能合约升级指南

## 修改说明

### 问题
原合约设计中，`record_attendance_with_verification` 函数的 `ticket` 参数是可变引用 (`&mut Ticket`)，这要求**只有票据的所有者才能签名交易**。但实际业务场景是：**活动组织者扫描参会者的二维码进行签到**，组织者并不拥有参会者的票据。

### 解决方案
1. **将 `ticket` 参数从 `&mut Ticket` 改为 `&Ticket`**（不可变引用）
2. **添加全局共享对象 `UsedTicketsRegistry`** 来记录已使用的票据
3. **在 `Attendance` 模块中检查和记录票据使用状态**

### 关键变更

#### 1. 新增 `UsedTicketsRegistry` 结构
```move
public struct UsedTicketsRegistry has key {
    id: UID,
    used_tickets: sui::table::Table<address, bool>,
}
```

#### 2. 修改函数签名
**之前**:
```move
public entry fun record_attendance_with_verification(
    event: &EventInfo,
    user: address,
    ticket: &mut Ticket,  // ← 可变引用，只有所有者能调用
    ...
)
```

**之后**:
```move
public entry fun record_attendance_with_verification(
    registry: &mut UsedTicketsRegistry,  // ← 新增：全局注册表
    event: &EventInfo,
    user: address,
    ticket: &Ticket,  // ← 改为不可变引用，组织者可以调用
    ...
)
```

## 部署步骤

### 1. 编译合约
```bash
cd contract
sui move build
```

### 2. 部署合约
```bash
sui client publish --gas-budget 100000000
```

**记录输出的**:
- Package ID: `0x...` (新的合约地址)
- UsedTicketsRegistry Object ID: `0x...` (在 Created Objects 中查找)

### 3. 更新前端配置

#### Flutter 端
文件: `frontend/mobile_flutter/lib/services/checkin_service.dart`

```dart
static const String packageId = 'YOUR_NEW_PACKAGE_ID';
static const String registryId = 'YOUR_REGISTRY_OBJECT_ID';
```

#### Web 端
文件: `frontend/web/.env`

```env
VITE_PACKAGE_ID=YOUR_NEW_PACKAGE_ID
VITE_REGISTRY_ID=YOUR_REGISTRY_OBJECT_ID
```

并更新 `frontend/web/src/pages/events/CheckInScanner.jsx`:

```javascript
const PACKAGE_ID = import.meta.env.VITE_PACKAGE_ID;
const REGISTRY_ID = import.meta.env.VITE_REGISTRY_ID;

// 在 handleCheckIn 中
tx.moveCall({
  target: `${PACKAGE_ID}::attendance::record_attendance_with_verification`,
  arguments: [
    tx.object(REGISTRY_ID),       // ← 新增：Registry 对象
    tx.object(eventId),
    tx.pure.address(ticketFields.owner),
    tx.object(qrData.ticketId),   // ← 现在是不可变引用
    tx.pure.vector('u8', Array.from(new TextEncoder().encode(qrData.verificationCode))),
    tx.pure.u8(1),
    tx.object('0x6'),
  ],
});
```

### 4. 验证部署

检查 `UsedTicketsRegistry` 对象:
```bash
sui client object YOUR_REGISTRY_OBJECT_ID
```

应该看到:
```
Owner: Shared
ObjectType: 0x...::attendance::UsedTicketsRegistry
```

## 测试步骤

### 1. 重新创建活动和门票
因为合约地址变了，需要重新创建活动和购买门票。

### 2. 测试签到流程
1. **组织者账户**登录移动端/Web端
2. 进入事件详情页
3. 点击 "Check-In" 按钮
4. 扫描**参会者的门票二维码**
5. ✅ 签到成功（现在组织者可以为任何人签到了！）

### 3. 验证防重复签到
再次扫描同一张票的二维码，应该报错：
```
ERR_TICKET_ALREADY_USED (3005)
```

## 兼容性说明

### ⚠️ 不兼容变更
- **旧合约部署的活动和门票无法使用新合约签到**
- **需要重新部署并创建新的活动和门票**

### ✅ 新特性
- 组织者可以为任何参会者签到（无需参会者账户）
- 全局防重复签到（跨所有活动）
- 更符合实际业务场景

## 回滚方案

如果需要回滚到旧版本:
1. 找到之前的 Package ID
2. 更新前端配置中的 `packageId`
3. **注意**: 旧版本仍然有所有权限制问题

## 技术细节

### 为什么不继续使用 `ticket_nft::mark_used`？
- `mark_used` 需要 `&mut Ticket`，这会带回所有权问题
- 新方案使用全局共享表，任何有权限的人都可以查询和更新

### Gas 成本影响
- 新增了对全局 Table 的读写操作
- 预计 gas 成本增加约 10-15%
- 但解决了核心业务问题，值得权衡

### 安全考虑
- 只有活动组织者可以调用签到函数（合约内有检查）
- Registry 是共享对象，但修改受函数权限控制
- 票据一旦标记为已使用，无法重置（防止作弊）

## 常见问题

### Q: 为什么不直接修改 Ticket 对象的状态？
A: Sui 的所有权模型不允许非所有者修改对象的可变状态。

### Q: 会不会有并发问题？
A: 不会。Sui 的共享对象有内置的并发控制机制。

### Q: 旧的票据数据会丢失吗？
A: 是的，旧合约的数据不会迁移。这是一次完整的重新部署。

### Q: 能否保留旧合约的同时部署新合约？
A: 可以，但建议停用旧合约，避免用户混淆。

## 后续优化建议

1. **分活动的 Registry**: 为每个活动创建独立的 Registry，减少 gas 成本
2. **批量签到**: 支持一次交易签到多个参会者
3. **签到时间窗口**: 在合约中加入签到时间限制
4. **撤销签到**: 为组织者提供撤销错误签到的功能

## 联系支持

如有问题，请查看:
- 合约源码: `contract/sources/attendance.move`
- 测试文件: `contract/tests/attendance_tests.move`
- 技术文档: `docs/contract/`
