import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCurrentAccount, useSignAndExecuteTransaction } from '@mysten/dapp-kit';
import { Transaction } from '@mysten/sui/transactions';
import Navbar from '../../layout/Navbar.jsx';
import Footer from '../../layout/Footer.jsx';
import { uploadToWalrus } from '../../utils/walrus.js';

const PACKAGE_ID = import.meta.env.VITE_PACKAGE_ID ;
const WALRUS_AGGREGATOR_URL = import.meta.env.VITE_WALRUS_AGGREGATOR;

export default function CreateEvent() {
  const navigate = useNavigate();
  const currentAccount = useCurrentAccount();
  const { mutate: signAndExecuteTransaction } = useSignAndExecuteTransaction();

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    location: '',
    startTime: '',
    endTime: '',
    capacity: '',
    price: '',
    imageFile: null,
    ticketType: 'general',
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [imagePreview, setImagePreview] = useState('');

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setFormData(prev => ({ ...prev, imageFile: file }));
      
      // 创建预览
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!currentAccount) {
      setError('Please connect your wallet first');
      return;
    }

    setLoading(true);
    setError('');

    try {
      let imageUrl = '';
      
      // 如果用户上传了图片，先上传到 Walrus
      if (formData.imageFile) {
        console.log('Uploading image to Walrus...');
        const imageUploadResult = await uploadToWalrus(formData.imageFile, {
          type: 'event-image',
          title: formData.title,
        });
        console.log('Image upload successful:', imageUploadResult);
        
        // 拼接完整的图片 URL
        imageUrl = `${WALRUS_AGGREGATOR_URL}/v1/blobs/${imageUploadResult.blobId}`;
        console.log('Image URL:', imageUrl);
      }
      
      // 构建活动元数据 JSON
      const eventMetadata = {
        title: formData.title,
        description: formData.description,
        location: formData.location,
        startTime: formData.startTime,
        endTime: formData.endTime,
        price: formData.price,
        imageUrl: imageUrl,
        ticketType: formData.ticketType,
        createdAt: new Date().toISOString(),
      };

      // 上传 eventMetadata 到 Walrus
      console.log('Uploading event metadata to Walrus...');
      const metadataJson = JSON.stringify(eventMetadata);
      const metadataBlob = new Blob([metadataJson], { type: 'application/json' });
      
      const uploadResult = await uploadToWalrus(metadataBlob, {
        type: 'event-metadata',
        title: formData.title,
      });
      
      console.log('Upload successful:', uploadResult);
      const walrusBlobId = uploadResult.blobId;
      
      // 将 blobId 字符串转换为 u8 数组
      const walrusBlobIdBytes = new TextEncoder().encode(walrusBlobId);
      
      // 创建交易
      const tx = new Transaction();
      
      tx.moveCall({
        target: `${PACKAGE_ID}::event_registry::create_event`,
        arguments: [
          tx.pure.vector('u8', Array.from(walrusBlobIdBytes)),
          tx.pure.u64(parseInt(formData.capacity)),
          tx.object('0x6'), // Clock 对象
        ],
      });

      // 执行交易
      signAndExecuteTransaction(
        {
          transaction: tx,
        },
        {
          onSuccess: (result) => {
            console.log('Event created successfully:', result);
            
            // 提取创建的对象信息
            const objectChanges = result.objectChanges || [];
            const eventInfo = objectChanges.find(obj => 
              obj.objectType?.includes('EventInfo')
            );
            const ticketPolicy = objectChanges.find(obj => 
              obj.objectType?.includes('TicketPolicy')
            );
            const policyCap = objectChanges.find(obj => 
              obj.objectType?.includes('PolicyCap')
            );
            
            console.log('📦 Created objects:', {
              eventInfo: eventInfo?.objectId,
              ticketPolicy: ticketPolicy?.objectId,
              policyCap: policyCap?.objectId,
            });
            
            // 提示用户保存 PolicyCap 信息
            if (policyCap) {
              alert(`✅ Event created successfully! 🎉\n\n⚠️ Important: Save your PolicyCap ID:\n${policyCap.objectId}\n\nYou will need this to mint tickets.`);
            } else {
              alert('Event created successfully! 🎉');
            }
            
            navigate('/events/my');
          },
          onError: (error) => {
            console.error('Error creating event:', error);
            setError(error.message || 'Failed to create event');
            setLoading(false);
          },
        }
      );
    } catch (err) {
      console.error('Error:', err);
      setError(err.message || 'An unexpected error occurred');
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 to-red-50">
      <Navbar />
      
      <div className="max-w-4xl mx-auto px-4 py-12">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl md:text-5xl font-black text-gray-900 mb-4">
            Create New Event
          </h1>
          <p className="text-xl text-gray-600">
            Organize your event on-chain with NFT tickets
          </p>
        </div>

        {/* Form */}
        <div className="bg-white rounded-2xl shadow-xl p-8 border-2 border-orange-200">
          {error && (
            <div className="mb-6 p-4 bg-red-50 border-l-4 border-red-500 text-red-700">
              <p className="font-medium">Error</p>
              <p className="text-sm">{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Event Title */}
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">
                Event Title *
              </label>
              <input
                type="text"
                name="title"
                required
                value={formData.title}
                onChange={handleChange}
                placeholder="e.g., Web3 Developer Meetup"
                className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-all text-gray-900"
              />
            </div>

            {/* Description */}
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">
                Description *
              </label>
              <textarea
                name="description"
                required
                value={formData.description}
                onChange={handleChange}
                rows="4"
                placeholder="Describe your event..."
                className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-all text-gray-900"
              />
            </div>

            {/* Location */}
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">
                Location *
              </label>
              <input
                type="text"
                name="location"
                required
                value={formData.location}
                onChange={handleChange}
                placeholder="e.g., San Francisco, CA or Online"
                className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-all text-gray-900"
              />
            </div>

            {/* Date & Time */}
            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">
                  Start Date & Time *
                </label>
                <input
                  type="datetime-local"
                  name="startTime"
                  required
                  value={formData.startTime}
                  onChange={handleChange}
                  className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-all text-gray-900"
                />
              </div>
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">
                  End Date & Time *
                </label>
                <input
                  type="datetime-local"
                  name="endTime"
                  required
                  value={formData.endTime}
                  onChange={handleChange}
                  className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-all text-gray-900"
                />
              </div>
            </div>

            {/* Capacity & Price */}
            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">
                  Capacity *
                </label>
                <input
                  type="number"
                  name="capacity"
                  required
                  min="1"
                  value={formData.capacity}
                  onChange={handleChange}
                  placeholder="e.g., 100"
                  className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-all text-gray-900"
                />
              </div>
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">
                  Price (SUI)
                </label>
                <input
                  type="number"
                  name="price"
                  min="0"
                  step="0.01"
                  value={formData.price}
                  onChange={handleChange}
                  placeholder="0 for free event"
                  className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-all text-gray-900"
                />
              </div>
            </div>

            {/* Image Upload */}
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">
                Event Image
              </label>
              <input
                type="file"
                accept="image/*"
                onChange={handleImageChange}
                className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-all text-gray-900"
              />
              {imagePreview && (
                <div className="mt-4">
                  <img 
                    src={imagePreview} 
                    alt="Preview" 
                    className="max-w-xs rounded-lg shadow-md"
                  />
                </div>
              )}
            </div>

            {/* Ticket Type */}
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">
                Ticket Type
              </label>
              <select
                name="ticketType"
                value={formData.ticketType}
                onChange={handleChange}
                className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-all text-gray-900"
              >
                <option value="general">General Admission</option>
                <option value="vip">VIP</option>
                <option value="early-bird">Early Bird</option>
                <option value="student">Student</option>
              </select>
            </div>

            {/* Submit Button */}
            <div className="flex gap-4 pt-6">
              <button
                type="button"
                onClick={() => navigate('/events/browse')}
                className="flex-1 px-6 py-4 text-lg font-bold border-2 border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-all"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading || !currentAccount}
                className="flex-1 px-6 py-4 text-lg font-bold bg-gradient-to-r from-orange-500 to-red-600 hover:from-orange-600 hover:to-red-700 text-white rounded-lg shadow-lg transform hover:scale-105 transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
              >
                {loading ? (
                  <span className="flex items-center justify-center gap-2">
                    <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    Creating...
                  </span>
                ) : !currentAccount ? (
                  'Connect Wallet First'
                ) : (
                  '🎉 Create Event'
                )}
              </button>
            </div>
          </form>
        </div>

        {/* Info Box */}
        <div className="mt-8 bg-gradient-to-r from-orange-100 to-red-100 rounded-lg p-6 border-2 border-orange-300">
          <h3 className="text-lg font-bold text-orange-900 mb-3 flex items-center gap-2">
            <span>ℹ️</span> How it works
          </h3>
          <ul className="space-y-2 text-orange-800">
            <li className="flex items-start gap-2">
              <span className="text-orange-600 font-bold">1.</span>
              <span>Event metadata will be stored on Walrus (decentralized storage)</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-orange-600 font-bold">2.</span>
              <span>Event info is registered on-chain via Sui smart contract</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-orange-600 font-bold">3.</span>
              <span>Attendees will receive NFT tickets with encrypted access</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-orange-600 font-bold">4.</span>
              <span>You can manage your event and verify attendance on-chain</span>
            </li>
          </ul>
        </div>
      </div>

      <Footer />
    </div>
  );
}
