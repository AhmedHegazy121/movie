import { useEffect, useState, useRef } from "react";
import { useDebounce } from "react-use";
import Search from "./component/Search";
import Spinner from "./component/Spinner";
import MovieCard from "./component/MovieCard";
import { getTrendingMovies, updateSearchCount } from "./appwrite";

const API_BASE_URL = "https://api.themoviedb.org/3";

function App() {
  const [searchTerm, setSearchTerm] = useState("");
  const [error, setError] = useState("");
  const [movieList, setMovieList] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState("");

  // New independent states for Trending Movies
  const [trendingMovies, setTrendingMovies] = useState([]);
  const [isTrendingLoading, setIsTrendingLoading] = useState(false);
  const [trendingError, setTrendingError] = useState("");

  // Reference for the custom slider track
  const sliderRef = useRef(null);

  useDebounce(() => setDebouncedSearchTerm(searchTerm), 500, [searchTerm]);

  const fetchMovies = async (query = "") => {
    try {
      const API_KEY = import.meta.env.VITE_TMDB_API_KEY;

      const API_OPTIONS = {
        method: "GET",
        headers: {
          accept: "application/json",
          Authorization: `Bearer ${API_KEY}`,
        },
      };

      setIsLoading(true);
      setError("");

      const endpoint = query
        ? `${API_BASE_URL}/search/movie?query=${encodeURIComponent(query)}`
        : `${API_BASE_URL}/discover/movie?sort_by=popularity.desc`;

      const response = await fetch(endpoint, API_OPTIONS);

      if (!response.ok) {
        throw new Error(`Failed to fetch movies. Status: ${response.status}`);
      }

      const data = await response.json();
      if (data.Response === "False") {
        setError(
          data.Error || "Failed to fetch movies. Please try again later.",
        );
        setMovieList([]);
        return;
      }
      setMovieList(data.results);

      if (query && data.results.length > 0) {
        await updateSearchCount(query, data.results[0]);
      }
    } catch (error) {
      console.error("Error fetching movies:", error);
      setError("Failed to fetch movies. Please try again later.");
    } finally {
      setIsLoading(false);
    }
  };

  const loadTrendingMovies = async () => {
    try {
      setIsTrendingLoading(true);
      setTrendingError(""); // Clear old errors
      const trending = await getTrendingMovies();
      setTrendingMovies(trending);
    } catch (error) {
      console.error("Error fetching trending movies:", error);
      setTrendingError("Could not load trending searches at this time.");
    } finally {
      setIsTrendingLoading(false);
    }
  };

  // Manual scrolling function
  const handleScroll = (direction) => {
    if (sliderRef.current) {
      const { scrollLeft } = sliderRef.current;
      const scrollAmount = 480;

      sliderRef.current.scrollTo({
        left:
          direction === "left"
            ? scrollLeft - scrollAmount
            : scrollLeft + scrollAmount,
        behavior: "smooth",
      });
    }
  };

  useEffect(() => {
    fetchMovies(debouncedSearchTerm);
  }, [debouncedSearchTerm]);

  useEffect(() => {
    loadTrendingMovies();
  }, []);

  return (
    <main>
      <div className="pattern">
        <div className="wrapper" />
        <header>
          <img src="./hero.png" alt="" />
          <h1 className=" ">
            Find <span className="text-gradient"> Movies</span> you'll Enjoy
            Without the Hassle
          </h1>
          <Search searchTerm={searchTerm} setSearchTerm={setSearchTerm} />
        </header>

        {/* Trending Section Conditional Wrapper */}
        {(isTrendingLoading || trendingError || trendingMovies.length > 0) && (
          <section className="trending flex flex-col items-center justify-center w-full px-4 mt-20">
            <div className="w-full max-w-6xl mx-auto">
              {/* Header with Title and Custom Theme Controls */}
              <div className="flex justify-between items-center mb-6 w-full">
                <h2 className="text-gradient">Trending Searches</h2>

                {/* Only render navigation controls if we actually have slides to scroll */}
                {trendingMovies.length > 0 &&
                  !isTrendingLoading &&
                  !trendingError && (
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleScroll("left")}
                        className="bg-[var(--color-dark-100)] hover:bg-[var(--color-primary)] border border-zinc-800 text-[var(--color-light-100)] hover:text-[var(--color-light-200)] font-bold p-2 rounded-full w-10 h-10 flex items-center justify-center transition-all cursor-pointer select-none active:scale-95"
                        aria-label="Scroll Left"
                      >
                        ←
                      </button>
                      <button
                        onClick={() => handleScroll("right")}
                        className="bg-[var(--color-dark-100)] hover:bg-[var(--color-primary)] border border-zinc-800 text-[var(--color-light-100)] hover:text-[var(--color-light-200)] font-bold p-2 rounded-full w-10 h-10 flex items-center justify-center transition-all cursor-pointer select-none active:scale-95"
                        aria-label="Scroll Right"
                      >
                        →
                      </button>
                    </div>
                  )}
              </div>

              {/* Conditional Rendering inside the Slide window Container */}
              {isTrendingLoading ? (
                <div className="flex justify-center py-6">
                  <Spinner />
                </div>
              ) : trendingError ? (
                <p className="text-red-500 bg-[var(--color-dark-100)] p-4 rounded-xl text-center border border-red-950/40">
                  {trendingError}
                </p>
              ) : (
                /* Scroll Track */
                <ul
                  ref={sliderRef}
                  className="flex flex-row overflow-x-auto gap-5 w-full scroll-smooth select-none snap-x snap-mandatory"
                  style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
                >
                  {trendingMovies.map((movie, index) => (
                    <li
                      key={movie.$id}
                      className="min-w-[230px] flex flex-row items-center snap-start"
                    >
                      <p className="fancy-text mt-[22px] text-nowrap">
                        {index + 1}
                      </p>
                      <img
                        src={movie.poster_url}
                        alt={movie.title}
                        className="w-[127px] h-[163px] rounded-lg object-cover -ml-3.5 pointer-events-none"
                      />
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </section>
        )}

        <section className="all-movies">
          <h2 className="text-gradient">All Movies</h2>

          {isLoading ? (
            <Spinner />
          ) : error ? (
            <p className="text-red-500">{error}</p>
          ) : (
            <ul>
              {movieList.map((movie) => (
                <MovieCard key={movie.id} movie={movie} />
              ))}
            </ul>
          )}
        </section>
      </div>
    </main>
  );
}

export default App;
