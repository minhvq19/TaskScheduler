// Script debug login trực tiếp để kiểm tra vấn đề
import fetch from 'node-fetch';

async function testLogin() {
  const baseUrl = 'http://10.21.118.100:12500';
  
  console.log('🔍 Testing login functionality...');
  
  try {
    // Test 1: Kiểm tra health endpoint
    console.log('\n1. Testing health endpoint...');
    const healthRes = await fetch(`${baseUrl}/api/health`);
    const healthData = await healthRes.text();
    console.log('Health status:', healthRes.status, healthData);
    
    // Test 2: Thử login với tài khoản admin
    console.log('\n2. Testing login with admin credentials...');
    const loginRes = await fetch(`${baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        username: 'admin',
        password: 'AdminBiDV@2025'
      })
    });
    
    const loginData = await loginRes.text();
    console.log('Login status:', loginRes.status);
    console.log('Login response:', loginData);
    
    if (loginRes.status === 500) {
      console.log('❌ Internal Server Error - Check server logs for details');
    } else if (loginRes.status === 401) {
      console.log('❌ Unauthorized - Wrong credentials or user not found');
    } else if (loginRes.status === 200) {
      console.log('✅ Login successful!');
    }
    
  } catch (error) {
    console.error('❌ Network error:', error.message);
  }
}

// Chạy test
testLogin();