/**
 * Walrus 集成测试
 */

import { uploadToWalrus, downloadFromWalrus } from './walrus.js';

export async function testWalrusUpload() {
  try {
    console.log('🧪 Testing Walrus upload...');
    
    // 创建测试数据
    const testData = 'Hello Walrus! This is a test message.';
    const blob = new Blob([testData], { type: 'text/plain' });
    
    // 上传
    const result = await uploadToWalrus(blob, {
      type: 'test',
      timestamp: new Date().toISOString(),
    });
    
    console.log('✅ Test upload successful:', result);
    
    return result;
  } catch (error) {
    console.error('❌ Test upload failed:', error);
    throw error;
  }
}

export async function testWalrusDownload(blobId) {
  try {
    console.log('🧪 Testing Walrus download...');
    console.log('Blob ID:', blobId);
    
    // 下载
    const blob = await downloadFromWalrus(blobId);
    
    // 读取内容
    const text = await blob.text();
    console.log('✅ Test download successful:', text);
    
    return text;
  } catch (error) {
    console.error('❌ Test download failed:', error);
    throw error;
  }
}

export async function testWalrusRoundTrip() {
  try {
    console.log('🧪 Testing Walrus round trip...');
    
    // 上传
    const uploadResult = await testWalrusUpload();
    
    // 下载
    const downloadedText = await testWalrusDownload(uploadResult.blobId);
    
    // 验证
    const expected = 'Hello Walrus! This is a test message.';
    if (downloadedText === expected) {
      console.log('✅ Round trip test PASSED!');
      return true;
    } else {
      console.error('❌ Round trip test FAILED!');
      console.error('Expected:', expected);
      console.error('Got:', downloadedText);
      return false;
    }
  } catch (error) {
    console.error('❌ Round trip test error:', error);
    throw error;
  }
}
