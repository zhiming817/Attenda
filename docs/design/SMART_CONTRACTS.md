# Attenda - 智能合约详细设计文档

版本：1.0

说明：
本文件为 Attenda 平台（基于 Sui）的智能合约子系统设计说明，包含模块划分、数据结构、函数签名（Move 风格伪码）、事件/错误定义、典型流（活动创建、铸票、转移控制、入场验证与出席铸造）、安全与审计要点、测试用例建议与部署注意事项。

---

## 设计原则（重申）

- 链上只保存最小可验证信息（索引、身份、状态、证明），私密或大体量数据存 Walrus（加密）。
- 合约应可组合、可审计、最小权限原则、并具备良好错误语义。
- 避免将敏感密钥/解密材料上链；Seal 加密与密钥交换在链下/客户端完成。

---

## 模块概览

1. EventRegistry（事件注册与管理）
2. TicketNFT（门票 NFT 管理与铸造）
3. Attendance（出席记录与 Attendance NFT）
4. AccessControl（组织者与管理员权限、审批逻辑）
5. Treasury（可选：支付相关的链上辅助处理/记录）
6. Utils（公用类型、错误码与事件）

每个模块为一个 Move 框架下的 Move package/module（Sui Move）。

---

## 公共类型与事件（Utils）

类型（概念）:
- type ChainEventId = vector<u8> // or string
- type ChainTokenId = vector<u8>
- type WalrusRef = vector<u8> // UTF-8 URI
- enum EventStatus { Active, Paused, Closed, Cancelled }
- enum TicketStatus { Valid, Used, Revoked, Transferred }

事件（示例）:
- event EventCreated(chain_event_id, organizer, walrus_ref)
- event TicketMinted(chain_ticket_id, event_id, owner)
- event TicketTransferred(chain_ticket_id, from, to)
- event TicketRevoked(chain_ticket_id, reason)
- event AttendanceRecorded(chain_attendance_id, event_id, user, ticket_id)

错误码（示例）:
- ERR_NOT_ORGANIZER
- ERR_EVENT_CLOSED
- ERR_TICKET_NOT_OWNED
- ERR_TICKET_INVALID
- ERR_ALREADY_CHECKED_IN
- ERR_NOT_APPROVED
- ERR_CAPACITY_FULL

---

## Module: EventRegistry

职责：记录活动索引（链上主索引），维护活动状态，管理活动与组织者的映射；对外提供查询与最小元数据（walrus_blob）。

关键存储：
- resource EventInfo {
    id: ChainEventId,
    organizer: address,
    walrus_blob_id: WalrusRef,
    capacity: u64,
    num_tickets_sold: u64,
    status: EventStatus,
    created_at: u64,
    updated_at: u64,
  }

主要函数签名（伪 Move）：
- public fun create_event(organizer: &signer, walrus_ref: WalrusRef, capacity: u64, ...) : ChainEventId
  - 检查 organizer 权限
  - 在链上创建 EventInfo 并 emit EventCreated

- public fun update_event(organizer: &signer, event_id: ChainEventId, updates: EventUpdate)
  - 只能由 organizer 修改
  - 修改后 emit EventUpdated

- public fun set_status(admin: &signer, event_id: ChainEventId, status: EventStatus)
  - admin 或 organizer 可暂停/关闭

- public fun get_event(event_id: ChainEventId): EventInfo

注意：EventInfo 尽量保持最小字段，不包含机密或大量描述（这些存 Walrus）。

---

## Module: TicketNFT

职责：门票 NFT 的铸造、转移策略（可选限制转售）、元数据关联 walrus_blob_ref、状态管理（used/revoked）。

关键存储：
- struct Ticket {
    id: ChainTokenId,
    event_id: ChainEventId,
    owner: address,
    walrus_blob_ref: WalrusRef,
    encrypted_meta_hash: vector<u8>,
    ticket_type: u8, // enum
    status: TicketStatus,
    created_at: u64,
  }

主要函数签名：
- public fun mint_ticket(issuer: &signer, to: address, event_id: ChainEventId, walrus_blob_ref: WalrusRef, encrypted_meta_hash: vector<u8>, ticket_type: u8) : ChainTokenId
  - 仅 organizer 或经授权的发行合约可调用
  - 更新 EventInfo.num_tickets_sold 并检测 capacity
  - emit TicketMinted

- public fun transfer_ticket(sender: &signer, to: address, ticket_id: ChainTokenId)
  - 若票种允许转让则允许；否则 revert with ERR_TICKET_INVALID
  - 更新 owner，emit TicketTransferred

- public fun revoke_ticket(admin: &signer, ticket_id: ChainTokenId, reason: vector<u8>)
  - 标记 status = Revoked，emit TicketRevoked

- public fun mark_used(checkin_system: &signer, ticket_id: ChainTokenId)
  - 标记 status = Used
  - 仅在入场验证成功后调用或由经过授权的门禁系统提交交易

- public fun get_ticket(ticket_id: ChainTokenId): Ticket

设计要点：
- 铸票行为必须与支付流程幂等绑定（外部订单/tx_id）以防重铸。
- walrus_blob_ref 指明 Seal 加密数据在 Walrus 的位置，解密在客户端完成。
- 尽量避免在合约中保存可解密信息。

---

## Module: Attendance

职责：出席记录与 Attendance NFT 的铸造（可选择 soulbound）。记录验证方法、时间戳与链上证明。

关键存储：
- struct Attendance {
    id: ChainTokenId,
    event_id: ChainEventId,
    user: address,
    ticket_id: Option<ChainTokenId>,
    check_in_time: u64,
    verification_method: u8, // enum: QR, WALLET_SIG, NFC
    minted: bool,
  }

主要函数签名：
- public fun record_attendance(verifier: &signer, user: address, ticket_id: Option<ChainTokenId>, event_id: ChainEventId, verification_method: u8) : ChainTokenId
  - 验证 verifier 有权限（例如门禁设备或组织者签名）
  - 检查 ticket 状态（若 ticket_id 提供），防止重复 check-in
  - 创建 Attendance 记录并 emit AttendanceRecorded

- public fun mint_attendance_nft(organizer: &signer, attendance_id: ChainTokenId, soulbound: bool)
  - 将 attendance 记录铸造为 NFT（若 soulbound，NFT 不可转移或在合约上实现约束）

- public fun get_attendance(attendance_id: ChainTokenId): Attendance

注意：为防止门禁滥用，record_attendance 可要求门禁设备提交可验证签名或使用后端 relayer 对入场凭证进行二次验证。

---

## Module: AccessControl

职责：管理组织者、管理员、门禁设备与合约间授权关系；支持审批流程（活动需要审批的票种）。

关键设计：
- 使用资源/角色管理（组织者资源、admin list、verifier list）
- 提供 `grant_role`, `revoke_role`, `is_admin`, `is_verifier` 等接口

示例函数：
- public fun grant_role(admin: &signer, role: Role, target: address)
- public fun revoke_role(admin: &signer, role: Role, target: address)

---

## Module: Treasury（可选）

职责：记录/托管与事件相关的链上资金（若需要），或仅作为支付事件哈希记录器。推荐：链上只记录最小必要信息（tx hash），实际支付由 off-chain 支付网关处理。

---

## 链下组件与合约交互说明

1. Walrus / Seal：
   - 合约仅保存 `walrus_blob_ref`。加密/解密与 Seal 密钥交换在客户端或受信任的后端 relayer 中完成。
2. 支付流程：
   - 后端负责与支付网关交互并在支付成功后调用合约 `mint_ticket`（或发出交易请求由客户端发起），需要保证 idempotency（外部 order_id 在链下记录）。
3. 门禁设备：
   - 门禁可作为 `verifier` 角色，提交 `record_attendance`。建议门禁先进行本地验证（QR、钱包签名），再由后端/relayer 在链上提交记录交易以降低出入口延迟。

---

## 典型交互流程（伪序列）

### 流 A：活动创建
1. 组织者通过 dApp 上传公开元数据到 Walrus，得到 `walrus_blob_id`。
2. dApp 调用 `EventRegistry.create_event(organizer, walrus_ref, capacity, ..)` 发起链上交易。
3. 链上创建 EventInfo 并 emit EventCreated。

### 流 B：购买与铸票
1. 用户在前端选择票种并发起支付（钱包签名或第三方支付）。
2. 支付网关回调后，后端确认并调用 `TicketNFT.mint_ticket(issuer, to, event_id, walrus_blob_ref, encrypted_meta_hash, ticket_type)` 或通知客户端提交铸票交易。
3. 铸票完成，emit TicketMinted，ticket metadata 包含 `walrus_blob_ref`。

### 流 C：入场验证与出席铸造
1. 用户出示 QR 或钱包凭证。
2. 门禁设备本地验证（验证 NFT 所有权、状态）。
3. 验证通过后，门禁设备或后端 relayer 调用 `Attendance.record_attendance(verifier, user, ticket_id, event_id, method)`。
4. 合约创建出席记录并 emit AttendanceRecorded；可触发 `mint_attendance_nft`（在链上铸造 Attendance NFT）。

---

## 权限与安全要点

- 组织者必须持有组织者角色或对 EventInfo 享有管理员权限。
- 门禁设备与后端 relayer 在链上作为 `verifier` 注册；需要审计并可撤销权限。
- 所有链上敏感操作（revoke, mark_used, mint_attendance_nft）应记录执行者与时间戳。
- 合约应进行溢出检查、状态检查与幂等性保护（外部 order id、tx id 防重复）。
- 推荐加入 pausability（暂停合约）功能以便紧急响应。

---

## Gas / 成本优化建议

- 合约避免存储重复字符串/大字段，使用引用/哈希。
- 将只读数据（非敏感）优先放 Walrus 并在链上保存最小索引/哈希。
- 批量操作（例如批量铸造）应在合约设计中支持，以减少多次 tx cost。

---

## 可升级性与迁移策略

- 使用代理模式或版本化存储（versioned resources）来支持未来合约升级。
- 迁移策略应包含事件迁移脚本，确保链上历史与新合约的数据一致性。

---

## 测试用例（建议）

1. Event 流程
   - 创建活动成功/失败（容量、权限、walrus_ref 格式）
   - 更新与变更状态（pause/close）

2. Ticket 流程
   - 铸造票（正常、超过 capacity、重复铸造幂等）
   - 转移票（允许/禁止）
   - 撤销/标记已用

3. Attendance 流程
   - 正常 check-in（未被使用的票）
   - 重复 check-in 被拒绝
   - 门禁非授权提交被拒绝

4. 安全测试
   - 非 organizer 调用 create_event/ mint_ticket 被拒绝
   - 权限撤销后不能再提交 verifier 操作

5. 集成测试
   - End-to-end: 从活动创建、上传 Walrus、用户购买、门禁验证到 attendance NFT 铸造

---

## 审计要点清单

- 检查所有外部输入（walrus_ref、ticket_type）长度限制与格式验证。
- 权限系统（grant/revoke）是否存在任意权限提升漏洞。
- 幂等性保证（支付-铸票流程）。
- 敏感数据是否被误写入链上（禁止明文地址、二维码等）。
- 事件日志（emit）是否足够用于链外审计。

---

## 部署与监控建议

- 在 dev/staging/prod 环境分阶段部署合约，使用不同地址与版本标注。
- 部署后运行完整集成测试并验证监听器（链上事件 -> 后端同步）功能。
- 监控：链上失败交易率、门禁失败率、铸票重试次数、合约调用错误码分布。

---

## 后续工作（可选）

- 生成 Move 语言的草稿合约实现（以本设计为基础）。
- 为门禁设计轻量级离线验证方案（签名票据 + 后端汇总上链）。
- 制定合约治理/紧急响应流程（谁能暂停/升级合约）。

---

维护者：Attenda 合约与安全团队

如需，我可以继续基于本设计：
- 生成 Move 代码原型（模块/函数的初始实现），
- 生成详细的单元与集成测试脚本，
- 或者生成合约部署脚本与迁移策略（包含 tx 模板）。
