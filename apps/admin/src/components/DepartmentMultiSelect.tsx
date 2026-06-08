import { useMemo, useState } from 'react';
import { Check, Loader2, Search, X } from 'lucide-react';
import type { Department } from '@/lib/types';

interface Props {
  departments: Department[];
  loading?: boolean;
  selected: Set<string>;
  onToggle: (id: string) => void;
  disabled?: boolean;
}

function deptLabel(dept: Department): string {
  return dept.code ? `${dept.code} · ${dept.name}` : dept.name;
}

export function DepartmentMultiSelect({
  departments,
  loading = false,
  selected,
  onToggle,
  disabled = false,
}: Props) {
  const [query, setQuery] = useState('');

  const byId = useMemo(
    () => new Map(departments.map((d) => [d.id, d])),
    [departments],
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return departments;
    return departments.filter(
      (d) =>
        d.name.toLowerCase().includes(q) ||
        (d.code ?? '').toLowerCase().includes(q),
    );
  }, [departments, query]);

  const selectedList = [...selected]
    .map((id) => byId.get(id))
    .filter((d): d is Department => Boolean(d));

  return (
    <div>
      {selectedList.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {selectedList.map((dept) => (
            <span
              key={dept.id}
              className="inline-flex items-center gap-1.5 rounded-full bg-gradient-to-br from-red-vivid to-red px-3 py-1 text-sm font-medium text-white"
            >
              {deptLabel(dept)}
              <button
                type="button"
                disabled={disabled}
                onClick={() => onToggle(dept.id)}
                className="cursor-pointer rounded-full p-0.5 transition-colors hover:bg-white/25 disabled:cursor-not-allowed"
                aria-label={`Retirer ${dept.name}`}
              >
                <X className="h-3 w-3" />
              </button>
            </span>
          ))}
        </div>
      )}

      {loading ? (
        <div className="mt-3 flex items-center gap-2 text-sm text-ink-2">
          <Loader2 className="h-4 w-4 animate-spin" /> Chargement…
        </div>
      ) : departments.length === 0 ? (
        <p className="mt-3 text-sm text-ink-2">Aucun département disponible.</p>
      ) : (
        <div
          className={`overflow-hidden rounded-2xl border border-ink-4 bg-paper ${
            selectedList.length > 0 ? 'mt-3' : ''
          }`}
        >
          <div className="flex items-center gap-2 border-b border-ink-4 px-3.5 py-2.5">
            <Search className="h-4 w-4 text-ink-3" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Rechercher un département (code ou nom)…"
              className="w-full bg-transparent text-sm text-ink outline-none placeholder:text-ink-3"
            />
          </div>
          <ul className="max-h-56 overflow-y-auto py-1">
            {filtered.length === 0 ? (
              <li className="px-3.5 py-3 text-sm text-ink-3">
                Aucun résultat pour « {query} ».
              </li>
            ) : (
              filtered.map((dept) => {
                const active = selected.has(dept.id);
                return (
                  <li key={dept.id}>
                    <button
                      type="button"
                      disabled={disabled}
                      onClick={() => onToggle(dept.id)}
                      className="flex w-full cursor-pointer items-center gap-3 px-3.5 py-2 text-left text-sm transition-colors hover:bg-red-soft disabled:cursor-not-allowed"
                    >
                      <span
                        className={[
                          'flex shrink-0 items-center justify-center rounded-[6px] border transition-colors',
                          active
                            ? 'border-red bg-red text-white'
                            : 'border-ink-4 bg-paper-2',
                        ].join(' ')}
                        style={{ height: 18, width: 18 }}
                      >
                        {active && <Check className="h-3 w-3" />}
                      </span>
                      {dept.code && (
                        <span className="w-7 shrink-0 font-mono text-xs text-ink-3">
                          {dept.code}
                        </span>
                      )}
                      <span className="text-ink">{dept.name}</span>
                    </button>
                  </li>
                );
              })
            )}
          </ul>
        </div>
      )}
    </div>
  );
}
