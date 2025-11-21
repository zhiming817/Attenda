import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCurrentAccount, useSuiClient } from '@mysten/dapp-kit';
import Navbar from '../../layout/Navbar.jsx';
import Footer from '../../layout/Footer.jsx';

const PACKAGE_ID = import.meta.env.VITE_PACKAGE_ID || '0x5a29cc03847b88c5225fb960e6a6ada5ef7ff9fa57494e69a8d831d82f7a5f21';

export default function MyTickets() {
  const navigate = useNavigate();
  const currentAccount = useCurrentAccount();
  const suiClient = useSuiClient();

  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (currentAccount) {
      loadMyTickets();
    }
  }, [currentAccount]);

  const loadMyTickets = async () => {
    try {
      setLoading(true);
      
      // 查询当前用户拥有的 Ticket NFT
      const result = await suiClient.getOwnedObjects({
        owner: currentAccount.address,
        filter: {
          StructType: `${PACKAGE_ID}::ticket_nft::Ticket`,
        },
        options: {
          showContent: true,
          showDisplay: true,
        },
      });

      const ticketList = result.data.map(obj => {
        const fields = obj.data?.content?.fields || {};
        console.log('Ticket fields:', fields); // 调试日志
        return {
          id: obj.data.objectId,
          eventId: fields.event_id,
          ticketType: fields.ticket_type !== undefined ? fields.ticket_type : 0,
          status: fields.status !== undefined ? parseInt(fields.status) : 0,
          createdAt: fields.created_at ? parseInt(fields.created_at) : 0,
        };
      });

      setTickets(ticketList);
    } catch (error) {
      console.error('Error loading tickets:', error);
    } finally {
      setLoading(false);
    }
  };

  if (!currentAccount) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-orange-50 to-red-50">
        <Navbar />
        <div className="max-w-4xl mx-auto px-4 py-20 text-center">
          <div className="text-6xl mb-4">🔐</div>
          <h2 className="text-3xl font-bold text-gray-900 mb-4">Connect Your Wallet</h2>
          <p className="text-gray-600 mb-8">
            Please connect your wallet to view your tickets
          </p>
        </div>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 to-red-50">
      <Navbar />
      
      <div className="max-w-7xl mx-auto px-4 py-12">
        {/* Header */}
        <div className="mb-12">
          <h1 className="text-4xl md:text-5xl font-black text-gray-900 mb-4">
            My Tickets
          </h1>
          <p className="text-xl text-gray-600">
            Your NFT tickets and proof of attendance
          </p>
        </div>

        {/* Loading */}
        {loading && (
          <div className="text-center py-20">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-orange-500 border-t-transparent"></div>
            <p className="mt-4 text-gray-600 font-medium">Loading your tickets...</p>
          </div>
        )}

        {/* No Tickets */}
        {!loading && tickets.length === 0 && (
          <div className="text-center py-20">
            <div className="text-6xl mb-4">🎫</div>
            <h3 className="text-2xl font-bold text-gray-900 mb-2">No Tickets Yet</h3>
            <p className="text-gray-600 mb-6">Browse events and get your first ticket!</p>
            <button
              onClick={() => navigate('/events/browse')}
              className="px-8 py-3 bg-gradient-to-r from-orange-500 to-red-600 text-white rounded-lg font-bold shadow-lg hover:shadow-xl transform hover:scale-105 transition-all"
            >
              Browse Events
            </button>
          </div>
        )}

        {/* Tickets Grid */}
        {!loading && tickets.length > 0 && (
          <div>
            {/* Stats */}
            <div className="grid md:grid-cols-3 gap-6 mb-8">
              <div className="bg-white rounded-xl shadow-lg border-2 border-orange-200 p-6">
                <div className="text-4xl font-black text-orange-600 mb-2">
                  {tickets.length}
                </div>
                <div className="text-gray-600 font-medium">Total Tickets</div>
              </div>
              <div className="bg-white rounded-xl shadow-lg border-2 border-green-200 p-6">
                <div className="text-4xl font-black text-green-600 mb-2">
                  {tickets.filter(t => t.status === 0).length}
                </div>
                <div className="text-gray-600 font-medium">Valid Tickets</div>
              </div>
              <div className="bg-white rounded-xl shadow-lg border-2 border-blue-200 p-6">
                <div className="text-4xl font-black text-blue-600 mb-2">
                  {tickets.filter(t => t.status === 1).length}
                </div>
                <div className="text-gray-600 font-medium">Used Tickets</div>
              </div>
            </div>

            {/* Tickets List */}
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {tickets.map((ticket) => (
                <div
                  key={ticket.id}
                  className="bg-white rounded-2xl shadow-lg border-2 border-orange-200 overflow-hidden transform hover:scale-105 transition-all"
                >
                  {/* Ticket Header */}
                  <div className="bg-gradient-to-br from-orange-400 to-red-500 p-6 text-white relative">
                    <div className="text-5xl mb-4">🎫</div>
                    <div className="font-black text-2xl mb-2">Ticket Type {ticket.ticketType}</div>
                    {ticket.status === 1 && (
                      <div className="absolute top-4 right-4 bg-green-500 text-white px-3 py-1 rounded-full text-xs font-bold">
                        ✓ USED
                      </div>
                    )}
                    {ticket.status === 2 && (
                      <div className="absolute top-4 right-4 bg-red-500 text-white px-3 py-1 rounded-full text-xs font-bold">
                        ✗ REVOKED
                      </div>
                    )}
                  </div>

                  {/* Ticket Body */}
                  <div className="p-6 space-y-4">
                    <div>
                      <div className="text-xs text-gray-500 font-medium mb-1">Event ID</div>
                      <div className="text-sm font-mono text-gray-900 truncate">
                        {ticket.eventId}
                      </div>
                    </div>

                    <div>
                      <div className="text-xs text-gray-500 font-medium mb-1">Ticket ID</div>
                      <div className="text-sm font-mono text-gray-900 truncate">
                        {ticket.id}
                      </div>
                    </div>

                    <div>
                      <div className="text-xs text-gray-500 font-medium mb-1">Created At</div>
                      <div className="text-sm text-gray-900">
                        {ticket.createdAt > 0 ? `Epoch ${ticket.createdAt}` : 'N/A'}
                      </div>
                    </div>

                    <div>
                      <div className="text-xs text-gray-500 font-medium mb-1">Status</div>
                      <div className="text-sm text-gray-900">
                        {ticket.status === 0 ? '✅ Valid' : ticket.status === 1 ? '🎟️ Used' : '❌ Revoked'}
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="pt-4 border-t border-gray-200 space-y-3">
                      <button
                        onClick={() => navigate(`/events/${ticket.eventId}`)}
                        className="w-full px-4 py-3 bg-gradient-to-r from-orange-500 to-red-600 text-white rounded-lg font-bold hover:from-orange-600 hover:to-red-700 transition-all"
                      >
                        View Event
                      </button>
                      <button
                        onClick={() => navigate(`/tickets/${ticket.id}/manage`)}
                        className="w-full px-4 py-3 border-2 border-orange-500 text-orange-600 rounded-lg font-bold hover:bg-orange-50 transition-all"
                      >
                        🔧 Manage Ticket
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <Footer />
    </div>
  );
}
