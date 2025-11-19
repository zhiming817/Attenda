/**
 * 订阅服务工具函数
 * 用于简历付费解锁功能
 */

import { Transaction } from '@mysten/sui/transactions';
import { SUI_CLOCK_OBJECT_ID } from '@mysten/sui/utils';
import { getSubscriptionTarget } from '../config/subscription.config';

/**
 * 创建订阅服务（简历所有者调用）
 * @param {Object} params
 * @param {number} params.fee - 订阅费用 (USDC micro-units)
 * @param {number} params.ttl - 订阅时长 (毫秒)，0 表示永久
 * @param {string} params.name - 服务名称 (简历 ID)
 * @param {string} params.senderAddress - 发送者地址
 * @returns {Transaction} Sui 交易对象
 */
export function createSubscriptionServiceTx(params) {
  const { fee, ttl, name, senderAddress } = params;
  
  const tx = new Transaction();
  tx.setGasBudget(10000000);
  tx.setSender(senderAddress);
  
  // 调用 create_service_entry
  tx.moveCall({
    target: getSubscriptionTarget('create_service_entry'),
    arguments: [
      tx.pure.u64(fee),
      tx.pure.u64(ttl),
      tx.pure.string(name),
    ],
  });
  
  return tx;
}

/**
 * 购买订阅（买家调用）
 * @param {Object} params
 * @param {string} params.serviceId - 订阅服务 ID (简历的 Service Object ID)
 * @param {number} params.fee - 支付金额 (SUI MIST, 9 decimals) - 必须与服务的 fee 完全一致！
 * @param {string} params.buyerAddress - 买家地址
 * @returns {Transaction} Sui 交易对象
 */
export function purchaseSubscriptionTx(params) {
  const { serviceId, fee, buyerAddress } = params;
  
  const tx = new Transaction();
  tx.setGasBudget(10000000);
  tx.setSender(buyerAddress);
  
  // 1. 使用 coinWithBalance 创建精确金额的 Coin（重要！）
  // 注意：fee 必须与 service.fee 完全一致，否则会 abort
  const [paymentCoin] = tx.splitCoins(tx.gas, [tx.pure.u64(fee)]);
  
  // 2. 调用 subscribe - 返回 Subscription 对象
  const subscriptionObj = tx.moveCall({
    target: getSubscriptionTarget('subscribe'),
    arguments: [
      paymentCoin,                    // 支付的 Coin
      tx.object(serviceId),           // Service ID
      tx.object(SUI_CLOCK_OBJECT_ID), // Sui Clock
    ],
  });
  
  // 2. 将 Subscription 转移给买家
  tx.moveCall({
    target: getSubscriptionTarget('transfer'),
    arguments: [
      subscriptionObj,
      tx.pure.address(buyerAddress),
    ],
  });
  
  return tx;
}

/**
 * 验证订阅权限（Seal 解密时调用）
 * @param {Object} params
 * @param {string} params.blobId - Blob ID (hex 格式)
 * @param {string} params.subscriptionId - Subscription Object ID
 * @param {string} params.serviceId - Service Object ID
 * @returns {Function} MoveCall 构造函数
 */
export function constructSubscriptionApprove(params) {
  const { blobId, subscriptionId, serviceId } = params;
  
  return (tx, id) => {
    tx.moveCall({
      target: getSubscriptionTarget('seal_approve'),
      arguments: [
        tx.pure.vector('u8', Array.from(Buffer.from(id, 'hex'))),
        tx.object(subscriptionId),
        tx.object(serviceId),
        // 新合约移除了 Clock 参数 - 支持永久订阅
      ],
    });
  };
}

/**
 * 查询用户的订阅列表
 * @param {Object} suiClient - Sui 客户端
 * @param {string} ownerAddress - 用户地址
 * @param {string} packageId - 合约包 ID
 * @returns {Promise<Array>} 订阅列表
 */
export async function getUserSubscriptions(suiClient, ownerAddress, packageId) {
  try {
    console.log('📡 查询订阅 - 参数:', {
      owner: ownerAddress,
      packageId: packageId,
      filter: `${packageId}::subscription::Subscription`
    });
    
    const result = await suiClient.getOwnedObjects({
      owner: ownerAddress,
      options: {
        showContent: true,
        showType: true,
      },
      filter: {
        StructType: `${packageId}::subscription::Subscription`,
      },
    });
    
    console.log('📡 查询订阅 - 原始结果:', result);
    console.log('📡 查询订阅 - 数据条数:', result.data?.length || 0);
    
    const subscriptions = result.data.map(obj => {
      console.log('📡 处理订阅对象:', obj);
      const fields = obj?.data?.content?.fields || {};
      console.log('📡 订阅字段:', fields);
      return {
        id: fields?.id?.id,
        service_id: fields?.service_id,
        created_at: parseInt(fields?.created_at || 0),
      };
    });
    
    console.log('📡 查询订阅 - 解析结果:', subscriptions);
    return subscriptions;
  } catch (error) {
    console.error('❌ 查询订阅列表失败:', error);
    return [];
  }
}

/**
 * 查询服务详情
 * @param {Object} suiClient - Sui 客户端
 * @param {string} serviceId - Service Object ID
 * @returns {Promise<Object|null>} 服务详情
 */
export async function getServiceDetails(suiClient, serviceId) {
  try {
    const service = await suiClient.getObject({
      id: serviceId,
      options: { showContent: true },
    });
    
    const fields = service?.data?.content?.fields || {};
    return {
      id: serviceId,
      fee: parseInt(fields?.fee || 0),
      ttl: parseInt(fields?.ttl || 0),
      owner: fields?.owner,
      name: fields?.name,
    };
  } catch (error) {
    console.error('查询服务详情失败:', error);
    return null;
  }
}

/**
 * 检查订阅是否有效
 * @param {Object} subscription - 订阅对象
 * @param {Object} service - 服务对象
 * @param {number} currentTimestamp - 当前时间戳 (毫秒)
 * @returns {boolean} 是否有效
 */
export function isSubscriptionValid(subscription, service, currentTimestamp) {
  // 如果 TTL 为 0，表示永久有效
  if (service.ttl === 0) {
    return true;
  }
  
  // 检查是否在有效期内
  const expiresAt = subscription.created_at + service.ttl;
  return currentTimestamp <= expiresAt;
}

/**
 * 添加订阅者到白名单（订阅成功后调用）
 * @param {Object} params
 * @param {string} params.allowlistId - Allowlist Object ID
 * @param {string} params.capId - Cap Object ID
 * @param {string} params.subscriberAddress - 订阅者地址
 * @param {string} params.senderAddress - 发送者地址（通常是简历所有者）
 * @returns {Transaction} Sui 交易对象
 */
export function addSubscriberToAllowlistTx(params) {
  const { allowlistId, capId, subscriberAddress, senderAddress } = params;
  const { TESTNET_PACKAGE_ID, ALLOWLIST_MODULE_NAME } = require('../config/seal.config');
  
  const tx = new Transaction();
  tx.setGasBudget(10000000);
  tx.setSender(senderAddress);
  
  tx.moveCall({
    target: `${TESTNET_PACKAGE_ID}::${ALLOWLIST_MODULE_NAME}::add`,
    arguments: [
      tx.object(allowlistId),
      tx.object(capId),
      tx.pure.address(subscriberAddress),
    ],
  });
  
  return tx;
}
