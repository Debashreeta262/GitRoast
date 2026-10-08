import React, { useState } from 'react';
import {
  ArrowUpDown,
  BookCheck,
  BookX,
  ExternalLink,
  GitFork,
  Globe,
  Star,
} from 'lucide-react';
import type { RepoAnalysis } from '../types';

interface RepoTableProps {
  repos: RepoAnalysis[];
  username: string;
}

type SortField = 'quality_score' | 'stars' | 'name' | 'pushed_at';
type SortOrder = 'asc' | 'desc';

export const RepoTable: React.FC<RepoTableProps> = ({ repos, username }) => {
  const [sortField, setSortField] = useState<SortField>('quality_score');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');
  const [hideForks, setHideForks] = useState(false);
  const [onlyWithDemos, setOnlyWithDemos] = useState(false);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('desc');
    }
  };

  const filteredRepos = repos.filter((r) => {
    if (hideForks && r.is_fork) return false;
    if (onlyWithDemos && !r.homepage) return false;
    return true;
  });

  const sortedRepos = [...filteredRepos].sort((a, b) => {
    let aVal = a[sortField];
    let bVal = b[sortField];

    if (aVal === null || aVal === undefined) aVal = '';
    if (bVal === null || bVal === undefined) bVal = '';

    if (typeof aVal === 'string') {
      return sortOrder === 'asc'
        ? (aVal as string).localeCompare(bVal as string)
        : (bVal as string).localeCompare(aVal as string);
    }

    return sortOrder === 'asc' ? (aVal as number) - (bVal as number) : (bVal as number) - (aVal as number);
  });

  const getScoreBadge = (score: number) => {
    if (score >= 80) return 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30';
    if (score >= 60) return 'text-indigo-400 bg-indigo-500/10 border-indigo-500/30';
    if (score >= 40) return 'text-amber-400 bg-amber-500/10 border-amber-500/30';
    return 'text-rose-400 bg-rose-500/10 border-rose-500/30';
  };

  const formatDate = (isoStr: string | null) => {
    if (!isoStr) return 'N/A';
    try {
      const dt = new Date(isoStr);
      return dt.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
    } catch {
      return 'N/A';
    }
  };

  return (
    <div className="bg-surface rounded-2xl p-6 sm:p-8 border border-surface-border shadow-xl">
      {/* Table Header & Controls */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-6">
        <div>
          <h3 className="text-lg font-bold text-white flex items-center gap-2">
            Repository Quality Audit ({repos.length} Repositories)
          </h3>
          <p className="text-xs text-gray-400 mt-1">
            Deterministic code audits, hygiene flags, and recruiter signals for each repository.
          </p>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-3">
          <label className="text-xs text-gray-300 flex items-center gap-1.5 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={hideForks}
              onChange={(e) => setHideForks(e.target.checked)}
              className="rounded bg-surface-card border-surface-border text-primary focus:ring-0"
            />
            Hide Forks
          </label>
          <label className="text-xs text-gray-300 flex items-center gap-1.5 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={onlyWithDemos}
              onChange={(e) => setOnlyWithDemos(e.target.checked)}
              className="rounded bg-surface-card border-surface-border text-primary focus:ring-0"
            />
            Has Live Demo
          </label>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto -mx-6 sm:mx-0">
        <table className="w-full text-left border-collapse text-xs">
          <thead>
            <tr className="border-b border-surface-border text-gray-400 uppercase font-mono tracking-wider bg-surface-card/30">
              <th
                onClick={() => handleSort('name')}
                className="py-3 px-4 cursor-pointer hover:text-white transition-colors"
              >
                <div className="flex items-center gap-1">
                  Repository <ArrowUpDown className="w-3 h-3" />
                </div>
              </th>
              <th className="py-3 px-4">Stack / Lang</th>
              <th
                onClick={() => handleSort('stars')}
                className="py-3 px-4 cursor-pointer hover:text-white transition-colors text-right"
              >
                <div className="flex items-center justify-end gap-1">
                  Stars <ArrowUpDown className="w-3 h-3" />
                </div>
              </th>
              <th className="py-3 px-4 text-center">README</th>
              <th className="py-3 px-4 text-center">Demo</th>
              <th
                onClick={() => handleSort('pushed_at')}
                className="py-3 px-4 cursor-pointer hover:text-white transition-colors"
              >
                <div className="flex items-center gap-1">
                  Last Push <ArrowUpDown className="w-3 h-3" />
                </div>
              </th>
              <th
                onClick={() => handleSort('quality_score')}
                className="py-3 px-4 cursor-pointer hover:text-white transition-colors text-right"
              >
                <div className="flex items-center justify-end gap-1">
                  Score <ArrowUpDown className="w-3 h-3" />
                </div>
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-surface-border/50">
            {sortedRepos.map((repo) => {
              const githubUrl = `https://github.com/${username}/${repo.name}`;
              return (
                <tr
                  key={repo.name}
                  className="hover:bg-surface-card/50 transition-colors group"
                >
                  {/* Name and Description */}
                  <td className="py-3.5 px-4 max-w-xs sm:max-w-sm">
                    <div className="flex items-center gap-2">
                      <a
                        href={githubUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="font-mono font-semibold text-indigo-300 hover:text-indigo-200 hover:underline flex items-center gap-1 text-sm"
                      >
                        {repo.name}
                        <ExternalLink className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                      </a>
                      {repo.is_fork && (
                        <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-surface-card border border-surface-border text-gray-400 flex items-center gap-0.5">
                          <GitFork className="w-2.5 h-2.5" /> fork
                        </span>
                      )}
                    </div>
                    {repo.description && (
                      <p className="text-[11px] text-gray-400 mt-1 line-clamp-1">
                        {repo.description}
                      </p>
                    )}
                    {/* Flags pill */}
                    {repo.flags.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-1.5">
                        {repo.flags.slice(0, 3).map((flag, fIdx) => (
                          <span
                            key={fIdx}
                            className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-surface-card border border-surface-border text-gray-400"
                          >
                            {flag}
                          </span>
                        ))}
                      </div>
                    )}
                  </td>

                  {/* Language */}
                  <td className="py-3.5 px-4">
                    <span className="font-mono text-gray-300 bg-surface-card px-2 py-1 rounded-md border border-surface-border">
                      {repo.language || 'Unknown'}
                    </span>
                  </td>

                  {/* Stars / Forks */}
                  <td className="py-3.5 px-4 text-right font-mono text-gray-300">
                    <div className="flex items-center justify-end gap-1">
                      <Star className="w-3 h-3 text-amber-400 fill-amber-400/20" />
                      {repo.stars}
                    </div>
                  </td>

                  {/* README badge */}
                  <td className="py-3.5 px-4 text-center">
                    {repo.has_readme ? (
                      <span className="inline-flex items-center gap-0.5 text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/30 text-[10px] font-mono">
                        <BookCheck className="w-3 h-3" /> Yes
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-0.5 text-rose-400 bg-rose-500/10 px-2 py-0.5 rounded-full border border-rose-500/30 text-[10px] font-mono">
                        <BookX className="w-3 h-3" /> No
                      </span>
                    )}
                  </td>

                  {/* Demo link */}
                  <td className="py-3.5 px-4 text-center">
                    {repo.homepage ? (
                      <a
                        href={repo.homepage.startsWith('http') ? repo.homepage : `https://${repo.homepage}`}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 text-primary hover:text-primary-light hover:underline font-mono text-[11px]"
                      >
                        <Globe className="w-3.5 h-3.5" /> Demo
                      </a>
                    ) : (
                      <span className="text-gray-600 font-mono">-</span>
                    )}
                  </td>

                  {/* Last Push */}
                  <td className="py-3.5 px-4 font-mono text-gray-400">
                    {formatDate(repo.pushed_at || repo.updated_at)}
                  </td>

                  {/* Quality Score */}
                  <td className="py-3.5 px-4 text-right">
                    <span
                      className={`font-mono font-bold text-sm px-2.5 py-1 rounded-lg border ${getScoreBadge(
                        repo.quality_score
                      )}`}
                    >
                      {repo.quality_score}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};
