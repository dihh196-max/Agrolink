export function Logo({ size = 32, withText = true }: { size?: number; withText?: boolean }) {
  return (
    <span className="flex items-center gap-2">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/logo.svg" alt="AgroLink" width={size} height={size} className="rounded-full" />
      {withText && <span style={{ fontSize: size * 0.625 }} className="font-bold">AgroLink</span>}
    </span>
  )
}
