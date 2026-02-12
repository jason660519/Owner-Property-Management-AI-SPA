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
  Filter
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
    <div className="relative w-full h-5 bg-gray-100 rounded-full overflow-hidden shadow-inner">
      <div 
        className={clsx(
          "h-full rounded-full transition-all duration-500 absolute top-0 left-0 flex items-center justify-center",
          percentage === 100 ? "bg-emerald-500" : 
          percentage > 0 ? "bg-blue-500" : "bg-gray-300"
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
  <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex items-center gap-4">
    <div className={clsx("p-3 rounded-lg", bgClass, colorClass)}>
      <Icon className="w-6 h-6" />
    </div>
    <div>
      <p className="text-sm text-gray-500 font-medium">{label}</p>
      <div className="flex items-baseline gap-2">
        <h3 className="text-2xl font-bold text-gray-900">{value}</h3>
        {subValue && <span className="text-xs text-gray-400">{subValue}</span>}
      </div>
    </div>
  </div>
);

export default function ProjectProgressPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  
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

  // Column Resizing Logic (Simplified for React)
  // We'll use CSS Grid with a fixed template for now to ensure alignment, 
  // as fully dynamic resizing in React without a library can be verbose.
  // The original used: 5% 15% 15% 25% 10% 10% 20%
  const gridTemplate = "50px 150px 200px 1fr 100px 120px 250px";

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold text-gray-900 flex items-center gap-2">
          <Activity className="text-emerald-600 w-6 h-6" />
          Project Progress Dashboard (專案進度儀表板)
        </h1>
        <p className="text-gray-500 text-sm">
          Track development progress across all modules. Last updated: <span className="font-mono font-medium text-gray-700">{ROADMAP_DATA.lastUpdated}</span>
        </p>
      </div>

      {/* Stats Section */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Overall Progress Circular */}
        <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex items-center gap-4 col-span-1 md:col-span-2 lg:col-span-1">
          <div className="relative w-16 h-16 flex-shrink-0">
             <svg className="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
                <path
                  className="text-gray-100"
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
                <span className="text-sm font-bold text-gray-900">{stats.overallProgress}%</span>
              </div>
          </div>
          <div>
            <h2 className="text-sm font-bold text-gray-900">總體開發進度</h2>
            <p className="text-xs text-gray-500">Weighted by Story Points</p>
            <p className="text-xs text-gray-400 mt-1">{stats.totalFeatures} Features</p>
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
      <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm flex flex-col md:flex-row justify-between items-center gap-4">
        <div className="flex flex-col sm:flex-row items-center gap-4 w-full">
           <div className="relative w-full sm:w-64">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input 
              type="text" 
              placeholder="Search features..." 
              className="w-full bg-gray-50 border border-gray-200 rounded-md pl-10 pr-4 py-2 text-sm focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none text-gray-900 placeholder-gray-400 transition-all"
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
                    : "bg-white border-gray-200 text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                )}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white border border-gray-200 rounded-lg shadow-sm overflow-hidden flex flex-col h-[calc(100vh-400px)]">
        {/* Header */}
        <div className="overflow-hidden border-b border-gray-200 bg-gray-50">
             <div className="grid gap-4 px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider min-w-[1000px]"
                  style={{ gridTemplateColumns: gridTemplate }}>
                <div>ID</div>
                <div>Category</div>
                <div>Feature</div>
                <div>Acceptance Criteria</div>
                <div>Progress</div>
                <div>Last Modified</div>
                <div>Dev Log</div>
             </div>
        </div>

        {/* Scrollable Body */}
        <div className="overflow-y-auto flex-1 overflow-x-auto">
           <div className="min-w-[1000px] divide-y divide-gray-100">
              {filteredFeatures.map((feature, idx) => (
                  <div 
                    key={feature.name}
                    className="grid gap-4 px-6 py-4 hover:bg-gray-50 transition-colors items-start group"
                    style={{ gridTemplateColumns: gridTemplate }}
                  >
                      {/* ID */}
                      <div className="font-mono text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded w-fit">
                          {(idx + 1).toString().padStart(3, '0')}
                      </div>

                      {/* Category */}
                      <div>
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-medium bg-gray-100 text-gray-800 break-words">
                              {feature.category}
                          </span>
                      </div>

                      {/* Name */}
                      <div>
                          <h3 className="text-sm font-medium text-gray-900 break-words">{feature.name}</h3>
                          {feature.docPath && (
                              <a href={feature.docPath} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-xs text-blue-600 hover:underline mt-1">
                                  <ExternalLink className="w-3 h-3" />
                                  Docs
                              </a>
                          )}
                      </div>

                      {/* Criteria */}
                      <div className="text-xs text-gray-600 whitespace-pre-line max-h-32 overflow-y-auto pr-2 custom-scrollbar">
                          {feature.acceptanceCriteria}
                      </div>

                      {/* Progress */}
                      <div className="w-full">
                          <ProgressBar percentage={feature.percentage} />
                      </div>

                      {/* Last Modified */}
                      <div className="text-xs text-gray-500">
                          <p>{feature.lastModifiedBy}</p>
                          <p className="font-mono mt-0.5 text-[10px]">{feature.lastModifiedDate}</p>
                      </div>

                      {/* Dev Log */}
                      <div className="text-xs text-gray-600 whitespace-pre-line max-h-32 overflow-y-auto pr-2 custom-scrollbar">
                          {feature.devLog ? feature.devLog : <span className="text-gray-400 italic">No logs</span>}
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
