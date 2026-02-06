
export default function AdminLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <div className="min-h-screen bg-[#1A1A1A]">
            {/* 
                We are using DashboardLayout in the page components, 
                so we don't need a global header here anymore to avoid duplication.
                The background is set to match the dark theme.
            */}
            <main className="flex-1">
                {children}
            </main>
        </div>
    );
}
