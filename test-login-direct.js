
async function testLogin() {
  try {
    console.log('🔐 測試管理員登入...');
    console.log('Email: admin@upimg.local');
    console.log('Password: Admin123!@#');
    
    const response = await fetch('http://localhost:3001/api/admin/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: 'admin@upimg.local',
        password: 'Admin123!@#'
      })
    });

    console.log('\n📊 回應狀態:', response.status);
    
    const data = await response.text();
    console.log('📄 回應內容:', data);
    
    // 顯示 cookies
    const setCookieHeader = response.headers.get('set-cookie');
    if (setCookieHeader) {
      console.log('\n🍪 設定的 Cookies:');
      console.log('  -', setCookieHeader);
    }
    
    if (response.ok) {
      console.log('\n✅ 登入成功！');
      console.log('請訪問: http://localhost:3001/admin');
    } else {
      console.log('\n❌ 登入失敗');
    }
    
  } catch (error) {
    console.error('❌ 錯誤:', error);
  }
}

testLogin();