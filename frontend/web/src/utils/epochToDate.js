/**
 * 将 Sui epoch 编号转换为日期时间
 * 仅当 epoch 为当前 epoch 时才能准确转换
 */

/**
 * 尝试将 epoch 编号解析为日期
 * @param {number|string} epochNumber - Sui epoch 编号
 * @param {string} rpcUrl - Sui RPC URL
 * @returns {Promise<Date|null>} 解析的日期或 null（如果无法解析）
 */
export async function resolveEpochToDate(epochNumber, rpcUrl) {
  if (!rpcUrl) {
    rpcUrl = import.meta.env.VITE_SUI_RPC_URL || 'https://fullnode.testnet.sui.io:443';
  }

  try {
    const res = await fetch(rpcUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 1,
        method: 'suix_getLatestSuiSystemState',
        params: [],
      }),
    });
    
    const json = await res.json();
    const state = json.result || json;

    console.log('Sui System State:', state);

    // 兼容不同的字段名
    const currentEpoch = state.epoch ?? state.current_epoch ?? state.epoch_number ?? null;
    const epochStartMs = state.epochStartTimestampMs ?? 
                        state.epoch_start_timestamp_ms ?? 
                        state.epoch_start_timestamp ?? 
                        state.epoch_start_ms ?? 
                        null;
    
    console.log('Current Epoch:', currentEpoch);
    console.log('Epoch Start Ms:', epochStartMs);
    console.log('Ticket Epoch:', epochNumber);
    console.log('Match:', Number(epochNumber) === Number(currentEpoch));

    if (currentEpoch == null || epochStartMs == null) {
      console.warn('Unable to get current epoch info from system state', { currentEpoch, epochStartMs });
      return null;
    }

    const epochDiff = Number(currentEpoch) - Number(epochNumber);
    
    // 如果是当前 epoch，返回准确时间
    if (epochDiff === 0) {
      return new Date(Number(epochStartMs));
    }
    
    // 如果是最近几个 epoch（比如前 7 个），可以做近似估算
    // Sui epoch 大约 24 小时，但这只是估算
    if (epochDiff > 0 && epochDiff <= 7) {
      const APPROX_EPOCH_DURATION_MS = 24 * 60 * 60 * 1000; // 大约 24 小时
      const estimatedTime = Number(epochStartMs) - (epochDiff * APPROX_EPOCH_DURATION_MS);
      const date = new Date(estimatedTime);
      // 标记这是估算值
      date._isApproximate = true;
      return date;
    }

    // 太久远的 epoch，无法可靠估算
    return null;
  } catch (error) {
    console.error('Error resolving epoch to date:', error);
    return null;
  }
}

/**
 * 格式化 epoch 显示
 * @param {number|string} epochNumber - Sui epoch 编号
 * @param {Date|null} resolvedDate - 解析的日期
 * @returns {string} 格式化的显示文本
 */
export function formatEpochDisplay(epochNumber, resolvedDate) {
  if (resolvedDate) {
    const dateStr = resolvedDate.toLocaleString();
    // 如果是近似估算的日期，添加标识
    if (resolvedDate._isApproximate) {
      return `${dateStr} (approx.)`;
    }
    return dateStr;
  }
  return `Epoch ${epochNumber}`;
}
