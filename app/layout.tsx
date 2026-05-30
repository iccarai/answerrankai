import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'AnswerRank AI — TSO (Total Search Optimization)',
  description:
    'Dominate AI platforms: Claude, ChatGPT, Perplexity, Gemini, Google AI Overviews, and Google Search. Get audited, get optimized, get visibility.',
  openGraph: {
    title: 'AnswerRank AI',
    description:
      'Total Search Optimization for AI platforms. Audit your AI visibility across 6 platforms.',
    url: 'https://answerrank.ai',
    type: 'website',
  },
  robots: {
    index: true,
    follow: true,
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </head>
      <body>{children}</body>
    </html>
  )
}
