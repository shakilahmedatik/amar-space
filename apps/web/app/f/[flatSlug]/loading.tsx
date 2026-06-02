/**
 * Skeleton loading state for the portal page.
 * Displays immediately while the server component fetches data.
 */
export default function PortalLoading() {
  return (
    <div
      className="flex flex-col gap-6 animate-pulse"
      role="status"
      aria-label="লোড হচ্ছে"
    >
      {/* Header skeleton */}
      <div className="flex flex-col gap-2">
        <div className="h-6 w-3/4 rounded bg-surface" />
        <div className="h-5 w-1/2 rounded bg-surface" />
        <div className="mt-2 h-7 w-24 rounded-full bg-surface" />
      </div>

      {/* Quick actions skeleton */}
      <div className="grid grid-cols-2 gap-3">
        <div className="h-14 rounded-lg bg-surface" />
        <div className="h-14 rounded-lg bg-surface" />
        <div className="h-14 rounded-lg bg-surface" />
        <div className="h-14 rounded-lg bg-surface" />
      </div>

      {/* Notice board skeleton */}
      <div className="flex flex-col gap-3">
        <div className="h-5 w-1/3 rounded bg-surface" />
        <div className="h-20 rounded-lg bg-surface" />
        <div className="h-20 rounded-lg bg-surface" />
      </div>

      {/* Emergency contacts skeleton */}
      <div className="flex flex-col gap-3">
        <div className="h-5 w-2/5 rounded bg-surface" />
        <div className="h-14 rounded-lg bg-surface" />
        <div className="h-14 rounded-lg bg-surface" />
        <div className="h-14 rounded-lg bg-surface" />
      </div>
    </div>
  )
}
