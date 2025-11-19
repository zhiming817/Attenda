import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useCurrentAccount, ConnectButton } from '@mysten/dapp-kit';

const Navbar = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const currentAccount = useCurrentAccount();

  const formatAddress = (address) => {
    if (!address) return '';
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  const navigation = [
    { name: 'Home', href: '/' },
    { name: '➕ Create Event', href: '/events/create' },
    { name: '📋 Browse Events', href: '/events/browse' },
    { name: '🎭 My Events', href: '/events/my' },
    { name: '🎫 My Tickets', href: '/events/tickets' },
  ];

  const createItems = [
    { name: 'Create Vault', href: '/resume/create' },
  ];

  const isActive = (href) => {
    if (href === '/') return location.pathname === '/';
    return location.pathname.startsWith(href);
  };

  const handleNavigation = (href) => {
    navigate(href);
    setIsMenuOpen(false);
  };

  return (
    <nav className="bg-white border-b border-gray-200 sticky top-0 z-50 backdrop-blur-sm bg-white/90">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <button
            onClick={() => handleNavigation('/')}
            className="flex items-center space-x-2 cursor-pointer"
          >
            <div className="bg-gradient-to-r from-orange-500 to-red-600 p-2 rounded-lg">
              <span className="text-white text-xl font-bold">🎭</span>
            </div>
            <span className="text-xl font-bold text-gray-900">Attenda</span>
          </button>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center space-x-8">
            {navigation.map((item) => (
              <button
                key={item.name}
                onClick={() => handleNavigation(item.href)}
                className={`px-3 py-2 rounded-md text-sm font-medium transition-colors flex items-center space-x-1 ${
                  isActive(item.href)
                    ? 'text-orange-600 bg-orange-50'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                }`}
              >
                {item.icon && <span>{item.icon}</span>}
                <span>{item.name}</span>
              </button>
            ))}
            
            {/* Create Dropdown */}
            
          </div>

          {/* Wallet Connection */}
          <div className="flex items-center space-x-4">
            {currentAccount ? (
              <div className="flex items-center space-x-3">
                <div className="text-right hidden sm:block">
                  <div className="text-sm font-medium text-gray-900">
                    {formatAddress(currentAccount.address)}
                  </div>
                  <div className="text-xs text-gray-500">
                    Connected
                  </div>
                </div>
                <ConnectButton />
              </div>
            ) : (
              <ConnectButton />
            )}

            {/* Mobile menu button */}
            <button
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="md:hidden p-2 rounded-md text-gray-600 hover:text-gray-900 hover:bg-gray-50"
            >
              {isMenuOpen ? (
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              ) : (
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              )}
            </button>
          </div>
        </div>

        {/* Mobile Navigation */}
        {isMenuOpen && (
          <div className="md:hidden border-t border-gray-200 pt-4 pb-4">
            <div className="space-y-2">
              {navigation.map((item) => (
                <button
                  key={item.name}
                  onClick={() => handleNavigation(item.href)}
                  className={`block w-full text-left px-3 py-2 rounded-md text-base font-medium transition-colors flex items-center space-x-2 ${
                    isActive(item.href)
                      ? 'text-orange-600 bg-orange-50'
                      : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                  }`}
                >
                  {item.icon && <span>{item.icon}</span>}
                  <span>{item.name}</span>
                </button>
              ))}
              
              {/* Create Items in Mobile */}
              <div className="border-t border-gray-200 pt-2 mt-2">
                {createItems.map((item) => (
                  <button
                    key={item.name}
                    onClick={() => handleNavigation(item.href)}
                    className="block w-full text-left px-3 py-2 rounded-md text-base font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-50 transition-colors"
                  >
                    {item.name}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </nav>
  );
};

export default Navbar;
