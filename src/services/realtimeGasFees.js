import axios from 'axios';

const GAS_API_URL = 'https://ethgasstation.info/json/ethgasAPI.json';

export async function fetchGasFees() {
  try {
    const response = await axios.get(GAS_API_URL);
    const fast = Number(response.data.fast) / 10;
    const average = Number(response.data.average) / 10;
    const safeLow = Number(response.data.safeLow) / 10;
    return { fast, average, safeLow };
  } catch (error) {
    console.error('Error fetching gas fees:', error);
    return { fast: 50, average: 40, safeLow: 30 };
  }
}