# Radical Word Builder

A standalone game for learning Chinese characters by composing words from radicals.

## Features

- **All 350 Radicals**: Uses the complete radicals.csv database
- **Full Word Database**: Words from basic, intermediate, and advanced levels
- **Drag & Drop**: Compose words by dragging radicals to the composition area
- **Click to Add**: Or simply click radicals to add them
- **Score Tracking**: Points based on word complexity
- **Streak Counter**: Track consecutive successful words
- **Word Database**: Browse all available words with filtering

## How to Play

1. Open `index.html` in a web browser
2. Click or drag radicals from the grid to the composition area
3. Click "Check Word" to see if your combination forms a valid word
4. Successfully found words earn points based on radical count
5. Click on composed radicals to remove them
6. Use "Clear" to reset the composition area

## Game Modes

- **Free Play**: Explore and discover words at your own pace
- **Challenge**: (Future) Timed challenges and targets
- **Practice**: (Future) Guided learning with hints

## File Structure

```
radical-word-builder/
├── index.html      # Main HTML structure
├── style.css       # Styling
├── game.js         # Game logic
└── README.md       # This file
```

## Data Sources

The plugin reads from:
- `../../data/languages/chinese/radicals/radicals.csv` - All 350 radicals
- `../../data/languages/chinese/basic.csv` - Basic vocabulary
- `../../data/languages/chinese/intermediate.csv` - Intermediate vocabulary
- `../../data/languages/chinese/advanced.csv` - Advanced vocabulary

## Running Locally

Due to browser security restrictions with file:// protocol, you may need to run a local server:

```bash
# Using Python 3
python -m http.server 8000

# Using Node.js
npx serve
```

Then navigate to `http://localhost:8000/plugins/radical-word-builder/`

## Customization

The game can be extended by:
- Adding more radicals to radicals.csv
- Adding more vocabulary CSVs
- Implementing challenge/practice modes in game.js
