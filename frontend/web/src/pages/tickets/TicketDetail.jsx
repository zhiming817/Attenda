import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useCurrentAccount, useSuiClient, useSignPersonalMessage } from '@mysten/dapp-kit';
import { decryptTicketMetadata } from '../../utils/ticketEncryption';
import QRCode from 'qrcode';
import Navbar from '../../layout/Navbar.jsx';
import Footer from '../../layout/Footer.jsx';

export default function TicketDetail() {
  const { ticketId } = useParams();
  const navigate = useNavigate();
  const currentAccount = useCurrentAccount();
  const suiClient = useSuiClient();
  const { mutateAsync: signPersonalMessage } = useSignPersonalMessage();

  const [ticket, setTicket] = useState(null);
  const [event, setEvent] = useState(null);
  const [decryptedData, setDecryptedData] = useState(null);
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState('');
  const [loading, setLoading] = useState(true);
  const [decrypting, setDecrypting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    loadTicket();
  }, [ticketId, currentAccount]);

  const loadTicket = async () => {
    try {
      setLoading(true);
      setError('');

      // 1. 从链上获取门票 NFT
      const ticketObject = await suiClient.getObject({
        id: ticketId,
        options: {
          showContent: true,
          showOwner: true,
        },
      });

      if (!ticketObject.data) {
        throw new Error('Ticket not found');
      }

      const ticketData = ticketObject.data.content.fields;
      setTicket(ticketData);

      // 2. 验证所有权
      if (ticketData.owner !== currentAccount?.address) {
        setError('You do not own this ticket');
        setLoading(false);
        return;
      }

      console.log('✅ Ticket loaded:', ticketData);
      
      // 3. 获取关联的活动信息（包含 policy_id）
      if (ticketData.event_id) {
        try {
          const eventObject = await suiClient.getObject({
            id: ticketData.event_id,
            options: {
              showContent: true,
            },
          });
          
          if (eventObject.data) {
            const eventFields = eventObject.data.content.fields;
            // 提取 policy_id
            let policyId = null;
            if (eventFields.policy_id) {
              policyId = typeof eventFields.policy_id === 'string' 
                ? eventFields.policy_id 
                : eventFields.policy_id.id || eventFields.policy_id;
            }
            setEvent({ ...eventFields, policyId });
            console.log('✅ Event loaded with policy_id:', policyId);
          }
        } catch (err) {
          console.error('Failed to load event:', err);
        }
      }
    } catch (err) {
      console.error('Error loading ticket:', err);
      setError(err.message || 'Failed to load ticket');
    } finally {
      setLoading(false);
    }
  };

  const handleDecrypt = async () => {
    try {
      setDecrypting(true);
      setError('');

      console.log('🔓 Decrypting ticket metadata...');
      
      // 检查钱包连接
      if (!currentAccount) {
        throw new Error('Please connect your wallet first.');
      }
      
      // 检查是否有 policy_id
      if (!event || !event.policyId) {
        throw new Error('Policy ID not found. Cannot decrypt ticket without policy information.');
      }

      // 从 Walrus 获取并解密元数据
      const walrusBlobId = ticket.walrus_blob_ref;
      const decrypted = await decryptTicketMetadata(
        walrusBlobId,
        currentAccount.address,
        event.policyId, // 传递 policy ID
        suiClient, // 传递 suiClient
        signPersonalMessage // 传递签名函数
      );

      setDecryptedData(decrypted);
      console.log('✅ Decryption successful');
      
      // 生成包含真实 ticket ID 的二维码
      const qrData = {
        ticketId: ticketId, // 使用真实的 ticket NFT ID
        eventId: ticket.event_id,
        holder: currentAccount.address,
        timestamp: Date.now(),
        verificationCode: decrypted.encryptedData.verificationCode,
      };
      
      const qrCodeUrl = await QRCode.toDataURL(JSON.stringify(qrData), {
        errorCorrectionLevel: 'H',
        margin: 1,
        width: 300,
        color: {
          dark: '#000000',
          light: '#FFFFFF',
        },
      });
      
      setQrCodeDataUrl(qrCodeUrl);
      console.log('✅ QR Code generated with real ticket ID');
    } catch (err) {
      console.error('❌ Decryption failed:', err);
      setError(err.message || 'Failed to decrypt ticket data');
    } finally {
      setDecrypting(false);
    }
  };

  const getStatusBadge = (status) => {
    const statusMap = {
      0: { text: 'Valid', color: 'bg-green-100 text-green-800 border-green-300', icon: '✅' },
      1: { text: 'Used', color: 'bg-gray-100 text-gray-800 border-gray-300', icon: '✓' },
      2: { text: 'Revoked', color: 'bg-red-100 text-red-800 border-red-300', icon: '❌' },
    };
    return statusMap[status] || statusMap[0];
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-orange-50 to-red-50">
        <Navbar />
        <div className="flex items-center justify-center py-20">
          <div className="text-center">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-orange-500 border-t-transparent"></div>
            <p className="mt-4 text-gray-600 font-medium">Loading ticket...</p>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  if (error && !ticket) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-orange-50 to-red-50">
        <Navbar />
        <div className="max-w-4xl mx-auto px-4 py-20 text-center">
          <div className="text-6xl mb-4">😢</div>
          <h2 className="text-3xl font-bold text-gray-900 mb-4">Ticket Not Found</h2>
          <p className="text-gray-600 mb-8">{error}</p>
          <button
            onClick={() => navigate('/tickets/my')}
            className="px-8 py-3 bg-gradient-to-r from-orange-500 to-red-600 text-white rounded-lg font-bold shadow-lg hover:shadow-xl transform hover:scale-105 transition-all"
          >
            Back to My Tickets
          </button>
        </div>
        <Footer />
      </div>
    );
  }

  const statusBadge = getStatusBadge(ticket?.status);

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 to-red-50">
      <Navbar />

      <div className="max-w-4xl mx-auto px-4 py-12">
        {/* Back Button */}
        <button
          onClick={() => navigate('/tickets/my')}
          className="mb-6 flex items-center gap-2 text-gray-600 hover:text-orange-600 font-medium transition-colors"
        >
          <span>←</span> Back to My Tickets
        </button>

        {/* Ticket Card */}
        <div className="bg-white rounded-2xl shadow-xl border-2 border-orange-200 overflow-hidden">
          {/* Header */}
          <div className="bg-gradient-to-r from-orange-500 to-red-600 p-6 text-white">
            <div className="flex items-center justify-between mb-4">
              <h1 className="text-3xl font-black">🎫 Your Ticket</h1>
              <span className={`px-4 py-2 rounded-full text-sm font-bold border-2 ${statusBadge.color}`}>
                {statusBadge.icon} {statusBadge.text}
              </span>
            </div>
            <p className="text-orange-100">NFT Ticket with Seal-encrypted metadata</p>
          </div>

          {/* Public Information */}
          <div className="p-8 border-b-2 border-gray-100">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Ticket Information</h2>
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-gray-900">Ticket ID</p>
                <p className="font-mono text-sm text-gray-900">{ticketId.slice(0, 20)}...</p>
              </div>
              <div>
                <p className="text-sm text-gray-900">Event ID</p>
                <p className="font-mono text-sm text-gray-900">{ticket?.event_id.slice(0, 20)}...</p>
              </div>
              <div>
                <p className="text-sm text-gray-900">Name</p>
                <p className="font-medium text-gray-900">{ticket?.name}</p>
              </div>
              <div>
                <p className="text-sm text-gray-900">Type</p>
                <p className="font-medium text-gray-900">
                  {ticket?.ticket_type === 0 ? 'General Admission' : 'VIP'}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-900">Created At</p>
                <p className="font-medium text-gray-900">
                  {new Date(parseInt(ticket?.created_at)).toLocaleString()}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-900">Walrus Blob ID</p>
                <p className="font-mono text-xs break-all text-gray-900">{ticket?.walrus_blob_ref}</p>
              </div>
            </div>
          </div>

          {/* Decrypt Section */}
          {!decryptedData && (
            <div className="p-8 bg-gradient-to-br from-orange-50 to-red-50">
              <div className="text-center">
                <div className="text-6xl mb-4">🔐</div>
                <h3 className="text-2xl font-bold text-gray-900 mb-2">
                  Encrypted Ticket Details
                </h3>
                <p className="text-gray-600 mb-6">
                  Your ticket contains encrypted metadata including location, QR code, and access link.
                  Click below to decrypt and view your full ticket details.
                </p>
                {error && (
                  <div className="mb-4 p-4 bg-red-50 border-l-4 border-red-500 text-red-700 text-sm">
                    {error}
                  </div>
                )}
                <button
                  onClick={handleDecrypt}
                  disabled={decrypting || ticket?.status !== 0}
                  className="px-8 py-3 bg-gradient-to-r from-orange-500 to-red-600 text-white rounded-lg font-bold shadow-lg hover:shadow-xl transform hover:scale-105 transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
                >
                  {decrypting ? (
                    <span className="flex items-center gap-2">
                      <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                      </svg>
                      Decrypting...
                    </span>
                  ) : (
                    '🔓 Decrypt & View Ticket'
                  )}
                </button>
              </div>
            </div>
          )}

          {/* Decrypted Data */}
          {decryptedData && (
            <>
              <div className="p-8 bg-gradient-to-br from-green-50 to-blue-50">
                <div className="flex items-center gap-2 mb-4">
                  <span className="text-2xl">✅</span>
                  <h2 className="text-xl font-bold text-gray-900">
                    Decrypted Ticket Details
                  </h2>
                </div>
                <div className="space-y-4">
                  <div className="bg-white p-4 rounded-lg shadow">
                    <p className="text-sm text-gray-600 mb-1">📍 Event Location</p>
                    <p className="font-bold text-lg text-gray-900">{decryptedData.encryptedData.location}</p>
                  </div>
                  <div className="bg-white p-4 rounded-lg shadow">
                    <p className="text-sm text-gray-600 mb-1">🕐 Start Time</p>
                    <p className="font-bold text-gray-900">
                      {new Date(decryptedData.encryptedData.startTime).toLocaleString()}
                    </p>
                  </div>
                  <div className="bg-white p-4 rounded-lg shadow">
                    <p className="text-sm text-gray-600 mb-1">🔑 Verification Code</p>
                    <p className="font-mono text-2xl font-black text-orange-600">
                      {decryptedData.encryptedData.verificationCode}
                    </p>
                  </div>
                  <div className="bg-white p-4 rounded-lg shadow">
                    <p className="text-sm text-gray-600 mb-1">🔗 Access Link</p>
                    <a
                      href={decryptedData.encryptedData.accessLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:underline break-all"
                    >
                      {decryptedData.encryptedData.accessLink}
                    </a>
                  </div>
                </div>
              </div>

              {/* QR Code */}
              <div className="p-8 text-center border-t-2 border-gray-100">
                <h2 className="text-xl font-bold text-gray-900 mb-4">Entry QR Code</h2>
                <div className="inline-block p-4 bg-white rounded-lg shadow-lg">
                  <img
                    src={qrCodeDataUrl || decryptedData.encryptedData.qrCode}
                    alt="Ticket QR Code"
                    className="max-w-xs mx-auto"
                  />
                </div>
                <p className="text-sm text-gray-600 mt-4">
                  Present this QR code at the venue entrance for verification
                </p>
              </div>
            </>
          )}
        </div>
      </div>

      <Footer />
    </div>
  );
}
