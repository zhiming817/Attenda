import 'dart:convert';
import 'package:http/http.dart' as http;
import '../models/event_model.dart';

class WalrusService {
  static const String aggregatorUrl =
      'https://aggregator.walrus-testnet.walrus.space';

  Future<EventMetadata?> loadMetadata(String blobId) async {
    try {
      if (blobId.isEmpty) {
        return null;
      }

      final url = '$aggregatorUrl/v1/blobs/$blobId';
      print('🌐 Loading metadata from: $url');

      final response = await http.get(Uri.parse(url));

      if (response.statusCode == 200) {
        final json = jsonDecode(response.body);
        print('✅ Metadata loaded: ${json['title']}');
        return EventMetadata.fromJson(json);
      } else {
        print('❌ Failed to load metadata: ${response.statusCode}');
        return null;
      }
    } catch (e) {
      print('❌ Error loading metadata: $e');
      return null;
    }
  }
}
