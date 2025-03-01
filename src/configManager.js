import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const configPath = path.join(__dirname, '../config.json');

export function loadConfig() {
  try {
    const data = fs.readFileSync(configPath, 'utf8');
    return JSON.parse(data);
  } catch (err) {
    console.error('Error reading config file:', err);
    return {};
  }
}

export function saveConfig(newConfig) {
  try {
    fs.writeFileSync(configPath, JSON.stringify(newConfig, null, 2), 'utf8');
    return true;
  } catch (err) {
    console.error('Error saving config file:', err);
    return false;
  }
}