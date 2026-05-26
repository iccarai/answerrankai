'use client'

import { useState } from 'react'

export default function Page() {
  const [openFaqIdx, setOpenFaqIdx] = useState<number | null>(null)

  const faqs = [
    {
      q: 'What is TSO - Total Search Optimization?',
      a: 'TSO is optimizing across all four modern search surfaces: SEO, AEO, AIO, and GEO. Each uses different signals. Most agencies only touch one. TSO covers all of them.',
    },
    {
      q: 'What is AI Visibility?',
      a: 'When someone asks ChatGPT or Perplexity who to hire in your industry, they get one answer. Your business is either there or not. AI Visibility is how consistently your business appears in those answers.',
    },
    {
      q: 'How is this different from SEO?',
      a: 'TSO covers four channels simultaneously (SEO, AEO, AIO, GEO). Traditional SEO covers one. We optimize every surface where customers look.',
    },
    {
      q: 'Which AI platforms do you scan?',
      a: 'ChatGPT, Perplexity, Gemini, and Google AI Overviews. Each platform weighs different signals.',
    },
    {
      q: 'How is the score calculated?',
      a: 'Your AI Visibility Score (0-100) comes from: brand mention rate, citation source rate, sentiment, platform coverage, and competitor displacement.',
    },
  ]

  return (
    <div className="min-h-screen bg-black text-white">
      <header className="border-b border-gray-800 sticky top-0 bg-black/95 backdrop-blur">
        <nav className="max-w-6xl mx-auto px-4 py-4 flex justify-between items-center">
          <div className="text-2xl font-bold">AnswerRank AI</div>
          <button className="px-6 py-2 bg-blue-600 hover:bg-blue-700 rounded">
            Get Started
          </button>
        </nav>
      </header>

      <main>
        {/* Hero */}
        <section className="max-w-6xl mx-auto px-4 py-20 text-center">
          <h1 className="text-5xl font-bold mb-6">AI Visibility for Your Business</h1>
          <p className="text-xl text-gray-300 mb-8 max-w-2xl mx-auto">
            See exactly where your business appears in ChatGPT, Perplexity, Gemini, and Google AI. Get a prioritized fix list to climb higher.
          </p>
          <button className="px-8 py-3 bg-blue-600 hover:bg-blue-700 rounded text-lg font-semibold">
            Start Your Free Audit - $297
          </button>
        </section>

        {/* TSO Pillars */}
        <section className="bg-gray-900 py-16">
          <div className="max-w-6xl mx-auto px-4">
            <h2 className="text-3xl font-bold mb-12 text-center">Total Search Optimization</h2>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              {[
                { title: 'SEO', desc: 'Google search rankings' },
                { title: 'AEO', desc: 'Answer engines & voice' },
                { title: 'AIO', desc: 'Google AI Overviews' },
                { title: 'GEO', desc: 'Generative AI platforms' },
              ].map((pillar) => (
                <div key={pillar.title} className="p-6 bg-gray-800 rounded">
                  <h3 className="text-xl font-bold mb-2">{pillar.title}</h3>
                  <p className="text-gray-400">{pillar.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Pricing */}
        <section className="max-w-6xl mx-auto px-4 py-20">
          <h2 className="text-3xl font-bold mb-12 text-center">Simple Pricing</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="border border-gray-700 p-8 rounded">
              <h3 className="text-2xl font-bold mb-2">TSO Audit</h3>
              <p className="text-4xl font-bold text-blue-400 mb-2">$297</p>
              <p className="text-gray-400 mb-6">One-time comprehensive audit</p>
              <button className="w-full px-6 py-2 bg-blue-600 hover:bg-blue-700 rounded mb-4">
                Get Audit
              </button>
              <ul className="text-sm text-gray-300 space-y-2">
                <li>Full technical SEO audit</li>
                <li>AI Visibility Score across 4 platforms</li>
                <li>Prioritized Fix List</li>
                <li>PDF report</li>
              </ul>
            </div>
            <div className="border-2 border-blue-600 p-8 rounded bg-blue-950/20">
              <h3 className="text-2xl font-bold mb-2">Done-For-You TSO</h3>
              <p className="text-4xl font-bold text-blue-400 mb-2">$1,497</p>
              <p className="text-gray-400 mb-6">Per month (3-month minimum)</p>
              <button className="w-full px-6 py-2 bg-blue-600 hover:bg-blue-700 rounded mb-4">
                Book Discovery Call
              </button>
              <ul className="text-sm text-gray-300 space-y-2">
                <li>Everything in Audit, executed monthly</li>
                <li>Technical fixes implemented</li>
                <li>Content restructures</li>
                <li>Monthly reports</li>
              </ul>
            </div>
          </div>
        </section>

        {/* FAQs */}
        <section className="bg-gray-900 py-16">
          <div className="max-w-2xl mx-auto px-4">
            <h2 className="text-3xl font-bold mb-12 text-center">Common Questions</h2>
            <div className="space-y-4">
              {faqs.map((faq, idx) => (
                <div key={idx} className="border border-gray-700 rounded">
                  <button
                    onClick={() => setOpenFaqIdx(openFaqIdx === idx ? null : idx)}
                    className="w-full p-4 text-left hover:bg-gray-800 font-semibold flex justify-between items-center"
                  >
                    {faq.q}
                    <span>{openFaqIdx === idx ? '-' : '+'}</span>
                  </button>
                  {openFaqIdx === idx && (
                    <div className="p-4 text-gray-300 border-t border-gray-700">
                      {faq.a}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="max-w-4xl mx-auto px-4 py-20 text-center">
          <h2 className="text-4xl font-bold mb-6">Ready to See Your AI Visibility Score?</h2>
          <button className="px-8 py-3 bg-blue-600 hover:bg-blue-700 rounded text-lg font-semibold">
            Start Your $297 Audit Now
          </button>
        </section>
      </main>

      <footer className="border-t border-gray-800 py-8 text-center text-gray-400">
        <p>AnswerRank AI - Total Search Optimization</p>
      </footer>
    </div>
  )
}
