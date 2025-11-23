import 'package:sui/sui.dart';
import '../models/event_model.dart';
import 'walrus_service.dart';

class SuiService {
  static const String packageId =
      '0x8b17b23f2ecc48dc78d453f437b98b241b4948ea0f32c3371ad9a9d7bc3cbec0';

  final SuiClient _client;
  final WalrusService _walrusService;

  SuiService()
    : _client = SuiClient(SuiUrls.testnet),
      _walrusService = WalrusService();

  Future<List<EventModel>> queryEvents({int limit = 50}) async {
    try {
      print('🔍 Querying events from package: $packageId');

      final response = await _client.queryEvents({
        "MoveEventType": "$packageId::event_registry::EventCreated",
      }, limit: limit);

      print('📦 Found ${response.data.length} events');

      List<EventModel> events = [];

      for (var event in response.data) {
        try {
          final parsedJson = event.parsedJson;
          if (parsedJson == null) {
            print('⚠️ Event has no parsedJson');
            continue;
          }

          print('📝 Event data: $parsedJson');

          // 加载 Walrus 元数据
          EventMetadata? metadata;
          final walrusBlobId = parsedJson['walrus_blob_id'] ?? '';
          if (walrusBlobId.isNotEmpty) {
            metadata = await _walrusService.loadMetadata(walrusBlobId);
          }

          events.add(
            EventModel.fromJson(parsedJson, metadata, event.id.txDigest),
          );
        } catch (e) {
          print('❌ Error parsing event: $e');
        }
      }

      print('✅ Loaded ${events.length} events successfully');
      return events;
    } catch (e) {
      print('❌ Error loading events: $e');
      rethrow;
    }
  }
}
