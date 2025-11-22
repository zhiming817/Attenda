/**
 * 门票加密工具
 * 使用 Seal 加密敏感的门票元数据（活动地点、二维码、访问链接）
 */

import QRCode from 'qrcode';
import { SessionKey } from '@mysten/seal';
import { getSealClient, getSuiClient } from './sealClient';
import { uploadToWalrus, downloadFromWalrus } from './walrus';
import { fromHex, toHex } from '@mysten/sui/utils';
import { EncryptedObject, NoAccessError } from '@mysten/seal';
import { Transaction } from '@mysten/sui/transactions';
import { SEAL_CONFIG, getSealTarget, ATTENDA_PACKAGE_ID } from '../config/seal.config';

/**
 * 生成门票二维码
 * @param {object} qrData - 二维码数据
 * @returns {Promise<string>} Base64 格式的二维码图片
 */
async function generateQRCode(qrData) {
  try {
    const qrCodeDataUrl = await QRCode.toDataURL(JSON.stringify(qrData), {
      errorCorrectionLevel: 'H',
      margin: 1,
      width: 300,
      color: {
        dark: '#000000',
        light: '#FFFFFF',
      },
    });
    return qrCodeDataUrl;
  } catch (error) {
    console.error('QR code generation failed:', error);
    throw new Error('Failed to generate QR code');
  }
}

/**
 * 生成验证码
 */
function generateVerificationCode() {
  return Math.random().toString(36).substring(2, 10).toUpperCase();
}

/**
 * 创建并加密门票元数据
 * @param {object} ticketInfo - 门票信息
 * @param {string} ticketInfo.eventId - 活动 ID
 * @param {string} ticketInfo.ticketId - 门票 ID
 * @param {string} ticketInfo.eventTitle - 活动标题
 * @param {string} ticketInfo.location - 活动地点
 * @param {string} ticketInfo.startTime - 开始时间
 * @param {string} ticketInfo.accessLink - 访问链接
 * @param {string} ticketInfo.holderAddress - 持有者地址
 * @param {string} ticketInfo.policyId - Seal 策略 ID（TicketPolicy 对象 ID）
 * @returns {Promise<object>} { blobId, encryptionId, url }
 */
export async function createEncryptedTicketMetadata(ticketInfo) {
  try {
    const {
      eventId,
      ticketId,
      eventTitle,
      location,
      startTime,
      accessLink,
      holderAddress,
      policyId,
    } = ticketInfo;
    
    if (!policyId) {
      throw new Error('policyId is required for encryption');
    }

    console.log('🎫 Step 1: Generating ticket metadata...');

    // 1. 生成二维码数据
    const qrData = {
      ticketId,
      eventId,
      holder: holderAddress,
      timestamp: Date.now(),
      verificationCode: generateVerificationCode(),
    };

    const qrCodeImage = await generateQRCode(qrData);

    // 2. 构建敏感元数据（需要加密的部分）
    const sensitiveMetadata = {
      location: location || 'TBA',
      qrCode: qrCodeImage,
      accessLink: accessLink || `https://attenda.app/events/${eventId}/access`,
      verificationCode: qrData.verificationCode,
      startTime: startTime || new Date().toISOString(),
      secretNote: 'This is your encrypted ticket. Keep it safe!',
    };

    // 3. 构建完整的门票元数据
    const ticketMetadata = {
      version: '1.0',
      type: 'attenda-ticket',
      eventTitle,
      eventId,
      ticketId,
      holder: holderAddress,
      issuedAt: new Date().toISOString(),
      // 公开信息
      publicInfo: {
        eventName: eventTitle,
        ticketType: 'General Admission',
        status: 'Valid',
      },
      // 加密的敏感信息
      encryptedData: sensitiveMetadata,
    };

    console.log('🔐 Step 2: Encrypting sensitive metadata with Seal...');

    // 4. 使用 Seal 加密敏感元数据
    const sealClient = getSealClient();
    const jsonString = JSON.stringify(ticketMetadata);
    const dataBytes = new TextEncoder().encode(jsonString);

    // 生成加密 ID (使用 policy ID + 随机 nonce)
    const nonce = crypto.getRandomValues(new Uint8Array(5));
    const policyBytes = fromHex(policyId.replace('0x', ''));
    const encryptionId = toHex(new Uint8Array([...policyBytes, ...nonce]));

    console.log('🔑 Policy ID:', policyId);
    console.log('🔑 Encryption ID:', encryptionId);

    // 使用 Seal 加密 - packageId 应该是 ATTENDA_PACKAGE_ID
    const { encryptedObject: encryptedBytes } = await sealClient.encrypt({
      threshold: SEAL_CONFIG.threshold,
      packageId: ATTENDA_PACKAGE_ID,
      id: encryptionId,
      data: dataBytes,
    });

    console.log('✅ Encryption complete');
    console.log('📦 Encrypted size:', encryptedBytes.length, 'bytes');

    // 5. 上传加密数据到 Walrus
    console.log('☁️  Step 3: Uploading to Walrus...');

    const encryptedBlob = new Blob([encryptedBytes], {
      type: 'application/octet-stream',
    });

    const { blobId, url } = await uploadToWalrus(encryptedBlob, {
      type: 'encrypted-ticket',
      encrypted: true,
      encryptionId,
      eventId,
      ticketId,
      holder: holderAddress,
      timestamp: new Date().toISOString(),
    });

    console.log('✅ Upload complete');
    console.log('🆔 Blob ID:', blobId);

    // 6. 返回加密数据的哈希（用于存储在 NFT 中）
    const metadataHash = await crypto.subtle.digest(
      'SHA-256',
      new TextEncoder().encode(encryptionId)
    );

    return {
      blobId,
      encryptionId,
      metadataHash: Array.from(new Uint8Array(metadataHash)),
      url,
    };
  } catch (error) {
    console.error('❌ Failed to create encrypted ticket metadata:', error);
    throw new Error(`Ticket encryption failed: ${error.message}`);
  }
}

/**
 * 解密门票元数据
 * @param {string} blobId - Walrus Blob ID
 * @param {string} holderAddress - 持有者地址（用于访问控制）
 * @param {string} policyId - Seal 策略 ID（TicketPolicy 对象 ID）
 * @param {object} suiClient - Sui 客户端
 * @param {function} signPersonalMessage - 签名函数
 * @returns {Promise<object>} 解密后的门票元数据
 */
export async function decryptTicketMetadata(blobId, holderAddress, policyId, suiClient, signPersonalMessage) {
  try {
    if (!policyId) {
      throw new Error('policyId is required for decryption');
    }
    
    if (!suiClient || !signPersonalMessage) {
      throw new Error('suiClient and signPersonalMessage are required');
    }
    
    console.log('🔧 Debug - ATTENDA_PACKAGE_ID:', ATTENDA_PACKAGE_ID);
    console.log('🔧 Debug - policyId:', policyId);
    console.log('🔧 Debug - holderAddress:', holderAddress);
    
    console.log('📥 Step 1: Downloading encrypted ticket from Walrus...');

    // 1. 从 Walrus 下载加密数据
    const encryptedBlob = await downloadFromWalrus(blobId);
    const arrayBuffer = await encryptedBlob.arrayBuffer();
    const encryptedData = new Uint8Array(arrayBuffer);

    console.log('✅ Download complete');
    console.log('📦 Encrypted size:', encryptedData.length, 'bytes');

    // 2. 解析加密对象获取 ID
    const encryptedObject = EncryptedObject.parse(encryptedData);
    const fullId = encryptedObject.id;

    console.log('🔑 Encryption ID:', fullId);
    console.log('🔑 Policy ID:', policyId);
    console.log('🔓 Step 2: Decrypting with Seal...');

    const sealClient = getSealClient();

    // 3. 创建并签名 SessionKey
    console.log('🔑 Creating SessionKey...');
    const sessionKey = await SessionKey.create({
      address: holderAddress,
      packageId: ATTENDA_PACKAGE_ID,
      ttlMin: 10, // 10 分钟有效期
      suiClient,
    });
    
    // 签名 SessionKey
    console.log('✍️ 请在钱包中签名 SessionKey...');
    const personalMessage = sessionKey.getPersonalMessage();
    const signResult = await signPersonalMessage({
      message: personalMessage,
    });
    await sessionKey.setPersonalMessageSignature(signResult.signature);
    console.log('✅ SessionKey 创建并签名成功');

    // 4. 创建访问控制交易（验证持有者身份）
    const tx = new Transaction();
    
    // 调用 ticket_seal::seal_approve 验证访问权限
    tx.moveCall({
      target: getSealTarget('seal_approve'),
      arguments: [
        tx.pure.vector('u8', Array.from(fromHex(fullId))),
        tx.object(policyId), // 使用 TicketPolicy 对象 ID
      ],
    });

    console.log('🔑 Building transaction...');
    const txBytes = await tx.build({
      client: suiClient,
      onlyTransactionKind: true,
    });

    try {
      // 5. 从密钥服务器获取解密密钥
      await sealClient.fetchKeys({
        ids: [fullId],
        txBytes,
        sessionKey,
        threshold: SEAL_CONFIG.threshold,
      });

      // 6. 解密数据
      const decryptedData = await sealClient.decrypt({
        data: encryptedData,
        sessionKey,
        txBytes,
      });

      // 7. 转换回 JSON
      const jsonString = new TextDecoder().decode(decryptedData);
      const ticketMetadata = JSON.parse(jsonString);

      console.log('✅ Decryption complete');

      return ticketMetadata;
    } catch (err) {
      if (err instanceof NoAccessError) {
        throw new Error('Access denied: You do not own this ticket');
      }
      throw new Error(`Decryption failed: ${err.message}`);
    }
  } catch (error) {
    console.error('❌ Failed to decrypt ticket metadata:', error);
    throw error;
  }
}

/**
 * 验证门票二维码
 * @param {string} qrCodeData - 二维码数据（JSON 字符串）
 * @param {string} ticketId - 门票 ID
 * @returns {boolean} 是否有效
 */
export function verifyTicketQRCode(qrCodeData, ticketId) {
  try {
    const data = JSON.parse(qrCodeData);
    return data.ticketId === ticketId && data.timestamp > 0;
  } catch (error) {
    console.error('QR code verification failed:', error);
    return false;
  }
}
