
import React, { useState, useEffect, useRef } from 'react';
import { Search, Loader2, Eye, ThumbsUp, Calendar, AlertCircle, ChevronRight, MapPin, X, Star, BarChart3, Users, Clock, Flame, Check, Swords } from 'lucide-react';
import { StrategySearchResult, MaaGroup, MaaOperator } from '../types';
import { OperatorAvatar } from './OperatorAvatar';
import { resolveToKoreanName } from '../utils/maaProcessor';

interface StrategySearchProps {
  onLoaded: (name: string, content: string, description?: string, author?: string, sourceId?: string) => void;
  ownedOperators: string[]; // List of owned operator names (Korean)
}

interface StageInfo {
  code: string; // e.g., GT-1 (mapped from cat_three)
  name: string; // e.g., 日正当中
  stageId?: string; // e.g., a001_01
  category?: string; // cat_one or cat_two for display
}

// Proxy Helper with improved unwrapping
const fetchViaProxy = async (targetUrl: string): Promise<any> => {
    const timestamp = new Date().getTime();
    const urlWithCacheBust = targetUrl.includes('?') 
        ? `${targetUrl}&_t=${timestamp}` 
        : `${targetUrl}?_t=${timestamp}`;

    const proxies = [
        // CorsProxy.io
        (url: string) => `https://corsproxy.io/?${encodeURIComponent(url)}`,
        // AllOrigins
        (url: string) => `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`,
        // ThingProxy
        (url: string) => `https://thingproxy.freeboard.io/fetch/${url}`
    ];

    let lastError;

    for (const proxyGen of proxies) {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 8000);

        try {
            const fetchUrl = proxyGen(urlWithCacheBust);
            const res = await fetch(fetchUrl, { signal: controller.signal });
            clearTimeout(timeoutId);

            if (!res.ok) {
                if (res.status === 404) throw new Error("Not Found");
                continue;
            }
            
            const text = await res.text();
            let json;
            try {
                json = JSON.parse(text);
            } catch {
                continue;
            }

            // Unwrap AllOrigins generic response if accidentally hit non-raw endpoint
            if (json.contents && json.status?.url) {
                try {
                    return JSON.parse(json.contents);
                } catch {
                    return json.contents;
                }
            }

            return json;
        } catch (e) {
            clearTimeout(timeoutId);
            console.warn(`Proxy failed for ${targetUrl}`, e);
            lastError = e;
        }
    }
    throw lastError || new Error("All proxies failed");
};

const findStrategyContent = (obj: any, depth = 0): any => {
    if (!obj || depth > 3) return null;
    if (typeof obj === 'string') {
        try {
            if (obj.trim().startsWith('{')) {
                return findStrategyContent(JSON.parse(obj), depth + 1);
            }
        } catch { /* ignore */ }
        return null;
    }
    if (typeof obj === 'object') {
        if (Array.isArray(obj.opers) || Array.isArray(obj.groups) || (obj.stage_name && typeof obj.stage_name === 'string')) {
            return obj;
        }
        if (obj.content) {
            const result = findStrategyContent(obj.content, depth + 1);
            if (result) return result;
        }
        if (obj.data) {
             const result = findStrategyContent(obj.data, depth + 1);
             if (result) return result;
        }
        if (obj.strategy) {
            const result = findStrategyContent(obj.strategy, depth + 1);
            if (result) return result;
        }
    }
    return null;
};

// Helper to determine rating text and color based on rating_level (0-10)
const getRatingInfo = (level?: number) => {
    if (level === undefined || level < 0) return { text: "평가 부족", color: "text-slate-500", stars: 0 };
    
    // Scale 10 down to 5 stars
    const stars = Math.round(level / 2);

    if (level >= 9.0) return { text: "압도적으로 긍정적인 평가", color: "text-yellow-400", stars };
    if (level >= 8.0) return { text: "매우 긍정적인 평가", color: "text-lime-400", stars };
    if (level >= 6.0) return { text: "긍정적인 평가", color: "text-green-400", stars };
    if (level >= 4.0) return { text: "복합적인 평가", color: "text-amber-400", stars };
    return { text: "부정적인 평가", color: "text-red-400", stars };
};

type SortMode = 'hot' | 'latest' | 'views';

export const StrategySearch: React.FC<StrategySearchProps> = ({ onLoaded, ownedOperators }) => {
  const [query, setQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<StrategySearchResult[]>([]);
  const [error, setError] = useState<string | null>(null);
  
  // Sorting & Filtering State
  const [sortMode, setSortMode] = useState<SortMode>(() => {
    const saved = localStorage.getItem('maa_pref_search_sort');
    return (saved === 'latest' || saved === 'views' || saved === 'hot') ? (saved as SortMode) : 'hot';
  });
  
  const [prioritizeOwned, setPrioritizeOwned] = useState(false);
  const [isHardModeOnly, setIsHardModeOnly] = useState(false);
  
  // Enable prioritizeOwned by default if user has owned operators
  useEffect(() => {
    if (ownedOperators.length > 0) {
        setPrioritizeOwned(true);
    }
  }, [ownedOperators.length]);

  // Persist Sort Mode
  useEffect(() => {
    localStorage.setItem('maa_pref_search_sort', sortMode);
  }, [sortMode]);

  // Autocomplete State
  const [stageList, setStageList] = useState<StageInfo[]>([]);
  const [suggestions, setSuggestions] = useState<StageInfo[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);

  // Fetch Stage List on Mount with Caching
  useEffect(() => {
    const CACHE_KEY = 'maa_stage_list_cache_v3'; 
    
    const loadStages = async () => {
        const cached = localStorage.getItem(CACHE_KEY);
        if (cached) {
            try {
                const parsed = JSON.parse(cached);
                if (Date.now() - parsed.timestamp < 24 * 60 * 60 * 1000) {
                    setStageList(parsed.data);
                    if (Date.now() - parsed.timestamp > 60 * 60 * 1000) {
                        fetchAndCacheStages(CACHE_KEY);
                    }
                    return;
                }
            } catch (e) {
                localStorage.removeItem(CACHE_KEY);
            }
        }
        fetchAndCacheStages(CACHE_KEY);
    };

    const fetchAndCacheStages = async (cacheKey: string) => {
        try {
            const res = await fetchViaProxy('https://prts.maa.plus/arknights/level');
            let rawList: any[] = [];
            if (res && Array.isArray(res.data)) {
                rawList = res.data;
            } else if (Array.isArray(res)) {
                rawList = res;
            }

            if (rawList.length > 0) {
                const uniqueMap = new Map<string, StageInfo>();
                rawList.forEach((s: any) => {
                    if (!s || !s.cat_three) return;
                    const info: StageInfo = {
                        code: s.cat_three,
                        name: s.name || '',
                        stageId: s.stage_id,
                        category: s.cat_two || s.cat_one
                    };
                    if (uniqueMap.has(info.code)) {
                        const existing = uniqueMap.get(info.code)!;
                        const existingHasHash = existing.stageId && existing.stageId.includes('#');
                        const newHasHash = info.stageId && info.stageId.includes('#');
                        if (existingHasHash && !newHasHash) uniqueMap.set(info.code, info);
                    } else {
                        uniqueMap.set(info.code, info);
                    }
                });
                const validStages = Array.from(uniqueMap.values());
                setStageList(validStages);
                localStorage.setItem(cacheKey, JSON.stringify({
                    timestamp: Date.now(),
                    data: validStages
                }));
            }
        } catch (e) {
            console.warn("Failed to load stage list", e);
        }
    };
    loadStages();
  }, []);

  // Handle Autocomplete Filtering
  useEffect(() => {
    if (!query || !query.trim() || !stageList.length) {
        setSuggestions([]);
        return;
    }
    const lowerQuery = query.toLowerCase().trim();
    const filtered = stageList
        .filter(s => {
            if (!s.code) return false;
            const codeMatch = s.code.toLowerCase().includes(lowerQuery);
            const nameMatch = s.name.toLowerCase().includes(lowerQuery);
            return codeMatch || nameMatch;
        })
        .slice(0, 20);
    setSuggestions(filtered);
  }, [query, stageList]);

  // Click outside to close suggestions
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
        if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
            setShowSuggestions(false);
        }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const loadStrategyById = async (id: number | string) => {
    setIsSearching(true);
    setError(null);
    try {
        const endpoints = [
            `https://prts.maa.plus/copilot/get/${id}`,
            `https://prts.maa.plus/copilot/${id}`,
            `https://prts.plus/api/copilot/${id}`,
        ];

        let rawData = null;
        for (const url of endpoints) {
            try {
                rawData = await fetchViaProxy(url);
                if (rawData) break;
            } catch (e) { /* ignore */ }
        }

        if (!rawData) throw new Error("전략 데이터를 찾을 수 없습니다.");
        const validContent = findStrategyContent(rawData);
        if (!validContent) throw new Error("전략 파일 내용을 파싱할 수 없습니다.");

        const finalContentStr = JSON.stringify(validContent, null, 2);
        const wrapper = rawData.data || rawData; 
        
        onLoaded(
            wrapper.title || validContent.doc?.title || validContent.title || `MAA_${id}`, 
            finalContentStr, 
            wrapper.description || wrapper.desc || validContent.doc?.details || '', 
            wrapper.author || wrapper.uploader || wrapper.nickname || validContent.doc?.author || 'Unknown',
            String(id) // Pass the Source ID here
        );

    } catch (e: any) {
        console.error(e);
        setError(e.message || "전략을 불러오는데 실패했습니다.");
    } finally {
        setIsSearching(false);
    }
  };

  /**
   * REVISED CALCULATION LOGIC:
   * 1. Total Requirements = (Number of Groups) + (Number of Standalone Operators)
   * 2. Group Requirement is met if ANY operator in the group is owned.
   * 3. Standalone Requirement is met if that specific operator is owned.
   */
  const calculateOwnedMatch = (result: StrategySearchResult) => {
     try {
         const ownedSet = new Set(ownedOperators);
         let filledSlots = 0;
         let totalSlots = 0;

         // 1. Check Groups (Each group is 1 requirement slot)
         if (result.groups && result.groups.length > 0) {
             result.groups.forEach(group => {
                 totalSlots++;
                 const groupOpers = group.opers || [];
                 // If user owns AT LEAST ONE operator in this group, the requirement is met.
                 const hasOwnedInGroup = groupOpers.some(op => {
                     if (!op) return false;
                     const name = typeof op === 'string' ? op : op.name;
                     if (!name) return false;
                     const krName = resolveToKoreanName(name);
                     return ownedSet.has(krName);
                 });
                 if (hasOwnedInGroup) filledSlots++;
             });
         }

         // 2. Check Standalone Operators
         if (result.raw_opers && result.raw_opers.length > 0) {
             result.raw_opers.forEach(op => {
                 totalSlots++;
                 const name = typeof op === 'string' ? op : op.name;
                 if (name) {
                     const krName = resolveToKoreanName(name);
                     if (ownedSet.has(krName)) filledSlots++;
                 }
             });
         }

         // Fallback: If no groups/raw_opers parsed (e.g. old data), use flat opers list but this is inaccurate
         if (totalSlots === 0 && result.opers && result.opers.length > 0) {
             return { count: 0, total: 0, percent: 100 }; // Cannot calculate accurately
         }

         if (totalSlots === 0) return { count: 0, total: 0, percent: 100 };

         return { count: filledSlots, total: totalSlots, percent: (filledSlots / totalSlots) * 100 };
     } catch (e) {
         console.warn("Match calc failed", e);
         return { count: 0, total: 0, percent: 0 };
     }
  };

  const handleSearch = async (overrideQuery?: string, overrideStageId?: string) => {
    const targetQuery = typeof overrideQuery === 'string' ? overrideQuery : query;
    if (!targetQuery || !targetQuery.trim()) return;

    setShowSuggestions(false);
    
    // Do NOT reset sortMode here. Keep the user's preference or the persisted state.
    // setSortMode('hot'); 
    
    const cleanQuery = targetQuery.trim().replace('maa://', '');
    const isCode = /^\d+$/.test(cleanQuery);

    if (isCode) {
        await loadStrategyById(cleanQuery);
        return;
    }

    let searchStageId = overrideStageId;
    if (!searchStageId) {
        const match = stageList.find(s => 
            s.code.toLowerCase() === cleanQuery.toLowerCase() || 
            s.name === cleanQuery
        );
        if (match && match.stageId) {
            searchStageId = match.stageId;
        }
    }

    setIsSearching(true);
    setError(null);
    setSearchResults([]);

    try {
        // Increased limit to 50 to ensure we find strategies even if they aren't in top 12
        let apiUrl = `https://prts.maa.plus/copilot/query?limit=50&page=1&orderBy=hot&desc=true`;
        if (searchStageId) {
             apiUrl += `&levelKeyword=${encodeURIComponent(searchStageId)}`;
        } else {
             apiUrl += `&document=${encodeURIComponent(cleanQuery)}`;
        }

        const res = await fetchViaProxy(apiUrl);
        let list: any[] = [];
        if (res?.data?.data && Array.isArray(res.data.data)) {
            list = res.data.data;
        } else if (res?.data && Array.isArray(res.data)) {
            list = res.data;
        } else if (Array.isArray(res)) {
            list = res;
        }

        if (list.length > 0) {
            const formattedResults: StrategySearchResult[] = list.map((item: any) => {
                // Use findStrategyContent to robustly extract content, even if it's nested or stringified strangely
                const parsedContent = findStrategyContent(item) || {};

                const stage = parsedContent.stage_name || parsedContent.stageName || item.stage_name || item.levelKeyword || 'Unknown Stage';
                let title = parsedContent.doc?.title || parsedContent.title || item.title || `MAA Strategy ${item.id}`;
                if (!title || title === 'Untitled Strategy') title = `${stage} Strategy`;

                // Extraction for Calculation
                const rawGroups: MaaGroup[] = Array.isArray(parsedContent.groups) ? parsedContent.groups : [];
                const rawOpers: MaaOperator[] = Array.isArray(parsedContent.opers) ? parsedContent.opers : [];

                // Extraction for UI Preview (Flatten ALL operators involved)
                const allOpNames = new Set<string>();
                
                // Add standalone
                rawOpers.forEach((op: any) => {
                    if (op) allOpNames.add(typeof op === 'string' ? op : op.name);
                });
                
                // Add from groups
                rawGroups.forEach((g: any) => {
                    if (Array.isArray(g.opers)) {
                        g.opers.forEach((op: any) => {
                            if (op) allOpNames.add(typeof op === 'string' ? op : op.name);
                        });
                    }
                });

                // Fallback to item.opers if parsing failed but API has data
                if (allOpNames.size === 0 && Array.isArray(item.opers)) {
                    item.opers.forEach((op: any) => { if(op && op.name) allOpNames.add(op.name) });
                }

                const flattenedOpers = Array.from(allOpNames).filter(Boolean).map(name => ({ name }));

                const difficulty = parsedContent.difficulty !== undefined ? Number(parsedContent.difficulty) : 0;
                const ratingLevel = item.rating_level !== undefined ? Number(item.rating_level) : undefined;

                return {
                    id: item.id || item.copilot_id,
                    title: title,
                    stage_name: stage,
                    author: item.uploader || item.author || item.nickname || 'Unknown',
                    description: parsedContent.doc?.details || item.description || item.desc || '',
                    views: Number(item.views || 0),
                    like: Number(item.like || 0),
                    upload_time: item.upload_time || new Date().toISOString(),
                    opers: flattenedOpers, // For UI Icons
                    groups: rawGroups, // For Calculation
                    raw_opers: rawOpers, // For Calculation
                    difficulty: difficulty,
                    rating_level: ratingLevel
                };
            });
            setSearchResults(formattedResults);
        } else {
            setError("검색 결과가 없습니다.");
        }
    } catch (e) {
        console.error("Search failed:", e);
        setError("검색 중 오류가 발생했습니다. (API 접속 실패)");
    } finally {
        setIsSearching(false);
    }
  };

  const displayResults = [...searchResults]
      .filter(result => !isHardModeOnly || (result.difficulty !== undefined && result.difficulty > 2))
      .sort((a, b) => {
          if (prioritizeOwned && ownedOperators.length > 0) {
              const infoA = calculateOwnedMatch(a);
              const infoB = calculateOwnedMatch(b);
              
              const missingA = infoA.total - infoA.count;
              const missingB = infoB.total - infoB.count;

              if (missingA !== missingB) {
                  return missingA - missingB; // Ascending order of missing ops (fewer is better)
              }
          }
          // Secondary sort
          switch (sortMode) {
              case 'latest': return new Date(b.upload_time).getTime() - new Date(a.upload_time).getTime();
              case 'views': return b.views - a.views;
              case 'hot': default: return b.views - a.views; // Fallback to views for hot
          }
      });

  return (
    <div className="w-full max-w-4xl mx-auto mt-6 px-4" ref={wrapperRef}>
      {/* Search Input Area */}
      <div className="relative group z-20">
        <div className="absolute inset-0 bg-cyan-500/20 blur-xl rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
        <div className="relative flex items-center bg-slate-900/80 border border-slate-700 hover:border-cyan-500/50 rounded-2xl shadow-2xl transition-all">
            <div className="pl-5 text-slate-500">
                <Search className="w-5 h-5" />
            </div>
            <input 
                type="text" 
                value={query}
                onChange={(e) => {
                    setQuery(e.target.value);
                    setShowSuggestions(true);
                }}
                onFocus={() => setShowSuggestions(true)}
                onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                        e.preventDefault();
                        handleSearch();
                    }
                }}
                placeholder="스테이지 이름 (예: GT-1) 또는 MAA 코드 입력"
                className="w-full bg-transparent border-none py-4 px-4 text-base text-slate-100 placeholder:text-slate-500 focus:ring-0"
            />
            
            {query && (
                <button onClick={() => { setQuery(''); setSuggestions([]); }} className="p-2 text-slate-500 hover:text-white mr-2">
                    <X className="w-4 h-4" />
                </button>
            )}

            <button 
                type="button"
                onClick={() => handleSearch()}
                disabled={isSearching || !query.trim()}
                className="mr-2 px-6 py-2 bg-slate-800 hover:bg-cyan-600 hover:text-white text-slate-300 rounded-xl text-sm font-bold transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
                {isSearching ? <Loader2 className="w-4 h-4 animate-spin" /> : <ChevronRight className="w-4 h-4" />}
                <span>검색</span>
            </button>
        </div>

        {/* Autocomplete Dropdown */}
        {showSuggestions && suggestions.length > 0 && (
            <div className="absolute top-full left-0 right-0 mt-2 bg-slate-900/95 backdrop-blur-md border border-slate-700 rounded-xl shadow-xl overflow-hidden animate-in fade-in slide-in-from-top-2 z-50">
                <div className="py-1">
                    {suggestions.map((stage, idx) => (
                        <button
                            key={`${stage.code}-${idx}`}
                            onClick={() => {
                                setQuery(stage.code);
                                setShowSuggestions(false);
                                handleSearch(stage.code, stage.stageId);
                            }}
                            className="w-full text-left px-5 py-2.5 hover:bg-slate-800 transition-colors flex items-center justify-between border-b border-slate-800/50 last:border-none group"
                        >
                            <div className="flex items-center gap-3 overflow-hidden">
                                <div className="w-7 h-7 rounded-lg bg-slate-800 flex items-center justify-center text-cyan-500 group-hover:bg-cyan-500/20 transition-all shrink-0">
                                    <MapPin className="w-3.5 h-3.5" />
                                </div>
                                <div className="flex items-baseline gap-2 overflow-hidden">
                                    <span className="font-bold text-slate-200 text-sm whitespace-nowrap">
                                        {stage.code}
                                    </span>
                                    <span className="text-slate-400 text-sm truncate">
                                        {stage.name}
                                    </span>
                                </div>
                            </div>
                        </button>
                    ))}
                </div>
            </div>
        )}
      </div>

      {/* Error Message */}
      {error && (
        <div className="mt-4 p-4 bg-red-950/30 border border-red-500/20 rounded-xl flex items-center gap-3 animate-in fade-in slide-in-from-top-2">
            <AlertCircle className="w-5 h-5 text-red-400" />
            <span className="text-sm text-red-200">{error}</span>
        </div>
      )}

      {/* Results Controls */}
      {searchResults.length > 0 && (
         <div className="flex flex-col sm:flex-row items-center justify-between mt-6 px-1 gap-4 animate-in fade-in">
             <div className="text-sm text-slate-500 font-bold">
                검색 결과 {searchResults.length}건
                {isHardModeOnly && <span className="ml-1 text-red-400">(Hard Mode)</span>}
             </div>
             
             <div className="flex items-center gap-4 w-full sm:w-auto overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
                 <div className="flex items-center gap-1.5 p-1 bg-slate-900 rounded-xl border border-slate-800">
                     <button 
                       onClick={() => setSortMode('hot')}
                       className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 whitespace-nowrap
                          ${sortMode === 'hot' ? 'bg-slate-800 text-white shadow-sm' : 'text-slate-500 hover:text-slate-300'}`}
                     >
                        <Flame className="w-3 h-3" /> 인기
                     </button>
                     <button 
                       onClick={() => setSortMode('latest')}
                       className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 whitespace-nowrap
                          ${sortMode === 'latest' ? 'bg-slate-800 text-white shadow-sm' : 'text-slate-500 hover:text-slate-300'}`}
                     >
                        <Clock className="w-3 h-3" /> 최신
                     </button>
                     <button 
                       onClick={() => setSortMode('views')}
                       className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 whitespace-nowrap
                          ${sortMode === 'views' ? 'bg-slate-800 text-white shadow-sm' : 'text-slate-500 hover:text-slate-300'}`}
                     >
                        <Eye className="w-3 h-3" /> 조회
                     </button>
                 </div>

                 <button 
                   onClick={() => setIsHardModeOnly(!isHardModeOnly)}
                   className={`flex items-center gap-1.5 px-3 py-2.5 rounded-xl text-xs font-bold transition-all border whitespace-nowrap shadow-sm
                      ${isHardModeOnly ? 'bg-red-950 text-red-400 border-red-900 shadow-red-900/20' : 'bg-slate-900 text-slate-500 border-slate-800 hover:bg-slate-800 hover:text-slate-300'}`}
                 >
                    <Swords className="w-3.5 h-3.5" /> 하드
                 </button>

                 {ownedOperators.length > 0 && (
                     <button 
                       onClick={() => setPrioritizeOwned(!prioritizeOwned)}
                       className={`flex items-center gap-1.5 px-3 py-2.5 rounded-xl text-xs font-bold transition-all border whitespace-nowrap shadow-sm
                          ${prioritizeOwned ? 'bg-green-500 text-white border-green-400 shadow-green-900/20' : 'bg-slate-900 text-slate-500 border-slate-800 hover:bg-slate-800 hover:text-slate-300'}`}
                     >
                        {prioritizeOwned ? <Check className="w-3.5 h-3.5" /> : <BarChart3 className="w-3.5 h-3.5" />}
                        보유율 우선
                     </button>
                 )}
             </div>
         </div>
      )}

      {/* Search Results Grid */}
      {displayResults.length > 0 && !isSearching && (
        <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4 animate-in fade-in slide-in-from-bottom-4">
            {displayResults.map((result) => {
                const isHard = result.difficulty !== undefined && result.difficulty > 2;
                const rating = getRatingInfo(result.rating_level);
                const match = calculateOwnedMatch(result);
                const isFullMatch = match.percent === 100;
                
                return (
                <div 
                    key={result.id}
                    onClick={() => loadStrategyById(result.id)}
                    className="group bg-slate-900/40 border border-slate-800 hover:border-cyan-500/30 hover:bg-slate-800/60 rounded-xl p-4 cursor-pointer transition-all hover:shadow-lg hover:-translate-y-0.5"
                >
                    <div className="flex justify-between items-start mb-2">
                        <div className="flex items-center gap-2 mb-1">
                             <span className="px-1.5 py-0.5 rounded text-[10px] font-black bg-cyan-950 text-cyan-400 border border-cyan-500/20">
                                {result.stage_name}
                             </span>
                             {isHard && (
                                <span className="px-1.5 py-0.5 rounded text-[10px] font-black bg-red-950 text-red-400 border border-red-500/20">
                                   HARD
                                </span>
                             )}
                        </div>
                        <div className="text-[10px] text-slate-500 flex items-center gap-3">
                            <span className="flex items-center gap-1"><Eye className="w-3 h-3" /> {result.views}</span>
                            <span className="flex items-center gap-1"><ThumbsUp className="w-3 h-3" /> {result.like}</span>
                        </div>
                    </div>

                    <h3 className="text-sm font-bold text-slate-200 mb-2 line-clamp-1 group-hover:text-cyan-400 transition-colors">
                        {result.title}
                    </h3>
                    
                    <div className="flex items-center gap-2 mb-2">
                        <Star className={`w-3 h-3 fill-current ${rating.stars >= 1 ? rating.color : 'text-slate-700'}`} />
                        <div className={`text-xs font-bold ${rating.color}`}>
                            {rating.text}
                        </div>
                    </div>
                    
                    {/* Owned Match UI */}
                    {ownedOperators.length > 0 && (
                        <div className="mb-3">
                           <div className="flex justify-between items-center text-[10px] mb-1">
                              <span className="text-slate-500 font-bold flex items-center gap-1">
                                 <Users className="w-3 h-3" />
                                 보유율 (필요 슬롯: {match.total})
                              </span>
                              <span className={`font-mono font-bold ${isFullMatch ? 'text-green-400' : 'text-slate-300'}`}>
                                 {match.count}/{match.total}
                              </span>
                           </div>
                           <div className="h-1.5 w-full bg-slate-800 rounded-full overflow-hidden">
                              <div 
                                className={`h-full rounded-full transition-all duration-500 ${isFullMatch ? 'bg-green-500' : (match.percent > 50 ? 'bg-amber-500' : 'bg-red-500')}`}
                                style={{ width: `${match.percent}%` }}
                              ></div>
                           </div>
                        </div>
                    )}

                    <div className="flex items-center gap-2 mb-3 text-xs text-slate-500 border-t border-slate-800/50 pt-2">
                        <span className="font-medium text-slate-400 truncate max-w-[80px]">{result.author}</span>
                        <span>•</span>
                        <span className="flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            {new Date(result.upload_time).toLocaleDateString()}
                        </span>
                    </div>

                    {result.opers && result.opers.length > 0 && (
                        <div className="flex items-center gap-1.5 mt-auto">
                            {result.opers.slice(0, 6).map((op, idx) => {
                                const opNameKr = resolveToKoreanName(op.name);
                                const isOwned = ownedOperators.length === 0 || ownedOperators.includes(opNameKr);
                                return (
                                <div key={idx} title={opNameKr} className={`relative ${!isOwned ? 'opacity-30 grayscale' : ''}`}>
                                    <OperatorAvatar name={op.name} size="sm" className="w-7 h-7" />
                                    {!isOwned && ownedOperators.length > 0 && (
                                        <div className="absolute inset-0 flex items-center justify-center">
                                            <X className="w-4 h-4 text-red-500 drop-shadow-md" />
                                        </div>
                                    )}
                                </div>
                            )})}
                            {result.opers.length > 6 && (
                                <div className="w-7 h-7 rounded-lg bg-slate-800 flex items-center justify-center text-[10px] text-slate-400 font-bold border border-slate-700">
                                    +{result.opers.length - 6}
                                </div>
                            )}
                        </div>
                    )}
                </div>
            )})}
        </div>
      )}
      
      {!query && !isSearching && (
         <div className="mt-4 text-center">
            <p className="text-xs text-slate-600">
               검색어 없이 검색 버튼을 누르면 인기 전략을 보여줍니다.
            </p>
         </div>
      )}
    </div>
  );
};
