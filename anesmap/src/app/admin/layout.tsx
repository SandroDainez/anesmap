export default function AdminLayout({ children }: { children: React.ReactNode }) {
  // Full-screen overlay that escapes the root layout's max-w-md container
  return (
    <div className="fixed inset-0 z-50 overflow-auto bg-background">
      {children}
    </div>
  );
}
