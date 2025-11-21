import React, { useState, useEffect, useRef } from 'react';
import { FaSearch } from 'react-icons/fa';

const GoogleCSE = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [isInitialized, setIsInitialized] = useState(false);
  const [error, setError] = useState(null);
  const searchBoxRef = useRef(null);

  // Initialize Google CSE
  useEffect(() => {
    const initializeCSE = async () => {
      try {
        // Check if already initialized
        if (window.google && window.google.search && window.google.search.cse) {
          // Force re-initialization to ensure proper container binding
          const element = window.google.search.cse.element;
          if (element) {
            element.render({
              div: 'search-results-container',
              tag: 'searchresults-only',
              gname: 'searchresults-only'
            });
            setIsInitialized(true);
          }
          return;
        }

        // Check if script is already loaded but not initialized
        if (document.querySelector('script[src*="cse.google.com"]')) {
          // Wait for Google CSE to become available
          const checkInit = setInterval(() => {
            if (window.google && window.google.search && window.google.search.cse) {
              clearInterval(checkInit);
              window.google.search.cse.element.render({
                div: 'search-results-container',
                tag: 'searchresults-only',
                gname: 'searchresults-only'
              });
              setIsInitialized(true);
            }
          }, 100);
          
          // Timeout after 5 seconds
          setTimeout(() => {
            clearInterval(checkInit);
            if (!isInitialized) {
              setError('Search initialization timed out. Please refresh the page.');
            }
          }, 5000);
          return;
        }

        // Load the Google CSE script
        const script = document.createElement('script');
        script.src = 'https://cse.google.com/cse.js?cx=c77402227d2094dce';
        script.async = true;
        script.id = 'google-cse-script';

        script.onload = () => {
          // Wait for Google CSE to initialize
          const checkInit = setInterval(() => {
            if (window.google && window.google.search && window.google.search.cse) {
              clearInterval(checkInit);
              window.google.search.cse.element.render({
                div: 'search-results-container',
                tag: 'searchresults-only',
                gname: 'searchresults-only'
              });
              setIsInitialized(true);
            }
          }, 100);
          
          // Timeout after 5 seconds
          setTimeout(() => {
            clearInterval(checkInit);
            if (!isInitialized) {
              setError('Search initialization timed out. Please refresh the page.');
            }
          }, 5000);
        };

        script.onerror = () => {
          setError('Failed to load search functionality. Please try again later.');
        };

        document.body.appendChild(script);
      } catch (err) {
        console.error('Error initializing Google CSE:', err);
        setError('Failed to initialize search. Please refresh the page.');
      }
    };

    initializeCSE();

    return () => {
      const script = document.getElementById('google-cse-script');
      if (script && document.body.contains(script)) {
        document.body.removeChild(script);
      }
    };
  }, []);

  const handleSearch = (e) => {
    e.preventDefault();
    if (!searchQuery.trim() || !isInitialized) return;

    try {
      const element = window.google.search.cse.element.getElement('searchresults-only');
      if (element) {
        element.execute(searchQuery);
      }
    } catch (err) {
      console.error('Search error:', err);
      setError('Error performing search.');
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      handleSearch(e);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Interview Question Bank</h1>
          <p className="mt-1 text-gray-600">
            Search through thousands of interview questions from top companies
          </p>
        </div>

        {/* Search Bar */}
        <div className="mb-8">
          <form onSubmit={handleSearch} className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <FaSearch className="h-5 w-5 text-gray-400" />
            </div>
            <input
              type="text"
              ref={searchBoxRef}
              className="block w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg bg-white shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="Search interview questions (e.g., 'Amazon SDE', 'System Design', 'React')"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={handleKeyDown}
              disabled={!isInitialized}
            />
            <button
              type="submit"
              className="absolute inset-y-0 right-0 px-4 flex items-center text-gray-400 hover:text-gray-600"
              disabled={!isInitialized || !searchQuery.trim()}
            >
              Search
            </button>
          </form>
          {!isInitialized && !error && (
            <p className="mt-2 text-sm text-yellow-600">Initializing search...</p>
          )}
          {error && (
            <p className="mt-2 text-sm text-red-600">{error}</p>
          )}
        </div>

        {/* Results Container */}
        <div className="mt-6">
          <div 
            id="search-results-container"
            className="bg-white rounded-lg shadow-sm p-6 min-h-[400px] overflow-hidden"
          >
            {!searchQuery ? (
              <div className="flex flex-col items-center justify-center h-full text-gray-500">
                <FaSearch className="h-16 w-16 mb-4 text-gray-300" />
                <p className="text-lg">Enter a search term to find interview questions</p>
                <p className="text-sm mt-2 text-gray-400">
                  Try searching for "Amazon SDE", "System Design", or "React"
                </p>
              </div>
            ) : isInitialized ? (
              <div className="gcse-searchresults-only" data-queryParameterName="q"></div>
            ) : (
              <div className="flex items-center justify-center h-full">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
              </div>
            )}
          </div>
          {error && (
            <div className="mt-4 p-4 bg-red-50 text-red-700 rounded-lg">
              <p>{error}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default GoogleCSE;
