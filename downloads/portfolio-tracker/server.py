#!/usr/bin/env python3
"""Portfolio Tracker Server - Port 8089"""

import json
import os
import time
import uuid
from http.server import BaseHTTPRequestHandler, HTTPServer
from urllib.parse import urlparse, parse_qs

DATA_FILE = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'data', 'portfolios.json')
PORT = 8089


def load_data():
    if not os.path.exists(DATA_FILE):
        return {"portfolios": [], "closedTrades": []}
    try:
        with open(DATA_FILE, 'r') as f:
            d = json.load(f)
            if 'closedTrades' not in d:
                d['closedTrades'] = []
            return d
    except Exception:
        return {"portfolios": [], "closedTrades": []}


def save_data(data):
    os.makedirs(os.path.dirname(DATA_FILE), exist_ok=True)
    with open(DATA_FILE, 'w') as f:
        json.dump(data, f, indent=2)


def get_prices(tickers):
    try:
        import yfinance as yf
        result = {}
        for ticker in tickers:
            try:
                t = yf.Ticker(ticker)
                hist = t.history(period='2d')
                if len(hist) >= 2:
                    prev_close = float(hist['Close'].iloc[-2])
                    price = float(hist['Close'].iloc[-1])
                    change = price - prev_close
                    change_pct = (change / prev_close) * 100
                elif len(hist) == 1:
                    price = float(hist['Close'].iloc[-1])
                    change = 0.0
                    change_pct = 0.0
                    prev_close = price
                else:
                    result[ticker] = {'price': 0, 'change': 0, 'changePct': 0,
                                      'high': 0, 'low': 0, 'volume': 0}
                    continue
                result[ticker] = {
                    'price': round(price, 2),
                    'change': round(change, 2),
                    'changePct': round(change_pct, 2),
                    'high': round(float(hist['High'].iloc[-1]), 2),
                    'low': round(float(hist['Low'].iloc[-1]), 2),
                    'volume': int(hist['Volume'].iloc[-1]) if len(hist) > 0 else 0
                }
            except Exception as e:
                result[ticker] = {'price': 0, 'change': 0, 'changePct': 0,
                                  'high': 0, 'low': 0, 'volume': 0, 'error': str(e)}
        return result
    except Exception:
        return {t: {'price': 0, 'change': 0, 'changePct': 0, 'high': 0, 'low': 0, 'volume': 0}
                for t in tickers}


def get_financials(ticker):
    try:
        import yfinance as yf
        t = yf.Ticker(ticker)
        info = t.info
        return {
            'pe': info.get('trailingPE'),
            'eps': info.get('trailingEps'),
            'forwardPe': info.get('forwardPE'),
            'marketCap': info.get('marketCap'),
            'revenue': info.get('totalRevenue'),
            'netIncome': info.get('netIncomeToCommon'),
            'ebitda': info.get('ebitda'),
            'dividendYield': info.get('dividendYield'),
            'beta': info.get('beta'),
            '52wHigh': info.get('fiftyTwoWeekHigh'),
            '52wLow': info.get('fiftyTwoWeekLow'),
            'shortName': info.get('shortName', ticker),
            'sector': info.get('sector', ''),
            'industry': info.get('industry', ''),
            'description': info.get('longBusinessSummary', ''),
            'priceToBook': info.get('priceToBook'),
            'priceToSales': info.get('priceToSalesTrailing12Months'),
            'enterpriseValue': info.get('enterpriseValue'),
            'shortFloat': info.get('shortPercentOfFloat'),
            'avgVolume': info.get('averageVolume'),
        }
    except Exception as e:
        return {'error': str(e), 'shortName': ticker}


def get_chart(ticker, period):
    """Return full OHLCV data for the given ticker/period."""
    try:
        import yfinance as yf
        import pandas as pd
        df = yf.download(ticker, period=period, interval="1d", auto_adjust=False, progress=False)
        if df.empty:
            return {'dates': [], 'open': [], 'high': [], 'low': [], 'close': [],
                    'prices': [], 'volumes': [], 'volume': []}
        try:
            df.index = pd.to_datetime(df.index).tz_localize(None)
        except Exception:
            try:
                df.index = pd.to_datetime(df.index).tz_convert(None)
            except Exception:
                pass
        # Handle MultiIndex columns (yfinance v0.2+ returns MultiIndex sometimes)
        if hasattr(df.columns, 'levels'):
            df.columns = df.columns.get_level_values(0)
        # Deduplicate columns
        df = df.loc[:, ~df.columns.duplicated()]

        dates = [d.strftime('%Y-%m-%d') for d in df.index]
        close_vals = [round(float(p), 2) for p in df['Close']]
        open_vals  = [round(float(p), 2) for p in df['Open']]  if 'Open'   in df.columns else close_vals
        high_vals  = [round(float(p), 2) for p in df['High']]  if 'High'   in df.columns else close_vals
        low_vals   = [round(float(p), 2) for p in df['Low']]   if 'Low'    in df.columns else close_vals
        vol_vals   = [int(v)             for v in df['Volume']] if 'Volume' in df.columns else [0]*len(dates)

        return {
            'dates':   dates,
            'open':    open_vals,
            'high':    high_vals,
            'low':     low_vals,
            'close':   close_vals,
            'prices':  close_vals,   # backward-compat alias
            'volume':  vol_vals,
            'volumes': vol_vals,     # backward-compat alias
        }
    except Exception as e:
        return {'dates': [], 'open': [], 'high': [], 'low': [], 'close': [],
                'prices': [], 'volume': [], 'volumes': [], 'error': str(e)}


def get_statements(ticker):
    """Fetch and return income statement, balance sheet, cash flow, and earnings history."""
    import math

    def safe_float(v):
        if v is None:
            return None
        try:
            f = float(v)
            if math.isnan(f) or math.isinf(f):
                return None
            return f
        except Exception:
            return None

    def get_metric(df, *names):
        if df is None or df.empty:
            return None
        for name in names:
            if name in df.index:
                return df.loc[name]
        return None

    def col_period(col, quarterly=False):
        try:
            if quarterly:
                q = (col.month - 1) // 3 + 1
                return "Q{} {}".format(q, col.year)
            else:
                return str(col.year)
        except Exception:
            return str(col)

    def parse_income(df, quarterly=False):
        if df is None or df.empty:
            return []
        result = []
        cols = list(df.columns)[:4]
        rev_s  = get_metric(df, 'Total Revenue', 'Revenue')
        gp_s   = get_metric(df, 'Gross Profit')
        op_s   = get_metric(df, 'Operating Income', 'EBIT',
                             'Total Operating Income As Reported')
        ni_s   = get_metric(df, 'Net Income', 'Net Income Common Stockholders',
                             'Net Income Including Noncontrolling Interests')
        eb_s   = get_metric(df, 'EBITDA', 'Normalized EBITDA', 'Reconciled Ebitda')
        eps_s  = get_metric(df, 'Basic EPS', 'Diluted EPS')
        for col in cols:
            try:
                rev = safe_float(rev_s[col]) if rev_s is not None else None
                gp  = safe_float(gp_s[col])  if gp_s  is not None else None
                op  = safe_float(op_s[col])  if op_s  is not None else None
                ni  = safe_float(ni_s[col])  if ni_s  is not None else None
                eb  = safe_float(eb_s[col])  if eb_s  is not None else None
                eps = safe_float(eps_s[col]) if eps_s is not None else None
                op_margin  = round(op / rev * 100, 2) if (op  is not None and rev and rev != 0) else None
                net_margin = round(ni / rev * 100, 2) if (ni  is not None and rev and rev != 0) else None
                result.append({
                    'period':          col_period(col, quarterly),
                    'revenue':         rev,
                    'grossProfit':     gp,
                    'operatingIncome': op,
                    'netIncome':       ni,
                    'ebitda':          eb,
                    'eps':             eps,
                    'operatingMargin': op_margin,
                    'netMargin':       net_margin,
                })
            except Exception:
                pass
        return result

    def parse_balance(df, quarterly=False):
        if df is None or df.empty:
            return []
        result = []
        cols = list(df.columns)[:4]
        ta_s   = get_metric(df, 'Total Assets')
        tl_s   = get_metric(df, 'Total Liabilities Net Minority Interest', 'Total Liabilities')
        eq_s   = get_metric(df, 'Stockholders Equity', 'Total Equity Gross Minority Interest',
                             'Common Stock Equity')
        cash_s = get_metric(df, 'Cash And Cash Equivalents', 'Cash Equivalents', 'Cash Financial',
                             'Cash Cash Equivalents And Short Term Investments')
        td_s   = get_metric(df, 'Total Debt', 'Long Term Debt And Capital Lease Obligation')
        ca_s   = get_metric(df, 'Current Assets', 'Total Current Assets')
        cl_s   = get_metric(df, 'Current Liabilities', 'Total Current Liabilities')
        for col in cols:
            try:
                ta   = safe_float(ta_s[col])   if ta_s   is not None else None
                tl   = safe_float(tl_s[col])   if tl_s   is not None else None
                eq   = safe_float(eq_s[col])   if eq_s   is not None else None
                cash = safe_float(cash_s[col]) if cash_s is not None else None
                td   = safe_float(td_s[col])   if td_s   is not None else None
                ca   = safe_float(ca_s[col])   if ca_s   is not None else None
                cl   = safe_float(cl_s[col])   if cl_s   is not None else None
                net_debt   = round(td - cash, 0) if (td is not None and cash is not None) else None
                curr_ratio = round(ca / cl, 2)   if (ca and cl and cl != 0) else None
                de_ratio   = round(td / eq * 100, 2) if (td is not None and eq and eq != 0) else None
                result.append({
                    'period':          col_period(col, quarterly),
                    'totalAssets':     ta,
                    'totalLiabilities':tl,
                    'totalEquity':     eq,
                    'cash':            cash,
                    'totalDebt':       td,
                    'netDebt':         net_debt,
                    'currentRatio':    curr_ratio,
                    'debtToEquity':    de_ratio,
                })
            except Exception:
                pass
        return result

    def parse_cashflow(df, quarterly=False):
        if df is None or df.empty:
            return []
        result = []
        cols = list(df.columns)[:4]
        ocf_s  = get_metric(df, 'Operating Cash Flow',
                             'Cash Flow From Continuing Operating Activities')
        capex_s = get_metric(df, 'Capital Expenditure',
                              'Purchase Of Property Plant And Equipment')
        fcf_s  = get_metric(df, 'Free Cash Flow')
        div_s  = get_metric(df, 'Common Stock Dividend Paid', 'Dividends Paid',
                             'Cash Dividends Paid', 'Payment Of Dividends')
        repo_s = get_metric(df, 'Repurchase Of Capital Stock', 'Common Stock Repurchase',
                             'Repurchase Of Common Stock')
        for col in cols:
            try:
                ocf   = safe_float(ocf_s[col])   if ocf_s   is not None else None
                capex = safe_float(capex_s[col]) if capex_s is not None else None
                fcf   = safe_float(fcf_s[col])   if fcf_s   is not None else None
                if fcf is None and ocf is not None and capex is not None:
                    fcf = ocf + capex   # capex is negative in yfinance
                div  = safe_float(div_s[col])  if div_s  is not None else None
                repo = safe_float(repo_s[col]) if repo_s is not None else None
                result.append({
                    'period':            col_period(col, quarterly),
                    'operatingCashflow': ocf,
                    'capex':             capex,
                    'freeCashflow':      fcf,
                    'dividendsPaid':     div,
                    'shareRepurchases':  repo,
                })
            except Exception:
                pass
        return result

    def parse_earnings(tk):
        try:
            ed = tk.earnings_dates
            if ed is None or ed.empty:
                return []
            result = []
            # columns: 'EPS Estimate', 'Reported EPS', 'Surprise(%)'
            # index: announcement dates (newest first typically)
            for date_idx, row in ed.iterrows():
                if len(result) >= 8:
                    break
                try:
                    est     = safe_float(row.get('EPS Estimate'))
                    act     = safe_float(row.get('Reported EPS'))
                    surp_pct = safe_float(row.get('Surprise(%)'))
                    if act is None:
                        continue   # Skip future/unreported quarters
                    surprise = round(act - est, 4) if (act is not None and est is not None) else None
                    if surp_pct is None and surprise is not None and est and est != 0:
                        surp_pct = round(surprise / abs(est) * 100, 2)
                    beat = bool(surprise > 0) if surprise is not None else None
                    try:
                        q = (date_idx.month - 1) // 3 + 1
                        quarter_str = "Q{} {}".format(q, date_idx.year)
                    except Exception:
                        quarter_str = str(date_idx)[:10]
                    result.append({
                        'quarter':      quarter_str,
                        'epsEstimate':  est,
                        'epsActual':    act,
                        'surprise':     surprise,
                        'surprisePct':  surp_pct,
                        'beat':         beat,
                        'reportDate':   str(date_idx)[:10],
                    })
                except Exception:
                    pass
            return result
        except Exception:
            return []

    try:
        import yfinance as yf
        tk = yf.Ticker(ticker)

        fin_a  = tk.financials
        fin_q  = tk.quarterly_financials
        bs_a   = tk.balance_sheet
        bs_q   = tk.quarterly_balance_sheet
        cf_a   = tk.cashflow
        cf_q   = tk.quarterly_cashflow

        return {
            'income': {
                'annual':    parse_income(fin_a,  quarterly=False),
                'quarterly': parse_income(fin_q,  quarterly=True),
            },
            'balanceSheet': {
                'annual':    parse_balance(bs_a, quarterly=False),
                'quarterly': parse_balance(bs_q, quarterly=True),
            },
            'cashflow': {
                'annual':    parse_cashflow(cf_a, quarterly=False),
                'quarterly': parse_cashflow(cf_q, quarterly=True),
            },
            'earnings': parse_earnings(tk),
        }
    except Exception as e:
        return {
            'income':       {'annual': [], 'quarterly': []},
            'balanceSheet': {'annual': [], 'quarterly': []},
            'cashflow':     {'annual': [], 'quarterly': []},
            'earnings':     [],
            'error':        str(e),
        }


def get_analytics(portfolio_id):
    data = load_data()
    portfolio = next((p for p in data['portfolios'] if p['id'] == portfolio_id), None)
    if not portfolio:
        return {'error': 'Portfolio not found'}
    positions = portfolio.get('positions', [])
    if not positions:
        return {
            'totalValue': 0, 'totalCost': 0, 'totalPL': 0, 'totalPLPct': 0,
            'sectorWeights': {}, 'topGainers': [], 'topLosers': [], 'positions': []
        }
    tickers = [p['ticker'] for p in positions]
    prices = get_prices(tickers)
    enriched = []
    total_value = 0.0
    total_cost = 0.0

    for pos in positions:
        ticker = pos['ticker']
        price_data = prices.get(ticker, {})
        live_price = price_data.get('price', 0)
        shares = pos.get('shares', 0)
        avg_entry = pos.get('avgEntry', 0)
        cost = shares * avg_entry
        market_value = shares * live_price
        pl = market_value - cost
        pl_pct = (pl / cost * 100) if cost > 0 else 0
        total_value += market_value
        total_cost += cost
        target = pos.get('target')
        stop = pos.get('stop')
        upside = ((target - live_price) / live_price * 100) if (target and live_price > 0) else None
        cushion = ((live_price - stop) / live_price * 100) if (stop and live_price > 0) else None
        enriched.append({
            **pos,
            'livePrice': live_price,
            'change': price_data.get('change', 0),
            'changePct': price_data.get('changePct', 0),
            'marketValue': round(market_value, 2),
            'cost': round(cost, 2),
            'pl': round(pl, 2),
            'plPct': round(pl_pct, 2),
            'upside': round(upside, 2) if upside is not None else None,
            'cushion': round(cushion, 2) if cushion is not None else None,
            'weight': 0
        })

    for e in enriched:
        e['weight'] = round((e['marketValue'] / total_value * 100) if total_value > 0 else 0, 2)

    total_pl = total_value - total_cost
    total_pl_pct = (total_pl / total_cost * 100) if total_cost > 0 else 0

    sector_values = {}
    for e in enriched:
        sector = e.get('sector') or 'Unknown'
        sector_values[sector] = sector_values.get(sector, 0) + e['marketValue']
    sector_weights = {s: round(v / total_value * 100, 2) for s, v in sector_values.items()} if total_value > 0 else {}

    sorted_by_pl = sorted(enriched, key=lambda x: x['plPct'], reverse=True)
    top_gainers = [{'ticker': e['ticker'], 'plPct': e['plPct']} for e in sorted_by_pl[:3]]
    top_losers = [{'ticker': e['ticker'], 'plPct': e['plPct']} for e in sorted_by_pl[-3:][::-1]]

    return {
        'totalValue': round(total_value, 2),
        'totalCost': round(total_cost, 2),
        'totalPL': round(total_pl, 2),
        'totalPLPct': round(total_pl_pct, 2),
        'sectorWeights': sector_weights,
        'topGainers': top_gainers,
        'topLosers': top_losers,
        'positions': enriched
    }


class Handler(BaseHTTPRequestHandler):
    def log_message(self, format, *args):
        print(f"[{self.command}] {self.path}")

    def send_json(self, data, status=200):
        body = json.dumps(data).encode('utf-8')
        self.send_response(status)
        self.send_header('Content-Type', 'application/json')
        self.send_header('Content-Length', str(len(body)))
        self.add_cors()
        self.end_headers()
        self.wfile.write(body)

    def add_cors(self):
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')

    def do_OPTIONS(self):
        self.send_response(200)
        self.add_cors()
        self.end_headers()

    def read_body(self):
        length = int(self.headers.get('Content-Length', 0))
        if length > 0:
            try:
                return json.loads(self.rfile.read(length))
            except Exception:
                return {}
        return {}

    def serve_file(self, filename, content_type):
        filepath = os.path.join(os.path.dirname(os.path.abspath(__file__)), filename)
        try:
            with open(filepath, 'rb') as f:
                content = f.read()
            self.send_response(200)
            self.send_header('Content-Type', content_type)
            self.send_header('Content-Length', str(len(content)))
            self.add_cors()
            self.end_headers()
            self.wfile.write(content)
        except FileNotFoundError:
            self.send_response(404)
            self.end_headers()

    def do_GET(self):
        parsed = urlparse(self.path)
        path = parsed.path
        params = parse_qs(parsed.query)

        if path in ('/', '/index.html'):
            self.serve_file('index.html', 'text/html; charset=utf-8')
        elif path == '/api/portfolios':
            data = load_data()
            result = []
            for p in data['portfolios']:
                result.append({
                    'id': p['id'], 'name': p['name'],
                    'description': p.get('description', ''),
                    'benchmark': p.get('benchmark', 'SPY'),
                    'createdAt': p.get('createdAt', 0),
                    'positionCount': len(p.get('positions', []))
                })
            self.send_json(result)
        elif path == '/api/positions':
            pid = params.get('portfolioId', [None])[0]
            data = load_data()
            portfolio = next((p for p in data['portfolios'] if p['id'] == pid), None)
            if not portfolio:
                self.send_json({'error': 'Not found'}, 404)
            else:
                self.send_json(portfolio.get('positions', []))
        elif path == '/api/prices':
            tickers_str = params.get('tickers', [''])[0]
            tickers = [t.strip().upper() for t in tickers_str.split(',') if t.strip()]
            self.send_json(get_prices(tickers))
        elif path == '/api/financials':
            ticker = params.get('ticker', [''])[0].upper()
            self.send_json(get_financials(ticker))
        elif path == '/api/chart':
            ticker = params.get('ticker', [''])[0].upper()
            period = params.get('period', ['3mo'])[0]
            self.send_json(get_chart(ticker, period))
        elif path == '/api/statements':
            ticker = params.get('ticker', [''])[0].upper()
            self.send_json(get_statements(ticker))
        elif path == '/api/analytics':
            pid = params.get('portfolioId', [None])[0]
            self.send_json(get_analytics(pid))
        elif path == '/api/closed-trades':
            pid = params.get('portfolioId', [None])[0]
            data = load_data()
            trades = [t for t in data.get('closedTrades', []) if t.get('portfolioId') == pid]
            self.send_json(trades)
        else:
            self.send_response(404)
            self.end_headers()

    def do_POST(self):
        parsed = urlparse(self.path)
        path = parsed.path
        body = self.read_body()

        if path == '/api/portfolios':
            data = load_data()
            new_p = {
                'id': str(uuid.uuid4())[:8],
                'name': body.get('name', 'New Portfolio'),
                'description': body.get('description', ''),
                'benchmark': body.get('benchmark', 'SPY'),
                'createdAt': int(time.time()),
                'positions': []
            }
            data['portfolios'].append(new_p)
            save_data(data)
            self.send_json(new_p)
        elif path == '/api/positions':
            data = load_data()
            pid = body.get('portfolioId')
            portfolio = next((p for p in data['portfolios'] if p['id'] == pid), None)
            if not portfolio:
                self.send_json({'error': 'Portfolio not found'}, 404)
                return
            ticker = body.get('ticker', '').upper()
            # Remove existing
            portfolio['positions'] = [p for p in portfolio['positions'] if p['ticker'] != ticker]
            new_pos = {
                'ticker': ticker,
                'shares': float(body.get('shares', 0)),
                'avgEntry': float(body.get('avgEntry', 0)),
                'entryDate': body.get('entryDate', ''),
                'target': float(body.get('target')) if body.get('target') else None,
                'stop': float(body.get('stop')) if body.get('stop') else None,
                'thesis': body.get('thesis', ''),
                'sector': body.get('sector', ''),
                'notes': body.get('notes', '')
            }
            portfolio['positions'].append(new_pos)
            save_data(data)
            self.send_json(new_pos)
        elif path == '/api/close-position':
            data = load_data()
            pid = body.get('portfolioId')
            ticker = body.get('ticker', '').upper()
            exit_price = body.get('exitPrice', 0)
            portfolio = next((p for p in data['portfolios'] if p['id'] == pid), None)
            if not portfolio:
                self.send_json({'error': 'Not found'}, 404)
                return
            pos = next((p for p in portfolio['positions'] if p['ticker'] == ticker), None)
            if pos:
                trade = {
                    **pos,
                    'portfolioId': pid,
                    'exitDate': time.strftime('%Y-%m-%d'),
                    'exitPrice': exit_price,
                    'closedAt': int(time.time())
                }
                data.setdefault('closedTrades', []).append(trade)
                portfolio['positions'] = [p for p in portfolio['positions'] if p['ticker'] != ticker]
                save_data(data)
                self.send_json({'success': True, 'trade': trade})
            else:
                self.send_json({'error': 'Position not found'}, 404)
        else:
            self.send_json({'error': 'Not found'}, 404)

    def do_PUT(self):
        parsed = urlparse(self.path)
        path = parsed.path
        body = self.read_body()

        if path == '/api/positions':
            data = load_data()
            pid = body.get('portfolioId')
            ticker = body.get('ticker', '').upper()
            portfolio = next((p for p in data['portfolios'] if p['id'] == pid), None)
            if not portfolio:
                self.send_json({'error': 'Not found'}, 404)
                return
            pos = next((p for p in portfolio['positions'] if p['ticker'] == ticker), None)
            if not pos:
                self.send_json({'error': 'Position not found'}, 404)
                return
            for field in ['shares', 'avgEntry', 'entryDate', 'target', 'stop', 'thesis', 'sector', 'notes']:
                if field in body:
                    val = body[field]
                    if field in ('shares', 'avgEntry') and val is not None:
                        try:
                            val = float(val)
                        except Exception:
                            pass
                    elif field in ('target', 'stop') and val is not None and val != '':
                        try:
                            val = float(val)
                        except Exception:
                            pass
                    pos[field] = val
            save_data(data)
            self.send_json(pos)
        elif path == '/api/portfolios':
            data = load_data()
            pid = body.get('id')
            portfolio = next((p for p in data['portfolios'] if p['id'] == pid), None)
            if not portfolio:
                self.send_json({'error': 'Not found'}, 404)
                return
            for field in ['name', 'description', 'benchmark']:
                if field in body:
                    portfolio[field] = body[field]
            save_data(data)
            self.send_json(portfolio)
        else:
            self.send_json({'error': 'Not found'}, 404)

    def do_DELETE(self):
        parsed = urlparse(self.path)
        path = parsed.path
        body = self.read_body()

        if path == '/api/portfolios':
            data = load_data()
            pid = body.get('id')
            data['portfolios'] = [p for p in data['portfolios'] if p['id'] != pid]
            save_data(data)
            self.send_json({'success': True})
        elif path == '/api/positions':
            data = load_data()
            pid = body.get('portfolioId')
            ticker = body.get('ticker', '').upper()
            portfolio = next((p for p in data['portfolios'] if p['id'] == pid), None)
            if not portfolio:
                self.send_json({'error': 'Not found'}, 404)
                return
            portfolio['positions'] = [p for p in portfolio['positions'] if p['ticker'] != ticker]
            save_data(data)
            self.send_json({'success': True})
        else:
            self.send_json({'error': 'Not found'}, 404)


if __name__ == '__main__':
    print(f'Portfolio Tracker starting on http://localhost:{PORT}')
    print(f'Data file: {DATA_FILE}')
    server = HTTPServer(('0.0.0.0', PORT), Handler)
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print('\nShutting down.')
        server.shutdown()
