/** @type {import('next').NextConfig} */
const nextConfig = {
  // 減少 source map 大小（加速編譯）
  productionBrowserSourceMaps: false,

  // App Router is enabled by default in Next.js 13+
  async rewrites() {
    return [
      // 讓 /favicon.ico 指向您新增的 my-icon.ico，方便搜尋引擎與瀏覽器抓取
      {
        source: '/favicon.ico',
        destination: '/my-icon.ico',
      },
      {
        // 將帶有副檔名的短網址重寫到 smart-route API
        source: '/:hash(\\w{6}).:ext',
        destination: '/api/smart-route/:hash.:ext',
      },
      {
        // 將不帶副檔名的短網址重寫到 smart-route API
        source: '/:hash(\\w{6})',
        destination: '/api/smart-route/:hash',
        has: [
          {
            type: 'header',
            key: 'accept',
            value: '(?!.*text/html).*', // 不是瀏覽器請求
          },
        ],
      },
    ];
  },
}

module.exports = nextConfig
