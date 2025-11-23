import 'dart:convert';
import 'dart:typed_data';
import 'package:sui/sui.dart';
import '../models/ticket_model.dart';

class CheckInService {
  static const String packageId =
      '0x1f668fd670678b4849d269b2f60229d40aa998a6ff70ac984ea790bdba5c396e';

  // UsedTicketsRegistry shared object ID
  static const String registryId =
      '0x047ebc2067f16faf7f3c62db2601725cce54d885028f6058e34264addff135df';

  final SuiClient _client = SuiClient(SuiUrls.testnet);

  /// 加载活动信息
  Future<EventInfo> loadEventInfo(String eventId) async {
    try {
      print('🔍 Loading event info: $eventId');

      final response = await _client.getObject(
        eventId,
        options: SuiObjectDataOptions(
          showContent: true,
          showOwner: true,
          showType: true,
        ),
      );

      if (response.data == null) {
        throw Exception('Event not found: object data is null');
      }

      if (response.data!.content == null) {
        throw Exception('Event not found: object content is null');
      }

      final content = response.data!.content as SuiMoveObject;
      final fields = content.fields as Map<String, dynamic>;

      print('✅ Event fields: $fields');

      return EventInfo(
        id: eventId,
        organizer: fields['organizer'] ?? '',
        capacity: int.tryParse(fields['capacity']?.toString() ?? '0') ?? 0,
        ticketsSold:
            int.tryParse(fields['num_tickets_sold']?.toString() ?? '0') ?? 0,
        status: int.tryParse(fields['status']?.toString() ?? '0') ?? 0,
      );
    } catch (e) {
      print('❌ Error loading event info: $e');
      rethrow;
    }
  }

  /// 验证票据信息
  Future<TicketInfo> validateTicket(String ticketId, String eventId) async {
    try {
      print('🎫 Validating ticket: $ticketId');

      final response = await _client.getObject(
        ticketId,
        options: SuiObjectDataOptions(
          showContent: true,
          showOwner: true,
          showType: true,
        ),
      );

      if (response.data?.content == null) {
        throw Exception('Ticket not found');
      }

      final content = response.data!.content as SuiMoveObject;
      final fields = content.fields as Map<String, dynamic>;

      final ticketEventId = fields['event_id'] ?? '';
      final status = int.tryParse(fields['status']?.toString() ?? '0') ?? 0;
      final owner = fields['owner'] ?? '';

      // 验证票据所属活动
      if (ticketEventId != eventId) {
        throw Exception('This ticket is for a different event');
      }

      // 验证票据状态
      if (status != 0) {
        final statusText = status == 1 ? 'already used' : 'revoked';
        throw Exception('This ticket has been $statusText');
      }

      // 获取验证码（如果存在）
      final verificationCodeField = fields['verification_code'];
      String verificationCode = '';
      if (verificationCodeField != null) {
        if (verificationCodeField is List) {
          verificationCode = utf8.decode(verificationCodeField.cast<int>());
        } else {
          verificationCode = verificationCodeField.toString();
        }
      }

      print('✅ Ticket validation passed');
      print('   Owner: $owner');
      print('   Status: $status');

      return TicketInfo(
        id: ticketId,
        eventId: ticketEventId,
        owner: owner,
        status: status,
        verificationCode: verificationCode,
      );
    } catch (e) {
      print('❌ Error validating ticket: $e');
      rethrow;
    }
  }

  /// 执行签到
  Future<String> performCheckIn({
    required SuiAccount account,
    required String eventId,
    required String ticketId,
    required String ticketOwner,
    required String verificationCode,
  }) async {
    try {
      print('📝 Performing check-in...');
      print('   Event: $eventId');
      print('   Ticket: $ticketId');
      print('   Ticket Owner: $ticketOwner');

      // 构建交易
      final tx = Transaction();

      // 编码验证码为 vector<u8>
      final codeBytes = Uint8List.fromList(utf8.encode(verificationCode));

      // 调用合约方法: attendance::record_attendance_with_verification
      // 注意：合约现在接收 ticket_id (address) 而不是 ticket 对象引用
      tx.moveCall(
        '$packageId::attendance::record_attendance_with_verification',
        arguments: [
          tx.object(registryId), // UsedTicketsRegistry (shared object)
          tx.object(eventId), // EventInfo (shared object)
          tx.pure.address(ticketOwner), // user address
          tx.pure.address(ticketId), // ticket_id (作为地址传递，不是对象引用)
          tx.pure(codeBytes, 'vector<u8>'), // verification_code (使用 Uint8List)
          tx.pure.u8(1), // verification_method: 1 = QR Code Scan
          tx.object('0x6'), // Clock object
        ],
      );

      print('🚀 Executing transaction...');

      // 执行交易
      final result = await _client.signAndExecuteTransactionBlock(account, tx);

      final digest = result.digest;
      print('✅ Check-in successful!');
      print('   Transaction: $digest');

      return digest;
    } catch (e) {
      print('❌ Check-in failed: $e');
      rethrow;
    }
  }

  /// 检查用户是否为活动组织者
  bool isAuthorized(EventInfo event, String userAddress) {
    return event.organizer.toLowerCase() == userAddress.toLowerCase();
  }
}
