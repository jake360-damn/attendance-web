/** @type {import('next').NextConfig} */
const nextConfig = {
  // 输出 standalone 模式，适合 Docker 部署
  output: 'standalone',
  
  images: {
    unoptimized: true,
  },
  
  // 跳过静态生成时的错误页面
  typescript: {
    ignoreBuildErrors: false,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  
  // 启用压缩减少传输
  compress: true,
  
  // 生产环境优化 - 禁用 source map 减少构建时间
  productionBrowserSourceMaps: false,
  
  // 优化打包
  swcMinify: true,
  
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'Content-Security-Policy',
            value: "default-src 'self'; script-src 'self' 'unsafe-eval' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; font-src 'self'; connect-src 'self' https://*.supabase.co;"
          }
        ]
      }
    ]
  }
}

module.exports = nextConfig
