import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import Script from 'next/script'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: '考勤管理系统',
  description: '在线考勤管理和Excel协作编辑平台',
}

declare global {
  interface Window {
    VANTA: any
    THREE: any
    p5: any
  }
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="zh-CN">
      <head>
        <Script 
          id="three-js"
          src="/three.min.js" 
          strategy="beforeInteractive"
        />
        <Script 
          id="p5-js"
          src="/p5.min.js" 
          strategy="beforeInteractive"
        />
        <Script 
          id="vanta-birds"
          src="/vanta.birds.min.js" 
          strategy="beforeInteractive"
        />
        <Script 
          id="vanta-topology"
          src="/vanta.topology.min.js" 
          strategy="beforeInteractive"
        />
      </head>
      <body className={inter.className}>{children}</body>
    </html>
  )
}
