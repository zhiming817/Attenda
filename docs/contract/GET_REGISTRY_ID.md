# 获取 UsedTicketsRegistry ID

新合约已部署到:
- **Package ID**: `0xdcce259374ee87d79da1ce4f43a6eb96804a57f8a510c4d653ec4f523c7c6db4`

## 如何找到 Registry ID

`UsedTicketsRegistry` 是在合约部署时通过 `init` 函数自动创建的共享对象。

### 方法 1: 查看部署交易输出

在合约发布时的控制台输出中,查找 "Created Objects" 部分,找到类型为 `UsedTicketsRegistry` 的对象。

### 方法 2: 查询账户拥有的对象

运行以下命令查看所有共享对象:

```bash
cd contract
sui client objects
```

查找类型包含 `attendance::UsedTicketsRegistry` 的对象。

### 方法 3: 创建一个事件来触发查询

执行任何与新合约交互的操作,系统会自动发现 Registry ID。

## 更新客户端配置

找到 Registry ID 后,需要更新以下文件:

1. **Mobile Flutter**: 
   ```
   frontend/mobile_flutter/lib/services/checkin_service.dart
   ```
   将 `static const String registryId = 'REGISTRY_OBJECT_ID_HERE';` 中的值替换。

2. **Web**:
   需要在 Web 项目中找到类似的配置文件并更新。

## 临时方案

如果无法立即找到 Registry ID:

1. 先使用旧的事件和票据测试其他功能
2. 或者创建新事件和票据
3. Registry ID 会在第一次 check-in 操作的错误信息中显示

## 验证 Registry ID

获得 ID 后,可以用此命令验证:

```bash
sui client object <REGISTRY_ID>
```

应该看到类型为:
```
0xdcce259374ee87d79da1ce4f43a6eb96804a57f8a510c4d653ec4f523c7c6db4::attendance::UsedTicketsRegistry
```
