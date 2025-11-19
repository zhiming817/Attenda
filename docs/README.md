
## Overview
Today’s event registration platforms like Luma, Eventbrite, and Google Forms rely on centralized data models and email-based access. Tickets, confirmations, and event details are managed by intermediaries.



This project seeks to build a decentralized event and ticketing platform powered by Sui smart contracts, Walrus storage, and Seal encryption, where users:

Register with on-chain or ZkLogin identity.
Receive verifiable, encrypted NFT tickets.
Unlock access to event details hosted on Walrus Sites.
Earn attendance NFTs for proof-of-presence and reward eligibility.


While this RFP outlines recommended features and integrations, applicants are encouraged to propose alternative architectures, flows, or solutions that may better achieve the intended goals. Creative approaches that challenge or improve upon these specifications are welcome, provided they align with Sui and Walrus capabilities.



Enables

For organizers: Transparent, verifiable event data and participant history.
For users: True ownership of tickets, private encrypted access, and reputation-building through attendance.
For ecosystems: Event participation becomes composable data for airdrops, loyalty, and engagement insights.

## Desirable Features
Event Creation & Registration

Create events with metadata (title, time, image, description) stored on Walrus.
ZkLogin support for easy user onboarding.
Optional approval flow for limited-capacity events.
Flexible ticket parameters (price, capacity, visibility, etc.)
Upon successful registration, users receive a verifiable confirmation, confirmation includes an optional ICS calendar file (“Add to Calendar”) 
Payment integrations and discount code management.


NFT Ticketing

Ticket NFTs minted on Sui and linked to a Walrus blob.
Ticket blob includes encrypted metadata (event location, QR code, access link) locked via Seal.
Only the rightful holder can decrypt and view details.
Optional dynamic updates (status, RSVP, attendance).


Event Access & Validation

Ticket holders gain access to a full Walrus Site containing event-specific content (agenda, speakers, media, announcements). 
QR or wallet-based validation for entry
At the venue, ticket NFTs can be scanned for validation and attendance tracking.
Attendance tracking and participation proof on-chain


Attendance Verification

Scanning confirms attendance, triggering mint of an Attendance NFT (soulbound optional).
Proof of attendance can later be used for airdrops, follow-up campaigns, or reputation systems.


Communication

Optional integration notifications (reminders, updates, confirmations, event chat).
 

Communications: Optional integration for email or wallet notifications (reminders, updates, confirmations).



Post-Event Interaction

Event data remains verifiable on Walrus.
Organizers can export anonymized attendance data for analytics.
Attendees can showcase their attendance record across the ecosystem.
Ticket sales reports for tax
Users retain control over their Walrus-stored data and may delete or revoke access to their encrypted blobs while on-chain proofs remain intact.


Optional / Extended Features

Lead capture and networking capabilities, such as opt-in profile sharing, wallet-based reputation links, or post-event follow-ups.
Multi-track or multi-flow registration support for larger events with different ticket tiers, agendas, or attendee types.
Badge printing and check-in support for in-person events, including QR or NFC-based access validation.
Integration points for event apps, sponsor activations, or loyalty programs that leverage on-chain attendance data.

## Deliverables

Technical design and architecture document
Smart contracts for event registration, ticketing, and attendance
Frontend dApp (organizer + attendee view)
Integration with Walrus and Seal for ticket encryption
Deployment on Walrus Sites
NFT minting and attendance verification flows
Open-source repository (frontend + contracts)
GTM strategy


https://airtable.com/appoDAKpC74UOqoDa/shr1je0hfpi4LFHHx/tbliqV4teM5mxdDVp/viwWxOEjmyi7jt6bo/recZvYZQ0wT74sIwC