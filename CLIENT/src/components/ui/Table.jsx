import { useState } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faSort, faSortUp, faSortDown, faInbox } from '@fortawesome/free-solid-svg-icons';

// ─── Skeleton row ─────────────────────────────────────────────────────────────
function SkeletonRow({ cols }) {
  return (
    <tr className="animate-pulse">
      {Array.from({ length: cols }).map((_, i) => (
        <td key={i} className="px-4 py-3">
          <div className="h-4 bg-slate-100 rounded w-3/4" />
        </td>
      ))}
    </tr>
  );
}

export default function Table({
  columns       = [],
  data          = [],
  rowKey        = 'id',
  loading       = false,
  skeletonRows  = 5,
  emptyMessage  = 'No records found.',
  emptyIcon     = faInbox,
  onSort,
  onRowClick,
  className     = '',
}) {
  const [sortKey, setSortKey]   = useState(null);
  const [sortDir, setSortDir]   = useState('asc');

  const handleSort = (key) => {
    const newDir = sortKey === key && sortDir === 'asc' ? 'desc' : 'asc';
    setSortKey(key);
    setSortDir(newDir);
    onSort?.({ key, direction: newDir });
  };

  const thAlign = (a) => a === 'right' ? 'text-right' : a === 'center' ? 'text-center' : 'text-left';
  const tdAlign = (a) => a === 'right' ? 'text-right' : a === 'center' ? 'text-center' : 'text-left';

  return (
    <div className={`overflow-x-auto rounded-xl border border-slate-200 ${className}`}>
      <table className="min-w-full divide-y divide-slate-200 text-sm">
        {/* Head */}
        <thead className="bg-slate-50">
          <tr>
            {columns.map((col) => (
              <th
                key={col.key}
                scope="col"
                style={{ width: col.width }}
                className={[
                  'px-4 py-3 font-semibold text-slate-600 tracking-wide',
                  thAlign(col.align),
                  col.sortable ? 'cursor-pointer select-none hover:text-slate-900' : '',
                ].join(' ')}
                onClick={col.sortable ? () => handleSort(col.key) : undefined}
              >
                <span className="inline-flex items-center gap-1">
                  {col.label}
                  {col.sortable && (
                    <FontAwesomeIcon
                      icon={
                        sortKey === col.key
                          ? sortDir === 'asc' ? faSortUp : faSortDown
                          : faSort
                      }
                      className="text-slate-400"
                    />
                  )}
                </span>
              </th>
            ))}
          </tr>
        </thead>

        {/* Body */}
        <tbody className="bg-white divide-y divide-slate-100">
          {loading
            ? Array.from({ length: skeletonRows }).map((_, i) => (
                <SkeletonRow key={i} cols={columns.length} />
              ))
            : data.length === 0
              ? (
                <tr>
                  <td colSpan={columns.length} className="px-4 py-16 text-center">
                    <FontAwesomeIcon icon={emptyIcon} className="text-3xl text-slate-300 mb-3" />
                    <p className="text-slate-400 text-sm">{emptyMessage}</p>
                  </td>
                </tr>
              )
              : data.map((row) => (
                  <tr
                    key={row[rowKey]}
                    onClick={() => onRowClick?.(row)}
                    className={[
                      'transition-colors',
                      onRowClick ? 'cursor-pointer hover:bg-blue-50' : 'hover:bg-slate-50',
                    ].join(' ')}
                  >
                    {columns.map((col) => (
                      <td
                        key={col.key}
                        className={['px-4 py-3 text-slate-700', tdAlign(col.align)].join(' ')}
                      >
                        {col.render ? col.render(row) : row[col.key] ?? '—'}
                      </td>
                    ))}
                  </tr>
                ))
          }
        </tbody>
      </table>
    </div>
  );
}

// ─── Pagination controls ───────────────────────────────────────────────────────
export function Pagination({ page, totalPages, onPage, totalCount, pageSize }) {
  if (totalPages <= 1) return null;

  const start = (page - 1) * pageSize + 1;
  const end   = Math.min(page * pageSize, totalCount);

  return (
    <div className="flex items-center justify-between mt-4 text-sm text-slate-600">
      <span>Showing {start}–{end} of {totalCount}</span>
      <div className="flex items-center gap-1">
        <button
          disabled={page === 1}
          onClick={() => onPage(page - 1)}
          className="px-3 py-1 rounded-lg border border-slate-200 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed"
        >
          Prev
        </button>
        {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => i + 1).map((p) => (
          <button
            key={p}
            onClick={() => onPage(p)}
            className={[
              'px-3 py-1 rounded-lg border',
              p === page
                ? 'border-blue-500 bg-blue-500 text-white'
                : 'border-slate-200 hover:bg-slate-50',
            ].join(' ')}
          >
            {p}
          </button>
        ))}
        <button
          disabled={page === totalPages}
          onClick={() => onPage(page + 1)}
          className="px-3 py-1 rounded-lg border border-slate-200 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed"
        >
          Next
        </button>
      </div>
    </div>
  );
}
