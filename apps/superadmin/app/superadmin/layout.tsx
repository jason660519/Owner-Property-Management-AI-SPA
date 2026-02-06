export default function SuperadminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-[#1A1A1A]">
      <main className="flex-1">{children}</main>
    </div>
  );
}
