import requests
import json
import time
import os
import sys
import re
from bs4 import BeautifulSoup
import argparse 

PANTY_DISCOVER_API = "https://pantyflix.com/api/tmdb/discover/movie"
PANTY_SEARCH_API = "https://pantyflix.com/api/tmdb/search/movie"
ONLYFLIX_BASE_URL = "https://onlyflix.to"

# Standard TMDB Genre Reference ID Map
TMDB_GENRE_MAP = {
    28: "Action", 12: "Adventure", 16: "Animation", 35: "Comedy", 
    80: "Crime", 99: "Documentary", 18: "Drama", 10751: "Family", 
    14: "Fantasy", 36: "History", 27: "Horror", 10402: "Music", 
    9648: "Mystery", 10749: "Romance", 878: "Sci-Fi", 
    10770: "TV Movie", 53: "Thriller", 10752: "War", 37: "Western"
}

headers = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,application/json,text/plain,*/*;q=0.8",
}

num = 1

AD_SERVER_PATTERNS = [
    r"\bads?\b",
    r"hindi",
    r"super",
    r"cinezo",
    r"cinesrc",
    r"nest",
    r"peach",
    r"mega",
    r"alpha",
    r"orion"
]
CLEAN_SERVER_PATTERNS = [
    "adfree",
    "xpass",
    "moviesapi",
    "vidfast",
    "vidapi",
    "cdnm",
    "2embed",
    "onlyflix",
    "vidsrc"
]


def is_clean_stream_server(name, url=""):
    normalized_name = (name or "").lower()
    normalized_url = (url or "").lower()

    if any(token in normalized_name for token in CLEAN_SERVER_PATTERNS):
        return True
    if any(token in normalized_url for token in CLEAN_SERVER_PATTERNS):
        return True
    if any(re.search(pattern, normalized_name) for pattern in AD_SERVER_PATTERNS):
        return False
    if any(re.search(pattern, normalized_url) for pattern in AD_SERVER_PATTERNS):
        return False

    return True


def filter_ads_servers(server_dict):
    if not server_dict:
        return {}
    return {
        name: url
        for name, url in server_dict.items()
        if is_clean_stream_server(name, url)
    }


def verify_and_filter_servers(server_dict):
    global num
    working_servers = {}
    if not server_dict:
        return working_servers

    cleaned_servers = filter_ads_servers(server_dict)
    if not cleaned_servers:
        return working_servers
        
    print(f"📡 [{num}] Verifying candidate stream links...")
    for name, url in cleaned_servers.items():
        try:
            res = requests.head(url, headers=headers, timeout=2.5, allow_redirects=True)
            if 200 <= res.status_code < 400:
                working_servers[name] = url
            else:
                res_get = requests.get(url, headers=headers, timeout=2.5, stream=True)
                if 200 <= res_get.status_code < 400:
                    working_servers[name] = url
        except Exception:
            continue
            
    num += 1
    return working_servers

def fetch_movie_imdb_id(movie_id):
    """
    Bulletproof Lookup: Resolves the official IMDb mapping directly 
    using the TMDB ID engine schema.
    """
    try:
        ext_url = f"https://pantyflix.com/api/tmdb/movie/{movie_id}/external_ids"
        res = requests.get(ext_url, headers=headers, timeout=4)
        if res.status_code == 200:
            data = res.json()
            imdb_id = data.get("imdb_id")
            if imdb_id:
                return imdb_id
    except Exception as e:
        print(f"  ⚠️ Direct TMDB external mapping failed for movie {movie_id}: {e}")
    return None

def process_movie_details(movie, all_movies, existing_ids):
    title = movie.get("title") or movie.get("name")
    movie_id = movie.get("id")
    
    if not movie_id or movie_id in existing_ids:
        return False
        
    print(f"\n🎬 Processing Movie: '{title}' (TMDB ID: {movie_id})")
    
    # Base core player configuration 
    candidate_servers = {
        "Vidgod_AdFree": f"https://api.zxcstream.xyz/player/movie/{movie_id}",
        "Bolt_Ads": f"https://vidsrc.to/embed/movie/{movie_id}",
        "Cinezo_Ads": f"https://vidsrc.xyz/embed/movie/{movie_id}",
        "Hindi_Ads": f"https://vidsrc.me/embed/movie/{movie_id}",
        "Super_Ads": f"https://embed.su/embed/movie/{movie_id}",
        "CineSrc_Ads": f"https://api.cinesrc.xyz/embed/movie/{movie_id}",
        "Nest_Ads": f"https://nest.vidsrc.pro/embed/movie/{movie_id}",
        "Peach_Ads": f"https://peach.vidsrc.pro/embed/movie/{movie_id}",
        "Mega_Ads": f"https://vidsrc.cc/v3/embed/movie/{movie_id}",
        "Alpha_Ads": f"https://alpha.vidsrc.pro/embed/movie/{movie_id}",
        "Orion_Ads": f"https://orion.vidsrc.pro/embed/movie/{movie_id}"
    }
    
    # Inject OnlyFlix target structures if an IMDb reference layout resolves successfully
    imdb_id = fetch_movie_imdb_id(movie_id)
    if imdb_id:
        print(f"  ✅ Found IMDb ID Mapping: {imdb_id}")
        candidate_servers.update({
            "OnlyFlix_VidApi": f"https://vidapi.xyz/embed/movie/{imdb_id}",
            "OnlyFlix_CdnMap": f"https://share.cdnm.ink/embed/imdb/{imdb_id}",
            "OnlyFlix_Vidsrc": f"https://vidsrc.me/embed/movie?imdb={imdb_id}",
            "OnlyFlix_SuperEmbed": f"https://multiembed.to/id.php?imdb={imdb_id}",
            "OnlyFlix_2Embed": f"https://www.2embed.cc/embed/{imdb_id}"
        })
    else:
        print(f"  ⚠️ Warning: No valid IMDb ID returned. Running with primary servers.")

    # Run EVERY single server through verification (No bypass list)
    verified_servers = verify_and_filter_servers(candidate_servers)
    
    if not verified_servers:
        print(f"  ❌ Skipping '{title}' - No operational/working servers found.")
        return False

    genre_ids = movie.get("genre_ids") or []
    string_genres = [TMDB_GENRE_MAP[g_id] for g_id in genre_ids if g_id in TMDB_GENRE_MAP]

    all_movies.append({
        "id": movie_id,
        "title": title,
        "original_title": movie.get("original_title"),
        "overview": movie.get("overview"),
        "description": movie.get("overview"), 
        "poster_path": f"https://image.tmdb.org/t/p/w500{movie.get('poster_path')}" if movie.get('poster_path') else None,
        "backdrop_path": f"https://image.tmdb.org/t/p/original{movie.get('backdrop_path')}" if movie.get('backdrop_path') else None,
        "release_date": movie.get("release_date"),
        "vote_average": movie.get("vote_average"),
        "genres": string_genres, 
        "watch_page_url": f"https://pantyflix.com/watch/play/movie/{movie_id}",
        "servers": verified_servers 
    })
    
    existing_ids.add(movie_id)
    return True

def load_existing_data(file_name="movies.json"):
    try:
        with open(file_name, "r", encoding="utf-8") as f:
            return json.load(f)
    except (FileNotFoundError, json.JSONDecodeError):
        return []

def scrape_by_pages(start_page, end_page, all_movies, existing_ids):
    params = {
        "sort_by": "popularity.desc",
        "include_adult": "false",
        "vote_count.gte": "80",
        "include_video": "false",
        "page": start_page  
    }
    
    current_page = start_page
    while current_page <= end_page:
        print(f"\n--- Fetching Movie Discovery Page {current_page} of {end_page} ---")
        params["page"] = current_page
        
        try:
            response = requests.get(PANTY_DISCOVER_API, params=params, headers=headers)
            if response.status_code != 200:
                break
                
            data = response.json()
            movies = data.get("results", [])
            if not movies:
                break
                
            for movie in movies:
                if movie.get("id") in existing_ids:
                    continue
                process_movie_details(movie, all_movies, existing_ids)
                time.sleep(1.0)
                    
            current_page += 1
            time.sleep(1.2)
        except Exception as e:
            print(f"An error occurred executing page range queries: {e}")
            break

def main():
    print("=========================================")
    print("      Combined Cross-Flix Scraper Engine ")
    print("=========================================")
    print("1. total number of movies")
    print("2. movie by name")
    print("3. start to end page")
    print("4. all pages")
    
    parser = argparse.ArgumentParser(description="Cross-Flix Dual Core Scraper Engine")
    parser.add_argument('--mode', type=str, choices=['1', '2', '3', '4'])
    parser.add_argument('--count', type=int)
    parser.add_argument('--query', type=str)
    parser.add_argument('--start', type=int)
    parser.add_argument('--end', type=int)
    
    args = parser.parse_args()
    choice = args.mode if args.mode else input("\nSelect option (1-4): ").strip()

    script_dir = os.path.dirname(os.path.abspath(__file__))
    file_name = os.path.join(script_dir, "movies.json")

    all_movies = load_existing_data(file_name)
    existing_ids = {movie.get("id") for movie in all_movies if movie.get("id")}

    if choice == "1":
        target_count = args.count if args.count else int(input("How many movies total? "))
        page_num = 1
        scraped_this_session = 0
        
        while scraped_this_session < target_count:
            try:
                response = requests.get(PANTY_DISCOVER_API, params={"sort_by": "popularity.desc", "page": page_num}, headers=headers)
                if response.status_code != 200: break
                movies = response.json().get("results", [])
                if not movies: break
                
                for movie in movies:
                    if scraped_this_session >= target_count: break
                    if movie.get("id") in existing_ids: continue
                    if process_movie_details(movie, all_movies, existing_ids):
                        scraped_this_session += 1
                page_num += 1
                time.sleep(1.0)
            except Exception:
                break

    elif choice == "2":
        search_query = args.query if args.query else input("Enter movie title: ").strip()
        if not search_query: return
        try:
            response = requests.get(PANTY_SEARCH_API, params={"query": search_query}, headers=headers)
            if response.status_code == 200:
                results = response.json().get("results", [])
                if not results: return
                selected_movie = results[0]
                all_movies = [m for m in all_movies if m.get("id") != selected_movie.get("id")]
                if selected_movie.get("id") in existing_ids:
                    existing_ids.remove(selected_movie.get("id"))
                process_movie_details(selected_movie, all_movies, existing_ids)
        except Exception as e:
            print(f"Failure processing layout: {e}")

    elif choice == "3":
        start = args.start if args.start else int(input("Starting Page: "))
        end = args.end if args.end else int(input("Ending Page: "))
        scrape_by_pages(start, end, all_movies, existing_ids)

    elif choice == "4":
        scrape_by_pages(1, 500, all_movies, existing_ids)

    if all_movies:
        with open(file_name, "w", encoding="utf-8") as f:
            json.dump(all_movies, f, indent=4, ensure_ascii=False)
        print(f"\n[SUCCESS] Script executed. File records count: {len(all_movies)}")

if __name__ == "__main__":
    main()