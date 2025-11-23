import 'package:sui/sui.dart';
import 'package:shared_preferences/shared_preferences.dart';

class AccountService {
  static const String _privateKeyKey = 'sui_private_key';
  static const String _accountTypeKey = 'sui_account_type';

  final SuiClient _client = SuiClient(SuiUrls.testnet);

  /// 创建 Ed25519 账号
  Future<SuiAccount> createEd25519Account() async {
    final account = SuiAccount.ed25519Account();
    await _saveAccount(account, 'ed25519');
    return account;
  }

  /// 创建 Secp256k1 账号
  Future<SuiAccount> createSecp256k1Account() async {
    final account = SuiAccount.secp256k1Account();
    await _saveAccount(account, 'secp256k1');
    return account;
  }

  /// 创建 Secp256r1 账号
  Future<SuiAccount> createSecp256r1Account() async {
    final account = SuiAccount.secp256r1Account();
    await _saveAccount(account, 'secp256r1');
    return account;
  }

  /// 保存账号私钥
  Future<void> _saveAccount(SuiAccount account, String type) async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString(_privateKeyKey, account.privateKey());
    await prefs.setString(_accountTypeKey, type);
    print('✅ Account saved: ${account.getAddress()}');
  }

  /// 获取已保存的账号
  Future<SuiAccount?> getSavedAccount() async {
    final prefs = await SharedPreferences.getInstance();
    final privateKey = prefs.getString(_privateKeyKey);
    
    if (privateKey == null) {
      return null;
    }

    try {
      return SuiAccount.fromPrivateKey(privateKey);
    } catch (e) {
      print('❌ Error loading account: $e');
      return null;
    }
  }

  /// 检查是否有已保存的账号
  Future<bool> hasAccount() async {
    final prefs = await SharedPreferences.getInstance();
    return prefs.containsKey(_privateKeyKey);
  }

  /// 获取账号地址
  Future<String?> getAddress() async {
    final account = await getSavedAccount();
    return account?.getAddress();
  }

  /// 清除保存的账号
  Future<void> clearAccount() async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.remove(_privateKeyKey);
    await prefs.remove(_accountTypeKey);
    print('✅ Account cleared');
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
