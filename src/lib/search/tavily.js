import axios from 'axios';

const TAVILY_API_KEY = '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';
const TAVILY_API_URL = 'https://api.tavily.com/search';

export const searchTavily = async (query) => {
  try {
    // Batasi panjang query ke 350 karakter untuk memberikan ruang buffer
    const truncatedQuery = query.substring(0, 350);

    const requestData = {
      api_key: TAVILY_API_KEY,
      query: truncatedQuery,
      search_depth: "advanced",
      max_results: 5
    };

    const response = await axios({
      method: 'post',
      url: TAVILY_API_URL,
      data: requestData,
      headers: {
        'Content-Type': 'application/json'
      }
    });

    if (!response.data || !response.data.results) {
      console.warn('Invalid Tavily response:', response.data);
      return [];
    }

    return response.data.results.map((result, index) => ({
      id: index + 1,
      title: result.title || 'No Title',
      content: result.content ? result.content.substring(0, 300) + '...' : '',
      url: result.url,
      score: result.score || 0.8
    }));

  } catch (error) {
    console.error("Error in Tavily search:", error.response?.data || error.message);
    return [];
  }
}; 