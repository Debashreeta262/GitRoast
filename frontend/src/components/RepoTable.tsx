import React, { useMemo, useState } from 'react';
import {
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  BookCheck,
  BookX,
  Clock,
  ExternalLink,
  GitFork,
  Globe,
  RotateCcw,
  Search,
  Star,
  X,
} from 'lucide-react';
import { Badge } from './ui/Badge';
import { Button } from './ui/Button';
import { Card } from './ui/Card';
import { getScoreMeta } from '../utils/score';
import type { RepoAnalysis } from '../types';

interface RepoTableProps {
  repos: RepoAnalysis[];
  username: string;
}

type SortField = 'quality_score' | 'stars' | 'forks' | 'name' | 'pushed_at';
type SortOrder = 'asc' | 'desc';
type FilterTab = 'all' | 'strongest' | 'needs_work' | 'recent';

const LANGUAGE_COLORS: Record<string, string> = {
  typescript: '#3178C6',
  javascript: '#F7DF1E',
  python: '#3572A5',
  go: '#00ADD8',
  rust: '#DEA584',
  java: '#B07219',
  'c++': '#F34B7D',
  c: '#555555',
  'c#': '#178600',
  ruby: '#701516',
  php: '#4F5D95',
  html: '#E34C26',
  css: '#563D7C',
  shell: '#89E051',
  swift: '#F05138',
  kotlin: '#A97BFF',
  dart: '#00B4AB',
  vue: '#41B883',
  svelte: '#FF3E00',
};

function getLanguageColor(language: string | null): string {
  if (!language) return '#8B949E';
  return LANGUAGE_COLORS[language.toLowerCase()] || '#8B949E';
}

function formatRelativeDate(isoStr: string | null): string {
  if (!isoStr) return 'N/A';
  try {
    const diffMs = Date.now() - new Date(isoStr).getTime();
    if (isNaN(diffMs)) return 'N/A';
    const diffSec = Math.max(0, Math.floor(diffMs / 1000));
    if (diffSec < 60) return 'just now';
    if (diffSec < 3600) return `${Math.floor(diffSec / 60)}m ago`;
    if (diffSec < 86400) return `${Math.floor(diffSec / 3600)}d ago`;
    const diffDays = Math.floor(diffSec / 86400);
    if (diffDays < 30) return `${diffDays}d ago`;
    if (diffDays < 365) return `${Math.floor(diffDays / 30)}mo ago`;
    return `${Math.floor(diffDays / 365)}y ago`;
  } catch {
    return 'N/A';
  }
}

function isWithin90Days(isoStr: string | null): boolean {
  if (!isoStr) return false;
  const time = new Date(isoStr).getTime();
  if (isNaN(time)) return false;
  const ninetyDaysMs = 90 * 24 * 60 * 60 * 1000;
  return Date.now() - time <= ninetyDaysMs;
}

export const RepoTable: React.FC<RepoTableProps> = ({ repos, username }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<FilterTab>('all');
  const [hideForks, setHideForks] = useState(false);
  const [onlyWithDemos, setOnlyWithDemos] = useState(false);
  const [sortField, setSortField] = useState<SortField>('quality_score');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('desc');
    }
  };

  const handleResetFilters = () => {
    setSearchQuery('');
    setActiveTab('all');
    setHideForks(false);
    setOnlyWithDemos(false);
    setSortField('quality_score');
    setSortOrder('desc');
  };

  // Pre-calculate tab counts for badges
  const counts = useMemo(() => {
    return {
      all: repos.length,
      strongest: repos.filter((r) => r.quality_score >= 70).length,
      needs_work: repos.filter((r) => r.quality_score < 50).length,
      recent: repos.filter((r) => isWithin90Days(r.pushed_at || r.updated_at)).length,
    };
  }, [repos]);

  // Filtering
  const filteredRepos = useMemo(() => {
    return repos.filter((repo) => {
      // Tab filter
      if (activeTab === 'strongest' && repo.quality_score < 70) return false;
      if (activeTab === 'needs_work' && repo.quality_score >= 50) return false;
      if (activeTab === 'recent' && !isWithin90Days(repo.pushed_at || repo.updated_at)) return false;

      // Checkbox toggles
      if (hideForks && repo.is_fork) return false;
      if (onlyWithDemos && !repo.homepage) return false;

      // Text search
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase().trim();
        const matchesName = repo.name.toLowerCase().includes(query);
        const matchesDesc = repo.description?.toLowerCase().includes(query) ?? false;
        const matchesLang = repo.language?.toLowerCase().includes(query) ?? false;
        const matchesTopics = repo.topics?.some((t) => t.toLowerCase().includes(query)) ?? false;
        if (!matchesName && !matchesDesc && !matchesLang && !matchesTopics) {
          return false;
        }
      }

      return true;
    });
  }, [repos, activeTab, hideForks, onlyWithDemos, searchQuery]);

  // Sorting
  const sortedRepos = useMemo(() => {
    return [...filteredRepos].sort((a, b) => {
      let aVal: string | number | null = a[sortField];
      let bVal: string | number | null = b[sortField];

      if (sortField === 'pushed_at') {
        aVal = a.pushed_at || a.updated_at || '';
        bVal = b.pushed_at || b.updated_at || '';
      }

      if (aVal === null || aVal === undefined) aVal = '';
      if (bVal === null || bVal === undefined) bVal = '';

      if (typeof aVal === 'string') {
        const cmp = aVal.localeCompare(bVal as string);
        return sortOrder === 'asc' ? cmp : -cmp;
      }

      return sortOrder === 'asc'
        ? (aVal as number) - (bVal as number)
        : (bVal as number) - (aVal as number);
    });
  }, [filteredRepos, sortField, sortOrder]);

  const renderSortIcon = (field: SortField) => {
    if (sortField !== field) {
      return <ArrowUpDown className="w-3 h-3 text-text-muted/50 group-hover:text-text-muted transition-colors" />;
    }
    return sortOrder === 'asc' ? (
      <ArrowUp className="w-3 h-3 text-accent" />
    ) : (
      <ArrowDown className="w-3 h-3 text-accent" />
    );
  };

  const isFiltering =
    searchQuery.trim().length > 0 ||
    activeTab !== 'all' ||
    hideForks ||
    onlyWithDemos;

  return (
    <Card variant="default" padding="lg" className="border-border">
      {/* Header and Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
        <div>
          <div className="flex items-center gap-2.5">
            <h2 className="text-lg font-bold text-text-primary tracking-tight">
              Repository Quality Audit
            </h2>
            <Badge variant="outline" size="sm" className="font-mono">
              {filteredRepos.length} of {repos.length}
            </Badge>
          </div>
          <p className="text-xs text-text-secondary mt-1">
            Deterministic code audits, hygiene flags, and recruiter signals for each repository.
          </p>
        </div>

        {isFiltering && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={handleResetFilters}
            leftIcon={<RotateCcw className="w-3.5 h-3.5" />}
            className="text-xs self-start sm:self-auto text-text-muted hover:text-text-primary"
          >
            Reset Filters
          </Button>
        )}
      </div>

      {/* Control Bar: Search & Filter Tabs & Checkboxes */}
      <div className="space-y-4 mb-6">
        {/* Top Controls: Search + Toggles */}
        <div className="flex flex-col md:flex-row gap-3">
          {/* Search Input */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-text-muted absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by repo name, language, description, or topic..."
              className="w-full bg-bg border border-border rounded-xl pl-9 pr-9 py-2 text-xs sm:text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent transition-all font-sans"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-primary p-0.5 rounded"
                title="Clear search"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Quick Checkboxes */}
          <div className="flex items-center gap-4 px-1 py-1 sm:py-0">
            <label className="text-xs text-text-secondary flex items-center gap-1.5 cursor-pointer select-none hover:text-text-primary transition-colors">
              <input
                type="checkbox"
                checked={hideForks}
                onChange={(e) => setHideForks(e.target.checked)}
                className="rounded bg-bg border-border text-accent focus:ring-0 cursor-pointer w-3.5 h-3.5"
              />
              Hide Forks
            </label>
            <label className="text-xs text-text-secondary flex items-center gap-1.5 cursor-pointer select-none hover:text-text-primary transition-colors">
              <input
                type="checkbox"
                checked={onlyWithDemos}
                onChange={(e) => setOnlyWithDemos(e.target.checked)}
                className="rounded bg-bg border-border text-accent focus:ring-0 cursor-pointer w-3.5 h-3.5"
              />
              Live Demo Only
            </label>
          </div>
        </div>

        {/* Filter Tabs Chips */}
        <div className="flex flex-wrap items-center gap-2 border-b border-border/60 pb-3">
          <button
            type="button"
            onClick={() => setActiveTab('all')}
            className={`text-xs font-medium px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 ${
              activeTab === 'all'
                ? 'bg-accent/15 text-accent-light border border-accent/30 font-semibold'
                : 'text-text-secondary hover:text-text-primary hover:bg-surface-elevated border border-transparent'
            }`}
          >
            All
            <span className="text-[10px] opacity-75 font-mono">({counts.all})</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('strongest')}
            className={`text-xs font-medium px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 ${
              activeTab === 'strongest'
                ? 'bg-score-success/15 text-score-success border border-score-success/30 font-semibold'
                : 'text-text-secondary hover:text-text-primary hover:bg-surface-elevated border border-transparent'
            }`}
          >
            Strongest (≥ 70)
            <span className="text-[10px] opacity-75 font-mono">({counts.strongest})</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('needs_work')}
            className={`text-xs font-medium px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 ${
              activeTab === 'needs_work'
                ? 'bg-score-danger/15 text-score-danger border border-score-danger/30 font-semibold'
                : 'text-text-secondary hover:text-text-primary hover:bg-surface-elevated border border-transparent'
            }`}
          >
            Needs Work (&lt; 50)
            <span className="text-[10px] opacity-75 font-mono">({counts.needs_work})</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('recent')}
            className={`text-xs font-medium px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 ${
              activeTab === 'recent'
                ? 'bg-accent/15 text-accent-light border border-accent/30 font-semibold'
                : 'text-text-secondary hover:text-text-primary hover:bg-surface-elevated border border-transparent'
            }`}
          >
            Recently Updated (&lt; 90d)
            <span className="text-[10px] opacity-75 font-mono">({counts.recent})</span>
          </button>
        </div>
      </div>

      {/* Empty State */}
      {sortedRepos.length === 0 ? (
        <div className="py-12 px-4 text-center rounded-xl bg-bg/50 border border-border/80 flex flex-col items-center justify-center">
          <div className="w-10 h-10 rounded-xl bg-surface-elevated border border-border flex items-center justify-center text-text-muted mb-3">
            <Search className="w-5 h-5" />
          </div>
          <h3 className="text-sm font-semibold text-text-primary mb-1">
            No repositories match your filter
          </h3>
          <p className="text-xs text-text-muted max-w-sm mb-4">
            Try adjusting your search query, selecting a different filter tab, or toggling off filters.
          </p>
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={handleResetFilters}
            leftIcon={<RotateCcw className="w-3.5 h-3.5" />}
          >
            Clear All Filters
          </Button>
        </div>
      ) : (
        <>
          {/* Desktop Table View (>= md) */}
          <div className="hidden md:block overflow-x-auto -mx-6 sm:mx-0">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-border text-text-muted uppercase font-mono tracking-wider bg-surface-elevated/40">
                  <th
                    onClick={() => handleSort('name')}
                    className="py-3 px-4 cursor-pointer hover:text-text-primary transition-colors group select-none"
                  >
                    <div className="flex items-center gap-1.5">
                      Repository {renderSortIcon('name')}
                    </div>
                  </th>
                  <th className="py-3 px-4">Stack / Lang</th>
                  <th
                    onClick={() => handleSort('stars')}
                    className="py-3 px-4 cursor-pointer hover:text-text-primary transition-colors text-right group select-none"
                  >
                    <div className="flex items-center justify-end gap-1.5">
                      Stars {renderSortIcon('stars')}
                    </div>
                  </th>
                  <th
                    onClick={() => handleSort('forks')}
                    className="py-3 px-4 cursor-pointer hover:text-text-primary transition-colors text-right group select-none"
                  >
                    <div className="flex items-center justify-end gap-1.5">
                      Forks {renderSortIcon('forks')}
                    </div>
                  </th>
                  <th className="py-3 px-4 text-center">README</th>
                  <th className="py-3 px-4 text-center">Demo</th>
                  <th
                    onClick={() => handleSort('pushed_at')}
                    className="py-3 px-4 cursor-pointer hover:text-text-primary transition-colors group select-none"
                  >
                    <div className="flex items-center gap-1.5">
                      Last Push {renderSortIcon('pushed_at')}
                    </div>
                  </th>
                  <th
                    onClick={() => handleSort('quality_score')}
                    className="py-3 px-4 cursor-pointer hover:text-text-primary transition-colors text-right group select-none"
                  >
                    <div className="flex items-center justify-end gap-1.5">
                      Score {renderSortIcon('quality_score')}
                    </div>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {sortedRepos.map((repo) => {
                  const githubUrl = `https://github.com/${username}/${repo.name}`;
                  const scoreMeta = getScoreMeta(repo.quality_score);
                  const langColor = getLanguageColor(repo.language);
                  const relativeDate = formatRelativeDate(repo.pushed_at || repo.updated_at);

                  return (
                    <tr
                      key={repo.name}
                      className="hover:bg-surface-elevated/50 transition-colors group"
                    >
                      {/* Name and Description */}
                      <td className="py-3.5 px-4 max-w-xs sm:max-w-sm">
                        <div className="flex items-center gap-2">
                          <a
                            href={githubUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="font-mono font-semibold text-accent-light hover:text-white hover:underline flex items-center gap-1.5 text-sm"
                          >
                            {repo.name}
                            <ExternalLink className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                          </a>
                          {repo.is_fork && (
                            <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-surface-elevated border border-border text-text-muted flex items-center gap-0.5">
                              <GitFork className="w-2.5 h-2.5" /> fork
                            </span>
                          )}
                        </div>

                        {repo.description && (
                          <p
                            className="text-[11px] text-text-secondary mt-1 line-clamp-1"
                            title={repo.description}
                          >
                            {repo.description}
                          </p>
                        )}

                        {/* Flags and Topics */}
                        {repo.flags.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-1.5">
                            {repo.flags.slice(0, 3).map((flag, fIdx) => (
                              <span
                                key={fIdx}
                                className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-surface-elevated border border-border/80 text-text-muted"
                              >
                                {flag}
                              </span>
                            ))}
                          </div>
                        )}
                      </td>

                      {/* Language */}
                      <td className="py-3.5 px-4">
                        <div className="inline-flex items-center gap-1.5 font-mono text-text-secondary bg-surface-elevated/80 px-2 py-1 rounded-md border border-border">
                          <span
                            className="w-2 h-2 rounded-full flex-shrink-0"
                            style={{ backgroundColor: langColor }}
                          />
                          <span>{repo.language || 'Unknown'}</span>
                        </div>
                      </td>

                      {/* Stars */}
                      <td className="py-3.5 px-4 text-right font-mono text-text-secondary">
                        <div className="flex items-center justify-end gap-1">
                          <Star className="w-3.5 h-3.5 text-score-warning fill-score-warning/20" />
                          <span>{repo.stars}</span>
                        </div>
                      </td>

                      {/* Forks */}
                      <td className="py-3.5 px-4 text-right font-mono text-text-secondary">
                        <div className="flex items-center justify-end gap-1">
                          <GitFork className="w-3.5 h-3.5 text-text-muted" />
                          <span>{repo.forks}</span>
                        </div>
                      </td>

                      {/* README status */}
                      <td className="py-3.5 px-4 text-center">
                        {repo.has_readme ? (
                          <span className="inline-flex items-center gap-0.5 text-score-success bg-score-success/10 px-2 py-0.5 rounded-full border border-score-success/30 text-[10px] font-mono font-medium">
                            <BookCheck className="w-3 h-3" /> Yes
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-0.5 text-score-danger bg-score-danger/10 px-2 py-0.5 rounded-full border border-score-danger/30 text-[10px] font-mono font-medium">
                            <BookX className="w-3 h-3" /> No
                          </span>
                        )}
                      </td>

                      {/* Live Demo */}
                      <td className="py-3.5 px-4 text-center">
                        {repo.homepage ? (
                          <a
                            href={repo.homepage.startsWith('http') ? repo.homepage : `https://${repo.homepage}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-accent hover:text-accent-light hover:underline font-mono text-[11px]"
                          >
                            <Globe className="w-3.5 h-3.5" /> Demo
                          </a>
                        ) : (
                          <span className="text-text-muted/60 font-mono">-</span>
                        )}
                      </td>

                      {/* Last Push */}
                      <td
                        className="py-3.5 px-4 font-mono text-text-secondary"
                        title={repo.pushed_at || repo.updated_at || undefined}
                      >
                        {relativeDate}
                      </td>

                      {/* Quality Score */}
                      <td className="py-3.5 px-4 text-right">
                        <span
                          className={`font-mono font-bold text-xs px-2.5 py-1 rounded-lg border ${scoreMeta.badgeClass}`}
                          title={`Quality Score: ${repo.quality_score}/100 (${scoreMeta.label})`}
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

          {/* Mobile Card View (< md) */}
          <div className="block md:hidden space-y-3">
            {sortedRepos.map((repo) => {
              const githubUrl = `https://github.com/${username}/${repo.name}`;
              const scoreMeta = getScoreMeta(repo.quality_score);
              const langColor = getLanguageColor(repo.language);
              const relativeDate = formatRelativeDate(repo.pushed_at || repo.updated_at);

              return (
                <div
                  key={repo.name}
                  className="bg-bg/60 border border-border rounded-xl p-4 flex flex-col justify-between space-y-3 hover:border-border/80 transition-colors"
                >
                  {/* Top: Name, Fork, Score */}
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <a
                          href={githubUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="font-mono font-semibold text-accent-light hover:text-white hover:underline flex items-center gap-1 text-sm truncate"
                        >
                          {repo.name}
                          <ExternalLink className="w-3 h-3 flex-shrink-0" />
                        </a>
                        {repo.is_fork && (
                          <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-surface-elevated border border-border text-text-muted flex items-center gap-0.5">
                            <GitFork className="w-2.5 h-2.5" /> fork
                          </span>
                        )}
                      </div>

                      {repo.description && (
                        <p className="text-xs text-text-secondary mt-1 line-clamp-2">
                          {repo.description}
                        </p>
                      )}
                    </div>

                    <span
                      className={`font-mono font-bold text-xs px-2 py-0.5 rounded-lg border flex-shrink-0 ${scoreMeta.badgeClass}`}
                    >
                      {repo.quality_score}
                    </span>
                  </div>

                  {/* Middle: Metadata grid */}
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-text-secondary font-mono pt-1 border-t border-border/50">
                    {/* Language */}
                    <div className="flex items-center gap-1.5">
                      <span
                        className="w-2 h-2 rounded-full flex-shrink-0"
                        style={{ backgroundColor: langColor }}
                      />
                      <span>{repo.language || 'Unknown'}</span>
                    </div>

                    {/* Stars */}
                    <div className="flex items-center gap-1">
                      <Star className="w-3.5 h-3.5 text-score-warning fill-score-warning/20" />
                      <span>{repo.stars}</span>
                    </div>

                    {/* Forks */}
                    <div className="flex items-center gap-1">
                      <GitFork className="w-3.5 h-3.5 text-text-muted" />
                      <span>{repo.forks}</span>
                    </div>

                    {/* Last Push */}
                    <div className="flex items-center gap-1 text-text-muted">
                      <Clock className="w-3 h-3" />
                      <span>{relativeDate}</span>
                    </div>
                  </div>

                  {/* Bottom: README & Demo link */}
                  <div className="flex items-center justify-between pt-1 text-[11px] font-mono">
                    <div className="flex items-center gap-2">
                      {repo.has_readme ? (
                        <span className="inline-flex items-center gap-0.5 text-score-success">
                          <BookCheck className="w-3 h-3" /> README
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-0.5 text-score-danger">
                          <BookX className="w-3 h-3" /> No README
                        </span>
                      )}
                    </div>

                    {repo.homepage && (
                      <a
                        href={repo.homepage.startsWith('http') ? repo.homepage : `https://${repo.homepage}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-accent hover:text-accent-light hover:underline"
                      >
                        <Globe className="w-3 h-3" /> Live Demo
                      </a>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}
    </Card>
  );
};
