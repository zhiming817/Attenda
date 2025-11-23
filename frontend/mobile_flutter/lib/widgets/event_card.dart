import 'package:flutter/material.dart';
import 'package:webview_flutter/webview_flutter.dart';
import '../models/event_model.dart';
import '../views/check_in_screen.dart';

class EventCard extends StatelessWidget {
  final EventModel event;
  final String? currentUserAddress;

  const EventCard({
    super.key,
    required this.event,
    this.currentUserAddress,
  });

  @override
  Widget build(BuildContext context) {
    return Card(
      margin: const EdgeInsets.only(bottom: 16),
      elevation: 2,
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // 活动图片
            if (event.metadata?.imageUrl != null) ...[
              _buildImage(),
              const SizedBox(height: 12),
            ],

            // 标题
            Text(
              event.metadata?.title ?? 'Untitled Event',
              style: const TextStyle(fontSize: 20, fontWeight: FontWeight.bold),
            ),
            const SizedBox(height: 8),

            // 位置
            if (event.metadata?.location != null)
              _buildInfoRow(Icons.location_on, event.metadata!.location!),

            // 时间
            if (event.metadata?.startTime != null)
              _buildInfoRow(Icons.access_time, event.metadata!.startTime!),

            const SizedBox(height: 8),

            // 描述
            if (event.metadata?.description != null)
              Text(
                event.metadata!.description!,
                style: const TextStyle(fontSize: 14),
                maxLines: 3,
                overflow: TextOverflow.ellipsis,
              ),

            const SizedBox(height: 12),

            // 门票信息
            _buildTags(),

            const SizedBox(height: 12),

            // 签到按钮（仅活动组织者可见）
            if (_isOrganizer())
              SizedBox(
                width: double.infinity,
                child: ElevatedButton.icon(
                  onPressed: () {
                    Navigator.push(
                      context,
                      MaterialPageRoute(
                        builder:
                            (context) => CheckInScreen(eventId: event.eventId),
                      ),
                    );
                  },
                  icon: const Icon(Icons.qr_code_scanner),
                  label: const Text('Check-In'),
                  style: ElevatedButton.styleFrom(
                    backgroundColor: Colors.orange,
                    foregroundColor: Colors.white,
                    padding: const EdgeInsets.symmetric(vertical: 12),
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(8),
                    ),
                  ),
                ),
              ),
          ],
        ),
      ),
    );
  }

  /// 检查当前用户是否为活动组织者
  bool _isOrganizer() {
    if (currentUserAddress == null || currentUserAddress!.isEmpty) {
      return false;
    }
    return event.organizer.toLowerCase() == currentUserAddress!.toLowerCase();
  }

  Widget _buildImage() {
    final controller = WebViewController()
      ..setJavaScriptMode(JavaScriptMode.unrestricted)
      ..setBackgroundColor(Colors.transparent)
      ..loadHtmlString('''
        <!DOCTYPE html>
        <html>
        <head>
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <style>
            body { 
              margin: 0; 
              padding: 0; 
              display: flex; 
              justify-content: center; 
              align-items: center; 
              height: 200px;
              background: #f5f5f5;
            }
            img { 
              width: 100%; 
              height: 200px; 
              object-fit: cover;
              display: block;
            }
          </style>
        </head>
        <body>
          <img src="${event.metadata!.imageUrl!}" alt="Event Image">
        </body>
        </html>
      ''');

    return ClipRRect(
      borderRadius: BorderRadius.circular(8),
      child: SizedBox(
        width: double.infinity,
        height: 200,
        child: WebViewWidget(controller: controller),
      ),
    );
  }

  Widget _buildInfoRow(IconData icon, String text) {
    return Row(
      children: [
        Icon(icon, size: 16, color: Colors.grey),
        const SizedBox(width: 4),
        Expanded(child: Text(text, style: const TextStyle(color: Colors.grey))),
      ],
    );
  }

  Widget _buildTags() {
    return Row(
      children: [
        _buildTag(
          'Capacity: ${event.capacity}',
          Colors.blue.shade50,
          Colors.blue.shade700,
        ),
        const SizedBox(width: 8),
        _buildTag(
          'ID: ${event.eventId.substring(0, 8)}...',
          Colors.green.shade50,
          Colors.green.shade700,
        ),
      ],
    );
  }

  Widget _buildTag(String text, Color bgColor, Color textColor) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
      decoration: BoxDecoration(
        color: bgColor,
        borderRadius: BorderRadius.circular(4),
      ),
      child: Text(text, style: TextStyle(fontSize: 12, color: textColor)),
    );
  }
}
