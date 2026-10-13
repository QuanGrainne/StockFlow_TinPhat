// Dashboard group layout — includes sidebar navigation
// Full sidebar implementation will be in shared/components/layout/Sidebar.tsx
export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-screen bg-gray-100">
      {/* Sidebar placeholder */}
      <aside className="w-64 bg-gray-900 text-white flex-shrink-0">
        <div className="p-4">
          <h2 className="text-xl font-bold">StockFlow</h2>
        </div>
        {/* Nav items will go here */}
      </aside>
      {/* Main content */}
      <main className="flex-1 overflow-auto p-6">{children}</main>
    </div>
  );
}
