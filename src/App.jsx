import { useState } from "react";
import "./styles/index.css";
import Sidebar from "./components/Sidebar";
import ItemDex from "./components/ItemDex";
import PokeDex from "./components/PokeDex";
import CatchTab from "./components/CatchTab";
import EvolveTab from "./components/EvolveTab";
import SettingsTab from "./components/SettingsTab";
import AchievementsTab from "./components/AchievementsTab";
import AchievementToaster from "./components/AchievementToaster";
import { loadSave } from "./lib/save";

const PAGE_LABELS = {
	catch: "Catch",
	pokedex: "Pokédex",
	items: "Items",
	evolve: "Evolve",
	achievements: "Achievements",
	settings: "Settings",
};

export default function App() {
	const [activePage, setActivePage] = useState("catch");
	const [gameState, setGameState] = useState(() => loadSave());
	const [achievements, setAchievements] = useState([]);

	function pushAchievement({ title, description, icon }) {
		const id = Date.now() + Math.random();
		setAchievements((prev) => [...prev, { id, title, description, icon }]);
	}

	function dismissAchievement(id) {
		setAchievements((prev) => prev.filter((a) => a.id !== id));
	}

	return (
		<div style={styles.root}>
			<Sidebar activePage={activePage} onNavigate={setActivePage} />
			<main style={styles.main}>
				<header style={styles.header}>
					<h1 style={styles.pageTitle}>{PAGE_LABELS[activePage]}</h1>
				</header>
				<div style={styles.content}>
					<div style={activePage === "catch" ? styles.page : styles.pageHidden}>
						<CatchTab
							gameState={gameState}
							setGameState={setGameState}
							gameMode={gameState.gameMode ?? "easy"}
							pushAchievement={pushAchievement}
						/>
					</div>
					<div
						style={activePage === "pokedex" ? styles.page : styles.pageHidden}>
						<PokeDex
							gameState={gameState}
							gameMode={gameState.gameMode ?? "easy"}
						/>
					</div>
					<div style={activePage === "items" ? styles.page : styles.pageHidden}>
						<ItemDex gameState={gameState} />
					</div>
					<div
						style={activePage === "evolve" ? styles.page : styles.pageHidden}>
						<EvolveTab
							gameState={gameState}
							setGameState={setGameState}
							gameMode={gameState.gameMode ?? "easy"}
							pushAchievement={pushAchievement}
						/>
					</div>
					<div
						style={activePage === "settings" ? styles.page : styles.pageHidden}>
						<SettingsTab
							gameState={gameState}
							setGameState={setGameState}
							pushAchievement={pushAchievement}
						/>
					</div>
					<div style={activePage === "achievements" ? styles.page : styles.pageHidden}>
						<AchievementsTab gameState={gameState} />
					</div>
					{activePage !== "catch" &&
						activePage !== "items" &&
						activePage !== "pokedex" &&
						activePage !== "evolve" &&
						activePage !== "achievements" &&
						activePage !== "settings" && <Placeholder page={activePage} />}
				</div>
			</main>
			<AchievementToaster
				toasts={achievements}
				onDismiss={dismissAchievement}
			/>
		</div>
	);
}

function Placeholder({ page }) {
	return (
		<div style={styles.placeholder}>
			<span style={styles.placeholderIcon}>◈</span>
			<p style={styles.placeholderText}>{PAGE_LABELS[page]} coming soon</p>
		</div>
	);
}

const styles = {
	root: {
		display: "flex",
		height: "100vh",
		width: "100vw",
		overflow: "hidden",
		background: "var(--bg-base)",
	},
	main: {
		flex: 1,
		display: "flex",
		flexDirection: "column",
		overflow: "hidden",
	},
	header: {
		padding: "24px 32px 16px",
		borderBottom: "1px solid var(--border)",
		background: "var(--bg-surface)",
	},
	pageTitle: {
		fontSize: "22px",
		fontWeight: "700",
		color: "var(--text-primary)",
		letterSpacing: "-0.01em",
	},
	content: {
		flex: 1,
		overflow: "hidden",
		padding: "32px",
		display: "flex",
		flexDirection: "column",
	},
	page: {
		flex: 1,
		display: "flex",
		flexDirection: "column",
		overflow: "hidden",
		animation: "tab-fade-in 0.2s ease-out",
	},
	pageHidden: {
		display: "none",
	},
	placeholder: {
		display: "flex",
		flexDirection: "column",
		alignItems: "center",
		justifyContent: "center",
		height: "100%",
		gap: "16px",
		opacity: 0.3,
	},
	placeholderIcon: {
		fontSize: "48px",
		color: "var(--accent)",
	},
	placeholderText: {
		fontSize: "16px",
		color: "var(--text-secondary)",
		fontWeight: "500",
	},
};
