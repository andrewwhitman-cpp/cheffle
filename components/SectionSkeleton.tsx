export default function SectionSkeleton({ lines = 4 }: { lines?: number }) {
  return (
    <div className="bg-white border border-sage-200 rounded-lg p-4 animate-pulse">
      <div className="space-y-2">
        {Array.from({ length: lines }).map((_, i) => (
          <div
            key={i}
            className="h-4 bg-sage-200 rounded"
            style={{ width: i === lines - 1 && lines > 2 ? '60%' : '100%' }}
          />
        ))}
      </div>
    </div>
  );
}
