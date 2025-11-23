class EventModel {
  final String eventId;
  final String organizer;
  final int capacity;
  final String walrusBlobId;
  final EventMetadata? metadata;
  final String timestamp;

  EventModel({
    required this.eventId,
    required this.organizer,
    required this.capacity,
    required this.walrusBlobId,
    this.metadata,
    required this.timestamp,
  });

  factory EventModel.fromJson(
    Map<String, dynamic> json,
    EventMetadata? metadata,
    String txDigest,
  ) {
    // 安全地解析 capacity，支持 String 和 int 类型
    int capacity = 0;
    final capacityValue = json['capacity'];
    if (capacityValue is int) {
      capacity = capacityValue;
    } else if (capacityValue is String) {
      capacity = int.tryParse(capacityValue) ?? 0;
    }

    return EventModel(
      eventId: json['event_id'] ?? '',
      organizer: json['organizer'] ?? '',
      capacity: capacity,
      walrusBlobId: json['walrus_blob_id'] ?? '',
      metadata: metadata,
      timestamp: txDigest,
    );
  }
}

class EventMetadata {
  final String title;
  final String? description;
  final String? location;
  final String? startTime;
  final String? imageUrl;

  EventMetadata({
    required this.title,
    this.description,
    this.location,
    this.startTime,
    this.imageUrl,
  });

  factory EventMetadata.fromJson(Map<String, dynamic> json) {
    return EventMetadata(
      title: json['title'] ?? 'Untitled Event',
      description: json['description'],
      location: json['location'],
      startTime: json['start_time'],
      imageUrl: json['imageUrl'],
    );
  }
}
