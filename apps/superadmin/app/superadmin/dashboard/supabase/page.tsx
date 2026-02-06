import React from 'react';
import { ExternalLink, Database, Activity, Shield, Clock, FileText } from 'lucide-react';

export default function SupabasePage() {
  return (
    <div className="p-6 space-y-8">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Supabase Database Management</h1>
        <a 
          href="https://supabase.com/dashboard" 
          target="_blank" 
          rel="noopener noreferrer"
          className="flex items-center gap-2 bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 transition-colors"
        >
          <ExternalLink size={16} />
          Supabase Dashboard
        </a>
      </div>

      {/* Connection & Health Status */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center gap-3 mb-4">
            <Activity className="text-blue-600" />
            <h2 className="text-xl font-semibold">Connection Pooling</h2>
          </div>
          <div className="space-y-2">
            <div className="flex justify-between">
              <span className="text-gray-600">Active Connections:</span>
              <span className="font-medium">12 / 50</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2.5">
              <div className="bg-blue-600 h-2.5 rounded-full" style={{ width: '24%' }}></div>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center gap-3 mb-4">
            <Database className="text-green-600" />
            <h2 className="text-xl font-semibold">Health Status</h2>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-green-500"></div>
            <span className="font-medium text-green-700">Active</span>
          </div>
          <p className="text-sm text-gray-500 mt-2">Last checked: Just now</p>
        </div>
      </div>

      {/* Backup & Restore */}
      <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
        <div className="flex items-center gap-3 mb-4">
          <FileText className="text-orange-600" />
          <h2 className="text-xl font-semibold">Backup & Restore</h2>
        </div>
        <div className="bg-blue-50 p-4 rounded-md text-blue-800 mb-4">
          <h3 className="font-semibold mb-2">Instructions</h3>
          <p>Supabase manages automatic daily backups. To restore a backup:</p>
          <ol className="list-decimal ml-5 mt-2 space-y-1">
            <li>Go to the Supabase Dashboard.</li>
            <li>Navigate to Database &gt; Backups.</li>
            <li>Select the Point-in-Time Recovery (PITR) or a scheduled backup.</li>
            <li>Click "Restore".</li>
          </ol>
        </div>
        <button className="border border-gray-300 px-4 py-2 rounded-md hover:bg-gray-50">
          View Backup Schedule
        </button>
      </div>

      {/* Slow Queries Logs */}
      <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
        <div className="flex items-center gap-3 mb-4">
          <Clock className="text-purple-600" />
          <h2 className="text-xl font-semibold">Slow Queries Logs</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="py-2 px-4">Time</th>
                <th className="py-2 px-4">Duration</th>
                <th className="py-2 px-4">Query</th>
                <th className="py-2 px-4">User</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-b border-gray-100">
                <td className="py-2 px-4 text-sm text-gray-600">2026-02-06 14:30:00</td>
                <td className="py-2 px-4 text-sm text-red-600">1200ms</td>
                <td className="py-2 px-4 text-sm font-mono bg-gray-50 rounded">SELECT * FROM logs...</td>
                <td className="py-2 px-4 text-sm">postgres</td>
              </tr>
              <tr>
                <td className="py-2 px-4 text-sm text-gray-600">2026-02-06 14:15:22</td>
                <td className="py-2 px-4 text-sm text-yellow-600">800ms</td>
                <td className="py-2 px-4 text-sm font-mono bg-gray-50 rounded">UPDATE properties...</td>
                <td className="py-2 px-4 text-sm">service_role</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* RLS Policies */}
      <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
        <div className="flex items-center gap-3 mb-4">
          <Shield className="text-red-600" />
          <h2 className="text-xl font-semibold">Row Level Security (RLS) Policies</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="py-2 px-4">Table</th>
                <th className="py-2 px-4">Policy Name</th>
                <th className="py-2 px-4">Action</th>
                <th className="py-2 px-4">Roles</th>
                <th className="py-2 px-4">Status</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-b border-gray-100">
                <td className="py-2 px-4 font-medium">users</td>
                <td className="py-2 px-4">Enable read for authenticated users</td>
                <td className="py-2 px-4">SELECT</td>
                <td className="py-2 px-4">authenticated</td>
                <td className="py-2 px-4 text-green-600">Active</td>
              </tr>
              <tr>
                <td className="py-2 px-4 font-medium">properties</td>
                <td className="py-2 px-4">Landlords can update own properties</td>
                <td className="py-2 px-4">UPDATE</td>
                <td className="py-2 px-4">authenticated</td>
                <td className="py-2 px-4 text-green-600">Active</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
