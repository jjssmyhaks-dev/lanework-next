export default function DashboardLoading() {
  return (
    <div className="min-h-[60vh] flex items-center justify-center px-6">
      <div className="text-center">
        <div className="mx-auto w-12 h-12 rounded-full border-4 border-gray-200 border-t-[#1a1a2e] animate-spin mb-4" />
        <p className="text-sm text-gray-500">Loading...</p>
      </div>
    </div>
  );
}
