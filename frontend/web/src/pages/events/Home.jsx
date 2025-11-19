import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import Navbar from '../../layout/Navbar.jsx';
import Footer from '../../layout/Footer.jsx';

export default function Home() {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    setIsVisible(true);
  }, []);

  return (
    <div className="relative min-h-screen overflow-hidden bg-gradient-to-br from-orange-50 to-red-50">
      {/* Animated Background */}
      <div 
        className="fixed inset-0 z-0 animate-[pan_60s_linear_infinite] opacity-30"
        style={{
          backgroundImage: 'url(/backgroundHome.png)',
          backgroundSize: '120%',
          backgroundPosition: 'center',
          backgroundRepeat: 'repeat',
        }}
      />

      {/* Content */}
      <div className="relative z-10">
        <Navbar />

        {/* Hero Section */}
        <section className="min-h-screen flex flex-col items-center justify-center px-4 sm:px-6 lg:px-8 pt-20">
          <div className={`text-center max-w-5xl mx-auto transition-all duration-1000 transform ${isVisible ? 'translate-y-0 opacity-100' : 'translate-y-10 opacity-0'}`}>
           
            
            <h1 className="text-6xl md:text-8xl font-black mb-6 bg-gradient-to-r from-orange-500 via-red-500 to-orange-600 text-transparent bg-clip-text drop-shadow-lg">
              Attenda
            </h1>
            
            <p className="text-2xl md:text-4xl font-bold mb-8 text-gray-800 drop-shadow-sm">
              Show up. Be recognized.
            </p>
            
            <p className="text-xl md:text-2xl mb-12 text-gray-700 max-w-3xl mx-auto drop-shadow-sm leading-relaxed">
              A decentralized event and ticketing platform powered by Sui smart contracts, Walrus storage, and Seal encryption.
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
              <Link to="/events/create">
                <button className="px-8 py-4 text-lg font-bold bg-gradient-to-r from-orange-500 to-red-600 hover:from-orange-600 hover:to-red-700 text-white rounded-lg shadow-2xl transform hover:scale-105 transition-all flex items-center gap-2">
                  Create Event
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                </button>
              </Link>
              <Link to="/events/browse">
                <button className="px-8 py-4 text-lg font-bold bg-white/90 hover:bg-white text-gray-900 rounded-lg shadow-xl transform hover:scale-105 transition-all border-2 border-white">
                  Browse Events
                </button>
              </Link>
            </div>
          </div>
        </section>

        {/* The Problem Section */}
        <section className="py-20 px-4 sm:px-6 lg:px-8">
          <div className="max-w-6xl mx-auto">
            <div className="bg-white/95 backdrop-blur rounded-2xl shadow-2xl border-4 border-yellow-400 p-8 md:p-12 transform hover:scale-[1.02] transition-all duration-300">
              <div className="flex items-center gap-4 mb-6">
                <svg className="w-12 h-12 text-yellow-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                <h2 className="text-4xl md:text-5xl font-black text-gray-900">The Problem</h2>
              </div>
              <div className="space-y-4">
                <div className="flex items-start gap-3">
                  <span className="text-2xl">🏢</span>
                  <p className="text-xl md:text-2xl text-gray-700 leading-relaxed">
                    <span className="font-bold text-red-600">Centralized Control:</span> Traditional platforms like Luma and Eventbrite control your event data and tickets
                  </p>
                </div>
                <div className="flex items-start gap-3">
                  <span className="text-2xl">📧</span>
                  <p className="text-xl md:text-2xl text-gray-700 leading-relaxed">
                    <span className="font-bold text-red-600">Email Dependency:</span> Tickets and confirmations are managed through centralized email systems
                  </p>
                </div>
                <div className="flex items-start gap-3">
                  <span className="text-2xl">🔒</span>
                  <p className="text-xl md:text-2xl text-gray-700 leading-relaxed">
                    <span className="font-bold text-red-600">No True Ownership:</span> You don't truly own your tickets or attendance records
                  </p>
                </div>
                <div className="flex items-start gap-3">
                  <span className="text-2xl">🎭</span>
                  <p className="text-xl md:text-2xl text-gray-700 leading-relaxed">
                    <span className="font-bold text-red-600">Privacy Concerns:</span> Personal information is stored and managed by intermediaries
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* The Solution Section */}
        <section className="py-20 px-4 sm:px-6 lg:px-8">
          <div className="max-w-6xl mx-auto">
            <div className="bg-gradient-to-br from-orange-50 to-red-50 rounded-2xl shadow-2xl border-4 border-orange-500 p-8 md:p-12 transform hover:scale-[1.02] transition-all duration-300">
              <div className="flex items-center gap-4 mb-6">
                <svg className="w-12 h-12 text-orange-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
                <h2 className="text-4xl md:text-5xl font-black bg-gradient-to-r from-orange-600 to-red-600 text-transparent bg-clip-text">
                  Attenda Solution
                </h2>
              </div>
              <p className="text-xl md:text-2xl text-gray-800 leading-relaxed mb-6">
                A <span className="font-bold text-orange-600">Web3-powered platform</span> where you truly own your event participation.
              </p>
              <div className="space-y-4">
                <div className="bg-white/80 rounded-lg p-6 border-2 border-orange-300">
                  <div className="flex items-center gap-3 mb-2">
                    <span className="text-3xl">🎫</span>
                    <p className="text-2xl font-bold text-orange-700">NFT Ticketing</p>
                  </div>
                  <p className="text-lg text-gray-700 ml-12">
                    Verifiable, encrypted NFT tickets on Sui with true ownership and transferability.
                  </p>
                </div>
                <div className="bg-white/80 rounded-lg p-6 border-2 border-orange-300">
                  <div className="flex items-center gap-3 mb-2">
                    <span className="text-3xl">🔐</span>
                    <p className="text-2xl font-bold text-orange-700">Encrypted Access</p>
                  </div>
                  <p className="text-lg text-gray-700 ml-12">
                    Event details and tickets encrypted with Seal, stored on Walrus. Only ticket holders can decrypt.
                  </p>
                </div>
                <div className="bg-white/80 rounded-lg p-6 border-2 border-orange-300">
                  <div className="flex items-center gap-3 mb-2">
                    <span className="text-3xl">✅</span>
                    <p className="text-2xl font-bold text-orange-700">Attendance Proof</p>
                  </div>
                  <p className="text-lg text-gray-700 ml-12">
                    Earn soulbound Attendance NFTs as proof-of-presence for airdrops and rewards.
                  </p>
                </div>
                <div className="bg-white/80 rounded-lg p-6 border-2 border-orange-300">
                  <div className="flex items-center gap-3 mb-2">
                    <span className="text-3xl">🔑</span>
                    <p className="text-2xl font-bold text-orange-700">ZkLogin Support</p>
                  </div>
                  <p className="text-lg text-gray-700 ml-12">
                    Easy onboarding with wallet or ZkLogin for privacy-preserving authentication.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* How It Works Section */}
        <section className="py-20 px-4 sm:px-6 lg:px-8">
          <div className="max-w-6xl mx-auto">
            <div className="bg-gradient-to-br from-yellow-50 to-orange-50 rounded-2xl shadow-2xl border-4 border-yellow-500 p-8 md:p-12 transform hover:scale-[1.02] transition-all duration-300">
              <div className="flex items-center gap-4 mb-6">
                <svg className="w-12 h-12 text-yellow-600 animate-pulse" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                </svg>
                <h2 className="text-4xl md:text-5xl font-black bg-gradient-to-r from-yellow-600 to-orange-600 text-transparent bg-clip-text">
                  How It Works
                </h2>
              </div>
              <div className="space-y-6">
                <div className="bg-white/80 rounded-lg p-6 border-l-4 border-yellow-500">
                  <div className="flex items-start gap-4">
                    <span className="text-4xl font-black text-yellow-600">1</span>
                    <div>
                      <p className="text-xl font-bold text-gray-900 mb-2">Create Event</p>
                      <p className="text-lg text-gray-700">Organizers create events with metadata stored on Walrus. Set capacity, pricing, and access rules.</p>
                    </div>
                  </div>
                </div>
                <div className="bg-white/80 rounded-lg p-6 border-l-4 border-orange-500">
                  <div className="flex items-start gap-4">
                    <span className="text-4xl font-black text-orange-600">2</span>
                    <div>
                      <p className="text-xl font-bold text-gray-900 mb-2">Register & Get Ticket</p>
                      <p className="text-lg text-gray-700">Users register with wallet or ZkLogin. Receive encrypted NFT ticket with QR code and event details.</p>
                    </div>
                  </div>
                </div>
                <div className="bg-white/80 rounded-lg p-6 border-l-4 border-red-500">
                  <div className="flex items-start gap-4">
                    <span className="text-4xl font-black text-red-600">3</span>
                    <div>
                      <p className="text-xl font-bold text-gray-900 mb-2">Access Event</p>
                      <p className="text-lg text-gray-700">Ticket holders decrypt their tickets and access full Walrus Site with event content.</p>
                    </div>
                  </div>
                </div>
                <div className="bg-white/80 rounded-lg p-6 border-l-4 border-green-500">
                  <div className="flex items-start gap-4">
                    <span className="text-4xl font-black text-green-600">4</span>
                    <div>
                      <p className="text-xl font-bold text-gray-900 mb-2">Verify Attendance</p>
                      <p className="text-lg text-gray-700">Scan ticket at venue to verify attendance. Earn soulbound Attendance NFT for proof-of-presence.</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Benefits Section */}
        <section className="py-20 px-4 sm:px-6 lg:px-8">
          <div className="max-w-6xl mx-auto">
            <div className="bg-gradient-to-br from-red-50 to-orange-50 rounded-2xl shadow-2xl border-4 border-red-500 p-8 md:p-12 transform hover:scale-[1.02] transition-all duration-300">
              <div className="flex items-center gap-4 mb-6">
                <svg className="w-12 h-12 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <h2 className="text-4xl md:text-5xl font-black bg-gradient-to-r from-red-600 to-orange-600 text-transparent bg-clip-text">
                  Who Benefits?
                </h2>
              </div>
              
              <div className="space-y-6">
                <div className="bg-white/90 rounded-lg p-6 border-2 border-red-300">
                  <h3 className="text-2xl font-bold text-red-700 mb-3 flex items-center gap-2">
                    <span>🎯</span> Organizers
                  </h3>
                  <ul className="space-y-2 text-lg text-gray-700">
                    <li className="flex items-start gap-2">
                      <span className="text-green-600 font-bold">✓</span>
                      <span><strong>Transparent data:</strong> Verifiable event and participant history on-chain</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-green-600 font-bold">✓</span>
                      <span><strong>Flexible ticketing:</strong> Set price, capacity, and access rules easily</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-green-600 font-bold">✓</span>
                      <span><strong>No intermediaries:</strong> Direct relationship with attendees</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-green-600 font-bold">✓</span>
                      <span><strong>Analytics:</strong> Export attendance data for insights and follow-ups</span>
                    </li>
                  </ul>
                </div>

                <div className="bg-white/90 rounded-lg p-6 border-2 border-orange-300">
                  <h3 className="text-2xl font-bold text-orange-700 mb-3 flex items-center gap-2">
                    <span>👥</span> Attendees
                  </h3>
                  <ul className="space-y-2 text-lg text-gray-700">
                    <li className="flex items-start gap-2">
                      <span className="text-green-600 font-bold">✓</span>
                      <span><strong>True ownership:</strong> Your tickets are NFTs you truly own</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-green-600 font-bold">✓</span>
                      <span><strong>Privacy protected:</strong> Encrypted access with Seal encryption</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-green-600 font-bold">✓</span>
                      <span><strong>Build reputation:</strong> Collect Attendance NFTs for proof-of-presence</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-green-600 font-bold">✓</span>
                      <span><strong>Rewards eligible:</strong> Use attendance history for airdrops and perks</span>
                    </li>
                  </ul>
                </div>

                <div className="bg-white/90 rounded-lg p-6 border-2 border-yellow-300">
                  <h3 className="text-2xl font-bold text-yellow-700 mb-3 flex items-center gap-2">
                    <span>🌐</span> Ecosystems
                  </h3>
                  <ul className="space-y-2 text-lg text-gray-700">
                    <li className="flex items-start gap-2">
                      <span className="text-green-600 font-bold">✓</span>
                      <span><strong>Composable data:</strong> Event participation becomes on-chain data</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-green-600 font-bold">✓</span>
                      <span><strong>Loyalty programs:</strong> Build rewards based on attendance history</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-green-600 font-bold">✓</span>
                      <span><strong>Engagement insights:</strong> Track community participation transparently</span>
                    </li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Technology Stack Section */}
        <section className="py-20 px-4 sm:px-6 lg:px-8">
          <div className="max-w-6xl mx-auto">
            <div className="bg-gradient-to-br from-purple-900 to-red-900 rounded-2xl shadow-2xl border-4 border-yellow-400 p-8 md:p-12 transform hover:scale-[1.02] transition-all duration-300">
              <div className="flex items-center gap-4 mb-6 justify-center">
                <svg className="w-16 h-16 text-yellow-400 animate-pulse" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
                </svg>
                <h2 className="text-4xl md:text-5xl font-black text-yellow-400">
                  Powered By Web3
                </h2>
              </div>
              <div className="grid md:grid-cols-2 gap-6">
                <div className="bg-white/10 backdrop-blur rounded-lg p-6 border-2 border-white/20">
                  <div className="flex items-center gap-3 mb-3">
                    <span className="text-3xl">⛓️</span>
                    <h3 className="text-2xl font-bold text-yellow-300">Sui Blockchain</h3>
                  </div>
                  <p className="text-white/90 text-lg">
                    Fast, secure smart contracts for tickets and attendance NFTs
                  </p>
                </div>
                <div className="bg-white/10 backdrop-blur rounded-lg p-6 border-2 border-white/20">
                  <div className="flex items-center gap-3 mb-3">
                    <span className="text-3xl">🗄️</span>
                    <h3 className="text-2xl font-bold text-yellow-300">Walrus Storage</h3>
                  </div>
                  <p className="text-white/90 text-lg">
                    Decentralized storage for event metadata and content
                  </p>
                </div>
                <div className="bg-white/10 backdrop-blur rounded-lg p-6 border-2 border-white/20">
                  <div className="flex items-center gap-3 mb-3">
                    <span className="text-3xl">🔐</span>
                    <h3 className="text-2xl font-bold text-yellow-300">Seal Encryption</h3>
                  </div>
                  <p className="text-white/90 text-lg">
                    End-to-end encryption for private ticket details
                  </p>
                </div>
                <div className="bg-white/10 backdrop-blur rounded-lg p-6 border-2 border-white/20">
                  <div className="flex items-center gap-3 mb-3">
                    <span className="text-3xl">🔑</span>
                    <h3 className="text-2xl font-bold text-yellow-300">ZkLogin</h3>
                  </div>
                  <p className="text-white/90 text-lg">
                    Privacy-preserving authentication for easy onboarding
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Final CTA Section */}
        <section className="py-32 px-4 sm:px-6 lg:px-8">
          <div className="max-w-4xl mx-auto text-center">
    
            <h2 className="text-5xl md:text-7xl font-black mb-8 text-gray-800 drop-shadow-sm">
              Own Your Event Experience
            </h2>
            <p className="text-2xl md:text-3xl mb-12 text-gray-700 drop-shadow-sm">
              Show up. Be recognized. Build your on-chain reputation.
            </p>
            <div className="flex flex-col sm:flex-row gap-6 justify-center items-center">
              <Link to="/events/create">
                <button className="px-12 py-6 text-xl font-bold bg-gradient-to-r from-orange-500 to-red-600 hover:from-orange-600 hover:to-red-700 text-white rounded-lg shadow-2xl transform hover:scale-110 transition-all flex items-center gap-3">
                  Create Your Event
                  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                </button>
              </Link>
              <Link to="/events/browse">
                <button className="px-12 py-6 text-xl font-bold bg-white/95 hover:bg-white text-gray-900 rounded-lg shadow-2xl transform hover:scale-110 transition-all border-2 border-white flex items-center gap-3">
                  Discover Events
                  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </button>
              </Link>
            </div>
          </div>
        </section>

        <Footer />
      </div>
    </div>
  );
}
