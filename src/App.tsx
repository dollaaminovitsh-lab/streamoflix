import React, { useState, useEffect } from 'react';
import { Film, Play, Star, Calendar, Clock, Tv, CheckCircle, AlertCircle, Search, Sparkles, X, ChevronRight, Eye } from 'lucide-react';
import { User, Movie, Series, Season, Episode } from './types';
import Header from './components/Header';
import AuthScreen from './components/AuthScreen';
import SubscribeScreen from './components/SubscribeScreen';
import AdminDashboard from './components/AdminDashboard';

export default function App() {
  // Authentication & session state
  const [user, setUser] = useState<User | null>(null);
  const [loadingSession, setLoadingLoadingSession] = useState(true);

  // Tab & Screen states: 'home' | 'movies' | 'series' | 'admin'
  const [activeTab, setActiveTab] = useState<string>('home');

  // Database lists fetched from back-end Express server
  const [movies, setMovies] = useState<Movie[]>([]);
  const [series, setSeries] = useState<Series[]>([]);
  const [randomFeatured, setRandomFeatured] = useState<Movie | Series | null>(null);
  const [loadingData, setLoadingData] = useState(false);

  // Search states
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<{ movies: Movie[]; series: Series[] }>({ movies: [], series: [] });
  const [isSearching, setIsSearching] = useState(false);

  // Filters for Movies Page
  const [movieFilters, setMovieFormFilters] = useState({
    genre: 'All',
    year: 'All',
    rating: 'All'
  });

  // Filters for Series Page
  const [seriesFilters, setSeriesFormFilters] = useState({
    genre: 'All',
    year: 'All',
    rating: 'All'
  });

  // Play detail view overlays
  const [selectedMovie, setSelectedMovie] = useState<Movie | null>(null);
  const [selectedSeries, setSelectedSeries] = useState<Series | null>(null);

  // Movie Player States
  const [activeMovieServerUrl, setActiveMovieServerUrl] = useState<string | null>(null);

  // Series Player States
  const [selectedSeasonNum, setSelectedSeasonNum] = useState<string>('1');
  const [selectedEpisodeNum, setSelectedEpisodeNum] = useState<string>('1');
  const [activeSeriesServerUrl, setActiveSeriesServerUrl] = useState<string | null>(null);

  // Stripe payments callback alerts
  const [stripeSuccessMsg, setStripeSuccessMsg] = useState('');

  // 1. URL Path Router to support /admin-password path
  useEffect(() => {
    const path = window.location.pathname;
    if (path === '/admin-password') {
      setActiveTab('admin');
    }

    // Handle payments callback
    const searchParams = new URLSearchParams(window.location.search);
    const sessionId = searchParams.get('session_id');
    if (sessionId) {
      handleStripeVerification(sessionId);
    }
  }, []);

  // Verification helper for Stripe success session
  const handleStripeVerification = async (sessionId: string) => {
    try {
      const response = await fetch('/api/checkout/verify', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ sessionId })
      });
      const data = await response.json();
      if (response.ok) {
        setStripeSuccessMsg('Congratulations! Your Monthly Premium Plan has been activated successfully. Start streaming immediately!');
        // Remove query parameters from address bar to clean the view
        window.history.replaceState({}, document.title, window.location.pathname);
        checkSession();
      }
    } catch (err) {
      console.error('Stripe verification failed:', err);
    }
  };

  // Validate user session on load
  const checkSession = async () => {
    try {
      const res = await fetch('/api/auth/me');
      const data = await res.json();
      if (data.user) {
        setUser(data.user);
      } else {
        setUser(null);
      }
    } catch (err) {
      setUser(null);
    } finally {
      setLoadingLoadingSession(false);
    }
  };

  useEffect(() => {
    checkSession();
  }, []);

  // Fetch movies and series once session is resolved
  const fetchLibrary = async () => {
    if (!user) return;
    setLoadingData(true);
    try {
      const resMovies = await fetch('/api/movies');
      const dataMovies = await resMovies.json();
      setMovies(dataMovies);

      const resSeries = await fetch('/api/series');
      const dataSeries = await resSeries.json();
      setSeries(dataSeries);

      // Select a random movie or series as hero featured content
      if (dataMovies.length > 0) {
        const randomIndex = Math.floor(Math.random() * dataMovies.length);
        setRandomFeatured(dataMovies[randomIndex]);
      }
    } catch (err) {
      console.error('Failed to retrieve content library:', err);
    } finally {
      setLoadingData(false);
    }
  };

  useEffect(() => {
    fetchLibrary();
  }, [user]);

  // Handle Search Input updates
  useEffect(() => {
    const handleSearch = async () => {
      if (!searchQuery.trim()) {
        setIsSearching(false);
        setSearchResults({ movies: [], series: [] });
        return;
      }

      setIsSearching(true);
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(searchQuery)}`);
        const data = await res.json();
        setSearchResults(data);
      } catch (err) {
        console.error('Search request failed:', err);
      }
    };

    const delayDebounce = setTimeout(handleSearch, 300);
    return () => clearTimeout(delayDebounce);
  }, [searchQuery]);

  // Sign out user
  const handleSignOut = async () => {
    try {
      await fetch('/api/auth/signout', { method: 'POST' });
      setUser(null);
      setMovies([]);
      setSeries([]);
      setRandomFeatured(null);
      setActiveTab('home');
    } catch (err) {
      console.error('Logout error:', err);
    }
  };

  // Movie Details display and player trigger
  const openMoviePlayer = (movie: Movie) => {
    setSelectedMovie(movie);
    // Auto-select first available server URL
    const serverKeys = Object.keys(movie.servers || {});
    if (serverKeys.length > 0) {
      setActiveMovieServerUrl(movie.servers[serverKeys[0]]);
    } else {
      setActiveMovieServerUrl(null);
    }
  };

  // Series Details display and player trigger
  const openSeriesPlayer = (item: Series) => {
    setSelectedSeries(item);
    
    // Choose first season
    const seasonsKeys = Object.keys(item.seasons || {});
    if (seasonsKeys.length > 0) {
      const firstSeasonKey = seasonsKeys[0];
      setSelectedSeasonNum(firstSeasonKey);

      // Choose first episode of first season
      const episodesKeys = Object.keys(item.seasons[firstSeasonKey].episodes || {});
      if (episodesKeys.length > 0) {
        const firstEpisodeKey = episodesKeys[0];
        setSelectedEpisodeNum(firstEpisodeKey);

        const episode = item.seasons[firstSeasonKey].episodes[firstEpisodeKey];
        const serverKeys = Object.keys(episode.servers || {});
        if (serverKeys.length > 0) {
          setActiveSeriesServerUrl(episode.servers[serverKeys[0]]);
        } else {
          setActiveSeriesServerUrl(null);
        }
      }
    }
  };

  // Update Series Episode play source
  const playEpisode = (seasonKey: string, episodeKey: string) => {
    if (!selectedSeries) return;
    setSelectedSeasonNum(seasonKey);
    setSelectedEpisodeNum(episodeKey);

    const episode = selectedSeries.seasons[seasonKey]?.episodes[episodeKey];
    if (episode) {
      const serverKeys = Object.keys(episode.servers || {});
      if (serverKeys.length > 0) {
        setActiveSeriesServerUrl(episode.servers[serverKeys[0]]);
      } else {
        setActiveSeriesServerUrl(null);
      }
    }
  };

  // Helper lists for page filters
  const movieGenres = ['All', ...Array.from(new Set(movies.flatMap(m => m.genres)))];
  const movieYears = ['All', ...Array.from(new Set(movies.map(m => m.release_date ? m.release_date.split('-')[0] : ''))).filter(Boolean).sort().reverse()];
  
  const seriesGenres = ['All', ...Array.from(new Set(series.flatMap(s => s.genres)))];
  const seriesYears = ['All', ...Array.from(new Set(series.map(s => s.year))).filter(Boolean).sort().reverse()];

  // Filtered lists
  const filteredMovies = movies.filter(movie => {
    const matchesGenre = movieFilters.genre === 'All' || movie.genres.includes(movieFilters.genre);
    const matchesYear = movieFilters.year === 'All' || (movie.release_date && movie.release_date.startsWith(movieFilters.year));
    const matchesRating = movieFilters.rating === 'All' || 
      (movieFilters.rating === '8+' && movie.vote_average >= 8) ||
      (movieFilters.rating === '7+' && movie.vote_average >= 7) ||
      (movieFilters.rating === '6+' && movie.vote_average >= 6);
    return matchesGenre && matchesYear && matchesRating;
  });

  const filteredSeries = series.filter(item => {
    const matchesGenre = seriesFilters.genre === 'All' || item.genres.includes(seriesFilters.genre);
    const matchesYear = seriesFilters.year === 'All' || item.year === seriesFilters.year;
    const matchesRating = seriesFilters.rating === 'All' || 
      (seriesFilters.rating === '8+' && parseFloat(String(item.rating)) >= 8) ||
      (seriesFilters.rating === '7+' && parseFloat(String(item.rating)) >= 7) ||
      (seriesFilters.rating === '6+' && parseFloat(String(item.rating)) >= 6);
    return matchesGenre && matchesYear && matchesRating;
  });

  // Calculate 6 static random genre lists
  const homeGenreGrids = [
    { title: 'Epic Action Blockbusters', genre: 'Action' },
    { title: 'Hilarious Comedies', genre: 'Comedy' },
    { title: 'Terrifying Horror & Thrillers', genre: 'Horror' },
    { title: 'Mind-Bending Sci-Fi', genre: 'Sci-Fi' },
    { title: 'Stunning Fantasy & Adventure', genre: 'Adventure' },
    { title: 'Heartfelt Romance', genre: 'Romance' }
  ].map(grid => {
    // Filter matching movies & series
    const matchingMovies = movies.filter(m => m.genres.includes(grid.genre));
    const matchingSeries = series.filter(s => s.genres.includes(grid.genre));
    const combined = [
      ...matchingMovies.map(m => ({ ...m, type: 'movie' })),
      ...matchingSeries.map(s => ({ ...s, type: 'series', poster_path: s.image, vote_average: parseFloat(String(s.rating)), release_date: s.year }))
    ];
    // Sort or randomize subset
    const randomizedSubset = combined.sort(() => 0.5 - Math.random()).slice(0, 4);
    return {
      title: grid.title,
      genre: grid.genre,
      items: randomizedSubset
    };
  });

  // Fetch status screen helper
  if (loadingSession) {
    return (
      <div className="min-h-screen bg-[#050505] flex flex-col items-center justify-center text-white/50">
        <div className="w-10 h-14 relative flex items-center justify-center mb-6">
          <div className="w-8 h-8 border-4 border-t-indigo-500 border-white/10 rounded-full animate-spin" />
        </div>
        <p className="text-xs font-medium tracking-wider uppercase">Loading StreamoFlix Engine...</p>
      </div>
    );
  }

  // Admin Gateway check
  if (activeTab === 'admin') {
    return (
      <AdminDashboard onBackToApp={() => {
        window.history.pushState({}, '', '/');
        setActiveTab('home');
      }} />
    );
  }

  // Not logged in gate
  if (!user) {
    return <AuthScreen onAuthSuccess={(authenticatedUser) => setUser(authenticatedUser)} />;
  }

  // Subscribed monthly premium plan check gate
  const isPremiumUser = user.is_premium;

  return (
    <div className="min-h-screen bg-[#050505] text-white flex flex-col selection:bg-indigo-600 selection:text-white">
      <Header
        user={user}
        onSignOut={handleSignOut}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
      />

      {/* Stripe Payment Success Notification Banner */}
      {stripeSuccessMsg && (
        <div className="bg-emerald-500 text-white font-semibold text-xs py-3 px-6 text-center relative flex items-center justify-center gap-2 animate-fade-in shadow-xl">
          <CheckCircle className="w-4 h-4 shrink-0" />
          <span>{stripeSuccessMsg}</span>
          <button onClick={() => setStripeSuccessMsg('')} className="absolute right-4 hover:opacity-80">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Main Content Dashboard */}
      <main className="flex-1 pb-16">
        
        {/* IF USER WANTS TO SEARCH: SHOW THEM ONLY SEARCH RESULTS */}
        {isSearching ? (
          <div className="max-w-7xl mx-auto px-4 lg:px-8 py-10">
            <div className="flex items-center justify-between border-b border-white/10 pb-4 mb-8">
              <div>
                <span className="text-xs font-bold text-indigo-500 tracking-widest uppercase">Search Results</span>
                <h2 className="text-2xl font-black text-white mt-1">Showing results for: "{searchQuery}"</h2>
              </div>
              <button
                onClick={() => setSearchQuery('')}
                className="text-xs bg-white/5 hover:bg-white/10 text-white border border-white/10 px-3 py-1.5 rounded-lg transition-colors cursor-pointer"
              >
                Clear Search
              </button>
            </div>

            {searchResults.movies.length === 0 && searchResults.series.length === 0 ? (
              <div className="text-center py-24 text-white/30">
                <Search className="w-12 h-12 mx-auto mb-4 text-white/15" />
                <p className="text-sm">No streaming content found matching "{searchQuery}". Try different keywords.</p>
              </div>
            ) : (
              <div className="space-y-12">
                {/* Movie results */}
                {searchResults.movies.length > 0 && (
                  <div>
                    <h3 className="text-sm font-bold text-white/50 tracking-wider uppercase mb-6 flex items-center gap-2">
                      <Film className="w-4 h-4 text-indigo-500" /> Movies ({searchResults.movies.length})
                    </h3>
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-6">
                      {searchResults.movies.map((movie) => (
                        <div 
                          key={movie.id} 
                          onClick={() => openMoviePlayer(movie)}
                          className="group bg-white/5 border border-white/10 hover:border-indigo-500/30 rounded-xl overflow-hidden cursor-pointer shadow-lg hover:shadow-indigo-500/5 hover:-translate-y-1 transition-all duration-300"
                        >
                          <div className="relative aspect-[2/3] overflow-hidden bg-white/10">
                            <img
                              src={movie.poster_path}
                              alt={movie.title}
                              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                              loading="lazy"
                              referrerPolicy="no-referrer"
                            />
                            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-3">
                              <span className="bg-indigo-600 text-white font-black text-[10px] px-2 py-1 rounded shadow-lg flex items-center gap-1">
                                <Play className="w-3 h-3 fill-white" /> PLAY NOW
                              </span>
                            </div>
                          </div>
                          <div className="p-3">
                            <h4 className="text-xs font-bold text-white truncate">{movie.title}</h4>
                            <div className="flex items-center justify-between text-[10px] text-white/40 mt-1">
                              <span>{movie.release_date?.split('-')[0]}</span>
                              <span className="flex items-center text-amber-400 font-bold">⭐ {parseFloat(String(movie.vote_average)).toFixed(1)}</span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Series results */}
                {searchResults.series.length > 0 && (
                  <div>
                    <h3 className="text-sm font-bold text-white/50 tracking-wider uppercase mb-6 flex items-center gap-2">
                      <Tv className="w-4 h-4 text-indigo-400" /> Series ({searchResults.series.length})
                    </h3>
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-6">
                      {searchResults.series.map((item) => (
                        <div 
                          key={item.id} 
                          onClick={() => openSeriesPlayer(item)}
                          className="group bg-white/5 border border-white/10 hover:border-indigo-500/30 rounded-xl overflow-hidden cursor-pointer shadow-lg hover:shadow-indigo-500/5 hover:-translate-y-1 transition-all duration-300"
                        >
                          <div className="relative aspect-[2/3] overflow-hidden bg-white/10">
                            <img
                              src={item.image}
                              alt={item.title}
                              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                              loading="lazy"
                              referrerPolicy="no-referrer"
                            />
                            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-3">
                              <span className="bg-indigo-600 text-white font-black text-[10px] px-2 py-1 rounded shadow-lg flex items-center gap-1">
                                <Play className="w-3 h-3 fill-white" /> VIEW EPISODES
                              </span>
                            </div>
                          </div>
                          <div className="p-3">
                            <h4 className="text-xs font-bold text-white truncate">{item.title}</h4>
                            <div className="flex items-center justify-between text-[10px] text-white/40 mt-1">
                              <span>{item.year}</span>
                              <span className="flex items-center text-amber-400 font-bold">⭐ {parseFloat(String(item.rating)).toFixed(1)}</span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        ) : (
          /* STANDARD TAB NAVIGATION DISPLAY */
          <>
            {/* 1. HOME TAB VIEW */}
            {activeTab === 'home' && (
              <div className="space-y-16">
                
                {/* HERO GRID / FEATURED BANNER */}
                {randomFeatured && (
                  <div className="relative h-[480px] lg:h-[620px] w-full overflow-hidden bg-[#050505] flex items-end">
                    {/* Dark gradient shadow overlays */}
                    <div className="absolute inset-0 z-10 bg-gradient-to-t from-[#050505] via-black/40 to-transparent" />
                    <div className="absolute inset-0 z-10 bg-gradient-to-r from-[#050505] via-black/20 to-transparent" />
                    
                    <img
                      src={randomFeatured.backdrop_path || (randomFeatured as any).image}
                      alt={randomFeatured.title}
                      className="absolute inset-0 w-full h-full object-cover scale-102 blur-[2px] opacity-25"
                      referrerPolicy="no-referrer"
                    />
                    <img
                      src={randomFeatured.backdrop_path || (randomFeatured as any).image}
                      alt={randomFeatured.title}
                      className="absolute inset-0 w-full h-full object-cover scale-100 opacity-75"
                      referrerPolicy="no-referrer"
                    />

                    {/* Featured Text Description overlay */}
                    <div className="relative z-20 max-w-4xl mx-auto px-4 lg:px-8 pb-12 lg:pb-24 w-full">
                      <div className="bg-indigo-600 text-white text-[10px] font-bold tracking-widest uppercase px-2 py-0.5 rounded w-max mb-3">
                        FEATURED STREAM
                      </div>
                      <h1 className="text-3xl sm:text-4xl md:text-6xl font-black tracking-tight text-white mb-4 drop-shadow-md">
                        {randomFeatured.title}
                      </h1>
                      <p className="text-xs sm:text-sm text-white/70 leading-relaxed mb-6 max-w-2xl drop-shadow">
                        {randomFeatured.overview || (randomFeatured as any).description}
                      </p>

                      <div className="flex flex-wrap items-center gap-4">
                        <button
                          onClick={() => {
                            if ('seasons' in randomFeatured) {
                              openSeriesPlayer(randomFeatured as Series);
                            } else {
                              openMoviePlayer(randomFeatured as Movie);
                            }
                          }}
                          className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold px-6 py-3 rounded-xl text-xs flex items-center gap-2 shadow-xl shadow-indigo-600/25 active:scale-95 transition-all cursor-pointer"
                        >
                          <Play className="w-4 h-4 fill-white" /> Start Streaming Now
                        </button>
                        
                        <div className="flex items-center gap-3 bg-white/5 border border-white/10 px-4 py-2 rounded-xl text-xs backdrop-blur-md">
                          <span className="text-indigo-400 font-bold">⭐ {parseFloat(String(randomFeatured.vote_average || (randomFeatured as any).rating)).toFixed(1)} Rating</span>
                          <span className="text-white/30">|</span>
                          <span className="text-white/60">{randomFeatured.release_date?.split('-')[0] || (randomFeatured as any).year}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* TRENDING TITLES LIST (Horizontal Scroll shelf) */}
                <div className="max-w-7xl mx-auto px-4 lg:px-8">
                  <div className="flex items-center justify-between border-b border-white/10 pb-3 mb-6">
                    <h2 className="text-lg font-black tracking-tight text-white uppercase flex items-center gap-2">
                      <Sparkles className="w-5 h-5 text-indigo-400 fill-indigo-400" /> Trending Titles
                    </h2>
                    <span className="text-[10px] font-semibold text-white/30 uppercase tracking-widest">Swipe for more</span>
                  </div>

                  {loadingData ? (
                    <div className="py-20 text-center text-white/20 text-xs">Loading shelf...</div>
                  ) : (
                    <div className="flex gap-6 overflow-x-auto pb-4 scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent">
                      {/* Combine movies and series */}
                      {[
                        ...movies.slice(0, 10).map(m => ({ ...m, type: 'movie' })),
                        ...series.slice(0, 5).map(s => ({ ...s, type: 'series', poster_path: s.image, vote_average: parseFloat(String(s.rating)), release_date: s.year }))
                      ].sort(() => 0.5 - Math.random()).map((item, index) => (
                        <div
                          key={`${item.type}-${item.id}-${index}`}
                          onClick={() => {
                            if (item.type === 'movie') {
                              openMoviePlayer(item as Movie);
                            } else {
                              openSeriesPlayer(item as any);
                            }
                          }}
                          className="w-36 md:w-44 shrink-0 group cursor-pointer"
                        >
                          <div className="relative aspect-[2/3] bg-white/5 border border-white/10 group-hover:border-indigo-500/30 rounded-xl overflow-hidden shadow-lg group-hover:shadow-indigo-500/5 group-hover:-translate-y-1 transition-all duration-300">
                            <img
                              src={item.poster_path}
                              alt={item.title}
                              className="w-full h-full object-cover group-hover:scale-102 transition-transform duration-300"
                              loading="lazy"
                              referrerPolicy="no-referrer"
                            />
                            <div className="absolute top-2 left-2 bg-black/70 backdrop-blur-md px-1.5 py-0.5 rounded text-[8px] font-bold text-white/80 border border-white/5">
                              {item.type === 'movie' ? 'MOVIE' : 'SERIES'}
                            </div>
                            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-3">
                              <span className="bg-indigo-600 text-white font-black text-[9px] px-2 py-0.5 rounded shadow-lg flex items-center gap-1">
                                <Play className="w-2.5 h-2.5 fill-white" /> PLAY
                              </span>
                            </div>
                          </div>
                          <div className="mt-2.5">
                            <h4 className="text-xs font-bold text-white truncate group-hover:text-indigo-400 transition-colors">{item.title}</h4>
                            <div className="flex items-center justify-between text-[10px] text-white/30 mt-0.5">
                              <span>{item.release_date?.split('-')[0]}</span>
                              <span className="flex items-center text-amber-400 font-bold">⭐ {parseFloat(String(item.vote_average)).toFixed(1)}</span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* 6 GRIDS FOR RANDOM SERIES OR MOVIE GENRE */}
                <div className="max-w-7xl mx-auto px-4 lg:px-8">
                  <div className="border-b border-white/5 pb-3 mb-8">
                    <h2 className="text-lg font-black tracking-tight text-white uppercase">Browse Genres</h2>
                    <p className="text-xs text-white/40 mt-0.5">Explore randomly generated category boards curated dynamically from Neon & Supabase databases.</p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                    {homeGenreGrids.map((grid, gridIndex) => (
                      <div key={gridIndex} className="bg-white/5 border border-white/10 rounded-2xl p-5 shadow-lg relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-24 h-24 bg-indigo-600/5 rounded-full blur-xl pointer-events-none" />
                        
                        <div className="flex items-center justify-between border-b border-white/10 pb-3 mb-4">
                          <h3 className="font-bold text-sm tracking-tight text-white">{grid.title}</h3>
                          <span className="text-[9px] bg-indigo-600/10 text-indigo-400 font-bold px-1.5 py-0.5 rounded">
                            {grid.genre}
                          </span>
                        </div>

                        {grid.items.length === 0 ? (
                          <div className="py-8 text-center text-xs text-white/20">No titles available in database yet.</div>
                        ) : (
                          <div className="grid grid-cols-2 gap-3">
                            {grid.items.map((item, itemIdx) => (
                              <div
                                key={itemIdx}
                                onClick={() => {
                                  if (item.type === 'movie') {
                                    openMoviePlayer(item as any);
                                  } else {
                                    openSeriesPlayer(item as any);
                                  }
                                }}
                                className="group/item cursor-pointer"
                              >
                                <div className="relative aspect-[4/3] rounded-lg overflow-hidden bg-white/5 border border-white/10 group-hover/item:border-indigo-500/20">
                                  <img
                                    src={item.poster_path}
                                    alt={item.title}
                                    className="w-full h-full object-cover group-hover/item:scale-105 transition-transform duration-300"
                                    loading="lazy"
                                    referrerPolicy="no-referrer"
                                  />
                                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent flex items-end p-2 opacity-90">
                                    <h4 className="text-[10px] font-bold text-white truncate w-full">{item.title}</h4>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

              </div>
            )}

            {/* 2. MOVIES TAB VIEW */}
            {activeTab === 'movies' && (
              <div className="max-w-7xl mx-auto px-4 lg:px-8 py-8">
                
                {/* Category Filters Banner */}
                <div className="bg-white/5 border border-white/10 rounded-2xl p-6 mb-8 flex flex-col md:flex-row items-start md:items-center justify-between gap-6 shadow-xl">
                  <div>
                    <span className="text-xs font-bold text-indigo-400 tracking-widest uppercase">PantyFlix Cinema</span>
                    <h2 className="text-2xl font-black text-white mt-1">Full Movies Archive</h2>
                    <p className="text-xs text-white/40 mt-1">Refine playback catalog across genres, years, and average rating scores from Neon database.</p>
                  </div>

                  {/* Dropdowns */}
                  <div className="flex flex-wrap items-center gap-4 w-full md:w-auto">
                    {/* Genre */}
                    <div className="flex flex-col gap-1 w-32">
                      <span className="text-[9px] font-bold text-white/40 uppercase">Genre</span>
                      <select
                        value={movieFilters.genre}
                        onChange={(e) => setMovieFormFilters({ ...movieFilters, genre: e.target.value })}
                        className="bg-white/5 border border-white/10 text-xs text-white px-3 py-1.5 rounded-lg focus:outline-none focus:border-indigo-500"
                      >
                        {movieGenres.map(g => <option key={g} value={g} className="bg-[#0c0c0e]">{g}</option>)}
                      </select>
                    </div>

                    {/* Year */}
                    <div className="flex flex-col gap-1 w-32">
                      <span className="text-[9px] font-bold text-white/40 uppercase">Release Year</span>
                      <select
                        value={movieFilters.year}
                        onChange={(e) => setMovieFormFilters({ ...movieFilters, year: e.target.value })}
                        className="bg-white/5 border border-white/10 text-xs text-white px-3 py-1.5 rounded-lg focus:outline-none focus:border-indigo-500"
                      >
                        {movieYears.map(y => <option key={y} value={y} className="bg-[#0c0c0e]">{y}</option>)}
                      </select>
                    </div>

                    {/* Rating */}
                    <div className="flex flex-col gap-1 w-32">
                      <span className="text-[9px] font-bold text-white/40 uppercase">Rating Score</span>
                      <select
                        value={movieFilters.rating}
                        onChange={(e) => setMovieFormFilters({ ...movieFilters, rating: e.target.value })}
                        className="bg-white/5 border border-white/10 text-xs text-white px-3 py-1.5 rounded-lg focus:outline-none focus:border-indigo-500"
                      >
                        <option value="All" className="bg-[#0c0c0e]">All Ratings</option>
                        <option value="8+" className="bg-[#0c0c0e]">⭐ 8.0+ Superb</option>
                        <option value="7+" className="bg-[#0c0c0e]">⭐ 7.0+ High</option>
                        <option value="6+" className="bg-[#0c0c0e]">⭐ 6.0+ Good</option>
                      </select>
                    </div>
                  </div>
                </div>

                {/* Movies Grid */}
                {loadingData ? (
                  <div className="py-24 text-center text-white/20 text-xs">Loading Neon catalog...</div>
                ) : filteredMovies.length === 0 ? (
                  <div className="text-center py-24 text-white/30 border border-dashed border-white/10 rounded-2xl">
                    <Film className="w-10 h-10 mx-auto mb-4 text-white/10" />
                    <p className="text-sm">No movies match the selected filters. Reset filters to see more.</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-6">
                    {filteredMovies.map((movie) => (
                      <div 
                        key={movie.id} 
                        onClick={() => openMoviePlayer(movie)}
                        className="group bg-white/5 border border-white/10 hover:border-indigo-500/30 rounded-xl overflow-hidden cursor-pointer shadow-lg hover:shadow-indigo-500/5 hover:-translate-y-1 transition-all duration-300"
                      >
                        <div className="relative aspect-[2/3] overflow-hidden bg-white/10">
                          <img
                            src={movie.poster_path}
                            alt={movie.title}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                            loading="lazy"
                            referrerPolicy="no-referrer"
                          />
                          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-3">
                            <span className="bg-indigo-600 text-white font-black text-[10px] px-2 py-1 rounded shadow-lg flex items-center gap-1">
                              <Play className="w-3 h-3 fill-white" /> PLAY NOW
                            </span>
                          </div>
                        </div>
                        <div className="p-3">
                          <h4 className="text-xs font-bold text-white truncate">{movie.title}</h4>
                          <div className="flex items-center justify-between text-[10px] text-white/40 mt-1">
                            <span>{movie.release_date?.split('-')[0]}</span>
                            <span className="flex items-center text-amber-400 font-bold">⭐ {parseFloat(String(movie.vote_average)).toFixed(1)}</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* 3. SERIES TAB VIEW */}
            {activeTab === 'series' && (
              <div className="max-w-7xl mx-auto px-4 lg:px-8 py-8">
                
                {/* Category Filters Banner */}
                <div className="bg-white/5 border border-white/10 rounded-2xl p-6 mb-8 flex flex-col md:flex-row items-start md:items-center justify-between gap-6 shadow-xl">
                  <div>
                    <span className="text-xs font-bold text-indigo-400 tracking-widest uppercase">PantyFlix Television</span>
                    <h2 className="text-2xl font-black text-white mt-1">Full TV Series Archive</h2>
                    <p className="text-xs text-white/40 mt-1">Refine playback catalog across genres, years, and average rating scores from Supabase database.</p>
                  </div>

                  {/* Dropdowns */}
                  <div className="flex flex-wrap items-center gap-4 w-full md:w-auto">
                    {/* Genre */}
                    <div className="flex flex-col gap-1 w-32">
                      <span className="text-[9px] font-bold text-white/40 uppercase">Genre</span>
                      <select
                        value={seriesFilters.genre}
                        onChange={(e) => setSeriesFormFilters({ ...seriesFilters, genre: e.target.value })}
                        className="bg-white/5 border border-white/10 text-xs text-white px-3 py-1.5 rounded-lg focus:outline-none focus:border-indigo-500"
                      >
                        {seriesGenres.map(g => <option key={g} value={g} className="bg-[#0c0c0e]">{g}</option>)}
                      </select>
                    </div>

                    {/* Year */}
                    <div className="flex flex-col gap-1 w-32">
                      <span className="text-[9px] font-bold text-white/40 uppercase">Release Year</span>
                      <select
                        value={seriesFilters.year}
                        onChange={(e) => setSeriesFormFilters({ ...seriesFilters, year: e.target.value })}
                        className="bg-white/5 border border-white/10 text-xs text-white px-3 py-1.5 rounded-lg focus:outline-none focus:border-indigo-500"
                      >
                        {seriesYears.map(y => <option key={y} value={y} className="bg-[#0c0c0e]">{y}</option>)}
                      </select>
                    </div>

                    {/* Rating */}
                    <div className="flex flex-col gap-1 w-32">
                      <span className="text-[9px] font-bold text-white/40 uppercase">Rating Score</span>
                      <select
                        value={seriesFilters.rating}
                        onChange={(e) => setSeriesFormFilters({ ...seriesFilters, rating: e.target.value })}
                        className="bg-white/5 border border-white/10 text-xs text-white px-3 py-1.5 rounded-lg focus:outline-none focus:border-indigo-500"
                      >
                        <option value="All" className="bg-[#0c0c0e]">All Ratings</option>
                        <option value="8+" className="bg-[#0c0c0e]">⭐ 8.0+ Superb</option>
                        <option value="7+" className="bg-[#0c0c0e]">⭐ 7.0+ High</option>
                        <option value="6+" className="bg-[#0c0c0e]">⭐ 6.0+ Good</option>
                      </select>
                    </div>
                  </div>
                </div>

                {/* Series Grid */}
                {loadingData ? (
                  <div className="py-24 text-center text-white/20 text-xs">Loading Supabase catalog...</div>
                ) : filteredSeries.length === 0 ? (
                  <div className="text-center py-24 text-white/30 border border-dashed border-white/10 rounded-2xl">
                    <Tv className="w-10 h-10 mx-auto mb-4 text-white/10" />
                    <p className="text-sm">No series match the selected filters. Reset filters to see more.</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-6">
                    {filteredSeries.map((item) => (
                      <div 
                        key={item.id} 
                        onClick={() => openSeriesPlayer(item)}
                        className="group bg-white/5 border border-white/10 hover:border-indigo-500/30 rounded-xl overflow-hidden cursor-pointer shadow-lg hover:shadow-indigo-500/5 hover:-translate-y-1 transition-all duration-300"
                      >
                        <div className="relative aspect-[2/3] overflow-hidden bg-white/10">
                          <img
                            src={item.image}
                            alt={item.title}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                            loading="lazy"
                            referrerPolicy="no-referrer"
                          />
                          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-3">
                            <span className="bg-indigo-600 text-white font-black text-[10px] px-2 py-1 rounded shadow-lg flex items-center gap-1">
                              <Play className="w-3 h-3 fill-white" /> VIEW EPISODES
                            </span>
                          </div>
                        </div>
                        <div className="p-3">
                          <h4 className="text-xs font-bold text-white truncate">{item.title}</h4>
                          <div className="flex items-center justify-between text-[10px] text-white/40 mt-1">
                            <span>{item.year}</span>
                            <span className="flex items-center text-amber-400 font-bold">⭐ {parseFloat(String(item.rating)).toFixed(1)}</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </main>

      {/* ==================== 1. DETAIL / STREAMING VIEW MODAL FOR MOVIES ==================== */}
      {selectedMovie && (
        <div className="fixed inset-0 z-50 bg-[#050505]/98 backdrop-blur-md overflow-y-auto flex items-center justify-center p-4">
          <div className="relative w-full max-w-5xl bg-[#0c0c0e] border border-white/10 rounded-2xl overflow-hidden shadow-2xl my-8">
            {/* Close button */}
            <button 
              onClick={() => setSelectedMovie(null)}
              className="absolute top-4 right-4 z-30 p-2 bg-black/60 hover:bg-black/90 text-white rounded-full transition-colors cursor-pointer border border-white/10"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Movie Backdrop banner */}
            <div className="relative h-64 sm:h-96 bg-black">
              <div className="absolute inset-0 bg-gradient-to-t from-[#0c0c0e] via-transparent to-transparent z-10" />
              <img
                src={selectedMovie.backdrop_path}
                alt={selectedMovie.title}
                className="w-full h-full object-cover opacity-60"
                referrerPolicy="no-referrer"
              />
              <div className="absolute bottom-6 left-6 lg:left-10 z-20 max-w-3xl">
                <div className="flex flex-wrap items-center gap-2 mb-2">
                  {selectedMovie.genres.map(g => (
                    <span key={g} className="bg-white/10 backdrop-blur-md text-white text-[9px] font-bold px-2 py-0.5 rounded">
                      {g}
                    </span>
                  ))}
                </div>
                <h2 className="text-2xl sm:text-4xl font-black text-white">{selectedMovie.title}</h2>
                <div className="flex items-center gap-4 text-xs text-white/50 mt-2">
                  <span className="flex items-center text-indigo-400 font-bold">⭐ {parseFloat(String(selectedMovie.vote_average)).toFixed(1)} TMDB Rating</span>
                  <span>|</span>
                  <span>{selectedMovie.release_date?.split('T')[0]}</span>
                </div>
              </div>
            </div>

            {/* Content & Play Section */}
            <div className="p-6 lg:p-10 grid grid-cols-1 lg:grid-cols-12 gap-8">
              
              {/* Left Column - Play Video frame OR Subscription lock gate */}
              <div className="lg:col-span-8 space-y-6">
                {!isPremiumUser ? (
                  // Paywall Block
                  <div className="bg-[#0c0c0e] border border-indigo-400/20 rounded-xl p-8 text-center flex flex-col items-center justify-center min-h-[300px] shadow-lg shadow-black/60">
                    <Sparkles className="w-10 h-10 text-indigo-400 fill-indigo-400 animate-pulse mb-3" />
                    <h3 className="font-bold text-lg text-white">Monthly Subscription Required</h3>
                    <p className="text-xs text-white/50 mt-1 max-w-md">
                      PantyFlix is an ad-free premium streaming system. Watch full high-definition movies & series by joining our Monthly subscription plan.
                    </p>
                    <button
                      onClick={() => {
                        setSelectedMovie(null);
                        setActiveTab('home');
                        // Quick scroll or focus on subscribe
                        const subscribeSection = document.getElementById('subscribe-panel');
                        if (subscribeSection) subscribeSection.scrollIntoView({ behavior: 'smooth' });
                      }}
                      className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold px-6 py-2.5 rounded-xl text-xs mt-6 transition-all"
                    >
                      View Subscription Options
                    </button>
                  </div>
                ) : (
                  // Real Premium Iframe Video Player
                  <div className="space-y-4">
                    <div className="relative aspect-video w-full bg-black rounded-xl overflow-hidden shadow-2xl border border-white/10">
                      {activeMovieServerUrl ? (
                        <iframe
                          src={activeMovieServerUrl}
                          className="w-full h-full"
                          allowFullScreen
                          referrerPolicy="no-referrer"
                        />
                      ) : (
                        <div className="absolute inset-0 flex flex-col items-center justify-center text-white/30 text-xs">
                          <AlertCircle className="w-8 h-8 mb-2" />
                          <span>No video streams configured for this item.</span>
                        </div>
                      )}
                    </div>

                    {/* Server Names simplified to server1, server2, server3 etc */}
                    <div className="space-y-2">
                      <span className="text-[10px] font-bold text-white/40 uppercase tracking-widest">Select streaming server source:</span>
                      <div className="flex flex-wrap gap-2">
                        {Object.entries(selectedMovie.servers || {}).map(([key, value], idx) => (
                          <button
                            key={key}
                            onClick={() => setActiveMovieServerUrl(value)}
                            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all border ${
                              activeMovieServerUrl === value
                                ? 'bg-indigo-600 border-indigo-500 text-white shadow-lg shadow-indigo-600/20'
                                : 'bg-white/5 border-white/10 hover:bg-white/10 text-white/70 hover:text-white'
                            }`}
                          >
                            Server {idx + 1} <span className="text-[9px] opacity-40">({key.split('_')[0]})</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Right Column - Movie Info */}
              <div className="lg:col-span-4 space-y-6">
                <div className="bg-white/5 rounded-xl p-5 border border-white/5">
                  <h4 className="text-[10px] font-bold text-white/40 uppercase tracking-widest mb-2">Movie Summary</h4>
                  <p className="text-xs leading-relaxed text-white/80">{selectedMovie.overview || 'No overview available for this title.'}</p>
                </div>

                <div className="bg-white/5 rounded-xl p-5 border border-white/5 space-y-3 text-xs">
                  <div>
                    <span className="text-white/40">Genres:</span> <span className="text-white/80 font-medium">{selectedMovie.genres.join(', ')}</span>
                  </div>
                  <div>
                    <span className="text-white/40">Release Date:</span> <span className="text-white/80 font-medium">{selectedMovie.release_date?.split('T')[0]}</span>
                  </div>
                  <div>
                    <span className="text-white/40">TMDB Identifier:</span> <span className="text-white/80 font-medium">{selectedMovie.tmdb_id}</span>
                  </div>
                </div>
              </div>

            </div>
          </div>
        </div>
      )}


      {/* ==================== 2. DETAIL / STREAMING VIEW MODAL FOR SERIES ==================== */}
      {selectedSeries && (
        <div className="fixed inset-0 z-50 bg-[#050505]/98 backdrop-blur-md overflow-y-auto flex items-center justify-center p-4">
          <div className="relative w-full max-w-5xl bg-[#0c0c0e] border border-white/10 rounded-2xl overflow-hidden shadow-2xl my-8">
            {/* Close button */}
            <button 
              onClick={() => setSelectedSeries(null)}
              className="absolute top-4 right-4 z-30 p-2 bg-black/60 hover:bg-black/90 text-white rounded-full transition-colors cursor-pointer border border-white/10"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Series Backdrop Banner */}
            <div className="relative h-64 sm:h-96 bg-black">
              <div className="absolute inset-0 bg-gradient-to-t from-[#0c0c0e] via-transparent to-transparent z-10" />
              <img
                src={selectedSeries.image}
                alt={selectedSeries.title}
                className="w-full h-full object-cover opacity-60"
                referrerPolicy="no-referrer"
              />
              <div className="absolute bottom-6 left-6 lg:left-10 z-20 max-w-3xl">
                <div className="flex flex-wrap items-center gap-2 mb-2">
                  {selectedSeries.genres.map(g => (
                    <span key={g} className="bg-white/10 backdrop-blur-md text-white text-[9px] font-bold px-2 py-0.5 rounded">
                      {g}
                    </span>
                  ))}
                </div>
                <h2 className="text-2xl sm:text-4xl font-black text-white">{selectedSeries.title}</h2>
                <div className="flex items-center gap-4 text-xs text-white/50 mt-2">
                  <span className="flex items-center text-indigo-400 font-bold">⭐ {parseFloat(String(selectedSeries.rating)).toFixed(1)} Rating</span>
                  <span>|</span>
                  <span>{selectedSeries.year} Series</span>
                </div>
              </div>
            </div>

            {/* Content, Seasons, and Episode Servers Selection Section */}
            <div className="p-6 lg:p-10 grid grid-cols-1 lg:grid-cols-12 gap-8">
              
              {/* Left Column: Iframe Player Box or Premium Restriction overlay */}
              <div className="lg:col-span-8 space-y-6">
                {!isPremiumUser ? (
                  // Premium overlay paywall
                  <div className="bg-[#0c0c0e] border border-indigo-400/20 rounded-xl p-8 text-center flex flex-col items-center justify-center min-h-[320px]">
                    <Sparkles className="w-10 h-10 text-indigo-400 fill-indigo-400 animate-pulse mb-3" />
                    <h3 className="font-bold text-lg text-white">Monthly Subscription Required</h3>
                    <p className="text-xs text-white/50 mt-1 max-w-md leading-relaxed">
                      To access this episode stream, please activate your Premium monthly account plan. Unlimited access with zero ads.
                    </p>
                    <button
                      onClick={() => {
                        setSelectedSeries(null);
                        setActiveTab('home');
                      }}
                      className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold px-6 py-2.5 rounded-xl text-xs mt-6 transition-all"
                    >
                      Subscribe via Stripe Now
                    </button>
                  </div>
                ) : (
                  // Active Episode Video Player frame
                  <div className="space-y-4">
                    <div className="relative aspect-video w-full bg-black rounded-xl overflow-hidden shadow-2xl border border-white/5">
                      {activeSeriesServerUrl ? (
                        <iframe
                          src={activeSeriesServerUrl}
                          className="w-full h-full"
                          allowFullScreen
                          referrerPolicy="no-referrer"
                        />
                      ) : (
                        <div className="absolute inset-0 flex flex-col items-center justify-center text-white/30 text-xs">
                          <AlertCircle className="w-8 h-8 mb-2" />
                          <span>No video streams configured for this episode yet.</span>
                        </div>
                      )}
                    </div>

                    {/* Servers listed dynamically as Server 1, Server 2 etc */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-bold text-white/40 uppercase tracking-widest">
                          Playing: Season {selectedSeasonNum}, Episode {selectedEpisodeNum} Servers:
                        </span>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {(() => {
                          const currentEpisode = selectedSeries.seasons[selectedSeasonNum]?.episodes[selectedEpisodeNum];
                          if (!currentEpisode || !currentEpisode.servers) return <span className="text-xs text-white/30">None configured</span>;
                          return Object.entries(currentEpisode.servers).map(([key, value], idx) => (
                            <button
                              key={key}
                              onClick={() => setActiveSeriesServerUrl(value)}
                              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all border ${
                                activeSeriesServerUrl === value
                                  ? 'bg-indigo-600 border-indigo-500 text-white shadow-lg shadow-indigo-600/20'
                                  : 'bg-white/5 border-white/10 hover:bg-white/10 text-white/70 hover:text-white'
                              }`}
                            >
                              Server {idx + 1} <span className="text-[9px] opacity-40">({key.split('_')[0]})</span>
                            </button>
                          ));
                        })()}
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Right Column: Episode selector list & Seasons dropdown */}
              <div className="lg:col-span-4 space-y-6">
                
                {/* Seasons Dropdown filter */}
                <div className="bg-white/5 rounded-xl p-4 border border-white/10">
                  <span className="text-[10px] font-bold text-white/40 uppercase tracking-widest">Select Season</span>
                  <select
                    value={selectedSeasonNum}
                    onChange={(e) => {
                      const seasonNum = e.target.value;
                      setSelectedSeasonNum(seasonNum);
                      // Auto-select first episode of new season
                      const episodes = selectedSeries.seasons[seasonNum]?.episodes || {};
                      const episodeKeys = Object.keys(episodes);
                      if (episodeKeys.length > 0) {
                        playEpisode(seasonNum, episodeKeys[0]);
                      }
                    }}
                    className="w-full bg-white/5 border border-white/10 text-xs text-white px-3 py-2 rounded-lg mt-1 focus:outline-none focus:border-indigo-500"
                  >
                    {Object.keys(selectedSeries.seasons || {}).map(seasonKey => (
                      <option key={seasonKey} value={seasonKey} className="bg-[#0c0c0e]">Season {seasonKey}</option>
                    ))}
                  </select>
                </div>

                {/* Episodes Scrolling selection list */}
                <div className="bg-white/5 rounded-xl p-4 border border-white/10 flex flex-col max-h-[300px]">
                  <span className="text-[10px] font-bold text-white/40 uppercase tracking-widest border-b border-white/10 pb-2 mb-2">Episodes List</span>
                  <div className="flex-1 overflow-y-auto space-y-1.5 pr-1 scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent">
                    {Object.entries(selectedSeries.seasons[selectedSeasonNum]?.episodes || {}).map(([episodeKey, ep]) => (
                      <button
                        key={episodeKey}
                        onClick={() => playEpisode(selectedSeasonNum, episodeKey)}
                        className={`w-full text-left px-3 py-2 rounded-lg text-xs transition-all flex items-center justify-between ${
                          selectedEpisodeNum === episodeKey
                            ? 'bg-indigo-600/10 border border-indigo-500/20 text-indigo-400 font-bold'
                            : 'bg-white/0 hover:bg-white/5 border border-transparent text-white/70 hover:text-white'
                        }`}
                      >
                        <span className="truncate">Episode {episodeKey}</span>
                        <Play className="w-3 h-3 shrink-0" />
                      </button>
                    ))}
                  </div>
                </div>

                {/* Series Synopsis box */}
                <div className="bg-white/5 rounded-xl p-4 border border-white/5">
                  <span className="text-[10px] font-bold text-white/40 uppercase tracking-widest mb-1 block">Series Plot</span>
                  <p className="text-[11px] leading-relaxed text-white/75">{selectedSeries.description || 'No description plot available.'}</p>
                </div>

              </div>

            </div>
          </div>
        </div>
      )}

      {/* Stripe Subscription Paywall panel on home if free plan */}
      {!isPremiumUser && activeTab === 'home' && (
        <div id="subscribe-panel" className="max-w-7xl mx-auto px-4 lg:px-8 mt-12 mb-16">
          <SubscribeScreen userEmail={user.email} />
        </div>
      )}
    </div>
  );
}
