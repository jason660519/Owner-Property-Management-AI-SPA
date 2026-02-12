'use client';

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { ROADMAP_DATA, RoadmapFeature } from '@/app/data/roadmap';
import { 
  PieChart, 
  Activity, 
  CheckCircle2, 
  Clock, 
  AlertCircle, 
  Layers, 
  ExternalLink,
  Search,
  Download,
  Filter,
  RotateCcw
} from 'lucide-react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

// --- Types ---

interface ColumnWidths {
  [key: number]: string;
}

// --- Components ---

const ProgressBar = ({ percentage }: { percentage: number }) => {
  return (
    <div className="relative w-full h-5 bg-bg-tertiary rounded-full overflow-hidden shadow-inner">
      <div 
        className={clsx(
          "h-full rounded-full transition-all duration-500 absolute top-0 left-0 flex items-center justify-center",
          percentage === 100 ? "bg-emerald-500" : 
          percentage > 0 ? "bg-blue-500" : "bg-bg-secondary"
        )}
        style={{ width: `${percentage}%` }}
      >
        {percentage > 0 && percentage < 100 && (
          <div className="absolute inset-0 bg-[linear-gradient(45deg,rgba(255,255,255,.15)_25%,transparent_25%,transparent_50%,rgba(255,255,255,.15)_50%,rgba(255,255,255,.15)_75%,transparent_75%,transparent)] bg-[length:1rem_1rem] animate-[progress-bar-stripes_1s_linear_infinite]" />
        )}
      </div>
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="text-xs font-bold text-white drop-shadow-md">
          {percentage}%
        </span>
      </div>
    </div>
  );
};

const StatCard = ({ 
  label, 
  value, 
  subValue, 
  icon: Icon, 
  colorClass,
  bgClass
}: { 
  label: string; 
  value: string | number; 
  subValue?: string;
  icon: React.ElementType; 
  colorClass: string;
  bgClass: string;
}) => (
  <div className="bg-bg-primary p-4 rounded-xl border border-border-default shadow-sm flex items-center gap-4 transition-colors">
    <div className={clsx("p-3 rounded-lg", bgClass, colorClass)}>
      <Icon className="w-6 h-6" />
    </div>
    <div>
      <p className="text-sm text-text-secondary font-medium">{label}</p>
      <div className="flex items-baseline gap-2">
        <h3 className="text-2xl font-bold text-text-primary">{value}</h3>
        {subValue && <span className="text-xs text-text-muted">{subValue}</span>}
      </div>
    </div>
  </div>
);

// Initial percentages for ALL 9 columns
// 1. ID -> 編碼
// 2. Category -> 分類
// 3. Feature -> 功能與說明
// 4. Acceptance Criteria -> 完成標準
// 5. Dev Progress -> 開發進度
// 6. Test Coverage -> 測試進度
// 7. Dev Log -> 開發日誌
// 8. Test Progress -> 測試日誌
// 9. Last Modified -> 最後修改者
const INITIAL_WIDTHS = [4, 10, 15, 20, 8, 8, 15, 12, 8];

const COLUMN_HEADERS = [
    { en: 'ID', zh: '編碼' },
    { en: 'Category', zh: '分類' },
    { en: 'Feature', zh: '功能與說明' },
    { en: 'Acceptance Criteria', zh: '完成標準' },
    { en: 'Dev Progress', zh: '開發進度' },
    { en: 'Test Coverage', zh: '測試進度' },
    { en: 'Dev Log', zh: '開發日誌' },
    { en: 'Test Log', zh: '測試日誌' },
    { en: 'Last Modified', zh: '最後修改者' }
];

export default function ProjectProgressPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  
  // Column resizing state (9 columns)
  const [colWidths, setColWidths] = useState<number[]>(INITIAL_WIDTHS);
  const tableRef = useRef<HTMLDivElement>(null);
  const currentWidthsRef = useRef<number[]>(INITIAL_WIDTHS);

  // Load saved widths on mount
  useEffect(() => {
    // Changed key to v3 to force reset due to column reordering
    const saved = localStorage.getItem('project_progress_col_widths_v3'); 
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length === 9) {
          setColWidths(parsed);
          currentWidthsRef.current = parsed;
        }
      } catch (e) {
        console.error('Failed to parse saved widths', e);
      }
    }
  }, []);

  const handleResizeStart = (index: number, e: React.MouseEvent) => {
    e.preventDefault();
    const startX = e.pageX;
    const startWidths = [...currentWidthsRef.current];
    const containerWidth = tableRef.current?.offsetWidth || 1000;
    
    const onMouseMove = (moveEvent: MouseEvent) => {
      const deltaPx = moveEvent.pageX - startX;
      const deltaPercent = (deltaPx / containerWidth) * 100;
      
      const newWidths = [...startWidths];
      const left = newWidths[index] + deltaPercent;
      const right = newWidths[index+1] - deltaPercent;
      
      // Min width check (approx 8px in %)
      // We use a small safety margin
      const minPct = (8 / containerWidth) * 100;
      
      if (left >= minPct && right >= minPct) {
        newWidths[index] = left;
        newWidths[index+1] = right;
        setColWidths(newWidths);
        currentWidthsRef.current = newWidths;
      }
    };
    
    const onMouseUp = () => {
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);
      localStorage.setItem('project_progress_col_widths_v3', JSON.stringify(currentWidthsRef.current));
    };
    
    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
  };

  const resetWidths = () => {
    setColWidths(INITIAL_WIDTHS);
    currentWidthsRef.current = INITIAL_WIDTHS;
    localStorage.removeItem('project_progress_col_widths_v3');
  };
  
  // Stats Calculation
  const stats = useMemo(() => {
    const features = ROADMAP_DATA.features;
    const totalPoints = features.reduce((sum, f) => sum + (f.points || 1), 0);
    const completedWeighted = features.reduce((sum, f) => sum + ((f.points || 1) * f.percentage), 0);
    const overallProgress = totalPoints ? (completedWeighted / totalPoints) : 0;
    
    return {
      totalFeatures: features.length,
      overallProgress: Math.round(overallProgress),
      completedCount: features.filter(f => f.percentage === 100).length,
      inProgressCount: features.filter(f => f.percentage > 0 && f.percentage < 100).length,
      pendingCount: features.filter(f => f.percentage === 0).length,
      totalPoints
    };
  }, []);

  // Filtering
  const filteredFeatures = useMemo(() => {
    return ROADMAP_DATA.features.filter(f => {
      const matchesSearch = f.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                           f.category.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesCategory = selectedCategory === 'All' || f.category === selectedCategory;
      return matchesSearch && matchesCategory;
    });
  }, [searchQuery, selectedCategory]);

  const categories = ['All', ...Array.from(new Set(ROADMAP_DATA.features.map(f => f.category)))];

  return (
    <div className="space-y-6 h-[calc(100vh-100px)] flex flex-col">
      {/* Header */}
      <div className="flex flex-col gap-1 flex-none">
        <h1 className="text-2xl font-semibold text-text-primary flex items-center gap-2">
          <Activity className="text-emerald-600 w-6 h-6" />
          Project Progress Dashboard (專案進度儀表板)
        </h1>
        <p className="text-text-secondary text-sm">
          Track development progress across all modules. Last updated: <span className="font-mono font-medium text-text-primary">{ROADMAP_DATA.lastUpdated}</span>
        </p>
      </div>

      {/* Stats Section */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 flex-none">
        {/* Overall Progress Circular */}
        <div className="bg-bg-primary p-4 rounded-xl border border-border-default shadow-sm flex items-center gap-4 col-span-1 md:col-span-2 lg:col-span-1 transition-colors">
          <div className="relative w-16 h-16 flex-shrink-0">
             <svg className="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
                <path
                  className="text-bg-tertiary"
                  d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="4"
                />
                <path
                  className="text-blue-600 transition-all duration-1000 ease-out"
                  strokeDasharray={`${stats.overallProgress}, 100`}
                  d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="4"
                />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-sm font-bold text-text-primary">{stats.overallProgress}%</span>
              </div>
          </div>
          <div>
            <h2 className="text-sm font-bold text-text-primary">總體開發進度</h2>
            <p className="text-xs text-text-secondary">Weighted by Story Points</p>
            <p className="text-xs text-text-muted mt-1">{stats.totalFeatures} Features</p>
          </div>
        </div>

        <StatCard 
          label="已完成 (Completed)" 
          value={stats.completedCount} 
          icon={CheckCircle2} 
          bgClass="bg-green-50" 
          colorClass="text-green-600" 
        />
        <StatCard 
          label="進行中 (In Progress)" 
          value={stats.inProgressCount} 
          icon={Clock} 
          bgClass="bg-blue-50" 
          colorClass="text-blue-600" 
        />
        <StatCard 
          label="未開始 (Pending)" 
          value={stats.pendingCount} 
          subValue={`/ ${stats.totalPoints} SP`}
          icon={Layers} 
          bgClass="bg-gray-100" 
          colorClass="text-gray-600" 
        />
      </div>

      {/* Controls */}
      <div className="bg-bg-primary p-4 rounded-lg border border-border-default shadow-sm flex flex-col md:flex-row justify-between items-center gap-4 flex-none transition-colors">
        <div className="flex flex-col sm:flex-row items-center gap-4 w-full">
           <div className="relative w-full sm:w-64">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-text-muted w-4 h-4" />
            <input 
              type="text" 
              placeholder="Search features..." 
              className="w-full bg-bg-secondary border border-border-default rounded-md pl-10 pr-4 py-2 text-sm focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none text-text-primary placeholder-text-muted transition-all"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
           <div className="flex gap-2 overflow-x-auto pb-2 sm:pb-0 w-full sm:w-auto scrollbar-hide max-w-full">
            {categories.map(cat => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={clsx(
                  "px-3 py-1.5 rounded-full text-xs font-medium transition-colors border whitespace-nowrap",
                  selectedCategory === cat 
                    ? "bg-emerald-50 border-emerald-200 text-emerald-700" 
                    : "bg-bg-primary border-border-default text-text-secondary hover:bg-bg-secondary hover:text-text-primary"
                )}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>
        <button
            onClick={resetWidths}
            className="flex items-center gap-2 px-3 py-2 text-xs font-medium text-text-secondary bg-bg-primary border border-border-default rounded-md hover:bg-bg-secondary hover:text-text-primary transition-colors whitespace-nowrap"
            title="Reset column widths"
        >
            <RotateCcw className="w-3.5 h-3.5" />
            Reset Widths
        </button>
      </div>

      {/* Table */}
      <div className="bg-bg-primary border border-border-default rounded-lg shadow-sm overflow-hidden flex flex-col flex-1 min-h-0 transition-colors">
        {/* Header */}
        <div className="border-b border-border-default bg-bg-secondary flex items-stretch w-full" ref={tableRef}>
             {COLUMN_HEADERS.map((header, idx) => (
                <div 
                    key={header.en} 
                    className={clsx(
                        "relative px-4 py-2 text-xs font-semibold text-text-secondary tracking-wider flex flex-col justify-center border-r border-border-light last:border-r-0",
                        // ID column specific styling
                        idx === 0 && "items-center"
                    )}
                    style={{ width: `${colWidths[idx]}%` }}
                >
                    <span className="uppercase truncate w-full">{header.en}</span>
                    <span className="text-[10px] text-text-muted truncate w-full">{header.zh}</span>
                    
                    {/* Resizer Handle (except for last column) */}
                    {idx < 8 && (
                        <div
                            className="absolute right-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-blue-400 z-10 active:bg-blue-600"
                            onMouseDown={(e) => handleResizeStart(idx, e)}
                        />
                    )}
                </div>
             ))}
        </div>

        {/* Scrollable Body */}
        <div className="overflow-y-auto flex-1 min-h-0">
           <div className="divide-y divide-border-light">
              {filteredFeatures.map((feature, idx) => (
                  <div 
                    key={feature.name}
                    className="flex items-stretch hover:bg-bg-secondary transition-colors group min-h-[80px]"
                  >
                      {/* 1. ID */}
                      <div 
                        className="flex-none px-2 py-4 flex justify-center border-r border-border-light bg-bg-secondary/50 group-hover:bg-bg-secondary/80"
                        style={{ width: `${colWidths[0]}%` }}
                      >
                          <div className="font-mono text-xs text-text-secondary bg-bg-primary border border-border-default px-1.5 py-0.5 rounded h-fit">
                              {(idx + 1).toString().padStart(3, '0')}
                          </div>
                      </div>

                      {/* 2. Category */}
                      <div 
                        className="px-4 py-4 border-r border-border-light flex items-start" 
                        style={{ width: `${colWidths[1]}%` }}
                      >
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-medium bg-bg-tertiary text-text-primary break-words max-w-full">
                              {feature.category}
                          </span>
                      </div>

                      {/* 3. Feature */}
                      <div 
                        className="px-4 py-4 border-r border-border-light flex flex-col items-start" 
                        style={{ width: `${colWidths[2]}%` }}
                      >
                          <h3 className="text-sm font-medium text-text-primary break-words w-full">{feature.name}</h3>
                          {feature.docPath && (
                              <a href={feature.docPath} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-xs text-blue-500 hover:underline mt-1">
                                  <ExternalLink className="w-3 h-3" />
                                  Docs
                              </a>
                          )}
                      </div>

                      {/* 4. Criteria */}
                      <div 
                        className="px-4 py-4 border-r border-border-light" 
                        style={{ width: `${colWidths[3]}%` }}
                      >
                        <div className="text-xs text-text-secondary whitespace-pre-line max-h-32 overflow-y-auto custom-scrollbar w-full">
                            {feature.acceptanceCriteria}
                        </div>
                      </div>

                      {/* 5. Dev Progress */}
                      <div 
                        className="px-4 py-4 border-r border-border-light flex items-center" 
                        style={{ width: `${colWidths[4]}%` }}
                      >
                          <div className="w-full">
                              <ProgressBar percentage={feature.percentage} />
                          </div>
                      </div>

                      {/* 6. Test Coverage */}
                      <div 
                        className="px-4 py-4 border-r border-border-light flex items-center" 
                        style={{ width: `${colWidths[5]}%` }}
                      >
                          <div className="w-full">
                              <ProgressBar percentage={feature.testCoverage || 0} />
                          </div>
                      </div>

                      {/* 7. Dev Log */}
                      <div 
                        className="px-4 py-4 border-r border-border-light bg-bg-secondary/30 group-hover:bg-bg-secondary/50"
                        style={{ width: `${colWidths[6]}%` }}
                      >
                          <div className="text-xs text-text-secondary whitespace-pre-line max-h-32 overflow-y-auto custom-scrollbar w-full">
                              {feature.devLog ? feature.devLog : <span className="text-text-muted italic">No logs</span>}
                          </div>
                      </div>

                      {/* 8. Test Progress */}
                      <div 
                        className="px-4 py-4 border-r border-border-light" 
                        style={{ width: `${colWidths[7]}%` }}
                      >
                          <div className="text-xs text-text-secondary whitespace-pre-line max-h-32 overflow-y-auto custom-scrollbar w-full">
                              {feature.testProgress ? feature.testProgress : <span className="text-text-muted italic">No test info</span>}
                          </div>
                      </div>

                      {/* 9. Last Modified */}
                      <div 
                        className="flex-none px-4 py-4 flex flex-col justify-center border-l border-border-light" 
                        style={{ width: `${colWidths[8]}%` }}
                      >
                          <div className="text-xs text-text-muted">
                              <p className="truncate" title={feature.lastModifiedBy}>{feature.lastModifiedBy}</p>
                              <p className="font-mono mt-0.5 text-[10px] truncate">{feature.lastModifiedDate}</p>
                          </div>
                      </div>
                  </div>
              ))}
           </div>
        </div>
      </div>
      
      <style jsx global>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background-color: #e5e7eb;
          border-radius: 20px;
        }
        @keyframes progress-bar-stripes {
            0% { background-position: 1rem 0; }
            100% { background-position: 0 0; }
        }
      `}</style>
    </div>
  );
}
