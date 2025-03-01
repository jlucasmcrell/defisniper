import axios from 'axios';

const NEWS_API_URL = 'https://newsapi.org/v2/top-headlines';
const NEWS_API_KEY = process.env.NEWS_API_KEY;

const positiveWords = ['bull', 'rally', 'breakout', 'gain', 'uptrend', 'surge'];
const negativeWords = ['bear', 'crash', 'downturn', 'loss', 'plunge', 'decline'];

export async function getNewsSentiment(country = 'us', category = 'business') {
  try {
    const response = await axios.get(NEWS_API_URL, {
      params: {
        country,
        category,
        apiKey: NEWS_API_KEY,
        q: 'crypto OR blockchain'
      }
    });
    let score = 0;
    response.data.articles.forEach(article => {
      const content = (article.title + ' ' + article.description).toLowerCase();
      positiveWords.forEach(word => {
        if (content.includes(word)) score += 1;
      });
      negativeWords.forEach(word => {
        if (content.includes(word)) score -= 1;
      });
    });
    return score;
  } catch (error) {
    console.error('Error fetching news sentiment:', error);
    return 0;
  }
}