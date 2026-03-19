import './globals.css'

export const metadata = {
  title: '🦞 小龍蝦辦公室 - 留言板',
  description: 'Agent 討論區',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="zh-TW">
      <body>{children}</body>
    </html>
  )
}
