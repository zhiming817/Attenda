
# Attenda

**Show up. Be recognized.**

A decentralized event and ticketing platform powered by Sui smart contracts, Walrus storage, and Seal encryption.

## 🎯 Overview

Attenda is a Web3 event management and ticketing platform that brings transparency, security, and ownership to event organizers and attendees. Built on the Sui blockchain, Attenda leverages NFT-based tickets with encrypted metadata to provide a seamless, decentralized event experience.

### Key Features

- **🎫 NFT Tickets**: Each ticket is a unique NFT with on-chain ownership and transferability
- **🔐 Seal Encryption**: Sensitive ticket data (location, QR codes, access links) encrypted using Seal protocol
- **📦 Walrus Storage**: Decentralized storage for event metadata and encrypted ticket information
- **✅ Attendance Verification**: Smart contract-based attendance tracking and proof of attendance
- **👥 Access Control**: Role-based permissions for event organizers and administrators
- **🎨 Rich Metadata**: Event details including images, descriptions, and schedules stored on Walrus

## 🏗️ Architecture

### Smart Contracts (Move)

Located in `/contract/sources/`:

- **`event_registry.move`**: Core event management, creation, and lifecycle
- **`ticket_nft.move`**: NFT ticket minting, transfers, and status management
- **`attendance.move`**: Attendance check-in and verification logic
- **`access_control.move`**: Role-based access control for organizers

### Frontend (React + Vite)

Located in `/frontend/web/`:

- Modern React application with Vite for fast development
- Integration with `@mysten/dapp-kit` for Sui wallet connectivity
- Seal SDK for client-side encryption/decryption
- Walrus client for decentralized storage access

### Mobile App (Flutter)

Located in `/frontend/mobile_flutter/`:

- Cross-platform mobile app built with Flutter for iOS and Android
- Native camera support for QR code scanning
- Sui wallet integration and transaction signing
- Optimized for mobile user experience
- **Download APK**: [Google Drive](https://drive.google.com/file/d/1Q3kOnNSMKxEgzcyFzf-jo6U8l1r_Loeg/view)

### Backend (Rust)

Located in `/backend/rust-backend/`:

- RESTful API server built with Rust
- Database integration for off-chain indexing
- Event and ticket data management

## 🚀 Getting Started

### Prerequisites

- Node.js 18+ and pnpm
- Sui CLI and wallet
- Rust toolchain (for backend)
- Access to Sui testnet and Walrus testnet

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/zhiming817/Attenda.git
   cd Attenda
   ```

2. **Install frontend dependencies**
   ```bash
   cd frontend/web
   pnpm install
   ```

3. **Configure environment variables**
   
   Create `.env` file in `frontend/web/`:
   ```env
   VITE_PACKAGE_ID=0x8b17b23f2ecc48dc78d453f437b98b241b4948ea0f32c3371ad9a9d7bc3cbec0
   VITE_WALRUS_AGGREGATOR=https://aggregator.walrus-testnet.walrus.space
   VITE_WALRUS_PUBLISHER=https://publisher.walrus-testnet.walrus.space
   ```

4. **Deploy smart contracts**
   ```bash
   cd contract
   sui client publish --gas-budget 100000000
   ```

5. **Run the frontend**
   ```bash
   cd frontend/web
   pnpm run dev
   ```

## 📖 Usage

### For Event Organizers

1. **Connect Wallet**: Connect your Sui wallet (Sui Wallet, Suiet, etc.)
2. **Create Event**: Fill in event details, upload cover image, set capacity and pricing
3. **Manage Event**: View ticket sales, pause/resume sales, close events
4. **Check Attendance**: Verify attendee tickets and mark attendance on-chain

### For Attendees

1. **Browse Events**: Explore upcoming events on the platform
2. **Purchase Tickets**: Buy NFT tickets with SUI tokens
3. **View Tickets**: Access your ticket collection with encrypted details
4. **Decrypt Details**: Use Seal to decrypt sensitive ticket information (QR codes, location, access links)
5. **Attend Event**: Present QR code at venue for verification

## 🔒 Security Features

### Seal Encryption

- Ticket metadata encrypted client-side using Seal protocol
- Only ticket owner can decrypt sensitive information
- Session keys with TTL for secure decryption
- Wallet signature required for SessionKey creation

### Smart Contract Security

- Role-based access control for administrative functions
- Ticket status verification (Valid, Used, Revoked)
- Event lifecycle management (Active, Paused, Closed, Cancelled)
- Transfer restrictions for used or revoked tickets

## 🛠️ Technology Stack

- **Blockchain**: Sui (Move smart contracts)
- **Storage**: Walrus decentralized storage network
- **Encryption**: Seal protocol for client-side encryption
- **Frontend**: React, Vite, TailwindCSS, @mysten/dapp-kit
- **Mobile**: Flutter, Dart, mobile_scanner
- **Backend**: Rust, Tokio, SQLx
- **Database**: PostgreSQL

## 📚 Documentation

- [Product Requirements](./docs/design/PRODUCT_REQUIREMENTS.md)
- [Technical Design](./docs/design/TECHNICAL_DESIGN.md)
- [Smart Contracts](./docs/design/SMART_CONTRACTS.md)
- [Database Schema](./docs/backend/DATABASE_SCHEMA.md)
- [Frontend Pages](./docs/frontend/PAGES_README.md)
- [Demo Guide](./演示指南_DEMO_GUIDE.md)

## 🎬 Demo

Check out our [3-minute demo guide](./演示指南_DEMO_GUIDE.md) for a quick walkthrough of the platform's key features.

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## 📄 License

This project is licensed under the MIT License.

## 🔗 Links

- [Sui Network](https://sui.io/)
- [Walrus Storage](https://walrus.site/)
- [Seal Protocol](https://github.com/MystenLabs/seal)

## 👥 Team

Built by [@zhiming817](https://github.com/zhiming817)

---

**Attenda** - Bringing events to Web3, one ticket at a time. 🎫✨