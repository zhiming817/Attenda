# 合约部署说明

## 修改内容

已将合约中的时间戳从 `epoch` 编号改为使用 `Clock` 获取毫秒级真实时间戳：

### 修改的合约文件：
1. `contract/sources/event_registry.move` - 活动注册模块
2. `contract/sources/ticket_nft.move` - 票据 NFT 模块

### 主要变更：
- `created_at` 和 `updated_at` 现在存储的是毫秒时间戳（ms），而不是 epoch 编号
- 所有需要时间的函数都添加了 `clock: &Clock` 参数
- 前端直接使用 `new Date(timestamp)` 显示真实日期

## 部署步骤

### 1. 进入合约目录
```bash
cd contract
```

### 2. 编译合约
```bash
sui move build
```

### 3. 部署到测试网
```bash
sui client publish --gas-budget 100000000
```

### 4. 记录部署信息
部署成功后，记录以下信息：
- **Package ID** - 新部署的包地址
- **Created Objects** - 可能包含一些共享对象

### 5. 更新前端环境变量
编辑 `frontend/web/.env` 文件：
```bash
VITE_PACKAGE_ID=<新的Package ID>
```

### 6. 重启前端
```bash
cd frontend/web
npm run dev
```

## 注意事项

⚠️ **重要**：
1. 旧的活动和票据仍使用 epoch 存储，无法自动迁移
2. 建议创建新的活动来测试新的时间戳功能
3. `0x6` 是 Sui 的全局 Clock 对象地址，无需修改

## Clock 对象说明

在 Sui 中，`0x6` 是一个特殊的共享对象，表示系统 Clock：
- 所有交易都可以访问这个对象
- `clock::timestamp_ms(&clock)` 返回当前的毫秒时间戳
- 前端调用时使用 `tx.object('0x6')` 传入

## 测试建议

部署后测试以下场景：
1. ✅ 创建新活动 - 检查 `created_at` 是否为毫秒时间戳
2. ✅ 购买票据 - 检查票据的 `created_at` 是否正确
3. ✅ 查看 My Tickets - 确认日期显示正确
4. ✅ 票据管理页面 - 确认日期显示正确
