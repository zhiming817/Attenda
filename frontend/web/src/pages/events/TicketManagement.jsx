import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useCurrentAccount, useSignAndExecuteTransaction, useSuiClient } from '@mysten/dapp-kit';
import { Transaction } from '@mysten/sui/transactions';
import Navbar from '../../layout/Navbar.jsx';
import Footer from '../../layout/Footer.jsx';

const PACKAGE_ID = import.meta.env.VITE_PACKAGE_ID || '0x5a29cc03847b88c5225fb960e6a6ada5ef7ff9fa57494e69a8d831d82f7a5f21';

export default function TicketManagement() {
  const { ticketId } = useParams();
  const navigate = useNavigate();
  const currentAccount = useCurrentAccount();
  const suiClient = useSuiClient();
  const { mutate: signAndExecuteTransaction } = useSignAndExecuteTransaction();

  const [ticket, setTicket] = useState(null);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState('');
  const [revokeReason, setRevokeReason] = useState('');
  const [showRevokeModal, setShowRevokeModal] = useState(false);

  useEffect(() => {
    if (ticketId) {
      loadTicket();
    }
  }, [ticketId]);

  const loadTicket = async () => {
    try {
      setLoading(true);
      
      const ticketObj = await suiClient.getObject({
        id: ticketId,
        options: {
          showContent: true,
          showOwner: true,
        },
      });

      if (!ticketObj.data) {
        setError('Ticket not found');
        return;
      }

      const fields = ticketObj.data.content?.fields || {};
      setTicket({
        id: ticketId,
        eventId: fields.event_id,
        owner: fields.owner,
        walrusBlobRef: fields.walrus_blob_ref,
        ticketType: fields.ticket_type !== undefined ? parseInt(fields.ticket_type) : 0,
        status: fields.status !== undefined ? parseInt(fields.status) : 0,
        createdAt: fields.created_at ? parseInt(fields.created_at) : 0,
      });
    } catch (error) {
      console.error('Error loading ticket:', error);
      setError('Failed to load ticket details');
    } finally {
      setLoading(false);
    }
  };

  const handleMarkUsed = async () => {
    if (!currentAccount) {
      alert('Please connect your wallet first');
      return;
    }

    if (ticket.status !== 0) {
      alert('This ticket is not valid');
      return;
    }

    setProcessing(true);
    setError('');

    try {
      const tx = new Transaction();
      
      // 调用 mark_used 函数
      tx.moveCall({
        target: `${PACKAGE_ID}::ticket_nft::mark_used`,
        arguments: [
          tx.object(ticketId), // ticket: &mut Ticket
        ],
      });

      signAndExecuteTransaction(
        {
          transaction: tx,
        },
        {
          onSuccess: (result) => {
            console.log('Ticket marked as used:', result);
            alert('✅ Ticket marked as used successfully!');
            loadTicket(); // 重新加载票据数据
            setProcessing(false);
          },
          onError: (error) => {
            console.error('Error marking ticket as used:', error);
            setError(error.message || 'Failed to mark ticket as used');
            setProcessing(false);
          },
        }
      );
    } catch (err) {
      console.error('Error:', err);
      setError(err.message || 'An unexpected error occurred');
      setProcessing(false);
    }
  };

  const handleRevokeTicket = async () => {
    if (!currentAccount) {
      alert('Please connect your wallet first');
      return;
    }

    if (ticket.status !== 0) {
      alert('This ticket is not valid');
      return;
    }

    if (!revokeReason.trim()) {
      alert('Please provide a reason for revocation');
      return;
    }

    setProcessing(true);
    setError('');
    setShowRevokeModal(false);

    try {
      const tx = new Transaction();
      
      // 调用 revoke_ticket 函数
      tx.moveCall({
        target: `${PACKAGE_ID}::ticket_nft::revoke_ticket`,
        arguments: [
          tx.object(ticketId), // ticket: &mut Ticket
          tx.pure.vector('u8', Array.from(new TextEncoder().encode(revokeReason))), // reason: vector<u8>
        ],
      });

      signAndExecuteTransaction(
        {
          transaction: tx,
        },
        {
          onSuccess: (result) => {
            console.log('Ticket revoked:', result);
            alert('❌ Ticket revoked successfully!');
            setRevokeReason('');
            loadTicket(); // 重新加载票据数据
            setProcessing(false);
          },
          onError: (error) => {
            console.error('Error revoking ticket:', error);
            setError(error.message || 'Failed to revoke ticket');
            setProcessing(false);
          },
        }
      );
    } catch (err) {
      console.error('Error:', err);
      setError(err.message || 'An unexpected error occurred');
      setProcessing(false);
    }
  };

  const getStatusInfo = (status) => {
    const statusMap = {
      0: { text: 'Valid', color: 'bg-green-100 text-green-800 border-green-300', icon: '✅' },
      1: { text: 'Used', color: 'bg-blue-100 text-blue-800 border-blue-300', icon: '🎟️' },
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
            <p className="mt-4 text-gray-600 font-medium">Loading ticket details...</p>
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
            onClick={() => navigate('/events/tickets')}
            className="px-8 py-3 bg-gradient-to-r from-orange-500 to-red-600 text-white rounded-lg font-bold shadow-lg hover:shadow-xl transform hover:scale-105 transition-all"
          >
            Back to My Tickets
          </button>
        </div>
        <Footer />
      </div>
    );
  }

  const statusInfo = getStatusInfo(ticket.status);

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 to-red-50">
      <Navbar />
      
      <div className="max-w-4xl mx-auto px-4 py-12">
        {/* Back Button */}
        <button
          onClick={() => navigate('/events/tickets')}
          className="mb-6 flex items-center gap-2 text-gray-600 hover:text-orange-600 font-medium transition-colors"
        >
          <span>←</span> Back to My Tickets
        </button>

        {/* Page Header */}
        <div className="mb-8">
          <h1 className="text-4xl md:text-5xl font-black text-gray-900 mb-4">
            Ticket Management
          </h1>
          <p className="text-xl text-gray-600">
            Manage ticket status and access control
          </p>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-50 border-l-4 border-red-500 text-red-700">
            <p className="font-medium">Error</p>
            <p className="text-sm">{error}</p>
          </div>
        )}

        {/* Ticket Card */}
        <div className="bg-white rounded-2xl shadow-xl border-2 border-orange-200 overflow-hidden mb-8">
          {/* Header */}
          <div className="bg-gradient-to-br from-orange-400 to-red-500 p-8 text-white relative">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-6xl mb-4">🎫</div>
                <h2 className="text-3xl font-black mb-2">Ticket Type {ticket.ticketType}</h2>
                <p className="text-orange-100">ID: {ticketId.slice(0, 20)}...</p>
              </div>
              <div className={`px-6 py-3 rounded-full text-lg font-bold border-2 ${statusInfo.color}`}>
                {statusInfo.icon} {statusInfo.text}
              </div>
            </div>
          </div>

          {/* Body */}
          <div className="p-8 space-y-6">
            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <div className="text-sm text-gray-500 font-medium mb-2">Event ID</div>
                <div className="text-gray-900 font-mono text-sm break-all">{ticket.eventId}</div>
              </div>
              <div>
                <div className="text-sm text-gray-500 font-medium mb-2">Owner</div>
                <div className="text-gray-900 font-mono text-sm break-all">{ticket.owner}</div>
              </div>
              <div>
                <div className="text-sm text-gray-500 font-medium mb-2">Walrus Blob Reference</div>
                <div className="text-gray-900 text-sm break-all">{ticket.walrusBlobRef}</div>
              </div>
              <div>
                <div className="text-sm text-gray-500 font-medium mb-2">Created At</div>
                <div className="text-gray-900 text-sm">
                  {ticket.createdAt > 0 ? new Date(ticket.createdAt).toLocaleString() : 'N/A'}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="grid md:grid-cols-2 gap-6">
          {/* Mark as Used */}
          <div className="bg-white rounded-2xl shadow-xl border-2 border-blue-200 p-6">
            <div className="flex items-center gap-3 mb-4">
              <span className="text-4xl">🎟️</span>
              <h3 className="text-2xl font-bold text-gray-900">Mark as Used</h3>
            </div>
            <p className="text-gray-600 mb-6">
              Simulate scanning the ticket at the venue entrance. This will mark the ticket as used.
            </p>
            <button
              onClick={handleMarkUsed}
              disabled={processing || !currentAccount || ticket.status !== 0}
              className="w-full px-6 py-4 text-lg font-bold bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white rounded-lg shadow-lg transform hover:scale-105 transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
            >
              {processing ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  Processing...
                </span>
              ) : !currentAccount ? (
                '🔐 Connect Wallet'
              ) : ticket.status !== 0 ? (
                '⏸️ Ticket Not Valid'
              ) : (
                '✅ Mark as Used'
              )}
            </button>
          </div>

          {/* Revoke Ticket */}
          <div className="bg-white rounded-2xl shadow-xl border-2 border-red-200 p-6">
            <div className="flex items-center gap-3 mb-4">
              <span className="text-4xl">❌</span>
              <h3 className="text-2xl font-bold text-gray-900">Revoke Ticket</h3>
            </div>
            <p className="text-gray-600 mb-6">
              Cancel this ticket permanently. Requires providing a reason for the revocation.
            </p>
            <button
              onClick={() => setShowRevokeModal(true)}
              disabled={processing || !currentAccount || ticket.status !== 0}
              className="w-full px-6 py-4 text-lg font-bold bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white rounded-lg shadow-lg transform hover:scale-105 transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
            >
              {!currentAccount ? '🔐 Connect Wallet' : ticket.status !== 0 ? '⏸️ Ticket Not Valid' : '❌ Revoke Ticket'}
            </button>
          </div>
        </div>

        {/* Info Box */}
        <div className="mt-8 bg-gradient-to-r from-orange-100 to-red-100 rounded-lg p-6 border-2 border-orange-300">
          <h3 className="text-lg font-bold text-orange-900 mb-3 flex items-center gap-2">
            <span>ℹ️</span> About Ticket Management
          </h3>
          <ul className="space-y-2 text-orange-800">
            <li className="flex items-start gap-2">
              <span className="text-orange-600 font-bold">•</span>
              <span><strong>Mark as Used:</strong> Simulates venue entrance scanning. Once marked, the ticket cannot be used again.</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-orange-600 font-bold">•</span>
              <span><strong>Revoke:</strong> Permanently cancels the ticket. Useful for refunds or access control.</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-orange-600 font-bold">•</span>
              <span><strong>Status:</strong> Valid tickets can be used or revoked. Used/Revoked tickets cannot be changed.</span>
            </li>
          </ul>
        </div>
      </div>

      {/* Revoke Modal */}
      {showRevokeModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-8">
            <h3 className="text-2xl font-bold text-gray-900 mb-4">Revoke Ticket</h3>
            <p className="text-gray-600 mb-6">
              Please provide a reason for revoking this ticket. This action cannot be undone.
            </p>
            <textarea
              value={revokeReason}
              onChange={(e) => setRevokeReason(e.target.value)}
              placeholder="e.g., Duplicate purchase, Customer request, Event cancelled..."
              className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 transition-all mb-6"
              rows="4"
            />
            <div className="flex gap-4">
              <button
                onClick={() => {
                  setShowRevokeModal(false);
                  setRevokeReason('');
                }}
                className="flex-1 px-6 py-3 border-2 border-gray-300 text-gray-700 rounded-lg font-bold hover:bg-gray-50 transition-all"
              >
                Cancel
              </button>
              <button
                onClick={handleRevokeTicket}
                disabled={!revokeReason.trim()}
                className="flex-1 px-6 py-3 bg-gradient-to-r from-red-500 to-red-600 text-white rounded-lg font-bold hover:from-red-600 hover:to-red-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Revoke
              </button>
            </div>
          </div>
        </div>
      )}

      <Footer />
    </div>
  );
}
