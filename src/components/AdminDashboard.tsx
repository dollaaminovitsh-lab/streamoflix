import React, { useState, useEffect } from 'react';
import { Shield, Plus, Trash2, Film, Tv, Play, AlertCircle, CheckCircle, ArrowLeft } from 'lucide-react';
import { Movie, Series } from '../types';

interface AdminDashboardProps {
  onBackToApp: () => void;
}

export default function AdminDashboard({ onBackToApp }: AdminDashboardProps) {
  const [isAdminAuthenticated, setIsAdminAuthenticated] = useState(false);
  const [passwordInput, setPasswordInput] = useState('');
  const [loginError, setLoginError] = useState('');

  // Admin active section: 'movies' | 'series'
  const [activeSection, setActiveSection] = useState<'movies' | 'series'>('movies');

  // Database lists
  const [movies, setMovies] = useState<Movie[]>([]);
  const [series, setSeries] = useState<Series[]>([]);

  // Logs & Loading states
  const [loading, setLoading] = useState(false);
  const [statusMsg, setStatusMsg] = useState<{ text: string; type: 'success' | 'error' | '' }>({ text: '', type: '' });

  // Add Movie form inputs
  const [movieForm, setMovieForm] = useState({
    title: '',
    overview: '',
    poster_path: '',
    backdrop_path: '',
    release_date: '',
    vote_average: '7.5',
    genres: '',
    servers: '{\n  "Server 1": "https://api.zxcstream.xyz/player/movie/1368337",\n  "Server 2": "https://vidsrc.to/embed/movie/1368337"\n}'
  });

  // Add Series form inputs
  const [seriesForm, setSeriesForm] = useState({
    title: '',
    year: '',
    description: '',
    rating: '8.0',
    image: '',
    genres: '',
    seasons: '{\n  "1": {\n    "episodes": {\n      "1": {\n        "title": "Episode 1",\n        "servers": {\n          "Server 1": "https://api.zxcstream.xyz/player/tv/94997/1/1",\n          "Server 2": "https://vidfast.vc/tv/94997/1/1"\n        }\n      }\n    }\n  }\n}'
  });

  // Verify Admin password (locks securely to 'admin')
  const handleAdminLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (passwordInput === 'admin') {
      setIsAdminAuthenticated(true);
      setLoginError('');
      fetchData();
    } else {
      setLoginError('Incorrect admin password. Access denied.');
    }
  };

  // Fetch lists from Neon & Supabase
  const fetchData = async () => {
    setLoading(true);
    try {
      const resMovies = await fetch('/api/movies');
      const dataMovies = await resMovies.json();
      setMovies(dataMovies);

      const resSeries = await fetch('/api/series');
      const dataSeries = await resSeries.json();
      setSeries(dataSeries);
    } catch (err) {
      console.error('Failed to load admin data:', err);
    } finally {
      setLoading(false);
    }
  };

  // Trigger add movie
  const handleAddMovie = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatusMsg({ text: '', type: '' });

    let serversParsed = {};
    try {
      serversParsed = JSON.parse(movieForm.servers);
    } catch (err) {
      setStatusMsg({ text: 'Invalid JSON structure in Video Servers field.', type: 'error' });
      return;
    }

    try {
      const response = await fetch('/api/admin/movies', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-password': 'admin'
        },
        body: JSON.stringify({
          title: movieForm.title,
          overview: movieForm.overview,
          poster_path: movieForm.poster_path,
          backdrop_path: movieForm.backdrop_path,
          release_date: movieForm.release_date,
          vote_average: parseFloat(movieForm.vote_average),
          genres: movieForm.genres.split(',').map(g => g.trim()).filter(Boolean),
          servers: serversParsed
        })
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Failed to add movie to Neon.');

      setStatusMsg({ text: `Successfully added movie: "${data.title}" to Neon!`, type: 'success' });
      // Reset form
      setMovieForm({
        title: '',
        overview: '',
        poster_path: '',
        backdrop_path: '',
        release_date: '',
        vote_average: '7.5',
        genres: '',
        servers: '{\n  "Server 1": "https://api.zxcstream.xyz/player/movie/1368337",\n  "Server 2": "https://vidsrc.to/embed/movie/1368337"\n}'
      });
      fetchData();
    } catch (err: any) {
      setStatusMsg({ text: err.message, type: 'error' });
    }
  };

  // Trigger add series
  const handleAddSeries = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatusMsg({ text: '', type: '' });

    let seasonsParsed = {};
    try {
      seasonsParsed = JSON.parse(seriesForm.seasons);
    } catch (err) {
      setStatusMsg({ text: 'Invalid JSON structure in Seasons & Episodes field.', type: 'error' });
      return;
    }

    try {
      const response = await fetch('/api/admin/series', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-password': 'admin'
        },
        body: JSON.stringify({
          title: seriesForm.title,
          year: seriesForm.year,
          description: seriesForm.description,
          rating: parseFloat(seriesForm.rating),
          image: seriesForm.image,
          genres: seriesForm.genres.split(',').map(g => g.trim()).filter(Boolean),
          seasons: seasonsParsed
        })
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Failed to add series to Supabase.');

      setStatusMsg({ text: `Successfully added series: "${data.title}" to Supabase!`, type: 'success' });
      // Reset form
      setSeriesForm({
        title: '',
        year: '',
        description: '',
        rating: '8.0',
        image: '',
        genres: '',
        seasons: '{\n  "1": {\n    "episodes": {\n      "1": {\n        "title": "Episode 1",\n        "servers": {\n          "Server 1": "https://api.zxcstream.xyz/player/tv/94997/1/1",\n          "Server 2": "https://vidfast.vc/tv/94997/1/1"\n        }\n      }\n    }\n  }\n}'
      });
      fetchData();
    } catch (err: any) {
      setStatusMsg({ text: err.message, type: 'error' });
    }
  };

  // Delete movie from Neon
  const handleDeleteMovie = async (id: number) => {
    if (!window.confirm('Are you sure you want to delete this movie from Neon database?')) return;
    setStatusMsg({ text: '', type: '' });
    try {
      const response = await fetch(`/api/admin/movies/${id}`, {
        method: 'DELETE',
        headers: {
          'x-admin-password': 'admin'
        }
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Failed to delete movie.');

      setStatusMsg({ text: data.message, type: 'success' });
      fetchData();
    } catch (err: any) {
      setStatusMsg({ text: err.message, type: 'error' });
    }
  };

  // Delete series from Supabase
  const handleDeleteSeries = async (id: number) => {
    if (!window.confirm('Are you sure you want to delete this series from Supabase database?')) return;
    setStatusMsg({ text: '', type: '' });
    try {
      const response = await fetch(`/api/admin/series/${id}`, {
        method: 'DELETE',
        headers: {
          'x-admin-password': 'admin'
        }
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Failed to delete series.');

      setStatusMsg({ text: data.message, type: 'success' });
      fetchData();
    } catch (err: any) {
      setStatusMsg({ text: err.message, type: 'error' });
    }
  };

  // Auth form
  if (!isAdminAuthenticated) {
    return (
      <div className="min-h-[calc(100vh-80px)] flex items-center justify-center bg-[#050505] px-4 py-8">
        <div className="w-full max-w-md bg-[#0c0c0e] border border-white/10 rounded-2xl p-8 shadow-2xl">
          <div className="flex flex-col items-center text-center gap-2 mb-8">
            <div className="bg-indigo-600/10 p-3 rounded-2xl text-indigo-400 border border-indigo-500/20">
              <Shield className="w-6 h-6" />
            </div>
            <h1 className="text-xl font-bold tracking-tight text-white mt-3">
              Admin Gateway Authentication
            </h1>
            <p className="text-xs text-white/40">
              This terminal is locked. Please enter your administrator token.
            </p>
          </div>

          <form onSubmit={handleAdminLogin} className="space-y-4">
            {loginError && (
              <div className="bg-red-500/10 border border-red-500/20 text-red-400 text-xs py-3 px-4 rounded-lg flex items-start gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{loginError}</span>
              </div>
            )}

            <div className="space-y-1">
              <label className="text-[10px] font-bold text-white/40 uppercase tracking-widest">Admin Token</label>
              <input
                type="password"
                required
                placeholder="Enter admin password"
                value={passwordInput}
                onChange={(e) => setPasswordInput(e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white placeholder-white/20 focus:outline-none focus:border-indigo-500/50 transition-colors"
              />
            </div>

            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={onBackToApp}
                className="flex-1 bg-white/5 hover:bg-white/10 text-white font-semibold py-2.5 rounded-xl text-xs transition-colors flex items-center justify-center gap-1.5"
              >
                <ArrowLeft className="w-3.5 h-3.5" /> Back to App
              </button>
              <button
                type="submit"
                className="flex-1 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold py-2.5 rounded-xl text-xs shadow-lg shadow-indigo-600/20 transition-all"
              >
                Unlock Dashboard
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#050505] text-white py-8 px-4 lg:px-8">
      {/* Admin Top Header */}
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-start md:items-center justify-between gap-4 border-b border-white/10 pb-6 mb-8">
        <div>
          <div className="flex items-center gap-2 text-indigo-400 text-xs font-bold tracking-widest uppercase">
            <Shield className="w-3.5 h-3.5" /> Security Center
          </div>
          <h1 className="text-3xl font-black text-white mt-1">Administrator Control Panel</h1>
          <p className="text-xs text-white/40 mt-1">
            Connected to <span className="text-amber-400 font-semibold">Neon (Movies + Users)</span> and <span className="text-purple-400 font-semibold">Supabase (Series)</span> Postgres instances.
          </p>
        </div>

        <button
          onClick={onBackToApp}
          className="bg-white/5 hover:bg-white/10 border border-white/10 px-4 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 transition-colors cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" /> Exit Admin panel
        </button>
      </div>

      {/* Main Container */}
      <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Column: Form Section */}
        <div className="lg:col-span-5 space-y-6">
          <div className="bg-[#0c0c0e] border border-white/10 rounded-2xl p-6">
            <div className="flex items-center gap-2 border-b border-white/10 pb-4 mb-4">
              {activeSection === 'movies' ? (
                <>
                  <Film className="w-5 h-5 text-indigo-400" />
                  <h3 className="font-bold text-white text-base">Add New Movie to Neon</h3>
                </>
              ) : (
                <>
                  <Tv className="w-5 h-5 text-purple-400" />
                  <h3 className="font-bold text-white text-base">Add New Series to Supabase</h3>
                </>
              )}
            </div>

            {/* Status alerts */}
            {statusMsg.text && (
              <div className={`mb-4 py-3 px-4 rounded-xl text-xs border flex items-start gap-2 ${
                statusMsg.type === 'success' 
                  ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' 
                  : 'bg-red-500/10 border-red-500/20 text-red-400'
              }`}>
                {statusMsg.type === 'success' ? (
                  <CheckCircle className="w-4 h-4 shrink-0 mt-0.5" />
                ) : (
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                )}
                <span>{statusMsg.text}</span>
              </div>
            )}

            {/* Form Toggle Tabs */}
            <div className="flex bg-white/5 p-1 rounded-xl mb-6">
              <button
                onClick={() => {
                  setActiveSection('movies');
                  setStatusMsg({ text: '', type: '' });
                }}
                className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all ${
                  activeSection === 'movies' ? 'bg-indigo-600 text-white shadow-md' : 'text-white/60 hover:text-white'
                }`}
              >
                Movies (Neon)
              </button>
              <button
                onClick={() => {
                  setActiveSection('series');
                  setStatusMsg({ text: '', type: '' });
                }}
                className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all ${
                  activeSection === 'series' ? 'bg-purple-600 text-white shadow-md' : 'text-white/60 hover:text-white'
                }`}
              >
                Series (Supabase)
              </button>
            </div>

            {/* Add Movie Form */}
            {activeSection === 'movies' && (
              <form onSubmit={handleAddMovie} className="space-y-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-white/40 uppercase">Movie Title</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Inception 2"
                    value={movieForm.title}
                    onChange={(e) => setMovieForm({ ...movieForm, title: e.target.value })}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-xs text-white placeholder-white/20 focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-white/40 uppercase">Overview / Description</label>
                  <textarea
                    rows={3}
                    placeholder="Provide movie description..."
                    value={movieForm.overview}
                    onChange={(e) => setMovieForm({ ...movieForm, overview: e.target.value })}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-xs text-white placeholder-white/20 focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-white/40 uppercase">Release Date</label>
                    <input
                      type="date"
                      value={movieForm.release_date}
                      onChange={(e) => setMovieForm({ ...movieForm, release_date: e.target.value })}
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-white/40 uppercase">Vote Average</label>
                    <input
                      type="number"
                      step="0.1"
                      min="0"
                      max="10"
                      value={movieForm.vote_average}
                      onChange={(e) => setMovieForm({ ...movieForm, vote_average: e.target.value })}
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-white/40 uppercase">Poster Image URL</label>
                  <input
                    type="url"
                    placeholder="https://image.tmdb.org/t/p/w500/..."
                    value={movieForm.poster_path}
                    onChange={(e) => setMovieForm({ ...movieForm, poster_path: e.target.value })}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-xs text-white placeholder-white/20 focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-white/40 uppercase">Genres (comma separated)</label>
                  <input
                    type="text"
                    placeholder="Sci-Fi, Action, Thriller"
                    value={movieForm.genres}
                    onChange={(e) => setMovieForm({ ...movieForm, genres: e.target.value })}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-xs text-white placeholder-white/20 focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-white/40 uppercase">Video Servers (JSON map)</label>
                  <textarea
                    rows={4}
                    value={movieForm.servers}
                    onChange={(e) => setMovieForm({ ...movieForm, servers: e.target.value })}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-[10px] font-mono text-emerald-400 focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <button
                  type="submit"
                  className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-2 rounded-xl text-xs transition-colors flex items-center justify-center gap-1 shadow-lg shadow-indigo-600/20"
                >
                  <Plus className="w-4 h-4" /> Save Movie to Neon
                </button>
              </form>
            )}

            {/* Add Series Form */}
            {activeSection === 'series' && (
              <form onSubmit={handleAddSeries} className="space-y-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-white/40 uppercase">Series Title</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Breaking Bad"
                    value={seriesForm.title}
                    onChange={(e) => setSeriesForm({ ...seriesForm, title: e.target.value })}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-xs text-white placeholder-white/20 focus:outline-none focus:border-purple-500"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-white/40 uppercase">Description</label>
                  <textarea
                    rows={3}
                    placeholder="Provide series synopsis..."
                    value={seriesForm.description}
                    onChange={(e) => setSeriesForm({ ...seriesForm, description: e.target.value })}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-xs text-white placeholder-white/20 focus:outline-none focus:border-purple-500"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-white/40 uppercase">Release Year</label>
                    <input
                      type="text"
                      placeholder="2024"
                      value={seriesForm.year}
                      onChange={(e) => setSeriesForm({ ...seriesForm, year: e.target.value })}
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-purple-500"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-white/40 uppercase">Rating</label>
                    <input
                      type="number"
                      step="0.1"
                      min="0"
                      max="10"
                      value={seriesForm.rating}
                      onChange={(e) => setSeriesForm({ ...seriesForm, rating: e.target.value })}
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-purple-500"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-white/40 uppercase">Poster Image URL</label>
                  <input
                    type="url"
                    placeholder="https://image.tmdb.org/t/p/w500/..."
                    value={seriesForm.image}
                    onChange={(e) => setSeriesForm({ ...seriesForm, image: e.target.value })}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-xs text-white placeholder-white/20 focus:outline-none focus:border-purple-500"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-white/40 uppercase">Genres (comma separated)</label>
                  <input
                    type="text"
                    placeholder="Drama, Sci-Fi & Fantasy"
                    value={seriesForm.genres}
                    onChange={(e) => setSeriesForm({ ...seriesForm, genres: e.target.value })}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-xs text-white placeholder-white/20 focus:outline-none focus:border-purple-500"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-white/40 uppercase">Seasons & Episodes (JSON map)</label>
                  <textarea
                    rows={6}
                    value={seriesForm.seasons}
                    onChange={(e) => setSeriesForm({ ...seriesForm, seasons: e.target.value })}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-[10px] font-mono text-emerald-400 focus:outline-none focus:border-purple-500"
                  />
                </div>

                <button
                  type="submit"
                  className="w-full bg-purple-600 hover:bg-purple-500 text-white font-bold py-2 rounded-xl text-xs transition-colors flex items-center justify-center gap-1 shadow-lg shadow-purple-600/20"
                >
                  <Plus className="w-4 h-4" /> Save Series to Supabase
                </button>
              </form>
            )}
          </div>
        </div>

        {/* Right Column: Database Records Lists */}
        <div className="lg:col-span-7 space-y-6">
          <div className="bg-[#0c0c0e] border border-white/10 rounded-2xl p-6 min-h-[500px]">
            <h3 className="font-bold text-white text-base border-b border-white/10 pb-4 mb-4 flex items-center justify-between">
              <span>Database Records</span>
              <span className="text-xs text-white/40">
                {activeSection === 'movies' ? `Movies in Neon: ${movies.length}` : `Series in Supabase: ${series.length}`}
              </span>
            </h3>

            {loading ? (
              <div className="flex flex-col items-center justify-center py-20 text-white/40">
                <div className="w-8 h-8 border-4 border-t-indigo-500 border-white/10 rounded-full animate-spin mb-4" />
                <span className="text-xs">Fetching postgres tables...</span>
              </div>
            ) : (
              <div className="space-y-4 max-h-[600px] overflow-y-auto pr-2">
                {activeSection === 'movies' ? (
                  movies.length === 0 ? (
                    <div className="text-center py-20 text-white/30 text-xs">No movies found in Neon database.</div>
                  ) : (
                    movies.map((movie) => (
                      <div key={movie.id} className="bg-white/5 border border-white/5 rounded-xl p-3 flex items-center justify-between gap-4">
                        <div className="flex items-center gap-3 min-w-0">
                          <img
                            src={movie.poster_path || 'https://via.placeholder.com/300x450'}
                            alt={movie.title}
                            className="w-10 h-14 object-cover rounded-lg shrink-0 bg-white/10"
                            referrerPolicy="no-referrer"
                          />
                          <div className="min-w-0">
                            <h4 className="text-xs font-bold text-white truncate">{movie.title}</h4>
                            <p className="text-[10px] text-white/40 mt-0.5 truncate">{movie.overview}</p>
                            <div className="flex items-center gap-2 mt-1">
                              <span className="text-[9px] bg-indigo-600/20 text-indigo-400 font-bold px-1.5 py-0.5 rounded">Neon</span>
                              <span className="text-[9px] text-white/55">⭐ {parseFloat(String(movie.vote_average)).toFixed(1)}</span>
                              <span className="text-[9px] text-white/30">{movie.release_date?.split('T')[0] || 'Unknown'}</span>
                            </div>
                          </div>
                        </div>

                        <button
                          onClick={() => handleDeleteMovie(movie.id)}
                          className="p-2 text-white/40 hover:text-red-500 hover:bg-white/5 rounded-lg transition-all shrink-0"
                          title="Delete movie from Neon"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    ))
                  )
                ) : (
                  series.length === 0 ? (
                    <div className="text-center py-20 text-white/30 text-xs">No series found in Supabase database.</div>
                  ) : (
                    series.map((item) => (
                      <div key={item.id} className="bg-white/5 border border-white/5 rounded-xl p-3 flex items-center justify-between gap-4">
                        <div className="flex items-center gap-3 min-w-0">
                          <img
                            src={item.image || 'https://via.placeholder.com/300x450'}
                            alt={item.title}
                            className="w-10 h-14 object-cover rounded-lg shrink-0 bg-white/10"
                            referrerPolicy="no-referrer"
                          />
                          <div className="min-w-0">
                            <h4 className="text-xs font-bold text-white truncate">{item.title}</h4>
                            <p className="text-[10px] text-white/40 mt-0.5 truncate">{item.description}</p>
                            <div className="flex items-center gap-2 mt-1">
                              <span className="text-[9px] bg-purple-600/20 text-purple-400 font-bold px-1.5 py-0.5 rounded">Supabase</span>
                              <span className="text-[9px] text-white/55">⭐ {parseFloat(String(item.rating)).toFixed(1)}</span>
                              <span className="text-[9px] text-white/30">{item.year || 'Unknown'}</span>
                            </div>
                          </div>
                        </div>

                        <button
                          onClick={() => handleDeleteSeries(item.id)}
                          className="p-2 text-white/40 hover:text-red-500 hover:bg-white/5 rounded-lg transition-all shrink-0"
                          title="Delete series from Supabase"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    ))
                  )
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
