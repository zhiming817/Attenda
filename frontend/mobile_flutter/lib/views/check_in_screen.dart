import 'package:flutter/material.dart';
import 'package:mobile_scanner/mobile_scanner.dart';
import 'package:provider/provider.dart';
import '../controllers/checkin_controller.dart';

class CheckInScreen extends StatefulWidget {
  final String eventId;

  const CheckInScreen({super.key, required this.eventId});

  @override
  State<CheckInScreen> createState() => _CheckInScreenState();
}

class _CheckInScreenState extends State<CheckInScreen> {
  late MobileScannerController _cameraController;
  late CheckInController _controller;
  bool _isScanning = false;
  bool _isInitialized = false;

  @override
  void initState() {
    super.initState();
    _controller = CheckInController();
    _cameraController = MobileScannerController(
      autoStart: false,
      detectionSpeed: DetectionSpeed.normal,
      facing: CameraFacing.back,
      returnImage: false,
    );
    _initializeController();
  }

  Future<void> _initializeController() async {
    await _controller.initialize(widget.eventId);
    if (mounted) {
      setState(() {
        _isInitialized = true;
      });
    }
  }

  @override
  void dispose() {
    _cameraController.dispose();
    _controller.dispose();
    super.dispose();
  }

  void _onDetect(BarcodeCapture capture) {
    if (!_isScanning || _controller.isProcessing) return;

    final List<Barcode> barcodes = capture.barcodes;

    if (barcodes.isNotEmpty) {
      final String? code = barcodes.first.rawValue;

      if (code != null && code.isNotEmpty) {
        setState(() {
          _isScanning = false;
        });

        // 停止扫描
        _stopScanningCamera();

        // 处理二维码
        _controller.handleScanResult(code);
      }
    }
  }

  Future<void> _startScanning() async {
    if (_isScanning) return;

    setState(() {
      _isScanning = true;
    });
    _controller.resetScan();

    try {
      await _cameraController.start();
    } catch (e) {
      print('❌ Error starting camera: $e');
      if (mounted) {
        setState(() {
          _isScanning = false;
        });
        ScaffoldMessenger.of(
          context,
        ).showSnackBar(SnackBar(content: Text('Failed to start camera: $e')));
      }
    }
  }

  Future<void> _stopScanningCamera() async {
    if (!_isScanning) return;

    try {
      await _cameraController.stop();
    } catch (e) {
      print('❌ Error stopping camera: $e');
    }
  }

  void _stopScanning() {
    setState(() {
      _isScanning = false;
    });
    _stopScanningCamera();
  }

  @override
  Widget build(BuildContext context) {
    return ChangeNotifierProvider.value(
      value: _controller,
      child: Scaffold(
        appBar: AppBar(
          backgroundColor: Colors.orange,
          title: const Text(
            '📷 Check-In Scanner',
            style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold),
          ),
          iconTheme: const IconThemeData(color: Colors.white),
          actions: [
            if (_isScanning && _isInitialized) ...[
              IconButton(
                icon: const Icon(Icons.flash_on),
                onPressed: () async {
                  try {
                    await _cameraController.toggleTorch();
                  } catch (e) {
                    print('❌ Error toggling torch: $e');
                  }
                },
              ),
              IconButton(
                icon: const Icon(Icons.flip_camera_ios),
                onPressed: () async {
                  try {
                    await _cameraController.switchCamera();
                  } catch (e) {
                    print('❌ Error switching camera: $e');
                  }
                },
              ),
            ],
          ],
        ),
        body: Consumer<CheckInController>(
          builder: (context, controller, child) {
            if (controller.isLoading) {
              return const Center(
                child: Column(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    CircularProgressIndicator(color: Colors.orange),
                    SizedBox(height: 16),
                    Text('Loading event...', style: TextStyle(fontSize: 16)),
                  ],
                ),
              );
            }

            if (controller.error != null && controller.eventInfo == null) {
              return Center(
                child: Padding(
                  padding: const EdgeInsets.all(20),
                  child: Column(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      const Icon(
                        Icons.error_outline,
                        size: 64,
                        color: Colors.red,
                      ),
                      const SizedBox(height: 16),
                      Text(
                        controller.error!,
                        style: const TextStyle(fontSize: 16, color: Colors.red),
                        textAlign: TextAlign.center,
                      ),
                      const SizedBox(height: 8),
                      Text(
                        'Event ID: ${widget.eventId}',
                        style: const TextStyle(
                          fontSize: 12,
                          color: Colors.grey,
                          fontFamily: 'monospace',
                        ),
                        textAlign: TextAlign.center,
                      ),
                      const SizedBox(height: 24),
                      ElevatedButton(
                        onPressed: () => Navigator.pop(context),
                        child: const Text('Back'),
                      ),
                    ],
                  ),
                ),
              );
            }

            return Column(
              children: [
                // Event Info Card
                if (controller.eventInfo != null)
                  Container(
                    margin: const EdgeInsets.all(16),
                    padding: const EdgeInsets.all(16),
                    decoration: BoxDecoration(
                      gradient: const LinearGradient(
                        colors: [Color(0xFFFFF3E0), Color(0xFFFFE0B2)],
                      ),
                      borderRadius: BorderRadius.circular(12),
                      border: Border.all(color: Colors.orange, width: 2),
                    ),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Row(
                          children: [
                            const Icon(Icons.event, color: Colors.orange),
                            const SizedBox(width: 8),
                            Expanded(
                              child: Text(
                                'Event ID: ${controller.eventInfo!.id.substring(0, 8)}...${controller.eventInfo!.id.substring(controller.eventInfo!.id.length - 6)}',
                                style: const TextStyle(
                                  fontWeight: FontWeight.bold,
                                  fontFamily: 'monospace',
                                ),
                              ),
                            ),
                          ],
                        ),
                        const SizedBox(height: 8),
                        Row(
                          mainAxisAlignment: MainAxisAlignment.spaceBetween,
                          children: [
                            Text(
                              'Tickets: ${controller.eventInfo!.ticketsSold} / ${controller.eventInfo!.capacity}',
                            ),
                            if (controller.isAuthorized)
                              const Row(
                                children: [
                                  Icon(
                                    Icons.check_circle,
                                    color: Colors.green,
                                    size: 16,
                                  ),
                                  SizedBox(width: 4),
                                  Text(
                                    'Authorized',
                                    style: TextStyle(
                                      color: Colors.green,
                                      fontWeight: FontWeight.bold,
                                    ),
                                  ),
                                ],
                              ),
                          ],
                        ),
                      ],
                    ),
                  ),

                // Messages
                if (controller.error != null)
                  Container(
                    margin: const EdgeInsets.symmetric(
                      horizontal: 16,
                      vertical: 8,
                    ),
                    padding: const EdgeInsets.all(12),
                    decoration: BoxDecoration(
                      color: Colors.red.shade50,
                      border: Border(
                        left: BorderSide(color: Colors.red, width: 4),
                      ),
                      borderRadius: BorderRadius.circular(8),
                    ),
                    child: Row(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        const Icon(Icons.error, color: Colors.red, size: 20),
                        const SizedBox(width: 12),
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(
                                controller.error!,
                                style: const TextStyle(
                                  color: Colors.red,
                                  fontWeight: FontWeight.w500,
                                  fontSize: 13,
                                ),
                              ),
                              if (controller.error!.contains(
                                'not signed by the correct sender',
                              )) ...[
                                const SizedBox(height: 8),
                                Container(
                                  padding: const EdgeInsets.all(8),
                                  decoration: BoxDecoration(
                                    color: Colors.orange.shade50,
                                    borderRadius: BorderRadius.circular(4),
                                    border: Border.all(
                                      color: Colors.orange.shade200,
                                    ),
                                  ),
                                  child: const Column(
                                    crossAxisAlignment:
                                        CrossAxisAlignment.start,
                                    children: [
                                      Text(
                                        '⚠️ Blockchain Limitation',
                                        style: TextStyle(
                                          fontWeight: FontWeight.bold,
                                          fontSize: 12,
                                          color: Colors.orange,
                                        ),
                                      ),
                                      SizedBox(height: 4),
                                      Text(
                                        'Due to Sui blockchain ownership rules, only the ticket owner can modify their ticket.',
                                        style: TextStyle(
                                          fontSize: 11,
                                          color: Colors.orange,
                                        ),
                                      ),
                                    ],
                                  ),
                                ),
                              ],
                            ],
                          ),
                        ),
                      ],
                    ),
                  ),

                if (controller.success != null)
                  Container(
                    margin: const EdgeInsets.symmetric(
                      horizontal: 16,
                      vertical: 8,
                    ),
                    padding: const EdgeInsets.all(12),
                    decoration: BoxDecoration(
                      color: Colors.green.shade50,
                      border: Border(
                        left: BorderSide(color: Colors.green, width: 4),
                      ),
                      borderRadius: BorderRadius.circular(8),
                    ),
                    child: Row(
                      children: [
                        const Icon(Icons.check_circle, color: Colors.green),
                        const SizedBox(width: 12),
                        Expanded(
                          child: Text(
                            controller.success!,
                            style: const TextStyle(
                              color: Colors.green,
                              fontWeight: FontWeight.w500,
                            ),
                          ),
                        ),
                      ],
                    ),
                  ),

                // Scanned Ticket Info Display
                if (controller.scannedData != null && !controller.isProcessing)
                  Container(
                    margin: const EdgeInsets.symmetric(
                      horizontal: 16,
                      vertical: 8,
                    ),
                    padding: const EdgeInsets.all(16),
                    decoration: BoxDecoration(
                      color: Colors.blue.shade50,
                      borderRadius: BorderRadius.circular(12),
                      border: Border.all(color: Colors.blue, width: 2),
                    ),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Row(
                          children: [
                            Icon(Icons.qr_code, color: Colors.blue.shade700),
                            const SizedBox(width: 8),
                            Text(
                              'Scanned Ticket Info',
                              style: TextStyle(
                                fontSize: 16,
                                fontWeight: FontWeight.bold,
                                color: Colors.blue.shade900,
                              ),
                            ),
                          ],
                        ),
                        const SizedBox(height: 12),
                        _buildInfoRow(
                          'Ticket ID:',
                          controller.scannedData!.ticketId,
                          Colors.blue.shade700,
                        ),
                        const SizedBox(height: 8),
                        _buildInfoRow(
                          'Verification Code:',
                          controller.scannedData!.verificationCode,
                          Colors.blue.shade700,
                          isCode: true,
                        ),
                        const SizedBox(height: 8),
                        _buildInfoRow(
                          'Holder:',
                          controller.scannedData!.holder,
                          Colors.blue.shade700,
                        ),
                      ],
                    ),
                  ),

                // Scanner Area
                Expanded(
                  child:
                      _isScanning && _isInitialized
                          ? Stack(
                            children: [
                              MobileScanner(
                                controller: _cameraController,
                                onDetect: _onDetect,
                              ),
                              _buildScannerOverlay(),
                              if (controller.isProcessing)
                                Container(
                                  color: Colors.black54,
                                  child: const Center(
                                    child: Column(
                                      mainAxisAlignment:
                                          MainAxisAlignment.center,
                                      children: [
                                        CircularProgressIndicator(
                                          color: Colors.white,
                                        ),
                                        SizedBox(height: 16),
                                        Text(
                                          'Processing check-in...',
                                          style: TextStyle(
                                            color: Colors.white,
                                            fontSize: 16,
                                          ),
                                        ),
                                      ],
                                    ),
                                  ),
                                ),
                            ],
                          )
                          : _buildStartScanningView(),
                ),

                // Bottom Button
                SafeArea(
                  child: Padding(
                    padding: const EdgeInsets.all(16),
                    child: SizedBox(
                      width: double.infinity,
                      height: 50,
                      child: ElevatedButton(
                        onPressed:
                            controller.isAuthorized && _isInitialized
                                ? (_isScanning ? _stopScanning : _startScanning)
                                : null,
                        style: ElevatedButton.styleFrom(
                          backgroundColor:
                              _isScanning ? Colors.grey : Colors.orange,
                          foregroundColor: Colors.white,
                          shape: RoundedRectangleBorder(
                            borderRadius: BorderRadius.circular(12),
                          ),
                        ),
                        child: Text(
                          !_isInitialized
                              ? 'Initializing...'
                              : (_isScanning
                                  ? 'Stop Scanning'
                                  : 'Start Scanning'),
                          style: const TextStyle(
                            fontSize: 18,
                            fontWeight: FontWeight.bold,
                          ),
                        ),
                      ),
                    ),
                  ),
                ),
              ],
            );
          },
        ),
      ),
    );
  }

  Widget _buildScannerOverlay() {
    return Column(
      children: [
        Expanded(child: Container(color: Colors.black54)),
        Row(
          children: [
            Expanded(child: Container(height: 300, color: Colors.black54)),
            Container(
              width: 300,
              height: 300,
              decoration: BoxDecoration(
                border: Border.all(color: Colors.orange, width: 2),
                borderRadius: BorderRadius.circular(12),
              ),
              child: Stack(
                children: List.generate(4, (index) {
                  final isTop = index < 2;
                  final isLeft = index % 2 == 0;
                  return Positioned(
                    top: isTop ? 0 : null,
                    bottom: isTop ? null : 0,
                    left: isLeft ? 0 : null,
                    right: isLeft ? null : 0,
                    child: Container(
                      width: 30,
                      height: 30,
                      decoration: BoxDecoration(
                        border: Border(
                          top:
                              isTop
                                  ? const BorderSide(
                                    color: Colors.orange,
                                    width: 4,
                                  )
                                  : BorderSide.none,
                          bottom:
                              !isTop
                                  ? const BorderSide(
                                    color: Colors.orange,
                                    width: 4,
                                  )
                                  : BorderSide.none,
                          left:
                              isLeft
                                  ? const BorderSide(
                                    color: Colors.orange,
                                    width: 4,
                                  )
                                  : BorderSide.none,
                          right:
                              !isLeft
                                  ? const BorderSide(
                                    color: Colors.orange,
                                    width: 4,
                                  )
                                  : BorderSide.none,
                        ),
                      ),
                    ),
                  );
                }),
              ),
            ),
            Expanded(child: Container(height: 300, color: Colors.black54)),
          ],
        ),
        Expanded(
          child: Container(
            color: Colors.black54,
            child: const Center(
              child: Padding(
                padding: EdgeInsets.all(20),
                child: Text(
                  'Place QR code within the frame to scan',
                  style: TextStyle(color: Colors.white, fontSize: 16),
                  textAlign: TextAlign.center,
                ),
              ),
            ),
          ),
        ),
      ],
    );
  }

  Widget _buildStartScanningView() {
    return Center(
      child: SingleChildScrollView(
        padding: const EdgeInsets.all(20),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            const Icon(Icons.qr_code_scanner, size: 80, color: Colors.orange),
            const SizedBox(height: 20),
            const Text(
              'Ready to Scan',
              style: TextStyle(fontSize: 22, fontWeight: FontWeight.bold),
            ),
            const SizedBox(height: 10),
            const Padding(
              padding: EdgeInsets.symmetric(horizontal: 30),
              child: Text(
                'Tap the button below to scan attendee ticket QR codes',
                style: TextStyle(fontSize: 15, color: Colors.grey),
                textAlign: TextAlign.center,
              ),
            ),
            const SizedBox(height: 24),
            Container(
              padding: const EdgeInsets.all(14),
              margin: const EdgeInsets.symmetric(horizontal: 20),
              decoration: BoxDecoration(
                color: Colors.grey.shade100,
                borderRadius: BorderRadius.circular(12),
                border: Border.all(color: Colors.grey.shade300, width: 2),
              ),
              child: const Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      Icon(Icons.info_outline, size: 18, color: Colors.grey),
                      SizedBox(width: 8),
                      Text(
                        'Instructions',
                        style: TextStyle(
                          fontWeight: FontWeight.bold,
                          fontSize: 13,
                        ),
                      ),
                    ],
                  ),
                  SizedBox(height: 10),
                  Text(
                    '• Ask attendee to show their decrypted ticket QR code',
                    style: TextStyle(fontSize: 12),
                  ),
                  SizedBox(height: 5),
                  Text(
                    '• Align QR code with the scanning frame',
                    style: TextStyle(fontSize: 12),
                  ),
                  SizedBox(height: 5),
                  Text(
                    '• System will automatically verify and check in',
                    style: TextStyle(fontSize: 12),
                  ),
                  SizedBox(height: 5),
                  Text(
                    '• Each ticket can only be checked in once',
                    style: TextStyle(fontSize: 12),
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildInfoRow(
    String label,
    String value,
    Color color, {
    bool isCode = false,
  }) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          label,
          style: TextStyle(
            fontSize: 12,
            fontWeight: FontWeight.w500,
            color: color,
          ),
        ),
        const SizedBox(height: 4),
        Text(
          value,
          style: TextStyle(
            fontSize: isCode ? 18 : 13,
            fontWeight: isCode ? FontWeight.bold : FontWeight.normal,
            fontFamily: 'monospace',
            color: color.withOpacity(0.9),
          ),
        ),
      ],
    );
  }
}
