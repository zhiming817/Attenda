# Attenda - 智能合约

基于 Sui Move 的去中心化活动与票务平台智能合约。

## 项目结构

```
contract/
├── Move.toml                  # Move 项目配置
├── sources/                   # 合约源代码
│   ├── event_registry.move    # 活动注册与管理
│   ├── ticket_nft.move        # 门票 NFT
│   ├── attendance.move        # 出席记录
│   └── access_control.move    # 权限控制
└── tests/                     # 单元测试
    └── event_registry_tests.move
```

## 模块说明

### 1. EventRegistry（活动注册）
- **职责**: 管理活动索引、状态与组织者权限
- **主要功能**:
  - `create_event`: 创建活动
  - `update_event`: 更新活动信息
  - `set_status`: 设置活动状态（active/paused/closed/cancelled）
  - `increment_tickets_sold`: 增加已售票数

### 2. TicketNFT（门票 NFT）
- **职责**: 门票铸造、转移与状态管理
- **主要功能**:
  - `mint_ticket`: 铸造门票 NFT
  - `transfer_ticket`: 转移门票
  - `revoke_ticket`: 撤销门票
  - `mark_used`: 标记门票已用

### 3. Attendance（出席记录）
- **职责**: 出席验证与 Attendance NFT 铸造
- **主要功能**:
  - `record_attendance`: 记录出席（需要门票）
  - `record_attendance_without_ticket`: 无门票出席记录
  - `make_soulbound`: 将出席记录转为 Soulbound NFT

### 4. AccessControl（权限控制）
- **职责**: 管理管理员与验证者角色
- **主要功能**:
  - `grant_role`: 授予角色
  - `revoke_role`: 撤销角色
  - `is_admin`: 检查管理员权限
  - `is_verifier`: 检查验证者权限

## 前置要求

- Sui CLI (`sui` 命令)
- Rust 工具链（用于编译 Move）

### 安装 Sui CLI

```bash
cargo install --locked --git https://github.com/MystenLabs/sui.git --branch testnet sui
```

## 编译合约

```bash
cd contract
sui move build
```

## 运行测试

```bash
sui move test
```

运行特定测试：
```bash
sui move test test_create_event
```

## 部署合约

### 1. 配置网络

查看当前网络配置：
```bash
sui client envs
```

切换到 testnet：
```bash
sui client switch --env testnet
```

### 2. 获取测试代币

```bash
sui client faucet
```

### 3. 部署合约

```bash
sui client publish --gas-budget 100000000
```

部署成功后会返回 Package ID，记录下来用于后续交互。

## 与合约交互

### 创建活动

```bash
sui client call \
  --package <PACKAGE_ID> \
  --module event_registry \
  --function create_event \
  --args "walrus://your-blob-id" 100 \
  --gas-budget 10000000
```

### 铸造门票

```bash
sui client call \
  --package <PACKAGE_ID> \
  --module ticket_nft \
  --function mint_ticket \
  --args <EVENT_OBJECT_ID> <RECIPIENT_ADDRESS> "walrus://ticket-blob" "0x1234" 0 \
  --gas-budget 10000000
```

### 记录出席

```bash
sui client call \
  --package <PACKAGE_ID> \
  --module attendance \
  --function record_attendance \
  --args <EVENT_ID> <USER_ADDRESS> <TICKET_OBJECT_ID> 0 \
  --gas-budget 10000000
```

## 数据模型

### EventInfo
- `organizer`: 组织者地址
- `walrus_blob_id`: Walrus 存储引用
- `capacity`: 活动容量
- `num_tickets_sold`: 已售票数
- `status`: 活动状态

### Ticket
- `event_id`: 关联活动 ID
- `owner`: 持票人地址
- `walrus_blob_ref`: 加密元数据引用
- `encrypted_meta_hash`: 加密哈希
- `ticket_type`: 票种
- `status`: 门票状态

### Attendance
- `event_id`: 关联活动 ID
- `user`: 出席用户地址
- `ticket_id`: 关联门票 ID（可选）
- `check_in_time`: 签到时间
- `verification_method`: 验证方式
- `is_soulbound`: 是否为 Soulbound NFT

## 事件

所有关键操作都会发出链上事件，便于链下同步与监听：

- `EventCreated`: 活动创建
- `EventUpdated`: 活动更新
- `EventStatusChanged`: 状态变更
- `TicketMinted`: 门票铸造
- `TicketTransferred`: 门票转移
- `TicketRevoked`: 门票撤销
- `TicketUsed`: 门票使用
- `AttendanceRecorded`: 出席记录
- `RoleGranted`: 角色授予
- `RoleRevoked`: 角色撤销

## 安全注意事项

1. **权限验证**: 所有管理操作都需要验证调用者权限
2. **状态检查**: 门票使用前需检查状态，防止重复使用
3. **容量限制**: 创建门票时检查活动容量
4. **幂等性**: 支付与铸票流程需要外部订单 ID 保证幂等
5. **加密数据**: 敏感元数据通过 Seal 加密后存储在 Walrus

## 开发路线图

- [x] 基础模块实现（EventRegistry, TicketNFT, Attendance, AccessControl）
- [x] 单元测试（EventRegistry）
- [ ] 完整单元测试覆盖
- [ ] 集成测试
- [ ] 审计与安全测试
- [ ] Mainnet 部署

## 贡献

欢迎提交 Issue 和 Pull Request！

## 许可证

MIT License

---

**维护者**: Attenda 合约团队  
**文档版本**: 1.0  
**最后更新**: 2025-01-19
