import 'dart:convert';
import 'package:sui/sui.dart';
import 'package:shared_preferences/shared_preferences.dart';

class AccountInfo {
  final String name;
  final String address;
  final String privateKey;
  final String type;
  final DateTime createdAt;

  AccountInfo({
    required this.name,
    required this.address,
    required this.privateKey,
    required this.type,
    required this.createdAt,
  });

  Map<String, dynamic> toJson() {
    return {
      'name': name,
      'address': address,
      'privateKey': privateKey,
      'type': type,
      'createdAt': createdAt.toIso8601String(),
    };
  }

  factory AccountInfo.fromJson(Map<String, dynamic> json) {
    return AccountInfo(
      name: json['name'] ?? '',
      address: json['address'] ?? '',
      privateKey: json['privateKey'] ?? '',
      type: json['type'] ?? 'ed25519',
      createdAt: DateTime.parse(json['createdAt']),
    );
  }
}

class AccountService {
  static const String _accountsKey = 'sui_accounts';
  static const String _currentAccountKey = 'sui_current_account';

  final SuiClient _client = SuiClient(SuiUrls.testnet);

  /// 获取所有账号
  Future<List<AccountInfo>> getAllAccounts() async {
    final prefs = await SharedPreferences.getInstance();
    final accountsJson = prefs.getString(_accountsKey);

    if (accountsJson == null) {
      return [];
    }

    try {
      final List<dynamic> decoded = json.decode(accountsJson);
      return decoded.map((item) => AccountInfo.fromJson(item)).toList();
    } catch (e) {
      print('❌ Error loading accounts: $e');
      return [];
    }
  }

  /// 保存账号列表
  Future<void> _saveAccounts(List<AccountInfo> accounts) async {
    final prefs = await SharedPreferences.getInstance();
    final accountsJson = json.encode(accounts.map((a) => a.toJson()).toList());
    await prefs.setString(_accountsKey, accountsJson);
  }

  /// 添加账号
  Future<void> addAccount(AccountInfo accountInfo) async {
    final accounts = await getAllAccounts();
    accounts.add(accountInfo);
    await _saveAccounts(accounts);

    // 如果是第一个账号，设置为当前账号
    if (accounts.length == 1) {
      await setCurrentAccount(accountInfo.address);
    }
  }

  /// 创建 Ed25519 账号
  Future<SuiAccount> createEd25519Account(String name) async {
    final account = SuiAccount.ed25519Account();
    await _addNewAccount(account, name, 'ed25519');
    return account;
  }

  /// 创建 Secp256k1 账号
  Future<SuiAccount> createSecp256k1Account(String name) async {
    final account = SuiAccount.secp256k1Account();
    await _addNewAccount(account, name, 'secp256k1');
    return account;
  }

  /// 创建 Secp256r1 账号
  Future<SuiAccount> createSecp256r1Account(String name) async {
    final account = SuiAccount.secp256r1Account();
    await _addNewAccount(account, name, 'secp256r1');
    return account;
  }

  /// 通过私钥导入账号
  Future<SuiAccount> importAccountFromPrivateKey(
    String privateKey,
    String name,
  ) async {
    try {
      final account = SuiAccount.fromPrivateKey(privateKey);
      final type = _detectAccountType(privateKey);
      await _addNewAccount(account, name, type);
      return account;
    } catch (e) {
      print('❌ Error importing account: $e');
      rethrow;
    }
  }

  /// 检测账号类型
  String _detectAccountType(String privateKey) {
    // 简单检测，实际可能需要更复杂的逻辑
    if (privateKey.startsWith('suiprivkey')) {
      return 'ed25519';
    }
    return 'ed25519'; // 默认
  }

  /// 添加新账号
  Future<void> _addNewAccount(
    SuiAccount account,
    String name,
    String type,
  ) async {
    final accountInfo = AccountInfo(
      name: name,
      address: account.getAddress(),
      privateKey: account.privateKey(),
      type: type,
      createdAt: DateTime.now(),
    );

    await addAccount(accountInfo);
    print('✅ Account added: ${account.getAddress()}');
  }

  /// 设置当前账号
  Future<void> setCurrentAccount(String address) async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString(_currentAccountKey, address);
    print('✅ Current account set: $address');
  }

  /// 获取当前账号地址
  Future<String?> getCurrentAccountAddress() async {
    final prefs = await SharedPreferences.getInstance();
    return prefs.getString(_currentAccountKey);
  }

  /// 获取当前账号
  Future<SuiAccount?> getSavedAccount() async {
    final currentAddress = await getCurrentAccountAddress();
    if (currentAddress == null) {
      return null;
    }

    final accounts = await getAllAccounts();
    final accountInfo = accounts.firstWhere(
      (acc) => acc.address == currentAddress,
      orElse:
          () =>
              accounts.isNotEmpty
                  ? accounts.first
                  : throw Exception('No account found'),
    );

    try {
      return SuiAccount.fromPrivateKey(accountInfo.privateKey);
    } catch (e) {
      print('❌ Error loading account: $e');
      return null;
    }
  }

  /// 获取账号信息
  Future<AccountInfo?> getCurrentAccountInfo() async {
    final currentAddress = await getCurrentAccountAddress();
    if (currentAddress == null) {
      return null;
    }

    final accounts = await getAllAccounts();
    try {
      return accounts.firstWhere((acc) => acc.address == currentAddress);
    } catch (e) {
      return accounts.isNotEmpty ? accounts.first : null;
    }
  }

  /// 删除账号
  Future<void> deleteAccount(String address) async {
    final accounts = await getAllAccounts();
    accounts.removeWhere((acc) => acc.address == address);
    await _saveAccounts(accounts);

    // 如果删除的是当前账号，切换到第一个账号
    final currentAddress = await getCurrentAccountAddress();
    if (currentAddress == address) {
      if (accounts.isNotEmpty) {
        await setCurrentAccount(accounts.first.address);
      } else {
        final prefs = await SharedPreferences.getInstance();
        await prefs.remove(_currentAccountKey);
      }
    }

    print('✅ Account deleted: $address');
  }

  /// 检查是否有已保存的账号
  Future<bool> hasAccount() async {
    final accounts = await getAllAccounts();
    return accounts.isNotEmpty;
  }

  /// 获取账号地址
  Future<String?> getAddress() async {
    final account = await getSavedAccount();
    return account?.getAddress();
  }

  /// 清除所有账号
  Future<void> clearAllAccounts() async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.remove(_accountsKey);
    await prefs.remove(_currentAccountKey);
    print('✅ All accounts cleared');
  }

  /// 从水龙头领取 SUI
  Future<bool> requestFaucet() async {
    try {
      final account = await getSavedAccount();
      if (account == null) {
        print('❌ No account found');
        return false;
      }

      final address = account.getAddress();
      print('🚰 Requesting SUI from faucet for: $address');

      final faucet = FaucetClient(SuiUrls.faucetTest);
      await faucet.requestSuiFromFaucetV0(address);

      print('✅ Faucet request successful');
      return true;
    } catch (e) {
      print('❌ Faucet request failed: $e');
      return false;
    }
  }

  /// 获取账号余额
  Future<String> getBalance() async {
    try {
      final account = await getSavedAccount();
      if (account == null) {
        return '0';
      }

      final address = account.getAddress();
      print('💰 Fetching balance for: $address');

      final balance = await _client.getBalance(address);
      final totalBalance = balance.totalBalance;

      // 转换为 SUI（1 SUI = 10^9 MIST）
      final balanceInMist = double.parse(totalBalance.toString());
      final suiBalance = balanceInMist / 1000000000;

      print('✅ Balance: $suiBalance SUI');
      return suiBalance.toStringAsFixed(4);
    } catch (e) {
      print('❌ Failed to get balance: $e');
      return '0';
    }
  }
}
