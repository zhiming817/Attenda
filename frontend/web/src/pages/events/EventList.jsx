import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSuiClient } from '@mysten/dapp-kit';
import Navbar from '../../layout/Navbar.jsx';
import Footer from '../../layout/Footer.jsx';

const PACKAGE_ID = '0x5a29cc03847b88c5225fb960e6a6ada5ef7ff9fa57494e69a8d831d82f7a5f21';

export default function EventList() {
  const navigate = useNavigate();
  const suiClient = useSuiClient();
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all'); // all, upcoming, past

  useEffect(() => {
    loadEvents();
  }, []);

  const loadEvents = async () => {
    try {
      setLoading(true);
      
      // 通过查询 EventCreated 事件来获取活动列表
      // 注意：这里使用 queryEvents，按创建时间降序排列
      const eventsQuery = await suiClient.queryEvents({
        query: {
          MoveEventType: `${PACKAGE_ID}::event_registry::EventCreated`,
        },
        order: 'descending',
        limit: 50,
      });

      console.log('Events from chain:', eventsQuery);
      
      // 从事件中提取 event_id，然后查询详细信息
      const eventIds = eventsQuery.data.map(event => event.parsedJson.event_id);
      
      const eventList = await Promise.all(
        eventIds.map(async (eventId) => {
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

      // 过滤掉 null 值
      setEvents(eventList.filter(e => e !== null));
    } catch (error) {
      console.error('Error loading events:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status) => {
    const statusMap = {
      0: { text: 'Active', color: 'bg-green-100 text-green-800 border-green-200' },
      1: { text: 'Paused', color: 'bg-yellow-100 text-yellow-800 border-yellow-200' },
      2: { text: 'Closed', color: 'bg-gray-100 text-gray-800 border-gray-200' },
      3: { text: 'Cancelled', color: 'bg-red-100 text-red-800 border-red-200' },
    };
    const badge = statusMap[status] || statusMap[0];
    return (
      <span className={`px-3 py-1 rounded-full text-xs font-bold border-2 ${badge.color}`}>
        {badge.text}
      </span>
    );
  };

  const filteredEvents = events.filter(event => {
    if (filter === 'all') return true;
    if (filter === 'active') return event.status === 0;
    if (filter === 'closed') return event.status === 2 || event.status === 3;
    return true;
  });

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 to-red-50">
      <Navbar />
      
      <div className="max-w-7xl mx-auto px-4 py-12">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl md:text-5xl font-black text-gray-900 mb-4">
            Discover Events
          </h1>
          <p className="text-xl text-gray-600">
            Browse upcoming events and get your NFT tickets
          </p>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-4 mb-8 justify-center">
          <button
            onClick={() => setFilter('all')}
            className={`px-6 py-3 rounded-lg font-bold transition-all ${
              filter === 'all'
                ? 'bg-gradient-to-r from-orange-500 to-red-600 text-white shadow-lg'
                : 'bg-white text-gray-700 border-2 border-gray-200 hover:border-orange-300'
            }`}
          >
            All Events
          </button>
          <button
            onClick={() => setFilter('active')}
            className={`px-6 py-3 rounded-lg font-bold transition-all ${
              filter === 'active'
                ? 'bg-gradient-to-r from-orange-500 to-red-600 text-white shadow-lg'
                : 'bg-white text-gray-700 border-2 border-gray-200 hover:border-orange-300'
            }`}
          >
            Active
          </button>
          <button
            onClick={() => setFilter('closed')}
            className={`px-6 py-3 rounded-lg font-bold transition-all ${
              filter === 'closed'
                ? 'bg-gradient-to-r from-orange-500 to-red-600 text-white shadow-lg'
                : 'bg-white text-gray-700 border-2 border-gray-200 hover:border-orange-300'
            }`}
          >
            Past Events
          </button>
        </div>

        {/* Loading */}
        {loading && (
          <div className="text-center py-20">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-orange-500 border-t-transparent"></div>
            <p className="mt-4 text-gray-600 font-medium">Loading events...</p>
          </div>
        )}

        {/* Event Grid */}
        {!loading && filteredEvents.length === 0 && (
          <div className="text-center py-20">
            <div className="text-6xl mb-4">🎭</div>
            <h3 className="text-2xl font-bold text-gray-900 mb-2">No Events Found</h3>
            <p className="text-gray-600 mb-6">Be the first to create an event!</p>
            <button
              onClick={() => navigate('/events/create')}
              className="px-8 py-3 bg-gradient-to-r from-orange-500 to-red-600 text-white rounded-lg font-bold shadow-lg hover:shadow-xl transform hover:scale-105 transition-all"
            >
              Create Event
            </button>
          </div>
        )}

        {!loading && filteredEvents.length > 0 && (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredEvents.map((event) => (
              <div
                key={event.id}
                className="bg-white rounded-2xl shadow-lg border-2 border-orange-200 overflow-hidden transform hover:scale-105 transition-all cursor-pointer"
                onClick={() => navigate(`/events/${event.id}`)}
              >
                {/* Event Image */}
                <div className="h-48 bg-gradient-to-br from-orange-400 to-red-500 flex items-center justify-center">
                  <span className="text-white text-6xl">🎭</span>
                </div>

                {/* Event Info */}
                <div className="p-6">
                  <div className="flex items-center justify-between mb-3">
                    {getStatusBadge(event.status)}
                    <span className="text-sm text-gray-500">
                      {event.ticketsSold}/{event.capacity} tickets
                    </span>
                  </div>

                  <h3 className="text-xl font-bold text-gray-900 mb-2">
                    Event #{event.id.slice(0, 8)}...
                  </h3>

                  <div className="space-y-2 text-sm text-gray-600">
                    <div className="flex items-center gap-2">
                      <span>📍</span>
                      <span className="truncate">{event.walrusBlobId}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span>👤</span>
                      <span className="truncate">
                        Organizer: {event.organizer.slice(0, 6)}...{event.organizer.slice(-4)}
                      </span>
                    </div>
                  </div>

                  <div className="mt-4 pt-4 border-t border-gray-200">
                    <button
                      className="w-full px-4 py-3 bg-gradient-to-r from-orange-500 to-red-600 text-white rounded-lg font-bold hover:from-orange-600 hover:to-red-700 transition-all"
                      onClick={(e) => {
                        e.stopPropagation();
                        navigate(`/events/${event.id}`);
                      }}
                    >
                      View Details →
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Create Event CTA */}
        <div className="mt-16 text-center">
          <div className="bg-gradient-to-r from-orange-100 to-red-100 rounded-2xl p-8 border-2 border-orange-300">
            <h3 className="text-2xl font-bold text-gray-900 mb-3">
              Want to organize your own event?
            </h3>
            <p className="text-gray-700 mb-6">
              Create events with NFT tickets and track attendance on-chain
            </p>
            <button
              onClick={() => navigate('/events/create')}
              className="px-8 py-4 bg-gradient-to-r from-orange-500 to-red-600 text-white rounded-lg font-bold shadow-lg hover:shadow-xl transform hover:scale-105 transition-all"
            >
              Create Event
            </button>
          </div>
        </div>
      </div>

      <Footer />
    </div>
  );
}
