import React from 'react';
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import { SuiClientProvider, WalletProvider } from '@mysten/dapp-kit';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { getFullnodeUrl } from '@mysten/sui/client';
import Home from './pages/events/Home.jsx';
import CreateEvent from './pages/events/CreateEvent.jsx';
import EventList from './pages/events/EventList.jsx';
import EventDetail from './pages/events/EventDetail.jsx';
import MyEvents from './pages/events/MyEvents.jsx';
import MyTickets from './pages/events/MyTickets.jsx';
import TicketManagement from './pages/events/TicketManagement.jsx';
import TicketDetail from './pages/tickets/TicketDetail.jsx';

import PageLayout from './layout/PageLayout.jsx';


const queryClient = new QueryClient();

// 配置网络
const networkConfig = {
  testnet: { url: getFullnodeUrl('testnet') },
  mainnet: { url: getFullnodeUrl('mainnet') },
};

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <SuiClientProvider networks={networkConfig} defaultNetwork="testnet">
        <WalletProvider autoConnect>
          <HashRouter>
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/events/create" element={<CreateEvent />} />
              <Route path="/events/browse" element={<EventList />} />
              <Route path="/events/:eventId" element={<EventDetail />} />
              <Route path="/events/my" element={<MyEvents />} />
              <Route path="/events/tickets" element={<MyTickets />} />
              <Route path="/tickets/:ticketId" element={<TicketDetail />} />
              <Route path="/tickets/:ticketId/manage" element={<TicketManagement />} />
            </Routes>
          </HashRouter>
        </WalletProvider>
      </SuiClientProvider>
    </QueryClientProvider>
  );
}

export default App;