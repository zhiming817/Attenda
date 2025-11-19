/**
 * Walrus 去中心化存储集成
 * 使用 @mysten/walrus TypeScript SDK
 * 参考: https://sdk.mystenlabs.com/walrus
 */

import { SuiClient, getFullnodeUrl } from '@mysten/sui/client';
import { walrus } from '@mysten/walrus';
import walrusWasmUrl from '@mysten/walrus-wasm/web/walrus_wasm_bg.wasm?url';

// 创建 Walrus 客户端
let walrusClient = null;
let initPromise = null;

/**
 * 初始化 Walrus 客户端
 */
async function initWalrusClient() {
  if (walrusClient) {
    return walrusClient;
  }
  
  if (initPromise) {
    return initPromise;
  }
  
  initPromise = (async () => {
    try {
      console.log('🔧 Initializing Walrus client...');
      
      // 获取网络配置 (testnet 或 mainnet)
      const network = import.meta.env.VITE_SUI_NETWORK || 'testnet';
      
      const suiClient = new SuiClient({
        url: getFullnodeUrl(network),
      });
      
      // 使用 network 参数和静态导入的 WASM URL
      walrusClient = suiClient.$extend(walrus({
        network,
        wasmUrl: walrusWasmUrl,
      }));
      
      console.log(`✅ Walrus client initialized for ${network}`);
      
      return walrusClient;
    } catch (error) {
      console.error('❌ Failed to initialize Walrus client:', error);
      initPromise = null;
      throw error;
    }
  })();
  
  return initPromise;
}

/**
 * 获取 Walrus 客户端
 */
async function getWalrusClient() {
  return await initWalrusClient();
}

/**
 * 上传数据到 Walrus
 * @param {Blob} blob - 要上传的数据
 * @param {object} metadata - 元数据
 * @returns {Promise<object>} { blobId, info, url }
 */
export async function uploadToWalrus(blob, metadata = {}, signer = null) {
  try {
    console.log('📤 Uploading to Walrus...');
    console.log('📦 Size:', blob.size, 'bytes');
    console.log('📋 Metadata:', metadata);

    const client = await getWalrusClient();

    // 将 Blob 转换为 Uint8Array
    const arrayBuffer = await blob.arrayBuffer();
    const uint8Array = new Uint8Array(arrayBuffer);

    const epochs = import.meta.env.VITE_WALRUS_EPOCHS
      ? Number(import.meta.env.VITE_WALRUS_EPOCHS)
      : 5;

    // 如果传入 signer，优先使用 SDK 的 writeBlob（需要 signer）
    if (signer) {
      try {
        console.log('⬆️  Uploading via Walrus SDK (writeBlob) with signer...');
        const { blobId, blobObject } = await client.walrus.writeBlob({
          blob: uint8Array,
          deletable: false,
          epochs,
          signer,
        });

        console.log('✅ Upload successful (SDK)!');
        console.log('🆔 Blob ID:', blobId);

        const aggregatorUrl = import.meta.env.VITE_WALRUS_AGGREGATOR ||
          'https://aggregator.walrus-testnet.walrus.space';

        return {
          blobId,
          info: blobObject,
          url: `${aggregatorUrl}/v1/${blobId}`,
        };
      } catch (err) {
        console.warn('Walrus SDK writeBlob failed, falling back to publisher HTTP:', err);
        // fallthrough to HTTP publisher below
      }
    }

    // Fallback: 使用 HTTP Publisher API（适用于不提供 signer 的情况）
    console.log('⬆️  Uploading via Publisher HTTP (fallback)...');
    const publisherUrl = import.meta.env.VITE_WALRUS_PUBLISHER ||
      'https://publisher.walrus-testnet.walrus.space';

    const response = await fetch(`${publisherUrl}/v1/blobs`, {
      method: 'PUT',
      body: uint8Array,
      headers: {
        'Content-Type': 'application/octet-stream',
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Walrus upload failed: ${response.status} ${errorText}`);
    }

    const result = await response.json();
    console.log('✅ Upload result (publisher):', result);

    // 提取 blobId
    const blobId = result.newlyCreated?.blobObject?.blobId ||
      result.alreadyCertified?.blobId;

    if (!blobId) {
      throw new Error('No blob ID returned from Walrus');
    }

    console.log('✅ Upload successful (publisher)!');
    console.log('🆔 Blob ID:', blobId);

    const aggregatorUrl = import.meta.env.VITE_WALRUS_AGGREGATOR ||
      'https://aggregator.walrus-testnet.walrus.space';

    return {
      blobId,
      info: result,
      url: `${aggregatorUrl}/v1/${blobId}`,
    };
  } catch (error) {
    console.error('❌ Upload to Walrus failed:', error);
    throw new Error(`Walrus upload failed: ${error.message}`);
  }
}

/**
 * 从 Walrus 下载数据
 * @param {string} blobId - Blob ID
 * @returns {Promise<Blob>} 下载的数据
 */
export async function downloadFromWalrus(blobId) {
  try {
    console.log('📥 Downloading from Walrus...');
    console.log('🆔 Blob ID:', blobId);
    
    const client = await getWalrusClient();
    
    console.log('⬇️  Downloading blob from Walrus storage nodes...');
    
    // 使用 Walrus SDK 的 readBlob 方法
    const uint8Array = await client.walrus.readBlob({ blobId });
    
    console.log('✅ Download successful!');
    console.log('📦 Size:', uint8Array.length, 'bytes');
    
    // 转换为 Blob
    const blob = new Blob([uint8Array]);
    
    return blob;
  } catch (error) {
    console.error('❌ Download from Walrus failed:', error);
    throw new Error(`Walrus download failed: ${error.message}`);
  }
}

/**
 * 检查 Blob 状态
 * @param {string} blobId - Blob ID
 * @returns {Promise<object>} Blob 信息
 */
export async function getBlobInfo(blobId) {
  try {
    console.log('ℹ️  Getting blob info...');
    console.log('🆔 Blob ID:', blobId);
    
    const aggregatorUrl = import.meta.env.VITE_WALRUS_AGGREGATOR || 
      'https://aggregator.walrus-testnet.walrus.space';
    
    const response = await fetch(`${aggregatorUrl}/v1/${blobId}`, {
      method: 'HEAD',
    });
    
    if (!response.ok) {
      throw new Error(`Get blob info failed: ${response.status}`);
    }
    
    return {
      exists: true,
      blobId,
      size: response.headers.get('content-length'),
      contentType: response.headers.get('content-type'),
    };
  } catch (error) {
    console.error('❌ Get blob info failed:', error);
    throw new Error(`Get blob info failed: ${error.message}`);
  }
}
