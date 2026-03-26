// Root page — redirect to login (middleware will forward logged-in users to their dashboard)
import { redirect } from 'next/navigation';

export default function RootPage() {
  redirect('/login');
}
