import './globals.css'

export const metadata = {
  title: 'Picnic At Home',
  description: 'Gourmet home food and weekly prizes',
  manifest: '/manifest.json',
};

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
