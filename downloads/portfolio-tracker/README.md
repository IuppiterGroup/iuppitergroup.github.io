# Portfolio Tracker

A free, local portfolio tracking tool with live price feeds, charts, financial statements, and analytics — all running on your machine. No accounts, no cloud, no subscriptions.

## Features

- **Live Prices** — Real-time quotes via Yahoo Finance (yfinance)
- **Interactive Charts** — Candlestick and line charts with multiple timeframes
- **Financial Statements** — Income, balance sheet, cash flow, and earnings history
- **Portfolio Analytics** — Sector allocation, P/L tracking, top gainers/losers
- **Position Management** — Add, edit, close positions with entry/exit tracking
- **Multiple Portfolios** — Track as many portfolios as you want
- **Dark Theme** — Easy on the eyes, built for focus
- **100% Local** — Your data stays on your machine in a simple JSON file

## Requirements

- **Python 3.8+** (comes pre-installed on most systems)
- **yfinance** — `pip install yfinance`

## Quick Start

1. Install the dependency:
   ```
   pip install yfinance
   ```

2. Launch the tracker:
   - **Windows:** Double-click `launch.bat`
   - **Mac/Linux:** Run `python server.py`

3. Open your browser to **http://localhost:8089**

That's it. A sample portfolio is included — edit or delete it and add your own positions.

## Files

| File | Purpose |
|------|---------|
| `server.py` | Python backend — serves the UI and fetches live market data |
| `index.html` | Frontend — the full tracker interface (single file, no build step) |
| `launch.bat` | Windows launcher (just runs `python server.py`) |
| `data/portfolios.json` | Your portfolio data — back this up |

## Usage Tips

- **Add a position:** Click "+ Add Position" in any portfolio
- **View details:** Click any ticker row to see charts, financials, and earnings
- **Close a position:** Use the close button to log the exit and move it to closed trades
- **Create portfolios:** Use the portfolio dropdown to create multiple tracking portfolios
- **Backup:** Copy `data/portfolios.json` to save your data

## License

Free to use. No warranty. Built by [Iuppiter Group](https://iuppitergroup.github.io).
