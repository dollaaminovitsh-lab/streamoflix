import requests
import json
import time
import os
import sys
import re
from bs4 import BeautifulSoup

PANTY_DISCOVER_API = "https://pantyflix.com/api/tmdb/discover/tv"
PANTY_SEARCH_API = "https://pantyflix.com/api/tmdb/search/tv"
ONLYFLIX_BASE_URL = "https://onlyflix.to"

# Standard TMDB Genre Reference ID Map for TV
TMDB_GENRE_MAP = {
    10759: "Action & Adventure", 16: "Animation", 35: "Comedy", 
    80: "Crime", 99: "Documentary", 18: "Drama", 10751: "Family", 
    10762: "Kids", 9648: "Mystery", 10763: "News", 10764: "Reality", 
    10765: "Sci-Fi & Fantasy", 10766: "Soap", 10767: "Talk", 
    10768: "War & Politics", 37: "Western"
}

headers = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
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


def verify_and_filter_servers(server_dict, title, s, e):
    
    working_servers = {}
    if not server_dict:
        return working_servers

    cleaned_servers = filter_ads_servers(server_dict)
    if not cleaned_servers:
        return working_servers
        
    print(f"  📡 Verifying stream links for {title} S{s}E{e}...")
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
    
    return working_servers

def fetch_imdb_id_from_tmdb(tv_id):
    """
    Bulletproof Method: Uses TMDB's direct external IDs proxy engine via PantyFlix 
    to get the official IMDb ID mapping directly.
    """
    try:
        ext_url = f"https://pantyflix.com/api/tmdb/tv/{tv_id}/external_ids"
        res = requests.get(ext_url, headers=headers, timeout=4)
        if res.status_code == 200:
            data = res.json()
            imdb_id = data.get("imdb_id")
            if imdb_id:
                return imdb_id
    except Exception as e:
        print(f"  ⚠️ Direct TMDB ID lookup mapping failed: {e}")
    return None

def process_series_details(show, all_series, existing_ids):
    global num
    title = show.get("name") or show.get("original_name")
    tv_id = show.get("id")
    
    if not tv_id or tv_id in existing_ids:
        return False
        
    # --- GENRE FILTERING SYSTEM ---
    genre_ids = show.get("genre_ids") or []
    if any(g_id in [10763, 10767, 10766, 10762] for g_id in genre_ids):
        print(f"⏭️ Skipping '{title}' due to excluded genre (News/Talk/Soap/kids).")
        return False
        
    print(f"\n🎬 [{num}] Processing Series: '{title}' (TMDB ID: {tv_id})")
    
    watch_url = f"https://pantyflix.com/watch/play/tv/{tv_id}"
    description = show.get("overview") or ""
    seasons_count = 1
    
    try:
        page_res = requests.get(watch_url, headers=headers, timeout=5)
        if page_res.status_code == 200:
            src = BeautifulSoup(page_res.content, 'lxml')
            table = src.find('div', {'class': 'watch-below-video mb-4 hidden md:block lg:mt-6 [.theatre-mode_&]:hidden'})
            if table:
                desc_el = table.find('p', {'class': 'mt-4 line-clamp-2 text-[15px] leading-[1.7] text-[var(--foreground-secondary)]'})
                if desc_el:
                    description = desc_el.text.strip()
                
                info_el = table.find('p', {'class': 'mt-3 text-sm text-[var(--foreground-secondary)]'})
                if info_el:
                    _, textS, _ = [x.strip() for x in info_el.text.split("·")]
                    seasons_count = int(''.join(filter(str.isdigit, textS)))
    except Exception as e:
        print(f"  ⚠️ Could not parse metadata details from page layout: {e}")

    # --- SEASON LIMIT FILTERING (Max 10 Seasons) ---
    if seasons_count > 10:
        print(f"⏭️ Skipping '{title}' because it has {seasons_count} seasons (exceeds the 10-season limit).")
        return False

    imdb_id = fetch_imdb_id_from_tmdb(tv_id)
    if imdb_id:
        print(f"  ✅ Found IMDb ID Mapping: {imdb_id}")
    else:
        print(f"  ⚠️ Warning: No valid IMDb ID found matching TMDB: {tv_id}. OnlyFlix will use fallback placeholders.")

    vote_average = show.get("vote_average")
    first_air_date = show.get("first_air_date")
    year = first_air_date.split("-")[0] if first_air_date else "N/A"
    genres = [TMDB_GENRE_MAP[g_id] for g_id in genre_ids if g_id in TMDB_GENRE_MAP]

    series_entry = {
        "id": int(tv_id),
        "title": title,
        "year": year,
        "description": description,
        "genres": genres,
        "rating": str(vote_average),
        "image": f"https://image.tmdb.org/t/p/w500{show.get('poster_path')}" if show.get('poster_path') else None,
        "seasons": {}
    }
    
    has_any_working_episodes = False

    for season in range(1, seasons_count + 1):
        print(f"  📂 Loading Season {season} metadata details...")
        season_episodes = {}
        
        season_url = f"{watch_url}?season={season}"
        try:
            season_res = requests.get(season_url, headers=headers, timeout=5)
            if season_res.status_code != 200: continue
            
            src3 = BeautifulSoup(season_res.content, 'lxml')
            ep_board = src3.find('div', {'class': 'space-y-2'})
            if not ep_board: continue
            
            episodes = ep_board.find_all('button', {'type': 'button'})
            
            for ep in range(1, len(episodes) + 1):
                try:
                    ep_title = episodes[ep-1].find('p', {'class': 'font-medium'}).text.strip()
                except:
                    ep_title = f"Episode {ep}"

                candidate_servers = {
                    "Vidgod_Ad_Free": f"https://api.zxcstream.xyz/player/tv/{tv_id}/{season}/{ep}",
                    "Cinezo_Ads": f"https://player.cinezo.live/embed/tv/{tv_id}/{season}/{ep}",
                    "Hindi_Ads": f"https://screenscape.me/embed?tmdb={tv_id}&type=tv&lan=hindi&s={season}&e={ep}",
                    "Super_Ads": f"https://vidsuper.net/tv/{tv_id}/{season}/{ep}",
                    "CineSrc_Ads": f"https://cinesrc.st/embed/tv/{tv_id}?s={season}&e={ep}",
                    "Nest_Ads": f"https://vidnest.fun/tv/{tv_id}/{season}/{ep}",
                    "Peach_Ads": f"https://peachify.top/embed/tv/{tv_id}/{season}/{ep}?accent=00A8E1",
                    "Mega_Ads": f"https://vidlink.pro/tv/{tv_id}/{season}/{ep}",
                    "Alpha_Ads": f"https://vidfast.vc/tv/{tv_id}/{season}/{ep}",
                    "Orion_Ads": f"https://vidrock.ru/tv/{tv_id}/{season}/{ep}"
                }
                
                final_imdb = imdb_id if imdb_id else "tt11198330"
                
                candidate_servers.update({
                    "OnlyFlix_xpass": f"https://play.xpass.top/e/tv/{final_imdb}/{season}/{ep}",
                    "OnlyFlix_moviesapi": f"https://moviesapi.to/tv/{final_imdb}-{season}-{ep}",
                    "OnlyFlix_vidfast": f"https://vidfast.vc/tv/{final_imdb}/{season}/{ep}"
                })
                
                # Global execution: Force verification on every candidate stream link
                verified_servers = verify_and_filter_servers(candidate_servers, title, season, ep)
                
                if verified_servers:
                    season_episodes[str(ep)] = {
                        "title": ep_title,
                        "servers": verified_servers
                    }
                    has_any_working_episodes = True
                else:
                    print(f"  ❌ Skipping S{season}E{ep} - No online stream server pairs found.")

            if season_episodes:
                series_entry["seasons"][str(season)] = {"episodes": season_episodes}

        except Exception as e:
            print(f"  ⚠️ Error parsing episodes loop for season {season}: {e}")
    num += 1 
    if has_any_working_episodes:
        all_series.append(series_entry)
        existing_ids.add(tv_id)
        return True
    else:
        print(f"⚠️ Skipping Entire Series '{title}' - Total validation count yielded 0 working links.")
        return False
    
    

def scrape_by_pages(start_page, end_page, all_series, existing_ids):

    params = {
        "sort_by": "popularity.desc",
        "include_adult": "false",
        "vote_count.gte": "80",
        "include_null_first_air_dates": "false",
        "page": start_page  
    }
    current_page = start_page
    while current_page <= end_page:
        print(f"\n--- Discovering TV Series Page {current_page} of {end_page} ---")
        params["page"] = current_page
        try:
            res = requests.get(PANTY_DISCOVER_API, params=params, headers=headers, timeout=5)
            if res.status_code != 200: break
            data = res.json()
            shows = data.get("results", [])
            if not shows: break
            for show in shows:
                process_series_details(show, all_series, existing_ids)
                time.sleep(1.0)
            current_page += 1
        except Exception as e:
            print(f"⚠️ Page loop execution failure: {e}")
            break

def main():
    print("=========================================")
    print("      TV Series Multi-Page Engine        ")
    print("=========================================")
    print("1. Scrap by pages (start to end)")
    print("2. Scrap by total series number")
    print("3. Scrap by series name")
    print("4. Scrap all pages")
    
    choice = input("\nSelect execution mode (1-4): ").strip()
    script_dir = os.path.dirname(os.path.abspath(__file__))
    file_path = os.path.join(script_dir, "series_data.json")
    
    try:
        with open(file_path, "r", encoding="utf-8") as f:
            all_series = json.load(f)
    except:
        all_series = []
        
    existing_ids = {show.get("id") for show in all_series if show.get("id")}
    
    if choice == "1":
        start = int(input("Starting Page: "))
        end = int(input("Ending Page: "))
        scrape_by_pages(start, end, all_series, existing_ids)
    elif choice == "2":
        target_count = int(input("Total number of series items to extract: "))
        page_num = 1
        scraped_count = 0
        while scraped_count < target_count:
            params = {"sort_by": "popularity.desc", "include_adult": "false", "vote_count.gte": "80", "page": page_num}
            try:
                res = requests.get(PANTY_DISCOVER_API, params=params, headers=headers, timeout=5)
                if res.status_code != 200: break
                shows = res.json().get("results", [])
                if not shows: break
                for show in shows:
                    if scraped_count >= target_count: break
                    if show.get("id") in existing_ids: continue
                    if process_series_details(show, all_series, existing_ids):
                        scraped_count += 1
                page_num += 1
            except Exception:
                break
    elif choice == "3":
        query = input("Enter TV series name: ").strip()
        if not query: return
        try:
            res = requests.get(PANTY_SEARCH_API, params={"query": query}, headers=headers, timeout=5)
            if res.status_code == 200:
                results = res.json().get("results", [])
                if not results:
                    print("No matching series found.")
                    return
                selected = results[0]
                all_series = [s for s in all_series if s.get("id") != selected.get("id")]
                if selected.get("id") in existing_ids:
                    existing_ids.remove(selected.get("id"))
                process_series_details(selected, all_series, existing_ids)
        except Exception as e:
            print(f"Search selection process issue: {e}")
    elif choice == "4":
        scrape_by_pages(1, 500, all_series, existing_ids)
        
    if all_series:
        with open(file_path, "w", encoding="utf-8") as f:
            json.dump(all_series, f, indent=4, ensure_ascii=False)
        print(f"\n[SUCCESS] Completed script routine. Total entries in database: {len(all_series)}")

if __name__ == "__main__":
    main()