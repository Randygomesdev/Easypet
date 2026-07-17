export default function PlaceholderPage({ title }: { title: string }) {
  return (
    <div className="flex items-center justify-center h-64">
      <p className="text-(--color-text-muted) text-sm">{title} em breve...</p>
    </div>
  )
}
