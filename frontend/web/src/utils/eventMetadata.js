/**
 * 活动元数据工具函数
 * 统一处理从 Walrus 加载活动元数据的逻辑
 */

const WALRUS_AGGREGATOR_URL = import.meta.env.VITE_WALRUS_AGGREGATOR;

/**
 * 从 Walrus 加载活动元数据
 * @param {string} walrusBlobId - Walrus Blob ID
 * @returns {Promise<object|null>} 活动元数据对象，失败返回 null
 */
export async function loadEventMetadata(walrusBlobId) {
  if (!walrusBlobId || !WALRUS_AGGREGATOR_URL) {
    return null;
  }

  try {
    const metadataUrl = `${WALRUS_AGGREGATOR_URL}/v1/blobs/${walrusBlobId}`;
    console.log('📥 Fetching metadata from:', metadataUrl);
    const response = await fetch(metadataUrl);
    
    if (response.ok) {
      const metadata = await response.json();
      console.log('📄 Event metadata:', metadata);
      return metadata;
    }
    
    console.warn('Failed to load metadata:', response.status);
    return null;
  } catch (err) {
    console.warn('Failed to load event metadata:', err);
    return null;
  }
}

/**
 * 批量加载多个活动的元数据
 * @param {Array} events - 活动数组，每个活动需要有 walrusBlobId 字段
 * @returns {Promise<Map>} 返回 Map，key 为 walrusBlobId，value 为元数据对象
 */
export async function loadEventMetadataBatch(events) {
  const metadataMap = new Map();
  
  const promises = events.map(async (event) => {
    if (event.walrusBlobId) {
      const metadata = await loadEventMetadata(event.walrusBlobId);
      if (metadata) {
        metadataMap.set(event.walrusBlobId, metadata);
      }
    }
  });
  
  await Promise.all(promises);
  return metadataMap;
}

/**
 * 格式化活动时间显示
 * @param {string} isoString - ISO 格式时间字符串
 * @returns {string} 格式化后的时间字符串
 */
export function formatEventTime(isoString) {
  if (!isoString) return 'TBA';
  
  try {
    const date = new Date(isoString);
    return date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  } catch (err) {
    return 'TBA';
  }
}

/**
 * 格式化活动日期（不含时间）
 * @param {string} isoString - ISO 格式时间字符串
 * @returns {string} 格式化后的日期字符串
 */
export function formatEventDate(isoString) {
  if (!isoString) return 'TBA';
  
  try {
    const date = new Date(isoString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  } catch (err) {
    return 'TBA';
  }
}

/**
 * 获取活动封面图 URL
 * @param {object} metadata - 活动元数据对象
 * @param {string} defaultImageUrl - 默认图片 URL
 * @returns {string} 封面图 URL
 */
export function getEventImageUrl(metadata, defaultImageUrl) {
  return metadata?.imageUrl || defaultImageUrl || '';
}

/**
 * 获取活动标题
 * @param {object} metadata - 活动元数据对象
 * @param {string} eventId - 活动 ID（用于生成默认标题）
 * @returns {string} 活动标题
 */
export function getEventTitle(metadata, eventId) {
  if (metadata?.title) {
    return metadata.title;
  }
  return eventId ? `Event #${eventId.slice(0, 16)}...` : 'Untitled Event';
}

/**
 * 获取活动地点
 * @param {object} metadata - 活动元数据对象
 * @returns {string} 活动地点
 */
export function getEventLocation(metadata) {
  return metadata?.location || 'TBA';
}

/**
 * 获取活动价格显示文本
 * @param {object} metadata - 活动元数据对象
 * @returns {string} 价格显示文本
 */
export function getEventPrice(metadata) {
  const price = metadata?.price;
  if (!price || parseFloat(price) === 0) {
    return 'Free';
  }
  return `${price} SUI`;
}
