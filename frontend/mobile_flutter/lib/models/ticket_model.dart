class TicketQRData {
  final String ticketId;
  final String eventId;
  final String verificationCode;
  final String holder;

  TicketQRData({
    required this.ticketId,
    required this.eventId,
    required this.verificationCode,
    required this.holder,
  });

  factory TicketQRData.fromJson(Map<String, dynamic> json) {
    return TicketQRData(
      ticketId: json['ticketId'] ?? '',
      eventId: json['eventId'] ?? '',
      verificationCode: json['verificationCode'] ?? '',
      holder: json['holder'] ?? '',
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'ticketId': ticketId,
      'eventId': eventId,
      'verificationCode': verificationCode,
      'holder': holder,
    };
  }
}

class TicketInfo {
  final String id;
  final String eventId;
  final String owner;
  final int status; // 0: active, 1: used, 2: revoked
  final String verificationCode;

  TicketInfo({
    required this.id,
    required this.eventId,
    required this.owner,
    required this.status,
    required this.verificationCode,
  });

  String get statusText {
    switch (status) {
      case 0:
        return 'Active';
      case 1:
        return 'Used';
      case 2:
        return 'Revoked';
      default:
        return 'Unknown';
    }
  }

  bool get isActive => status == 0;
}

class EventInfo {
  final String id;
  final String organizer;
  final int capacity;
  final int ticketsSold;
  final int status;

  EventInfo({
    required this.id,
    required this.organizer,
    required this.capacity,
    required this.ticketsSold,
    required this.status,
  });
}
