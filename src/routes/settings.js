import express from 'express';
import { loadConfig, saveConfig } from '../configManager.js';

const router = express.Router();

router.get('/', (req, res) => {
  const config = loadConfig();
  res.json(config);
});

router.post('/', (req, res) => {
  const newConfig = req.body;
  const success = saveConfig(newConfig);
  if (success) {
    res.json({ message: 'Settings saved successfully', config: newConfig });
  } else {
    res.status(500).json({ message: 'Failed to save settings' });
  }
});

export default router;