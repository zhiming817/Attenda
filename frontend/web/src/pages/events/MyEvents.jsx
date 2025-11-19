import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCurrentAccount, useSuiClient, useSignAndExecuteTransaction } from '@mysten/dapp-kit';
import { Transaction } from '@mysten/sui/transactions';
import Navbar from '../../layout/Navbar.jsx';
import Footer from '../../layout/Footer.jsx';

const PACKAGE_ID = '0x5a29cc03847b88c5225fb960e6a6ada5ef7ff9fa57494e69a8d831d82f7a5f21';

export default function MyEvents() {
  const navigate = useNavigate();
  const currentAccount = useCurrentAccount();
  const suiClient = useSuiClient();
  const { mutate: signAndExecuteTransaction } = useSignAndExecuteTransaction();

  const [myEvents, setMyEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [updatingStatus, setUpdatingStatus] = useState({});

  useEffect(() => {
    if (currentAccount) {
      loadMyEvents();
    }
  }, [currentAccount]);

  const loadMyEvents = async () => {
    try {
      setLoading(true);
      
      // 通过查询 EventCreated 事件，然后筛选当前用户创建的活动
      const eventsQuery = await suiClient.queryEvents({
        query: {
          MoveEventType: `${PACKAGE_ID}::event_registry::EventCreated`,
        },
        order: 'descending',
        limit: 100,
      });

      // 筛选出当前用户创建的活动
      const myEventIds = eventsQuery.data
        .filter(event => event.parsedJson.organizer === currentAccount.address)
        .map(event => event.parsedJson.event_id);

      const eventList = await Promise.all(
        myEventIds.map(async (eventId) => {
          try {
            const eventObj = await suiClient.getObject({
              id: eventId,
              options: {
                showContent: true,
              },
            });

            if (!eventObj.data) return null;

            const fields = eventObj.data.content?.fields || {};
            return {
              id: eventId,
              organizer: fields.organizer,
              walrusBlobId: fields.walrus_blob_id,
              capacity: parseInt(fields.capacity || '0'),
              ticketsSold: parseInt(fields.num_tickets_sold || '0'),
              status: parseInt(fields.status || '0'),
              createdAt: parseInt(fields.created_at || '0'),
              updatedAt: parseInt(fields.updated_at || '0'),
            };
          } catch (err) {
            console.error(`Error loading event ${eventId}:`, err);
            return null;
          }
        })
      );

      setMyEvents(eventList.filter(e => e !== null));
    } catch (error) {
      console.error('Error loading my events:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateStatus = async (eventId, newStatus) => {
    setUpdatingStatus(prev => ({ ...prev, [eventId]: true }));

    try {
      const tx = new Transaction();
      
      tx.moveCall({
        target: `${PACKAGE_ID}::event_registry::set_status`,
        arguments: [
          tx.object(eventId),
          tx.pure.u8(newStatus),
        ],
      });

      signAndExecuteTransaction(
        {
          transaction: tx,
        },
        {
          onSuccess: () => {
            alert('Event status updated successfully!');
            loadMyEvents();
          },
          onError: (error) => {
            console.error('Error updating status:', error);
            alert('Failed to update event status');
          },
        }
      );
    } catch (error) {
      console.error('Error:', error);
      alert('An error occurred');
    } finally {
      setUpdatingStatus(prev => ({ ...prev, [eventId]: false }));
    }
  };

  const getStatusInfo = (status) => {
    const statusMap = {
      0: { text: 'Active', color: 'bg-green-100 text-green-800', icon: '✅' },
      1: { text: 'Paused', color: 'bg-yellow-100 text-yellow-800', icon: '⏸️' },
      2: { text: 'Closed', color: 'bg-gray-100 text-gray-800', icon: '🔒' },
      3: { text: 'Cancelled', color: 'bg-red-100 text-red-800', icon: '❌' },
    };
    return statusMap[status] || statusMap[0];
  };

  if (!currentAccount) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-orange-50 to-red-50">
        <Navbar />
        <div className="max-w-4xl mx-auto px-4 py-20 text-center">
          <div className="text-6xl mb-4">🔐</div>
          <h2 className="text-3xl font-bold text-gray-900 mb-4">Connect Your Wallet</h2>
          <p className="text-gray-600 mb-8">
            Please connect your wallet to view your events
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
            My Events
          </h1>
          <p className="text-xl text-gray-600">
            Manage your events and track ticket sales
          </p>
        </div>

        {/* Create Event CTA */}
        <div className="mb-8">
          <button
            onClick={() => navigate('/events/create')}
            className="px-6 py-3 bg-gradient-to-r from-orange-500 to-red-600 text-white rounded-lg font-bold shadow-lg hover:shadow-xl transform hover:scale-105 transition-all"
          >
            + Create New Event
          </button>
        </div>

        {/* Loading */}
        {loading && (
          <div className="text-center py-20">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-orange-500 border-t-transparent"></div>
            <p className="mt-4 text-gray-600 font-medium">Loading your events...</p>
          </div>
        )}

        {/* No Events */}
        {!loading && myEvents.length === 0 && (
          <div className="text-center py-20">
            <div className="text-6xl mb-4">📋</div>
            <h3 className="text-2xl font-bold text-gray-900 mb-2">No Events Yet</h3>
            <p className="text-gray-600 mb-6">Create your first event to get started!</p>
            <button
              onClick={() => navigate('/events/create')}
              className="px-8 py-3 bg-gradient-to-r from-orange-500 to-red-600 text-white rounded-lg font-bold shadow-lg hover:shadow-xl transform hover:scale-105 transition-all"
            >
              Create Event
            </button>
          </div>
        )}

        {/* Events List */}
        {!loading && myEvents.length > 0 && (
          <div className="space-y-6">
            {myEvents.map((event) => {
              const statusInfo = getStatusInfo(event.status);
              const isUpdating = updatingStatus[event.id];

              return (
                <div
                  key={event.id}
                  className="bg-white rounded-2xl shadow-lg border-2 border-orange-200 p-6 hover:shadow-xl transition-all"
                >
                  <div className="flex flex-col lg:flex-row gap-6">
                    {/* Event Image */}
                    <div className="lg:w-48 h-48 bg-gradient-to-br from-orange-400 to-red-500 rounded-xl flex items-center justify-center flex-shrink-0">
                      <span className="text-white text-6xl">🎭</span>
                    </div>

                    {/* Event Details */}
                    <div className="flex-1">
                      <div className="flex items-start justify-between mb-4">
                        <div>
                          <div className="flex items-center gap-3 mb-2">
                            <span className={`px-3 py-1 rounded-full text-sm font-bold ${statusInfo.color}`}>
                              {statusInfo.icon} {statusInfo.text}
                            </span>
                          </div>
                          <h3 className="text-2xl font-bold text-gray-900 mb-1">
                            Event #{event.id.slice(0, 16)}...
                          </h3>
                          <p className="text-sm text-gray-500">
                            ID: {event.id}
                          </p>
                        </div>
                        <button
                          onClick={() => navigate(`/events/${event.id}`)}
                          className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg font-medium transition-all"
                        >
                          View Details
                        </button>
                      </div>

                      {/* Stats */}
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                        <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg p-3 border-2 border-blue-200">
                          <div className="text-2xl font-black text-blue-600">
                            {event.ticketsSold}
                          </div>
                          <div className="text-xs text-blue-800 font-medium">Tickets Sold</div>
                        </div>
                        <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-lg p-3 border-2 border-green-200">
                          <div className="text-2xl font-black text-green-600">
                            {event.capacity - event.ticketsSold}
                          </div>
                          <div className="text-xs text-green-800 font-medium">Available</div>
                        </div>
                        <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-lg p-3 border-2 border-purple-200">
                          <div className="text-2xl font-black text-purple-600">
                            {event.capacity}
                          </div>
                          <div className="text-xs text-purple-800 font-medium">Capacity</div>
                        </div>
                        <div className="bg-gradient-to-br from-orange-50 to-orange-100 rounded-lg p-3 border-2 border-orange-200">
                          <div className="text-2xl font-black text-orange-600">
                            {Math.round((event.ticketsSold / event.capacity) * 100)}%
                          </div>
                          <div className="text-xs text-orange-800 font-medium">Sold</div>
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex flex-wrap gap-2">
                        <button
                          onClick={() => handleUpdateStatus(event.id, 0)}
                          disabled={isUpdating || event.status === 0}
                          className="px-4 py-2 bg-green-100 hover:bg-green-200 text-green-700 rounded-lg font-medium text-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          ✅ Set Active
                        </button>
                        <button
                          onClick={() => handleUpdateStatus(event.id, 1)}
                          disabled={isUpdating || event.status === 1}
                          className="px-4 py-2 bg-yellow-100 hover:bg-yellow-200 text-yellow-700 rounded-lg font-medium text-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          ⏸️ Pause
                        </button>
                        <button
                          onClick={() => handleUpdateStatus(event.id, 2)}
                          disabled={isUpdating || event.status === 2}
                          className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg font-medium text-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          🔒 Close
                        </button>
                        <button
                          onClick={() => handleUpdateStatus(event.id, 3)}
                          disabled={isUpdating || event.status === 3}
                          className="px-4 py-2 bg-red-100 hover:bg-red-200 text-red-700 rounded-lg font-medium text-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          ❌ Cancel
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <Footer />
    </div>
  );
}
