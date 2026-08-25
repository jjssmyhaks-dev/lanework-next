export default function AgentsLoading() {
  return (
    <div className="min-h-[60vh] flex items-center justify-center px-6">
      <div className="text-center">
        <div className="grid h-12 w-12 place-items-center rounded-2xl bg-gray-100 mx-auto mb-4 animate-pulse">
          <div className="h-6 w-6 bg-gray-300 rounded-lg" />
        </div>
        <p className="text-sm text-gray-400 animate-pulse">Loading agents...</p>
      </div>
    </div>
  );
}
