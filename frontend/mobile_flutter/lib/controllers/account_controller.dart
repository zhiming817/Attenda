import 'package:flutter/material.dart';
import 'package:sui/sui.dart';
import '../services/account_service.dart';

class AccountController extends ChangeNotifier {
  final AccountService _accountService = AccountService();

  List<AccountInfo> _accounts = [];
  AccountInfo? _currentAccountInfo;
  SuiAccount? _account;
  bool _isLoading = false;
  String? _error;
  String _balance = '0';

  List<AccountInfo> get accounts => _accounts;
  AccountInfo? get currentAccountInfo => _currentAccountInfo;
  SuiAccount? get account => _account;
  bool get isLoading => _isLoading;
  String? get error => _error;
  String? get address => _account?.getAddress();
  bool get hasAccount => _account != null;
  String get balance => _balance;

  /// 初始化时加载已保存的账号
  Future<void> initialize() async {
    _isLoading = true;
    notifyListeners();

    try {
      _accounts = await _accountService.getAllAccounts();
      _currentAccountInfo = await _accountService.getCurrentAccountInfo();
      _account = await _accountService.getSavedAccount();

      if (_account != null) {
        await _loadBalance();
      }
      _error = null;
    } catch (e) {
      _error = e.toString();
    }

    _isLoading = false;
    notifyListeners();
  }

  /// 加载余额
  Future<void> _loadBalance() async {
    try {
      _balance = await _accountService.getBalance();
    } catch (e) {
      print('❌ Error loading balance: $e');
      _balance = '0';
    }
  }

  /// 刷新余额
  Future<void> refreshBalance() async {
    if (!hasAccount) return;

    _isLoading = true;
    notifyListeners();

    await _loadBalance();

    _isLoading = false;
    notifyListeners();
  }

  /// 创建 Ed25519 账号
  Future<void> createEd25519Account(String name) async {
    await _createAccount(() => _accountService.createEd25519Account(name));
  }

  /// 创建 Secp256k1 账号
  Future<void> createSecp256k1Account(String name) async {
    await _createAccount(() => _accountService.createSecp256k1Account(name));
  }

  /// 创建 Secp256r1 账号
  Future<void> createSecp256r1Account(String name) async {
    await _createAccount(() => _accountService.createSecp256r1Account(name));
  }

  /// 导入账号
  Future<void> importAccount(String privateKey, String name) async {
    await _createAccount(
      () => _accountService.importAccountFromPrivateKey(privateKey, name),
    );
  }

  Future<void> _createAccount(Future<SuiAccount> Function() createFn) async {
    _isLoading = true;
    _error = null;
    notifyListeners();

    try {
      await createFn();
      await initialize(); // 重新加载所有账号
      _error = null;
    } catch (e) {
      _error = e.toString();
    }

    _isLoading = false;
    notifyListeners();
  }

  /// 切换当前账号
  Future<void> switchAccount(String address) async {
    _isLoading = true;
    notifyListeners();

    try {
      await _accountService.setCurrentAccount(address);
      await initialize(); // 重新加载
      _error = null;
    } catch (e) {
      _error = e.toString();
    }

    _isLoading = false;
    notifyListeners();
  }

  /// 删除账号
  Future<void> deleteAccount(String address) async {
    _isLoading = true;
    notifyListeners();

    try {
      await _accountService.deleteAccount(address);
      await initialize(); // 重新加载
      _error = null;
    } catch (e) {
      _error = e.toString();
    }

    _isLoading = false;
    notifyListeners();
  }

  /// 从水龙头领取 SUI
  Future<bool> requestFaucet() async {
    if (!hasAccount) {
      _error = 'No account found. Please create an account first.';
      notifyListeners();
      return false;
    }

    _isLoading = true;
    _error = null;
    notifyListeners();

    try {
      final success = await _accountService.requestFaucet();
      if (!success) {
        _error = 'Failed to request from faucet';
      } else {
        // 等待几秒后刷新余额
        await Future.delayed(const Duration(seconds: 3));
        await _loadBalance();
      }
      _isLoading = false;
      notifyListeners();
      return success;
    } catch (e) {
      _error = e.toString();
      _isLoading = false;
      notifyListeners();
      return false;
    }
  }

  /// 清除账号
  Future<void> clearAllAccounts() async {
    await _accountService.clearAllAccounts();
    _accounts = [];
    _currentAccountInfo = null;
    _account = null;
    _balance = '0';
    _error = null;
    notifyListeners();
  }

  /// 复制地址到剪贴板
  String getShortAddress() {
    if (address == null) return '';
    return '${address!.substring(0, 6)}...${address!.substring(address!.length - 4)}';
  }
}
