export default function RecipeCardSkeleton() {
  return (
    <div className="block bg-white rounded-lg border border-sage-200 p-6 animate-pulse">
      <div className="h-5 bg-sage-200 rounded w-3/4 mb-2" />
      <div className="h-4 bg-sage-100 rounded w-full mb-1" />
      <div className="h-4 bg-sage-100 rounded w-2/3 mb-4" />
      <div className="flex gap-2">
        <div className="h-4 bg-sage-200 rounded w-16" />
        <div className="h-4 bg-sage-200 rounded w-20" />
        <div className="h-4 bg-sage-200 rounded w-24" />
      </div>
    </div>
  );
}
