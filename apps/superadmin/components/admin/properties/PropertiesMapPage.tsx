'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import { Search, AlignLeft, Map } from 'lucide-react';
import type { PropertiesResult } from '@/lib/types/properties';
import { PropertyMapView } from './PropertyMapView';
import { TAIWAN_CITIES, getDistrictsByCity } from '@/lib/data/taiwan-address';

function normalizeCityDistrict(input: string | null | undefined): string {
  return (input ?? '').trim().replaceAll('臺', '台');
}

export function PropertiesMapPage({ data: result }: { data: PropertiesResult }) {
  const { properties, totalSales, totalRentals } = result;
  const [typeFilter, setTypeFilter] = useState<'all' | 'sale' | 'rental'>('all');
  const [globalFilter, setGlobalFilter] = useState('');
  const [cityFilter, setCityFilter] = useState('');
  const [districtFilter, setDistrictFilter] = useState('');

  const districtOptions = useMemo(() => getDistrictsByCity(cityFilter), [cityFilter]);

  const filteredData = useMemo(() => {
    let list = typeFilter === 'all' ? properties : properties.filter((p) => p.type === typeFilter);
    if (globalFilter) {
      const q = globalFilter.toLowerCase();
      list = list.filter(
        (p) =>
          (p.title ?? '').toLowerCase().includes(q) ||
          (p.address ?? '').toLowerCase().includes(q),
      );
    }
    if (cityFilter) {
      const nCity = normalizeCityDistrict(cityFilter);
      list = list.filter((p) => normalizeCityDistrict(p.addressCity) === nCity);
    }
    if (districtFilter) {
      const nDist = normalizeCityDistrict(districtFilter);
      list = list.filter((p) => normalizeCityDistrict(p.addressDistrict) === nDist);
    }
    return list;
  }, [properties, typeFilter, globalFilter, cityFilter, districtFilter]);

  return (
    <div className="flex-1 min-h-0 flex flex-col gap-4">
      <div className="shrink-0 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-2 bg-bg-secondary border border-border-default p-2 rounded-lg w-full sm:max-w-sm">
          <Search size={18} className="text-text-secondary flex-shrink-0" />
          <input
            placeholder="搜尋物件名稱、地址..."
            value={globalFilter}
            onChange={(e) => setGlobalFilter(e.target.value)}
            className="outline-none text-sm w-full bg-transparent text-text-primary placeholder-text-muted"
          />
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex rounded-md border border-border-default overflow-hidden">
            <Link
              href="/superadmin/properties"
              title="表格檢視"
              className="px-2.5 py-1.5 text-xs flex items-center gap-1 transition-colors bg-bg-primary text-text-secondary hover:bg-bg-secondary"
            >
              <AlignLeft size={13} /> 表格
            </Link>
            <Link
              href="/superadmin/properties/map"
              title="地圖檢視"
              className="px-2.5 py-1.5 text-xs flex items-center gap-1 border-l border-border-default transition-colors bg-accent text-white"
            >
              <Map size={13} /> 地圖
            </Link>
          </div>
          <select
            value={cityFilter}
            onChange={(e) => { setCityFilter(e.target.value); setDistrictFilter(''); }}
            className="text-xs bg-bg-primary border border-border-default rounded px-2 py-1.5 text-text-primary focus:outline-none focus:border-accent"
          >
            <option value="">縣市</option>
            {TAIWAN_CITIES.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
          <select
            value={districtFilter}
            onChange={(e) => setDistrictFilter(e.target.value)}
            disabled={!cityFilter}
            className="text-xs bg-bg-primary border border-border-default rounded px-2 py-1.5 text-text-primary focus:outline-none focus:border-accent disabled:opacity-40"
          >
            <option value="">區</option>
            {districtOptions.map((d) => <option key={d} value={d}>{d}</option>)}
          </select>
          <button
            type="button"
            onClick={() => setTypeFilter('all')}
            className={`px-3 py-1.5 text-sm rounded-md border transition-colors ${
              typeFilter === 'all'
                ? 'bg-accent text-white border-accent'
                : 'bg-bg-secondary text-text-secondary border-border-default hover:border-accent/50'
            }`}
          >
            全部 ({properties.length})
          </button>
          <button
            type="button"
            onClick={() => setTypeFilter('sale')}
            className={`px-3 py-1.5 text-sm rounded-md border transition-colors ${
              typeFilter === 'sale'
                ? 'bg-green-600 text-white border-green-600'
                : 'bg-bg-secondary text-text-secondary border-border-default hover:border-green-500/50'
            }`}
          >
            出售 ({totalSales})
          </button>
          <button
            type="button"
            onClick={() => setTypeFilter('rental')}
            className={`px-3 py-1.5 text-sm rounded-md border transition-colors ${
              typeFilter === 'rental'
                ? 'bg-blue-600 text-white border-blue-600'
                : 'bg-bg-secondary text-text-secondary border-border-default hover:border-blue-500/50'
            }`}
          >
            出租 ({totalRentals})
          </button>
        </div>
      </div>

      <PropertyMapView properties={filteredData} />
    </div>
  );
}
