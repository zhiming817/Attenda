import 'package:flutter/material.dart';
import '../models/event_model.dart';
import '../services/sui_service.dart';

class EventController extends ChangeNotifier {
  final SuiService _suiService = SuiService();

  List<EventModel> _events = [];
  bool _isLoading = true;
  String? _error;

  List<EventModel> get events => _events;
  bool get isLoading => _isLoading;
  String? get error => _error;

  Future<void> loadEvents() async {
    try {
      _isLoading = true;
      _error = null;
      notifyListeners();

      _events = await _suiService.queryEvents();

      _isLoading = false;
      notifyListeners();
    } catch (e) {
      _error = e.toString();
      _isLoading = false;
      notifyListeners();
    }
  }

  Future<void> refresh() async {
    await loadEvents();
  }
}
