import { ChevronLeft, ChevronRight } from 'lucide-react';

export default function PaginationControls({
  page,
  pageCount,
  totalCount,
  pageSize,
  label,
  onPageChange,
}: {
  page: number;
  pageCount: number;
  totalCount: number;
  pageSize: number;
  label: string;
  onPageChange: (page: number) => void;
}) {
  const startItem = totalCount === 0 ? 0 : (page - 1) * pageSize + 1;
  const endItem = Math.min(page * pageSize, totalCount);
  const safePageCount = Math.max(pageCount, 1);

  if (safePageCount <= 1) {
    return null;
  }

  return (
    <div className="flex flex-col gap-3 border-t border-stone-100 bg-white/80 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
      <p className="text-[9px] font-semibold uppercase tracking-widest text-stone-400">
        Showing {startItem}-{endItem} of {totalCount} {label}
      </p>

      <div className="flex items-center gap-2">
        <button
          type="button"
          disabled={page <= 1}
          onClick={() => onPageChange(page - 1)}
          className="inline-flex h-9 cursor-pointer items-center gap-2 border border-stone-200 bg-[#fcfbf9] px-3 text-[9px] font-semibold uppercase tracking-widest text-stone-500 transition-colors hover:border-[#1a1a1a] hover:text-[#1a1a1a] disabled:cursor-not-allowed disabled:border-stone-100 disabled:text-stone-300"
        >
          <ChevronLeft size={12} />
          Prev
        </button>

        <span className="border border-stone-200 bg-white px-3 py-2 font-sans text-[10px] font-semibold text-stone-500">
          {page} / {safePageCount}
        </span>

        <button
          type="button"
          disabled={page >= safePageCount}
          onClick={() => onPageChange(page + 1)}
          className="inline-flex h-9 cursor-pointer items-center gap-2 border border-stone-200 bg-[#fcfbf9] px-3 text-[9px] font-semibold uppercase tracking-widest text-stone-500 transition-colors hover:border-[#1a1a1a] hover:text-[#1a1a1a] disabled:cursor-not-allowed disabled:border-stone-100 disabled:text-stone-300"
        >
          Next
          <ChevronRight size={12} />
        </button>
      </div>
    </div>
  );
}

