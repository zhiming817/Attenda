# Attenda - 数据库表结构设计

**版本**: 1.0  
**数据库类型**: PostgreSQL (推荐) / MySQL  
**说明**: 后端辅助数据库表结构，核心可验证数据存储在 Sui 链上，后端数据库仅用于缓存、支付回调、通知队列等辅助功能。

---

## 设计原则

1. **最小化链下数据**: 可验证数据（NFT、出席记录）存储在链上，数据库仅作辅助缓存与业务支持。
2. **索引优化**: 高频查询字段添加索引（event_id, user_wallet_address, status 等）。
3. **软删除**: 关键表使用 `deleted_at` 字段实现软删除而非物理删除。
4. **时间戳**: 所有表包含 `created_at` 和 `updated_at` 字段。
5. **幂等性**: 支付回调、通知等操作需要唯一标识符以防重复处理。

---

## 核心表结构

### 1. users（用户表）

存储用户基础信息与身份映射。

```sql
CREATE TABLE users (
    id BIGSERIAL PRIMARY KEY,
    wallet_address VARCHAR(66) UNIQUE NOT NULL,  -- Sui 钱包地址（0x...）
    zklogin_sub VARCHAR(255),                     -- ZkLogin subject（可选）
    email VARCHAR(255),                           -- 邮箱（可选，用于通知）
    username VARCHAR(100),                        -- 用户名（可选）
    avatar_url TEXT,                              -- 头像 URL
    bio TEXT,                                     -- 简介
    reputation_score INTEGER DEFAULT 0,           -- 声誉分数（基于出席记录）
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP WITH TIME ZONE,          -- 软删除
    
    CONSTRAINT check_identity CHECK (wallet_address IS NOT NULL OR zklogin_sub IS NOT NULL)
);

CREATE INDEX idx_users_wallet ON users(wallet_address);
CREATE INDEX idx_users_zklogin ON users(zklogin_sub);
CREATE INDEX idx_users_email ON users(email);
```

---

### 2. events（活动表 - 链上数据缓存）

缓存链上活动数据以提升查询性能，与链上数据同步。

```sql
CREATE TABLE events (
    id BIGSERIAL PRIMARY KEY,
    chain_event_id VARCHAR(100) UNIQUE NOT NULL,  -- 链上活动 ID（来自 Sui）
    organizer_wallet VARCHAR(66) NOT NULL,        -- 组织者钱包地址
    title VARCHAR(255) NOT NULL,                  -- 活动标题
    description TEXT,                             -- 活动描述
    start_time TIMESTAMP WITH TIME ZONE NOT NULL, -- 活动开始时间
    end_time TIMESTAMP WITH TIME ZONE,            -- 活动结束时间
    location VARCHAR(500),                        -- 地点（可选，加密存 Walrus）
    capacity INTEGER,                             -- 容量上限
    ticket_price DECIMAL(20, 9),                  -- 票价（SUI）
    walrus_blob_id TEXT NOT NULL,                -- Walrus Site 引用 URL
    image_url TEXT,                               -- 封面图片 URL
    status VARCHAR(20) DEFAULT 'active',          -- 状态: active, paused, closed, cancelled
    require_approval BOOLEAN DEFAULT FALSE,       -- 是否需要审批
    is_private BOOLEAN DEFAULT FALSE,             -- 是否私密活动
    tags JSONB,                                   -- 标签数组 ["tech", "web3"]
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP WITH TIME ZONE,
    
    CONSTRAINT fk_organizer FOREIGN KEY (organizer_wallet) REFERENCES users(wallet_address)
);

CREATE INDEX idx_events_chain_id ON events(chain_event_id);
CREATE INDEX idx_events_organizer ON events(organizer_wallet);
CREATE INDEX idx_events_status ON events(status);
CREATE INDEX idx_events_start_time ON events(start_time);
CREATE INDEX idx_events_tags ON events USING GIN(tags);
```

---

### 3. tickets（门票表 - 链上 NFT 缓存）

缓存链上门票 NFT 数据。

```sql
CREATE TABLE tickets (
    id BIGSERIAL PRIMARY KEY,
    chain_ticket_id VARCHAR(100) UNIQUE NOT NULL, -- 链上 NFT ID
    event_id BIGINT NOT NULL,                     -- 关联活动
    owner_wallet VARCHAR(66) NOT NULL,            -- 当前持有者
    original_owner_wallet VARCHAR(66),            -- 原始购买者（防转售追踪）
    walrus_blob_ref TEXT NOT NULL,                -- 加密 blob 引用
    encrypted_meta_hash VARCHAR(64),              -- 加密元数据哈希（验证用）
    ticket_type VARCHAR(50) DEFAULT 'standard',   -- 票种: standard, vip, early_bird
    status VARCHAR(20) DEFAULT 'valid',           -- 状态: valid, used, revoked, transferred
    qr_code_hash VARCHAR(64),                     -- QR 码哈希（用于验证）
    checked_in_at TIMESTAMP WITH TIME ZONE,       -- 入场时间
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT fk_ticket_event FOREIGN KEY (event_id) REFERENCES events(id),
    CONSTRAINT fk_ticket_owner FOREIGN KEY (owner_wallet) REFERENCES users(wallet_address)
);

CREATE INDEX idx_tickets_chain_id ON tickets(chain_ticket_id);
CREATE INDEX idx_tickets_event ON tickets(event_id);
CREATE INDEX idx_tickets_owner ON tickets(owner_wallet);
CREATE INDEX idx_tickets_status ON tickets(status);
CREATE INDEX idx_tickets_qr_hash ON tickets(qr_code_hash);
```

---

### 4. attendance_records（出席记录表）

记录用户出席情况与 Attendance NFT 铸造状态。

```sql
CREATE TABLE attendance_records (
    id BIGSERIAL PRIMARY KEY,
    chain_attendance_id VARCHAR(100) UNIQUE,      -- 链上 Attendance NFT ID（铸造后填充）
    event_id BIGINT NOT NULL,
    user_wallet VARCHAR(66) NOT NULL,
    ticket_id BIGINT,                             -- 关联的门票
    check_in_time TIMESTAMP WITH TIME ZONE NOT NULL,
    check_in_location VARCHAR(255),               -- 签到位置（可选）
    verification_method VARCHAR(20),              -- 验证方式: qr_scan, wallet_signature, nfc
    nft_minted BOOLEAN DEFAULT FALSE,             -- Attendance NFT 是否已铸造
    nft_mint_tx_hash VARCHAR(100),                -- 铸造交易哈希
    is_soulbound BOOLEAN DEFAULT TRUE,            -- 是否灵魂绑定
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT fk_attendance_event FOREIGN KEY (event_id) REFERENCES events(id),
    CONSTRAINT fk_attendance_user FOREIGN KEY (user_wallet) REFERENCES users(wallet_address),
    CONSTRAINT fk_attendance_ticket FOREIGN KEY (ticket_id) REFERENCES tickets(id)
);

CREATE INDEX idx_attendance_event ON attendance_records(event_id);
CREATE INDEX idx_attendance_user ON attendance_records(user_wallet);
CREATE INDEX idx_attendance_chain_id ON attendance_records(chain_attendance_id);
CREATE INDEX idx_attendance_time ON attendance_records(check_in_time);
```

---

### 5. registrations（报名申请表）

用于需要审批的活动报名流程。

```sql
CREATE TABLE registrations (
    id BIGSERIAL PRIMARY KEY,
    event_id BIGINT NOT NULL,
    user_wallet VARCHAR(66) NOT NULL,
    status VARCHAR(20) DEFAULT 'pending',         -- 状态: pending, approved, rejected, cancelled
    application_message TEXT,                     -- 申请留言
    ticket_type VARCHAR(50) DEFAULT 'standard',   -- 申请的票种
    approved_by VARCHAR(66),                      -- 审批人钱包地址
    approved_at TIMESTAMP WITH TIME ZONE,
    rejection_reason TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT fk_registration_event FOREIGN KEY (event_id) REFERENCES events(id),
    CONSTRAINT fk_registration_user FOREIGN KEY (user_wallet) REFERENCES users(wallet_address),
    CONSTRAINT unique_registration UNIQUE (event_id, user_wallet)
);

CREATE INDEX idx_registrations_event ON registrations(event_id);
CREATE INDEX idx_registrations_user ON registrations(user_wallet);
CREATE INDEX idx_registrations_status ON registrations(status);
```

---

### 6. discount_codes（折扣码表）

管理活动折扣码。

```sql
CREATE TABLE discount_codes (
    id BIGSERIAL PRIMARY KEY,
    event_id BIGINT NOT NULL,
    code VARCHAR(50) UNIQUE NOT NULL,             -- 折扣码（大写）
    discount_type VARCHAR(20) NOT NULL,           -- 类型: percentage, fixed_amount
    discount_value DECIMAL(10, 2) NOT NULL,       -- 折扣值（百分比或固定金额）
    max_uses INTEGER,                             -- 最大使用次数
    used_count INTEGER DEFAULT 0,                 -- 已使用次数
    valid_from TIMESTAMP WITH TIME ZONE,
    valid_until TIMESTAMP WITH TIME ZONE,
    is_active BOOLEAN DEFAULT TRUE,
    created_by VARCHAR(66),                       -- 创建者钱包
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT fk_discount_event FOREIGN KEY (event_id) REFERENCES events(id),
    CONSTRAINT check_discount_value CHECK (discount_value > 0)
);

CREATE INDEX idx_discounts_event ON discount_codes(event_id);
CREATE INDEX idx_discounts_code ON discount_codes(code);
CREATE INDEX idx_discounts_active ON discount_codes(is_active);
```

---

### 7. payment_transactions（支付交易表）

记录支付回调与状态。

```sql
CREATE TABLE payment_transactions (
    id BIGSERIAL PRIMARY KEY,
    transaction_id VARCHAR(100) UNIQUE NOT NULL,  -- 外部支付系统交易 ID
    event_id BIGINT NOT NULL,
    user_wallet VARCHAR(66) NOT NULL,
    amount DECIMAL(20, 9) NOT NULL,               -- 支付金额
    currency VARCHAR(10) DEFAULT 'SUI',           -- 币种
    payment_method VARCHAR(50),                   -- 支付方式: sui_wallet, credit_card, stripe
    status VARCHAR(20) DEFAULT 'pending',         -- 状态: pending, completed, failed, refunded
    discount_code_id BIGINT,                      -- 使用的折扣码 ID
    payment_gateway VARCHAR(50),                  -- 支付网关
    gateway_response JSONB,                       -- 网关响应（JSON）
    completed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT fk_payment_event FOREIGN KEY (event_id) REFERENCES events(id),
    CONSTRAINT fk_payment_user FOREIGN KEY (user_wallet) REFERENCES users(wallet_address),
    CONSTRAINT fk_payment_discount FOREIGN KEY (discount_code_id) REFERENCES discount_codes(id)
);

CREATE INDEX idx_payments_txn_id ON payment_transactions(transaction_id);
CREATE INDEX idx_payments_event ON payment_transactions(event_id);
CREATE INDEX idx_payments_user ON payment_transactions(user_wallet);
CREATE INDEX idx_payments_status ON payment_transactions(status);
```

---

### 8. notifications（通知队列表）

管理异步通知任务（邮件、推送）。

```sql
CREATE TABLE notifications (
    id BIGSERIAL PRIMARY KEY,
    user_wallet VARCHAR(66),                      -- 接收者钱包
    email VARCHAR(255),                           -- 接收者邮箱（备用）
    notification_type VARCHAR(50) NOT NULL,       -- 类型: email, push, sms, wallet
    channel VARCHAR(20) NOT NULL,                 -- 渠道: email, push, in_app
    subject VARCHAR(255),                         -- 主题（邮件用）
    content TEXT NOT NULL,                        -- 通知内容
    template_name VARCHAR(100),                   -- 模板名称
    template_data JSONB,                          -- 模板数据（JSON）
    status VARCHAR(20) DEFAULT 'pending',         -- 状态: pending, sent, failed, cancelled
    retry_count INTEGER DEFAULT 0,
    max_retries INTEGER DEFAULT 3,
    scheduled_at TIMESTAMP WITH TIME ZONE,        -- 计划发送时间
    sent_at TIMESTAMP WITH TIME ZONE,
    error_message TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT fk_notification_user FOREIGN KEY (user_wallet) REFERENCES users(wallet_address)
);

CREATE INDEX idx_notifications_user ON notifications(user_wallet);
CREATE INDEX idx_notifications_status ON notifications(status);
CREATE INDEX idx_notifications_scheduled ON notifications(scheduled_at);
CREATE INDEX idx_notifications_type ON notifications(notification_type);
```

---

### 9. event_analytics（活动分析表）

缓存活动统计数据以提升报表性能。

```sql
CREATE TABLE event_analytics (
    id BIGSERIAL PRIMARY KEY,
    event_id BIGINT UNIQUE NOT NULL,
    total_registrations INTEGER DEFAULT 0,        -- 总报名数
    total_tickets_sold INTEGER DEFAULT 0,         -- 总售票数
    total_revenue DECIMAL(20, 9) DEFAULT 0,       -- 总收入
    total_attendees INTEGER DEFAULT 0,            -- 总出席人数
    check_in_rate DECIMAL(5, 2),                  -- 出席率（百分比）
    average_rating DECIMAL(3, 2),                 -- 平均评分（如有评价功能）
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT fk_analytics_event FOREIGN KEY (event_id) REFERENCES events(id)
);

CREATE INDEX idx_analytics_event ON event_analytics(event_id);
```

---

### 10. admin_actions（管理操作日志表）

审计组织者与管理员操作。

```sql
CREATE TABLE admin_actions (
    id BIGSERIAL PRIMARY KEY,
    admin_wallet VARCHAR(66) NOT NULL,            -- 操作者钱包
    action_type VARCHAR(50) NOT NULL,             -- 操作类型: create_event, approve_registration, revoke_ticket
    target_type VARCHAR(50),                      -- 目标类型: event, ticket, user
    target_id VARCHAR(100),                       -- 目标 ID
    description TEXT,                             -- 操作描述
    ip_address INET,                              -- IP 地址
    user_agent TEXT,                              -- User Agent
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT fk_admin_user FOREIGN KEY (admin_wallet) REFERENCES users(wallet_address)
);

CREATE INDEX idx_admin_actions_wallet ON admin_actions(admin_wallet);
CREATE INDEX idx_admin_actions_type ON admin_actions(action_type);
CREATE INDEX idx_admin_actions_time ON admin_actions(created_at);
```

---

## 辅助表

### 11. system_config（系统配置表）

存储系统级配置参数。

```sql
CREATE TABLE system_config (
    id SERIAL PRIMARY KEY,
    config_key VARCHAR(100) UNIQUE NOT NULL,
    config_value TEXT NOT NULL,
    description TEXT,
    is_encrypted BOOLEAN DEFAULT FALSE,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_config_key ON system_config(config_key);
```

---

## 数据同步策略

### 链上 → 链下同步

1. **事件监听**: 监听 Sui 链上事件（EventCreated, TicketMinted, AttendanceRecorded）。
2. **数据写入**: 将链上数据写入对应表（events, tickets, attendance_records）。
3. **状态更新**: 定期同步 NFT 所有权变更、状态变更。
4. **冲突处理**: 链上数据为准，链下数据仅作缓存。

### 链下 → 链上提交

1. **支付确认后**: 调用链上合约铸造 Ticket NFT。
2. **出席验证后**: 调用链上合约铸造 Attendance NFT。
3. **事务日志**: 记录所有链上交易哈希用于审计与查询。

---

## 数据库迁移管理

推荐使用迁移工具：
- **Rust**: `sqlx-cli` (with migrations)
- **Node.js**: `knex`, `typeorm`, `prisma`
- **Python**: `alembic`, `django migrations`

迁移文件命名格式：`YYYYMMDDHHMMSS_description.sql`

---

## 安全建议

1. **加密敏感字段**: email, payment gateway response（使用应用层加密）。
2. **访问控制**: 数据库用户权限最小化，后端服务使用独立账户。
3. **SQL 注入防护**: 使用参数化查询或 ORM。
4. **备份策略**: 每日全量备份 + 实时增量备份。
5. **审计日志**: 所有写操作记录在 `admin_actions` 表。

---

## 性能优化建议

1. **索引优化**: 高频查询字段添加复合索引。
2. **分区表**: `notifications` 和 `admin_actions` 按时间分区。
3. **读写分离**: 使用主从复制，读操作走从库。
4. **缓存层**: Redis 缓存热点数据（活动列表、用户信息）。
5. **连接池**: 配置合理的数据库连接池大小。

---

## 下一步

1. 根据实际技术栈选择 ORM 或查询构建工具。
2. 编写数据库迁移脚本。
3. 实现链上事件监听与数据同步服务。
4. 配置数据库备份与监控。

维护者：Attenda 后端团队
