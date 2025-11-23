import 'package:flutter/material.dart';
import 'package:sui/sui.dart';
import '../services/account_service.dart';

class AccountController extends ChangeNotifier {
  final AccountService _accountService = AccountService();

  SuiAccount? _account;
  bool _isLoading = false;
  String? _error;
  String _balance = '0';

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
  Future<void> createEd25519Account() async {
    await _createAccount(() => _accountService.createEd25519Account());
  }

  /// 创建 Secp256k1 账号
  Future<void> createSecp256k1Account() async {
    await _createAccount(() => _accountService.createSecp256k1Account());
  }

  /// 创建 Secp256r1 账号
  Future<void> createSecp256r1Account() async {
    await _createAccount(() => _accountService.createSecp256r1Account());
  }

  Future<void> _createAccount(Future<SuiAccount> Function() createFn) async {
    _isLoading = true;
    _error = null;
    notifyListeners();

    try {
      _account = await createFn();
      await _loadBalance();
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
  Future<void> clearAccount() async {
    await _accountService.clearAccount();
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
