import Link from "next/link";

export default function DashboardPage() {
  // In a real app, you would fetch user data from the backend here
  // For now, we will just show a placeholder
  return (
    <div className="p-4 flex flex-col gap-4">
      <h1 className="text-2xl font-bold">Dashboard</h1>
      <div className="p-6 bg-white rounded-xl shadow-sm border text-center">
        <h2 className="text-xl font-semibold mb-2">Welcome!</h2>
        <p className="text-gray-600 mb-6">You are logged in.</p>
        <Link 
          href="/login" 
          className="px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg font-medium transition-colors"
        >
          Logout (Placeholder)
        </Link>
      </div>
    </div>
  );
}
