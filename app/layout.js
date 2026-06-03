import './globals.css'

export const metadata = {
  title: 'NEIGHBOURHOOD CLUB',
  description: 'Street food energy & secret perks',
}

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=0"/>
      </head>
      <body className="bg-[#FDFCF8] text-black antialiased">{children}</body>
    </html>
  )
}