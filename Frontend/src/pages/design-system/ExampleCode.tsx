export default function ExampleCode({ children }: { children: string }) {
  return (
    <details className="rounded-xl border border-border bg-bg text-sm text-text-body">
      <summary className="cursor-pointer rounded-xl px-3 py-2 font-medium focus-visible:outline-2 focus-visible:outline-primary-400">
        Ver código
      </summary>
      <pre className="overflow-x-auto border-t border-border px-3 py-3 text-xs" tabIndex={0} aria-label="Exemplo em TSX">
        <code>{children}</code>
      </pre>
    </details>
  )
}
