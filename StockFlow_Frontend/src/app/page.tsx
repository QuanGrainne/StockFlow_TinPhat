import { redirect } from 'next/navigation';

// Root page: redirect to login for now (auth guard will redirect to dashboard after login)
export default function HomePage() {
  redirect('/login');
}
