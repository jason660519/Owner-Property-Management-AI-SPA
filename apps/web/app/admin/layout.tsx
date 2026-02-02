
import Link from 'next/link';
import SignOutButton from './SignOutButton';

export default function AdminLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <div className="min-h-screen bg-gray-50 flex flex-col">
            <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
                <div className="container mx-auto px-4 h-16 flex items-center justify-between">
                    <div className="flex items-center gap-8">
                        <Link href="/admin/groups" className="text-xl font-bold text-gray-900">
                            Admin Console
                        </Link>
                        <nav className="flex items-center gap-4">
                            <Link
                                href="/admin/groups"
                                className="text-sm font-medium text-gray-600 hover:text-gray-900"
                            >
                                Groups
                            </Link>
                            <Link
                                href="/admin/users"
                                className="text-sm font-medium text-gray-600 hover:text-gray-900"
                            >
                                Users
                            </Link>
                        </nav>
                    </div>
                    <SignOutButton />
                </div>
            </header>
            <main className="flex-1">
                {children}
            </main>
        </div>
    );
}
