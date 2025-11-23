import 'dart:convert';
import 'package:flutter/material.dart';
import '../models/ticket_model.dart';
import '../services/checkin_service.dart';
import '../services/account_service.dart';

class CheckInController extends ChangeNotifier {
  final CheckInService _checkInService = CheckInService();
  final AccountService _accountService = AccountService();

  EventInfo? _eventInfo;
  bool _isLoading = false;
  bool _isProcessing = false;
  bool _isAuthorized = false;
  String? _error;
  String? _success;
  TicketQRData? _scannedData;

  EventInfo? get eventInfo => _eventInfo;
  bool get isLoading => _isLoading;
  bool get isProcessing => _isProcessing;
  bool get isAuthorized => _isAuthorized;
  String? get error => _error;
  String? get success => _success;
  TicketQRData? get scannedData => _scannedData;

  /// 初始化 - 加载活动信息
  Future<void> initialize(String eventId) async {
    _isLoading = true;
    _error = null;
    notifyListeners();

    try {
      // 获取当前账号
      final account = await _accountService.getSavedAccount();
      if (account == null) {
        _error = 'Please create an account first';
        return;
      }

      final userAddress = account.getAddress();

      // 加载活动信息
      _eventInfo = await _checkInService.loadEventInfo(eventId);

      // 检查权限
      _isAuthorized = _checkInService.isAuthorized(_eventInfo!, userAddress);

      if (!_isAuthorized) {
        _error = 'You are not authorized to check in attendees for this event';
      }

      print('✅ Controller initialized');
      print('   Authorized: $_isAuthorized');
    } catch (e) {
      _error = 'Failed to load event: ${e.toString()}';
      print('❌ Initialization error: $e');
    } finally {
      _isLoading = false;
      notifyListeners();
    }
  }

  /// 处理扫描结果
  Future<void> handleScanResult(String qrCodeData) async {
    _error = null;
    _success = null;

    try {
      // 解析二维码数据
      final jsonData = json.decode(qrCodeData);
      final ticketData = TicketQRData.fromJson(jsonData);

      // 验证是否为当前活动的票据
      if (ticketData.eventId != _eventInfo?.id) {
        _error = 'This ticket is for a different event';
        notifyListeners();
        return;
      }

      _scannedData = ticketData;
      notifyListeners();

      // 自动执行签到
      await _performCheckIn(ticketData);
    } catch (e) {
      _error = 'Invalid QR code: ${e.toString()}';
      print('❌ QR code parse error: $e');
      notifyListeners();
    }
  }

  /// 执行签到
  Future<void> _performCheckIn(TicketQRData ticketData) async {
    if (!_isAuthorized) {
      _error = 'You are not authorized to perform check-ins';
      notifyListeners();
      return;
    }

    _isProcessing = true;
    _error = null;
    _success = null;
    notifyListeners();

    try {
      // 获取账号
      final account = await _accountService.getSavedAccount();
      if (account == null) {
        throw Exception('Account not found');
      }

      // 1. 验证票据
      print('🎫 Validating ticket...');
      final ticketInfo = await _checkInService.validateTicket(
        ticketData.ticketId,
        ticketData.eventId,
      );

      // 2. 执行签到
      print('📝 Executing check-in...');
      final txDigest = await _checkInService.performCheckIn(
        account: account,
        eventId: ticketData.eventId,
        ticketId: ticketData.ticketId,
        ticketOwner: ticketInfo.owner,
        verificationCode: ticketData.verificationCode,
      );

      _success =
          'Check-in successful!\nTicket holder: ${_formatAddress(ticketInfo.owner)}';
      _scannedData = null;

      print('✅ Check-in completed');
      print('   Transaction: $txDigest');

      // 3秒后清除成功消息
      Future.delayed(const Duration(seconds: 3), () {
        _success = null;
        notifyListeners();
      });
    } catch (e) {
      _error = 'Check-in failed: ${e.toString()}';
      print('❌ Check-in error: $e');
    } finally {
      _isProcessing = false;
      notifyListeners();
    }
  }

  /// 清除错误
  void clearError() {
    _error = null;
    notifyListeners();
  }

  /// 清除成功消息
  void clearSuccess() {
    _success = null;
    notifyListeners();
  }

  /// 重置扫描状态
  void resetScan() {
    _scannedData = null;
    _error = null;
    _success = null;
    notifyListeners();
  }

  /// 格式化地址显示
  String _formatAddress(String address) {
    if (address.length <= 10) return address;
    return '${address.substring(0, 6)}...${address.substring(address.length - 4)}';
  }
}
