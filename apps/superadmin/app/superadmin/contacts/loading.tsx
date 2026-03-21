export default function ContactsLoading() {
  return (
    <div className="p-6">
      <div className="h-8 w-48 animate-pulse rounded bg-bg-tertiary" />
      <div className="mt-6 space-y-3">
        <div className="h-20 animate-pulse rounded-xl bg-bg-tertiary" />
        <div className="h-20 animate-pulse rounded-xl bg-bg-tertiary" />
        <div className="h-20 animate-pulse rounded-xl bg-bg-tertiary" />
      </div>
    </div>
  );
}