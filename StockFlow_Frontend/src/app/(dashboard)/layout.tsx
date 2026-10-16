import Navbar from '@/components/Navbar';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-[#f4f6f8] flex flex-col">
      <Navbar />
      <main className="flex-1 w-full flex flex-col">
        {children}
      </main>
    </div>
  );
}
