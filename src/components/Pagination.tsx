import { ChevronLeft, ChevronRight } from 'lucide-react';

interface PaginationProps {
  page: number;
  pageSize: number;
  total: number;
  onChange: (page: number) => void;
}

export function Pagination({
  page,
  pageSize,
  total,
  onChange,
}: PaginationProps) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  if (total <= pageSize) return null;

  const start = (page - 1) * pageSize + 1;
  const end = Math.min(page * pageSize, total);

  return (
    <div className="flex shrink-0 items-center justify-between border-t border-sve-border pt-3">
      <span className="text-sm text-sve-muted">
        显示 {start}–{end}，共 {total} 张
      </span>
      <div className="flex items-center gap-2">
        <button
          type="button"
          className="btn-secondary flex items-center gap-1 px-3 py-1.5 text-sm"
          disabled={page <= 1}
          onClick={() => onChange(page - 1)}
        >
          <ChevronLeft size={16} />
          上一页
        </button>
        <span className="min-w-[4.5rem] text-center text-sm text-sve-muted">
          {page} / {totalPages}
        </span>
        <button
          type="button"
          className="btn-secondary flex items-center gap-1 px-3 py-1.5 text-sm"
          disabled={page >= totalPages}
          onClick={() => onChange(page + 1)}
        >
          下一页
          <ChevronRight size={16} />
        </button>
      </div>
    </div>
  );
}
