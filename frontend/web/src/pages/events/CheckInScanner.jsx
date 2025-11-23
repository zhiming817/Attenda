import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useCurrentAccount, useSuiClient, useSignAndExecuteTransaction } from '@mysten/dapp-kit';
import { Transaction } from '@mysten/sui/transactions';
import { Html5QrcodeScanner } from 'html5-qrcode';
import Navbar from '../../layout/Navbar.jsx';
import Footer from '../../layout/Footer.jsx';

const PACKAGE_ID = import.meta.env.VITE_PACKAGE_ID;
const REGISTRY_ID = import.meta.env.VITE_REGISTRY_ID;

export default function CheckInScanner() {
  const { eventId } = useParams();
  const navigate = useNavigate();
  const currentAccount = useCurrentAccount();
  const suiClient = useSuiClient();
  const { mutate: signAndExecuteTransaction } = useSignAndExecuteTransaction();

  const [event, setEvent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [scanning, setScanning] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [scannedData, setScannedData] = useState(null);
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [scanner, setScanner] = useState(null);

  useEffect(() => {
    loadEvent();
  }, [eventId, currentAccount]);

  useEffect(() => {
    return () => {
      // 清理扫描器
      if (scanner) {
        scanner.clear().catch(console.error);
      }
    };
  }, [scanner]);

  const loadEvent = async () => {
    try {
      setLoading(true);
      setError('');

      if (!currentAccount) {
        setError('Please connect your wallet first');
        return;
      }

      // 加载活动信息
      const eventObj = await suiClient.getObject({
        id: eventId,
        options: {
          showContent: true,
        },
      });

      if (!eventObj.data) {
        throw new Error('Event not found');
      }

      const fields = eventObj.data.content?.fields || {};
      
      setEvent({
        id: eventId,
        organizer: fields.organizer,
        capacity: parseInt(fields.capacity || '0'),
        ticketsSold: parseInt(fields.num_tickets_sold || '0'),
        status: parseInt(fields.status || '0'),
      });

      // 检查当前用户是否为活动组织者
      const authorized = fields.organizer === currentAccount.address;
      setIsAuthorized(authorized);

      if (!authorized) {
        setError('You are not authorized to check in attendees for this event');
      }
    } catch (err) {
      console.error('Error loading event:', err);
      setError('Failed to load event details');
    } finally {
      setLoading(false);
    }
  };

  const startScanning = () => {
    setScanning(true);
    setError('');
    setSuccess('');
    setScannedData(null);

    // 等待 DOM 元素渲染后再初始化扫描器
    setTimeout(() => {
      const qrReaderElement = document.getElementById('qr-reader');
      if (!qrReaderElement) {
        setError('QR reader element not found');
        setScanning(false);
        return;
      }

      // 初始化扫描器
      const html5QrcodeScanner = new Html5QrcodeScanner(
        'qr-reader',
        { 
          fps: 10, 
          qrbox: { width: 250, height: 250 },
          aspectRatio: 1.0,
          rememberLastUsedCamera: true,
        },
        false
      );

      html5QrcodeScanner.render(onScanSuccess, onScanError);
      setScanner(html5QrcodeScanner);
    }, 100);
  };

  const stopScanning = () => {
    if (scanner) {
      scanner.clear().catch(console.error);
      setScanner(null);
    }
    setScanning(false);
  };

  const onScanSuccess = (decodedText) => {
    console.log('QR Code scanned:', decodedText);
    
    try {
      const qrData = JSON.parse(decodedText);
      
      // 验证二维码数据结构
      if (!qrData.ticketId || !qrData.eventId || !qrData.verificationCode) {
        throw new Error('Invalid QR code format');
      }

      // 验证是否为当前活动的票据
      if (qrData.eventId !== eventId) {
        throw new Error('This ticket is for a different event');
      }

      setScannedData(qrData);
      stopScanning();
      
      // 自动执行签到
      handleCheckIn(qrData);
    } catch (err) {
      console.error('QR code parse error:', err);
      setError(`Invalid QR code: ${err.message}`);
    }
  };

  const onScanError = (error) => {
    // 忽略扫描错误（正常情况下会频繁触发）
    if (error !== 'QR code parse error, error = NotFoundException: No MultiFormat Readers were able to detect the code.') {
      console.warn('QR scan error:', error);
    }
  };

  const handleCheckIn = async (qrData) => {
    if (!currentAccount || !isAuthorized) {
      setError('You are not authorized to perform check-ins');
      return;
    }

    setProcessing(true);
    setError('');
    setSuccess('');

    try {
      console.log('🎫 Starting check-in process...');
      console.log('Ticket ID:', qrData.ticketId);
      console.log('Verification Code:', qrData.verificationCode);

      // 1. 从链上获取票据验证状态
      const ticketObj = await suiClient.getObject({
        id: qrData.ticketId,
        options: {
          showContent: true,
          showOwner: true,
          showPreviousTransaction: true,
        },
      });

      if (!ticketObj.data) {
        throw new Error('Ticket not found');
      }

      const ticketFields = ticketObj.data.content?.fields || {};
      
      // 从 owner 字段获取票据持有者地址
      let ticketOwner;
      if (ticketObj.data.owner && typeof ticketObj.data.owner === 'object') {
        if (ticketObj.data.owner.AddressOwner) {
          ticketOwner = ticketObj.data.owner.AddressOwner;
        } else if (ticketObj.data.owner.ObjectOwner) {
          ticketOwner = ticketObj.data.owner.ObjectOwner;
        }
      }
      
      if (!ticketOwner) {
        throw new Error('Cannot determine ticket owner');
      }
      
      console.log('✅ Ticket validation passed');
      console.log('Ticket owner:', ticketOwner);
      
      // 验证票据状态（在内容字段中）
      if (ticketFields.status !== undefined && ticketFields.status !== 0) {
        const statusText = ticketFields.status === 1 ? 'already used' : 'revoked';
        throw new Error(`This ticket has been ${statusText}`);
      }

      // 验证票据所属活动
      if (ticketFields.event_id !== eventId) {
        throw new Error('This ticket is for a different event');
      }

      // 2. 构建签到交易
      const tx = new Transaction();

      // 调用 attendance::record_attendance_with_verification
      // 新参数: registry: &mut UsedTicketsRegistry, event: &EventInfo, user: address, 
      //        ticket_id: address (票据对象 ID), verification_code: vector<u8>, 
      //        verification_method: u8, clock: &Clock
      
      // 注意：合约已修改为接收 ticket_id (address) 而不是 ticket 对象引用
      // 这样组织者可以在不拥有票据的情况下完成签到
      tx.moveCall({
        target: `${PACKAGE_ID}::attendance::record_attendance_with_verification`,
        arguments: [
          tx.object(REGISTRY_ID), // UsedTicketsRegistry（shared object，可变引用）
          tx.object(eventId), // EventInfo 对象（shared object，不可变引用）
          tx.pure.address(ticketOwner), // 票据持有者地址
          tx.pure.address(qrData.ticketId), // 票据对象 ID（作为地址传递）
          tx.pure.vector('u8', Array.from(new TextEncoder().encode(qrData.verificationCode))), // 验证码（vector<u8>）
          tx.pure.u8(1), // verification_method: 1 = QR Code Scan
          tx.object('0x6'), // Clock 对象
        ],
      });

      console.log('📝 Executing check-in transaction...');

      signAndExecuteTransaction(
        {
          transaction: tx,
        },
        {
          onSuccess: (result) => {
            console.log('✅ Check-in successful:', result);
            setSuccess(`Check-in successful! Ticket holder: ${ticketOwner.slice(0, 6)}...${ticketOwner.slice(-4)}`);
            setScannedData(null);
            
            // 3秒后清除成功消息，可以继续扫描
            setTimeout(() => {
              setSuccess('');
            }, 3000);
          },
          onError: (error) => {
            console.error('❌ Check-in failed:', error);
            setError(`Check-in failed: ${error.message}`);
          },
        }
      );
    } catch (err) {
      console.error('❌ Check-in error:', err);
      setError(err.message || 'Failed to check in attendee');
    } finally {
      setProcessing(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-orange-50 to-red-50">
        <Navbar />
        <div className="flex items-center justify-center py-20">
          <div className="text-center">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-orange-500 border-t-transparent"></div>
            <p className="mt-4 text-gray-600 font-medium">Loading event...</p>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  if (error && !event) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-orange-50 to-red-50">
        <Navbar />
        <div className="max-w-4xl mx-auto px-4 py-20 text-center">
          <div className="text-6xl mb-4">😢</div>
          <h2 className="text-3xl font-bold text-gray-900 mb-4">Access Denied</h2>
          <p className="text-gray-600 mb-8">{error}</p>
          <button
            onClick={() => navigate(`/events/${eventId}`)}
            className="px-8 py-3 bg-gradient-to-r from-orange-500 to-red-600 text-white rounded-lg font-bold shadow-lg hover:shadow-xl transform hover:scale-105 transition-all"
          >
            Back to Event
          </button>
        </div>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 to-red-50">
      <Navbar />

      <div className="max-w-4xl mx-auto px-4 py-12">
        {/* Header */}
        <button
          onClick={() => navigate(`/events/${eventId}`)}
          className="mb-6 flex items-center gap-2 text-gray-600 hover:text-orange-600 font-medium transition-colors"
        >
          <span>←</span> Back to Event
        </button>

        <div className="bg-white rounded-2xl shadow-xl border-2 border-orange-200 overflow-hidden">
          {/* Header */}
          <div className="bg-gradient-to-r from-orange-500 to-red-600 p-6 text-white">
            <h1 className="text-3xl font-black mb-2">📱 Check-In Scanner</h1>
            <p className="text-orange-100">Scan attendee QR codes to mark attendance</p>
          </div>

          {/* Content */}
          <div className="p-8">
            {/* Event Info */}
            <div className="mb-6 p-4 bg-gradient-to-br from-orange-50 to-red-50 rounded-lg border-2 border-orange-200">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-gray-600">Event ID:</span>
                  <p className="font-mono font-bold text-gray-900">{eventId.slice(0, 8)}...{eventId.slice(-6)}</p>
                </div>
                <div>
                  <span className="text-gray-600">Tickets Sold:</span>
                  <p className="font-bold text-gray-900">{event?.ticketsSold} / {event?.capacity}</p>
                </div>
              </div>
            </div>

            {/* Messages */}
            {error && (
              <div className="mb-4 p-4 bg-red-50 border-l-4 border-red-500 text-red-700">
                <p className="font-medium">❌ {error}</p>
              </div>
            )}

            {success && (
              <div className="mb-4 p-4 bg-green-50 border-l-4 border-green-500 text-green-700">
                <p className="font-medium">✅ {success}</p>
              </div>
            )}

            {/* Scanner Area */}
            {!scanning && !processing && (
              <div className="text-center py-12">
                <div className="text-6xl mb-4">📷</div>
                <h3 className="text-2xl font-bold text-gray-900 mb-2">Ready to Scan</h3>
                <p className="text-gray-600 mb-6">
                  Click below to start scanning attendee QR codes
                </p>
                <button
                  onClick={startScanning}
                  disabled={!isAuthorized}
                  className="px-8 py-4 bg-gradient-to-r from-orange-500 to-red-600 text-white rounded-lg font-bold shadow-lg hover:shadow-xl transform hover:scale-105 transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
                >
                  🎫 Start Scanning
                </button>
              </div>
            )}

            {scanning && (
              <div>
                <div className="mb-4 text-center">
                  <h3 className="text-xl font-bold text-gray-900 mb-2">📷 Scanning...</h3>
                  <p className="text-gray-600">Position the QR code within the frame</p>
                </div>
                
                <div id="qr-reader" className="mb-4"></div>
                
                <button
                  onClick={stopScanning}
                  className="w-full px-6 py-3 bg-gray-500 text-white rounded-lg font-bold hover:bg-gray-600 transition-all"
                >
                  Stop Scanning
                </button>
              </div>
            )}

            {processing && (
              <div className="text-center py-12">
                <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-orange-500 border-t-transparent mb-4"></div>
                <p className="text-gray-600 font-medium">Processing check-in...</p>
              </div>
            )}

            {/* Scanned Data Display */}
            {scannedData && !processing && (
              <div className="mt-6 p-4 bg-blue-50 rounded-lg border-2 border-blue-200">
                <h4 className="text-lg font-bold text-blue-900 mb-3">📋 Scanned Ticket Info</h4>
                <div className="space-y-2 text-sm">
                  <div>
                    <span className="text-blue-700 font-medium">Ticket ID:</span>
                    <p className="font-mono text-blue-900">{scannedData.ticketId}</p>
                  </div>
                  <div>
                    <span className="text-blue-700 font-medium">Verification Code:</span>
                    <p className="font-mono text-xl font-bold text-blue-900">{scannedData.verificationCode}</p>
                  </div>
                  <div>
                    <span className="text-blue-700 font-medium">Holder:</span>
                    <p className="font-mono text-blue-900">{scannedData.holder}</p>
                  </div>
                </div>
              </div>
            )}

            {/* Instructions */}
            <div className="mt-6 p-4 bg-gray-50 rounded-lg border-2 border-gray-200">
              <h4 className="text-sm font-bold text-gray-900 mb-2">📖 Instructions</h4>
              <ul className="text-sm text-gray-700 space-y-1">
                <li>• Ask attendee to show their decrypted ticket QR code</li>
                <li>• Scan the QR code using your device camera</li>
                <li>• System will automatically verify and check in the attendee</li>
                <li>• Each ticket can only be checked in once</li>
                <li>• Only event organizers can perform check-ins</li>
              </ul>
            </div>
          </div>
        </div>
      </div>

      <Footer />
    </div>
  );
}
