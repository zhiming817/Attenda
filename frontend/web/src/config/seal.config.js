/**
 * Seal 加密和访问控制配置
 * 基于 examples 目录的实现
 * 参考: examples/frontend/src/constants.ts
 */

// Seal 合约配置 (已部署在测试网)
export const TESTNET_PACKAGE_ID = '0x5a29cc03847b88c5225fb960e6a6ada5ef7ff9fa57494e69a8d831d82f7a5f21';

// Seal 密钥服务器配置
export const SEAL_SERVER_CONFIGS = [
  {
    objectId: '0x73d05d62c18d9374e3ea529e8e0ed6161da1a141a94d3f76ae3fe4e99356db75',
    weight: 1,
  },
  {
    objectId: '0xf5d14a81a982144ae441cd7d64b09027f116a468bd36e7eca494f750591623c8',
    weight: 1,
  },
];

// Seal 配置选项
export const SEAL_CONFIG = {
  // 加密阈值 (需要多少个密钥服务器才能解密)
  threshold: 2,
  // 是否验证密钥服务器
  verifyKeyServers: false,
  // 合约包 ID
  packageId: TESTNET_PACKAGE_ID,
};

// Allowlist 模块名称 (用于访问控制)
export const ALLOWLIST_MODULE_NAME = 'allowlist';

// Sui 网络配置
export const SUI_NETWORK = import.meta.env.VITE_SUI_NETWORK || 'testnet';

// Sui 浏览器 URL
export const SUI_EXPLORER_URL = 'https://suiscan.xyz/testnet';

/**
 * 获取合约调用目标
 * @param {string} functionName - 函数名
 * @returns {string} 完整的合约调用目标
 */
export function getSealTarget(functionName) {
  return `${TESTNET_PACKAGE_ID}::${ALLOWLIST_MODULE_NAME}::${functionName}`;
}
