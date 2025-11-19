import React from 'react';
import { useLocation } from 'react-router-dom';
import Navbar from './Navbar';
import Footer from './Footer';

/**
 * PageLayout Component
 * Wraps pages with Navbar, Footer, and cute background for non-home pages
 */
export default function PageLayout({ children }) {
  const location = useLocation();
  const isHomePage = location.pathname === '/';

  if (isHomePage) {
    // Home page handles its own layout
    return <>{children}</>;
  }

  return (
    <div className="relative min-h-screen">
      {/* Background Image for non-home pages */}
      <div 
        className="fixed inset-0 z-0"
        style={{
          backgroundImage: 'url(/backgroundotherpage.png)',
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundRepeat: 'repeat',
        }}
      />
      
      {/* Overlay for better content readability */}
      <div className="fixed inset-0 z-0 bg-gradient-to-br from-blue-600/60 via-purple-600/60 to-pink-600/60" />
      
      {/* Content */}
      <div className="relative z-10">
        <Navbar />
        <div className="min-h-[calc(100vh-200px)]">
          {children}
        </div>
        <Footer />
      </div>
    </div>
  );
}

