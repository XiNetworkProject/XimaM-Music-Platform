export default function EmbedLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr">
      <body style={{ margin: 0, padding: 0, background: 'transparent', overflow: 'hidden' }}>
        {children}
      </body>
    </html>
  );
}
