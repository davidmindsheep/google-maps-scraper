'use client';

import { useState } from 'react';
import { Search, MapPin, Loader2, Download } from 'lucide-react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

interface ScrapeResult {
  name: string;
  rating?: string;
  reviews?: string;
  address?: string;
  phone?: string;
  website?: string;
}

export function cn(...inputs: (string | undefined | null | false)[]) {
  return twMerge(clsx(inputs));
}

export default function Home() {
  const [location, setLocation] = useState('');
  const [criteria, setCriteria] = useState('');
  const [limit, setLimit] = useState(5);
  const [results, setResults] = useState<ScrapeResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setResults([]);

    try {
      const response = await fetch('/api/scrape', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ location, criteria, limit }),
      });

      if (!response.ok) throw new Error('Failed to start scraping');
      if (!response.body) throw new Error('No response body');

      const reader = response.body.getReader();
      const decoder = new TextDecoder();

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value);
        const lines = chunk.split('\n');

        for (const line of lines) {
          if (!line.trim()) continue;
          try {
            const data = JSON.parse(line);
            if (data.error) {
              console.error("Scraper error:", data.error);
              // Don't stop, just log
            } else {
              setResults((prev) => [...prev, data]);
            }
          } catch (e) {
            console.error('Error parsing JSON chunk', e);
          }
        }
      }
    } catch (err: any) {
      setError(err.message || 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const exportCSV = () => {
    const headers = ['Name', 'Rating', 'Address', 'Phone', 'Website'];
    const csvContent = [
      headers.join(','),
      ...results.map(r => [
        `"${r.name}"`,
        `"${r.rating || ''}"`,
        `"${r.address || ''}"`,
        `"${r.phone || ''}"`,
        `"${r.website || ''}"`
      ].join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'scraped_results.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <main className="min-h-screen bg-slate-950 text-slate-200 p-8 font-sans">
      <div className="max-w-6xl mx-auto space-y-8">

        {/* Header */}
        <div className="text-center space-y-4">
          <h1 className="text-5xl font-extrabold bg-gradient-to-r from-blue-400 to-emerald-400 bg-clip-text text-transparent">
            Maps Scraper
          </h1>
          <p className="text-slate-400 text-lg">
            Automated local browser control for business data extraction.
          </p>
        </div>

        {/* Search Form */}
        <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-8 shadow-xl backdrop-blur-sm">
          <form onSubmit={handleSearch} className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-400 ml-1">Search Criteria</label>
              <div className="relative group">
                <Search className="absolute left-4 top-3.5 h-5 w-5 text-slate-500 group-focus-within:text-blue-400 transition-colors" />
                <input
                  type="text"
                  value={criteria}
                  onChange={(e) => setCriteria(e.target.value)}
                  placeholder="e.g. Coffee Shop"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl py-3 pl-12 pr-4 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-all placeholder:text-slate-600"
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-400 ml-1">Location</label>
              <div className="relative group">
                <MapPin className="absolute left-4 top-3.5 h-5 w-5 text-slate-500 group-focus-within:text-emerald-400 transition-colors" />
                <input
                  type="text"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  placeholder="e.g. San Francisco, CA"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl py-3 pl-12 pr-4 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500 transition-all placeholder:text-slate-600"
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-400 ml-1">Limit (Max 50)</label>
              <div className="relative group">
                <input
                  type="number"
                  min="1"
                  max="50"
                  value={limit}
                  onChange={(e) => setLimit(Math.min(50, Math.max(1, parseInt(e.target.value) || 1)))}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl py-3 px-4 focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500 transition-all text-center font-mono"
                />
              </div>
            </div>


            <div className="flex items-end">
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-gradient-to-r from-blue-600 to-emerald-600 hover:from-blue-500 hover:to-emerald-500 text-white font-bold py-3 px-6 rounded-xl shadow-lg shadow-blue-900/20 disabled:opacity-50 disabled:cursor-not-allowed transition-all transform hover:scale-[1.02] active:scale-[0.98] flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <Loader2 className="h-5 w-5 animate-spin" />
                    Scraping...
                  </>
                ) : (
                  'Start Scraping'
                )}
              </button>
            </div>
          </form>
        </div>

        {/* Error Message */}
        {error && (
          <div className="bg-red-500/10 border border-red-500/20 text-red-400 px-6 py-4 rounded-xl">
            {error}
          </div>
        )}

        {/* Results Area */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-bold flex items-center gap-3">
              Results
              <span className="bg-slate-800 text-slate-300 text-sm px-3 py-1 rounded-full">
                {results.length}
              </span>
            </h2>
            {results.length > 0 && (
              <button
                onClick={exportCSV}
                className="flex items-center gap-2 text-sm font-medium text-emerald-400 hover:text-emerald-300 transition-colors bg-emerald-500/10 hover:bg-emerald-500/20 px-4 py-2 rounded-lg"
              >
                <Download className="h-4 w-4" />
                Export CSV
              </button>
            )}
          </div>

          <div className="bg-slate-900/50 border border-slate-800 rounded-2xl overflow-hidden shadow-xl backdrop-blur-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-950/50 border-b border-slate-800">
                    <th className="p-4 font-semibold text-slate-400">Name</th>
                    <th className="p-4 font-semibold text-slate-400">Rating</th>
                    <th className="p-4 font-semibold text-slate-400">Address</th>
                    <th className="p-4 font-semibold text-slate-400">Phone</th>
                    <th className="p-4 font-semibold text-slate-400">Website</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/50">
                  {results.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="p-12 text-center text-slate-500">
                        {loading ? 'Waiting for results...' : 'No results yet. Start a search above.'}
                      </td>
                    </tr>
                  ) : (
                    results.map((result, idx) => (
                      <tr key={idx} className="hover:bg-slate-800/30 transition-colors group">
                        <td className="p-4 font-medium text-white group-hover:text-blue-400 transition-colors">{result.name}</td>
                        <td className="p-4 text-slate-300">{result.rating}</td>
                        <td className="p-4 text-slate-400 text-sm max-w-xs truncate" title={result.address}>{result.address}</td>
                        <td className="p-4 text-slate-300 whitespace-nowrap">{result.phone}</td>
                        <td className="p-4">
                          {result.website && (
                            <a
                              href={result.website}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-blue-400 hover:text-blue-300 hover:underline text-sm truncate max-w-[200px] block"
                            >
                              {result.website}
                            </a>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

      </div>
    </main>
  );
}
