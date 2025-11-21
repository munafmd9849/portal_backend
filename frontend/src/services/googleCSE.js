// Google CSE Integration Service
const CSE_ID = 'c77402227d2094dce';
const API_KEY = import.meta.env.VITE_GOOGLE_CSE_API_KEY || ''; // Use Vite environment variables

export const fetchQuestionsFromCSE = async (query) => {
  try {
    const response = await fetch(
      `https://www.googleapis.com/customsearch/v1?q=${encodeURIComponent(query)}&cx=${CSE_ID}&key=${API_KEY}`
    );
    
    if (!response.ok) {
      throw new Error('Failed to fetch from Google CSE');
    }

    const data = await response.json();
    
    // Transform CSE results to our question format
    const questions = data.items?.map((item, index) => ({
      id: `cse-${index}-${Date.now()}`,
      question: item.title,
      description: item.snippet,
      type: 'unknown',
      company: extractCompanyName(item.title, item.snippet),
      source: item.link,
      answer: null,
      metadata: {
        source: 'google_cse',
        displayLink: item.displayLink,
        formattedUrl: item.formattedUrl
      }
    })) || [];

    return { data: questions };
  } catch (error) {
    console.error('Error fetching from Google CSE:', error);
    throw error;
  }
};

// Helper function to extract company name from title or snippet
const extractCompanyName = (title, snippet) => {
  const companyPatterns = [
    /(?:asked in|at|by|from)\s+([A-Z][A-Za-z0-9\s&]+)(?:\s+interview|\s*\?|\s+\(|\s+on|,|$)/i,
    /(?:interview question(?:s)?(?: at| from| of)?)\s+([A-Z][A-Za-z0-9\s&]+)/i,
    /(?:at|from|by)\s+([A-Z][A-Za-z0-9\s&]+)(?:\s+interview|\s+questions?|\s*\?|\s+on|,|$)/i
  ];

  const text = `${title} ${snippet}`.toLowerCase();
  
  for (const pattern of companyPatterns) {
    const match = text.match(pattern);
    if (match && match[1]) {
      return match[1].trim();
    }
  }
  
  return null;
};

// Debounce function for search input
let searchTimeout;
export const debouncedSearch = (searchFunction, query, delay = 500) => {
  return new Promise((resolve) => {
    clearTimeout(searchTimeout);
    searchTimeout = window.setTimeout(async () => {
      try {
        const results = await searchFunction(query);
        resolve(results);
      } catch (error) {
        console.error('Search error:', error);
        resolve({ data: [] }); // Return empty results on error
      }
    }, delay);
  });
};

// Initialize Google CSE if available
const initGoogleCSE = () => {
  if (typeof window !== 'undefined' && window.google && window.google.search && window.google.search.cse) {
    return window.google.search.cse.element.getElement('searchResultsOnly0');
  }
  return null;
};

export const googleCSEService = {
  search: async (query) => {
    const element = initGoogleCSE();
    if (element) {
      element.execute(query);
      return new Promise((resolve) => {
        // This is a simplified example - you'll need to implement proper result handling
        // based on Google CSE's JavaScript API
        setTimeout(() => {
          resolve({ data: [] });
        }, 1000);
      });
    }
    return { data: [] };
  }
};
