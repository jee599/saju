export function PageSkeleton() {
  return (
    <div className="skeletonWrap">
      <div className="skeletonTitle" />
      <div className="skeletonBlock" />
      <div className="skeletonBlock skeletonShort" />
      <div className="skeletonBlock" />
    </div>
  );
}
