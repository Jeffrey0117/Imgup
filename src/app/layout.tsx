import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Batch Drop Upload → Markdown',
  description: '批量上傳圖片並生成 Markdown 連結',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="zh-Hant" suppressHydrationWarning>
      <body suppressHydrationWarning>{children}</body>
    </html>
  )
}
