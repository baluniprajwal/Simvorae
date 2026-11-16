type Variant = 'signature' | 'artisan' | 'carry';

function SkeletonCard({ className = '', dark = false }: { className?: string; dark?: boolean }) {
  return (
    <div className={`flex min-h-0 flex-col ${className}`}>
      <div className={`min-h-40 flex-1 rounded-[1.5rem] ${dark ? 'bg-white/10' : 'bg-stone-200/70'}`} />
      <div className={`mt-5 h-2 w-16 ${dark ? 'bg-white/10' : 'bg-stone-200'}`} />
      <div className={`mt-3 h-4 w-2/3 ${dark ? 'bg-white/10' : 'bg-stone-200'}`} />
    </div>
  );
}

export default function HomepageSectionSkeleton({ variant }: { variant: Variant }) {
  const dark = variant === 'carry';
  return (
    <section role="status" aria-label={`Loading ${variant} collection`} aria-busy="true" className={`px-4 py-24 md:px-12 md:py-32 ${dark ? 'bg-[#1a1a1a]' : ''}`}>
      <span className="sr-only">Loading collection</span>
      <div aria-hidden="true" className="mx-auto max-w-[1704px] animate-pulse motion-reduce:animate-none">
        <div className="mb-16 flex flex-col justify-between gap-6 md:flex-row md:items-end">
          <div className="w-full max-w-sm space-y-3">
            <div className={`h-10 w-3/4 md:h-14 ${dark ? 'bg-white/10' : 'bg-stone-200'}`} />
            <div className={`h-10 w-2/3 md:h-14 ${dark ? 'bg-white/10' : 'bg-stone-200'}`} />
          </div>
          <div className="w-full max-w-xs space-y-3">
            {[0, 1, 2].map((line) => <div key={line} className={`h-2 ${dark ? 'bg-white/10' : 'bg-stone-200'}`} />)}
          </div>
        </div>
        {variant === 'signature' && (
          <div className="grid gap-8 md:gap-12 lg:grid-cols-2">
            <SkeletonCard className="aspect-[4/5] lg:aspect-auto" />
            <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 md:gap-12">
              {[0, 1, 2, 3].map((slot) => <SkeletonCard key={slot} className="aspect-[4/5]" />)}
            </div>
          </div>
        )}
        {variant === 'artisan' && (
          <div className="grid gap-8 lg:grid-cols-3">
            <SkeletonCard className="aspect-square lg:col-span-1 lg:aspect-auto" />
            <div className="flex flex-col gap-8 lg:col-span-2">
              <SkeletonCard className="aspect-[4/3] md:aspect-[21/9]" />
              <div className="grid gap-8 sm:grid-cols-2">
                <SkeletonCard className="aspect-square" />
                <div className="min-h-64 rounded-[1.5rem] bg-stone-100" />
              </div>
            </div>
          </div>
        )}
        {variant === 'carry' && (
          <div className="grid gap-8 lg:h-[80vh] lg:grid-cols-12">
            <SkeletonCard dark className="h-[52vh] lg:col-span-5 lg:h-full" />
            <div className="grid gap-8 lg:col-span-7">
              <SkeletonCard dark className="min-h-[40vh] lg:min-h-0" />
              <div className="grid gap-8 sm:grid-cols-2">
                <SkeletonCard dark className="aspect-square lg:aspect-auto" />
                <SkeletonCard dark className="aspect-square lg:aspect-auto" />
              </div>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
