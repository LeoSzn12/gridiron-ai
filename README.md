# 🏈 Gridiron AI Pro v2.4

> Next-Generation NFL Fantasy Intelligence Terminal with Real-Time Data Pipelines, 10,000-Iteration Monte Carlo Simulation, and 5-Factor Decision Synthesis Engine.

[![React](https://img.shields.io/badge/React-19-blue.svg)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.9-blue.svg)](https://www.typescriptlang.org/)
[![Vite](https://img.shields.io/badge/Vite-8.2-purple.svg)](https://vitejs.dev/)
[![TailwindCSS](https://img.shields.io/badge/Tailwind-4.0-teal.svg)](https://tailwindcss.com/)

---

## 🌟 Key Features & Intelligence Modules

### 1. 🧠 Intelligent Decision Synthesis War Room (`src/components/DecisionEngineWarRoom.tsx`)
- **5-Factor Composite Algorithm**: Combines Vegas Implied Lines (30%), Matchup DvP & EPA (25%), Doppler Stadium Weather (15%), Offensive PROE & Pace (15%), and Custom 3-QB Scarcity (15%) into an **Alpha Index (0–100)**.
- **Interactive Weight Calibration**: Real-time slider adjustments to prioritize floor vs ceiling, Vegas betting momentum, or matchup volatility.
- **AI Start/Sit Arbiter**: Side-by-side player comparisons with transparent mathematical sub-score breakdowns.

### 2. 🌐 Real-Time Live Data Pipeline (`src/services/liveDataService.ts`)
- **ESPN Live Scoreboard & Betting API**: Live game quarters, clocks, spreads, and box scores.
- **Sleeper NFL State API**: Automated current season/week sync and active player health reports.
- **Open-Meteo Doppler Weather Radar**: Real-time GPS weather (temp, sustained wind, gusts, rain/snow) for all 30 NFL stadiums.
- **1-Click Yahoo League Sync**: Instant sync for custom league parameters (8 teams, 3 QB / 5 WR starting lineups, 50 pass yd/pt, 6pt TDs).

### 3. 🎲 10,000-Iteration Monte Carlo Matchup Simulator (`src/components/MatchupSimulator.tsx`)
- Head-to-head matchup simulation with normal distribution curves, median projected points, 90th-percentile boom ceiling, and 10th-percentile safety floor.

### 4. 📺 Live Sunday NFL Gamecast & Red Zone Radar (`src/components/GamedayLiveGamecast.tsx`)
- Interactive 100-yard field visualizer, drive progression tracker, glowing Red Zone markers, and real-time fantasy point popups.

### 5. 🔬 Advanced Coaching & Metrics Lab (`src/components/AdvancedMetricsLab.tsx`)
- PROE (Pass Rate Over Expected) vs Neutral Pace matrix, Cover 1/3/4 defensive matchup synergies, and IDP pass rush pressure grades.

### 6. 🌪️ Doppler Stadium Weather Radar Hub (`src/components/WeatherRadarHub.tsx`)
- High-wind threshold flags (>15 mph drag), precipitation slickness ratings, and kicker dome thresholds (Brandon Aubrey 60+ yd FGs).

### 7. 🎙️ AI Audio Briefing & Gameday Radio Show (`src/components/AIAudioBriefing.tsx`)
- Voice-synthesized morning podcast briefing using the browser's Web Speech API with waveform visualizers and speed controls.

### 8. 🏆 AI Live Draft Room (`src/components/DraftRoom.tsx`)
- 8-Team snake draft simulator with custom VORP rankings calibrated for 3-QB scarcity (24 starting QBs in the league).

### 9. 💵 Multi-Sportsbook Odds & Line Arbitrage (`src/components/VegasOddsHub.tsx`)
- Consensus line comparison across DraftKings, FanDuel, BetMGM, Caesars, and ESPN BET.

---

## 🛠️ Quickstart

### Prerequisites
- Node.js 18+
- npm or yarn

### Installation
```bash
# Clone the repository
git clone https://github.com/LeoSzn12/gridiron-ai.git
cd gridiron-ai

# Install dependencies
npm install

# Start development server
npm run dev
```

Visit **`http://localhost:5173/`** in your browser.

---

## 📐 Mathematical Decision Formula

The Composite Alpha Rating ($\alpha$) is calculated via multi-factor weighted normalization:

$$\alpha = \frac{\sum_{i=1}^{5} (W_i \times S_i)}{\sum_{i=1}^{5} W_i}$$

Where:
- $S_1$ = Vegas Line Efficiency ($\text{Implied Total} \times 0.5 + \text{Anytime TD Prob} \times 0.5$)
- $S_2$ = Matchup & DvP Delta ($\text{Rank vs Pos} \times 0.6 + \text{EPA Rank} \times 0.4$)
- $S_3$ = Environmental Weather Score ($100 - \text{Wind Drag} - \text{Rain/Snow Penalty}$)
- $S_4$ = Coaching & Neutral Pace Catalyst ($\text{Pace Rank} + \text{PROE Bonus}$)
- $S_5$ = Custom League Scarcity & VORP (3-QB / 5-WR positional scarcity multiplier)

---

## 📄 License
MIT License. Crafted with precision for fantasy football champions.
