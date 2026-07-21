import React from 'react';
import { Film, LogOut, Search, User as UserIcon, Sparkles } from 'lucide-react';
import { User } from '../types';

interface HeaderProps {
  user: User | null;
  onSignOut: () => void;
  activeTab: string;
  setActiveTab: (tab: string) => void;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
}

export default function Header({
  user,
  onSignOut,
  activeTab,
  setActiveTab,
  searchQuery,
  setSearchQuery,
}: HeaderProps) {
  return (
    <header className="sticky top-0 z-50 bg-black/40 backdrop-blur-md border-b border-white/10 px-6 lg:px-8 py-4 flex items-center justify-between">
      {/* Brand Logo */}
      <div 
        onClick={() => {
          setSearchQuery('');
          setActiveTab('home');
        }}
        className="flex items-center gap-2 cursor-pointer group"
      >
        <div className="bg-indigo-600 p-2 rounded-lg text-white shadow-lg shadow-indigo-600/20 group-hover:scale-105 transition-transform duration-200">
          <Film className="w-5 h-5" />
        </div>
        <span className="text-xl font-bold tracking-tight text-white">
          Streamo<span className="text-indigo-500">Flix</span>
        </span>
      </div>

      {/* Main Navigation */}
      {user && (
        <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-gray-400">
          <button
            onClick={() => {
              setSearchQuery('');
              setActiveTab('home');
            }}
            className={`transition-colors duration-150 hover:text-white pb-1 ${activeTab === 'home' && !searchQuery ? 'text-white border-b-2 border-indigo-500 font-semibold' : ''}`}
          >
            Home
          </button>
          <button
            onClick={() => {
              setSearchQuery('');
              setActiveTab('movies');
            }}
            className={`transition-colors duration-150 hover:text-white pb-1 ${activeTab === 'movies' && !searchQuery ? 'text-white border-b-2 border-indigo-500 font-semibold' : ''}`}
          >
            Movies
          </button>
          <button
            onClick={() => {
              setSearchQuery('');
              setActiveTab('series');
            }}
            className={`transition-colors duration-150 hover:text-white pb-1 ${activeTab === 'series' && !searchQuery ? 'text-white border-b-2 border-indigo-500 font-semibold' : ''}`}
          >
            Series
          </button>
        </nav>
      )}

      {/* Search and Profile Controls */}
      <div className="flex items-center gap-4 flex-1 md:flex-initial justify-end max-w-md ml-4">
        {user && (
          <div className="relative w-full max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
            <input
              type="text"
              placeholder="Search titles..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-white/5 border border-white/10 rounded-full pl-9 pr-4 py-1.5 text-xs text-white placeholder-white/30 focus:outline-none focus:border-indigo-500 focus:bg-white/10 transition-all duration-200"
            />
          </div>
        )}

        {user && (
          <div className="flex items-center gap-3">
            {/* User Premium/Status Badge */}
            <div className="hidden lg:flex flex-col items-end">
              <span className="text-xs font-semibold text-white/90 max-w-[120px] truncate">{user.email}</span>
              {user.is_premium ? (
                <span className="flex items-center gap-1 text-[10px] font-bold text-indigo-400">
                  <Sparkles className="w-3 h-3 fill-indigo-400" /> Premium Member
                </span>
              ) : (
                <span className="text-[10px] font-bold text-white/40">Free Plan</span>
              )}
            </div>

            {/* Logout button */}
            <button
              onClick={onSignOut}
              title="Sign Out"
              className="p-2 text-white/60 hover:text-indigo-400 hover:bg-white/5 rounded-full transition-all duration-150"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>
    </header>
  );
}
