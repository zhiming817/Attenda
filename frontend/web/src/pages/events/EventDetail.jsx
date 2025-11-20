import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useCurrentAccount, useSignAndExecuteTransaction, useSuiClient } from '@mysten/dapp-kit';
import { Transaction } from '@mysten/sui/transactions';
import Navbar from '../../layout/Navbar.jsx';
import Footer from '../../layout/Footer.jsx';

const PACKAGE_ID = '0x5a29cc03847b88c5225fb960e6a6ada5ef7ff9fa57494e69a8d831d82f7a5f21';

export default function EventDetail() {
  const { eventId } = useParams();
  const navigate = useNavigate();
  const currentAccount = useCurrentAccount();
  const suiClient = useSuiClient();
  const { mutate: signAndExecuteTransaction } = useSignAndExecuteTransaction();

  const [event, setEvent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [purchasing, setPurchasing] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    loadEvent();
  }, [eventId]);

  const loadEvent = async () => {
    try {
      setLoading(true);
      
      const eventObj = await suiClient.getObject({
        id: eventId,
        options: {
          showContent: true,
          showDisplay: true,
          showOwner: true,
        },
      });

      if (!eventObj.data) {
        setError('Event not found');
        return;
      }

      const fields = eventObj.data.content?.fields || {};
      setEvent({
        id: eventId,
        organizer: fields.organizer,
        walrusBlobId: fields.walrus_blob_id,
        capacity: parseInt(fields.capacity || '0'),
        ticketsSold: parseInt(fields.num_tickets_sold || '0'),
        status: parseInt(fields.status || '0'),
        createdAt: parseInt(fields.created_at || '0'),
        updatedAt: parseInt(fields.updated_at || '0'),
      });
    } catch (error) {
      console.error('Error loading event:', error);
      setError('Failed to load event details');
    } finally {
      setLoading(false);
    }
  };

  const handlePurchaseTicket = async () => {
    if (!currentAccount) {
      alert('Please connect your wallet first');
      return;
    }

    if (event.status !== 0) {
      alert('This event is not active');
      return;
    }

    if (event.ticketsSold >= event.capacity) {
      alert('This event is sold out');
      return;
    }

    setPurchasing(true);
    setError('');

    try {
      const tx = new Transaction();
      
      // 调用 mint_ticket 函数
      // mint_ticket(event: &mut EventInfo, to: address, walrus_blob_ref: vector<u8>, encrypted_meta_hash: vector<u8>, ticket_type: u8, ctx: &mut TxContext)
      tx.moveCall({
        target: `${PACKAGE_ID}::ticket_nft::mint_ticket`,
        arguments: [
          tx.object(eventId), // event: &mut EventInfo
          tx.pure.address(currentAccount.address), // to: address
          tx.pure.vector('u8', Array.from(new TextEncoder().encode('ticket-metadata'))), // walrus_blob_ref: vector<u8>
          tx.pure.vector('u8', []), // encrypted_meta_hash: vector<u8> (空数组表示无加密)
          tx.pure.u8(0), // ticket_type: u8 (0 = 普通票)
        ],
      });

      signAndExecuteTransaction(
        {
          transaction: tx,
        },
        {
          onSuccess: (result) => {
            console.log('Ticket purchased successfully:', result);
            alert('🎫 Ticket purchased successfully!');
            loadEvent(); // 重新加载活动数据
          },
          onError: (error) => {
            console.error('Error purchasing ticket:', error);
            setError(error.message || 'Failed to purchase ticket');
            setPurchasing(false);
          },
        }
      );
    } catch (err) {
      console.error('Error:', err);
      setError(err.message || 'An unexpected error occurred');
      setPurchasing(false);
    }
  };

  const getStatusInfo = (status) => {
    const statusMap = {
      0: { text: 'Active', color: 'bg-green-100 text-green-800 border-green-200', icon: '✅' },
      1: { text: 'Paused', color: 'bg-yellow-100 text-yellow-800 border-yellow-200', icon: '⏸️' },
      2: { text: 'Closed', color: 'bg-gray-100 text-gray-800 border-gray-200', icon: '🔒' },
      3: { text: 'Cancelled', color: 'bg-red-100 text-red-800 border-red-200', icon: '❌' },
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
            <p className="mt-4 text-gray-600 font-medium">Loading event details...</p>
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
          <h2 className="text-3xl font-bold text-gray-900 mb-4">Event Not Found</h2>
          <p className="text-gray-600 mb-8">{error}</p>
          <button
            onClick={() => navigate('/events/browse')}
            className="px-8 py-3 bg-gradient-to-r from-orange-500 to-red-600 text-white rounded-lg font-bold shadow-lg hover:shadow-xl transform hover:scale-105 transition-all"
          >
            Back to Events
          </button>
        </div>
        <Footer />
      </div>
    );
  }

  const statusInfo = getStatusInfo(event.status);
  const availableTickets = event.capacity - event.ticketsSold;
  const isSoldOut = availableTickets <= 0;
  const isActive = event.status === 0;

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 to-red-50">
      <Navbar />
      
      <div className="max-w-6xl mx-auto px-4 py-12">
        {/* Back Button */}
        <button
          onClick={() => navigate('/events/browse')}
          className="mb-6 flex items-center gap-2 text-gray-600 hover:text-orange-600 font-medium transition-colors"
        >
          <span>←</span> Back to Events
        </button>

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Event Header */}
            <div className="bg-white rounded-2xl shadow-xl border-2 border-orange-200 overflow-hidden">
              {/* Event Image */}
              <div className="h-64 bg-gradient-to-br from-orange-400 to-red-500 flex items-center justify-center">
                <span className="text-white text-8xl">🎭</span>
              </div>

              {/* Event Info */}
              <div className="p-8">
                <div className="flex items-center gap-3 mb-4">
                  <span className={`px-4 py-2 rounded-full text-sm font-bold border-2 ${statusInfo.color}`}>
                    {statusInfo.icon} {statusInfo.text}
                  </span>
                  <span className="text-sm text-gray-500">
                    Event ID: {eventId.slice(0, 8)}...{eventId.slice(-6)}
                  </span>
                </div>

                <h1 className="text-3xl md:text-4xl font-black text-gray-900 mb-4">
                  Event #{eventId.slice(0, 16)}...
                </h1>

                <div className="space-y-4 text-gray-700">
                  <div className="flex items-start gap-3">
                    <span className="text-2xl">📍</span>
                    <div>
                      <div className="font-bold text-gray-900">Walrus Blob ID</div>
                      <div className="text-sm break-all">{event.walrusBlobId}</div>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <span className="text-2xl">👤</span>
                    <div>
                      <div className="font-bold text-gray-900">Organizer</div>
                      <div className="text-sm font-mono">{event.organizer}</div>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <span className="text-2xl">🎫</span>
                    <div>
                      <div className="font-bold text-gray-900">Capacity</div>
                      <div className="text-sm">
                        {event.ticketsSold} / {event.capacity} tickets sold
                        {isSoldOut && <span className="ml-2 text-red-600 font-bold">SOLD OUT</span>}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <span className="text-2xl">📅</span>
                    <div>
                      <div className="font-bold text-gray-900">Created</div>
                      <div className="text-sm">
                        {new Date(event.createdAt).toLocaleString()}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* About */}
            <div className="bg-white rounded-2xl shadow-xl border-2 border-orange-200 p-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">About This Event</h2>
              <p className="text-gray-700 leading-relaxed">
                This is a blockchain-based event with NFT tickets stored on the Sui network. 
                Event metadata is stored on Walrus for decentralized, permanent access. 
                Each ticket is a unique NFT that grants you access to the event and serves 
                as proof of attendance.
              </p>
            </div>
          </div>

          {/* Sidebar */}
          <div className="lg:col-span-1">
            {/* Purchase Card */}
            <div className="bg-white rounded-2xl shadow-xl border-2 border-orange-200 p-6 sticky top-4">
              <h3 className="text-2xl font-bold text-gray-900 mb-4">Get Your Ticket</h3>

              {error && (
                <div className="mb-4 p-3 bg-red-50 border-l-4 border-red-500 text-red-700 text-sm">
                  {error}
                </div>
              )}

              {/* Ticket Stats */}
              <div className="mb-6 p-4 bg-gradient-to-br from-orange-50 to-red-50 rounded-lg border-2 border-orange-200">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-gray-600 font-medium">Available</span>
                  <span className="text-2xl font-black text-orange-600">
                    {availableTickets}
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-3">
                  <div
                    className="bg-gradient-to-r from-orange-500 to-red-600 h-3 rounded-full transition-all"
                    style={{ width: `${(event.ticketsSold / event.capacity) * 100}%` }}
                  />
                </div>
                <div className="mt-2 text-xs text-gray-500 text-center">
                  {event.ticketsSold} / {event.capacity} tickets claimed
                </div>
              </div>

              {/* Purchase Button */}
              <button
                onClick={handlePurchaseTicket}
                disabled={purchasing || !currentAccount || !isActive || isSoldOut}
                className="w-full px-6 py-4 text-lg font-bold bg-gradient-to-r from-orange-500 to-red-600 hover:from-orange-600 hover:to-red-700 text-white rounded-lg shadow-lg transform hover:scale-105 transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
              >
                {purchasing ? (
                  <span className="flex items-center justify-center gap-2">
                    <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    Processing...
                  </span>
                ) : !currentAccount ? (
                  '🔐 Connect Wallet'
                ) : isSoldOut ? (
                  '❌ Sold Out'
                ) : !isActive ? (
                  '⏸️ Event Not Active'
                ) : (
                  '🎫 Get Ticket (Free)'
                )}
              </button>

              {/* Info */}
              <div className="mt-6 p-4 bg-blue-50 rounded-lg border-2 border-blue-200">
                <h4 className="text-sm font-bold text-blue-900 mb-2">✨ What you get</h4>
                <ul className="text-sm text-blue-800 space-y-1">
                  <li>• NFT ticket on Sui blockchain</li>
                  <li>• Proof of attendance NFT</li>
                  <li>• Exclusive event access</li>
                  <li>• Lifetime ownership</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>

      <Footer />
    </div>
  );
}
