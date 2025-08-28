// Script debug đơn giản sử dụng cú pháp CommonJS
const http = require('http');

function testLogin() {
  console.log('🔍 Testing login on Ubuntu Server...');
  
  const postData = JSON.stringify({
    username: 'admin',
    password: 'AdminBiDV@2025'
  });

  const options = {
    hostname: '10.21.118.100',
    port: 12500,
    path: '/api/auth/login',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(postData)
    }
  };

  const req = http.request(options, (res) => {
    console.log(`Status: ${res.statusCode}`);
    console.log(`Headers:`, res.headers);
    
    let data = '';
    res.on('data', (chunk) => {
      data += chunk;
    });
    
    res.on('end', () => {
      console.log('Response:', data);
      
      if (res.statusCode === 200) {
        console.log('✅ Login thành công!');
      } else if (res.statusCode === 401) {
        console.log('❌ Sai username/password hoặc user không tồn tại');
      } else if (res.statusCode === 500) {
        console.log('❌ Internal Server Error - Lỗi server');
      }
    });
  });

  req.on('error', (e) => {
    console.error(`❌ Request error: ${e.message}`);
  });

  req.write(postData);
  req.end();
}

// Test health endpoint trước
const healthOptions = {
  hostname: '10.21.118.100',
  port: 12500,
  path: '/api/health',
  method: 'GET'
};

console.log('🏥 Testing health endpoint first...');
const healthReq = http.request(healthOptions, (res) => {
  console.log(`Health Status: ${res.statusCode}`);
  
  let data = '';
  res.on('data', (chunk) => {
    data += chunk;
  });
  
  res.on('end', () => {
    console.log('Health Response:', data);
    
    // Nếu health OK thì test login
    if (res.statusCode === 200) {
      console.log('\n📱 Health OK, testing login...');
      testLogin();
    } else {
      console.log('❌ Server không phản hồi health check');
    }
  });
});

healthReq.on('error', (e) => {
  console.error(`❌ Health check error: ${e.message}`);
  console.log('💡 Kiểm tra xem server có đang chạy không?');
});

healthReq.end();