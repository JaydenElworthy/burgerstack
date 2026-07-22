import './globals.css'
import Script from 'next/script'

export const metadata = {
  title: 'Picnic At Home',
  description: 'Gourmet home food and weekly prizes',
  manifest: '/manifest.json',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=0" />
        <Script id="pwa-init" strategy="afterInteractive">
          {`
            if ('serviceWorker' in navigator) {
              window.addEventListener('load', () => {
                navigator.serviceWorker.register('/sw.js')
              })
            }
            let deferredPrompt = null
            window.addEventListener('beforeinstallprompt', (e) => {
              e.preventDefault()
              deferredPrompt = e
              document.dispatchEvent(new CustomEvent('pwa-ready', { detail: deferredPrompt }))
            })
            window.installPWA = async () => {
              if (!deferredPrompt) return
              deferredPrompt.prompt()
              const result = await deferredPrompt.userChoice
              deferredPrompt = null
            }

          `}
        </Script>
      </head>
      <body className="bg-[#FDFCF8] text-black antialiased">{children}</body>
    </html>
  )
}
