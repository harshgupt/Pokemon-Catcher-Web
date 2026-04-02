import { useState, useEffect } from "react";
import pokemonData from "../data/pokemon.json";
import { saveGame } from "../lib/save";
import {
	byId,
	byItemId,
	getBaseId,
	canEvolveInto,
	performEvolve,
	countUnlockedInChain,
} from "../lib/evolve";
import { assetUrl } from "../lib/assetUrl";

/** Returns all evolution options for a pokemon that currently pass CanEvolve. */
function getAvailableEvolutions(p, gameState, gameMode = "easy") {
	if (!gameState.pokemon[p.id]?.isUnlocked) return [];
	if (!Array.isArray(p.nextForms)) return [];
	return p.nextForms
		.map((nf) => ({ ...nf, fromId: p.id }))
		.filter((nf) => canEvolveInto(nf, gameState, gameMode));
}

// ── Type colours (same as PokeDex) ───────────────────────────────────────────
const TYPE_COLORS = {
	Normal: "#9FA19F",
	Fire: "#E62829",
	Water: "#2980EF",
	Electric: "#FAC000",
	Grass: "#3FA129",
	Ice: "#3DCEF3",
	Fighting: "#FF8000",
	Poison: "#9141CB",
	Ground: "#915121",
	Flying: "#81B9EF",
	Psychic: "#EF4179",
	Bug: "#91A119",
	Rock: "#AFA981",
	Ghost: "#704170",
	Dragon: "#5060E1",
	Dark: "#624D4E",
	Steel: "#60A1B8",
	Fairy: "#EF70EF",
};

// ── Components ────────────────────────────────────────────────────────────────

export default function EvolveTab({
	gameState,
	setGameState,
	gameMode = "easy",
}) {
	const [selected, setSelected] = useState(null); // pokemon for evolve options popup
	const [evolved, setEvolved] = useState(null); // { fromPoke, toPoke } for result popup

	const evolvable = pokemonData.filter(
		(p) => getAvailableEvolutions(p, gameState, gameMode).length > 0,
	);

	function handleEvolve(nf) {
		const newGs = performEvolve(gameState, nf, gameMode);
		setGameState(newGs);
		saveGame(newGs);
		setSelected(null);
		setEvolved({ fromPoke: byId[nf.fromId], toPoke: byId[nf.nextCharacterID] });
	}

	function handleResultClose() {
		setEvolved(null);
	}

	return (
		<div style={styles.root}>
			{evolvable.length === 0 ? (
				<div style={styles.empty}>
					<span style={styles.emptyIcon}>◈</span>
					<p style={styles.emptyText}>No Pokémon ready to evolve</p>
					<p style={styles.emptySubtext}>
						Catch more to meet evolution requirements
					</p>
					{/* <button style={styles.testBtn} onClick={() => injectTestState(setGameState)}>⚙ Load Test Data</button> */}
				</div>
			) : (
				<div style={styles.grid}>
					{evolvable.map((p) => (
						<EvolveCard
							key={p.id}
							pokemon={p}
							gameState={gameState}
							gameMode={gameMode}
							onSelect={setSelected}
						/>
					))}
				</div>
			)}

			{selected && (
				<EvolvePopup
					pokemon={selected}
					gameState={gameState}
					gameMode={gameMode}
					onEvolve={handleEvolve}
					onClose={() => setSelected(null)}
				/>
			)}

			{evolved && (
				<EvolveResultPopup
					fromPoke={evolved.fromPoke}
					toPoke={evolved.toPoke}
					onClose={handleResultClose}
				/>
			)}
		</div>
	);
}

function EvolveCard({ pokemon: p, gameState, gameMode = "easy", onSelect }) {
	const [imgState, setImgState] = useState("loading");
	const rootId = getBaseId(p.id);
	const rootCaught = gameState.pokemon[rootId]?.numberCaught ?? 0;
	const spriteFile = p.spriteName ?? p.name;

	return (
		<div style={styles.card} onClick={() => onSelect(p)}>
			<div style={styles.imageWrap}>
				{imgState === "loading" && <div className="sprite-spinner" />}
				<img
					src={assetUrl(`/sprites/pokemon/mid/${spriteFile}.png`)}
					alt={p.name}
					style={{ ...styles.image, opacity: imgState === "loaded" ? 1 : 0 }}
					onLoad={() => setImgState("loaded")}
					onError={() => setImgState("error")}
				/>
			</div>
			<div style={styles.cardInfo}>
				<span style={styles.cardName}>{p.displayName ?? p.name}</span>
				{gameMode !== "easy" && (
					<span style={styles.cardCount}>×{rootCaught} caught</span>
				)}
			</div>
		</div>
	);
}

function EvolvePopup({
	pokemon: p,
	gameState,
	gameMode = "easy",
	onEvolve,
	onClose,
}) {
	const evolutions = getAvailableEvolutions(p, gameState, gameMode);
	const rootId = getBaseId(p.id);
	const rootCaught = gameState.pokemon[rootId]?.numberCaught ?? 0;
	const requiredCount =
		gameMode === "easy" ? countUnlockedInChain(rootId, gameState) + 1 : null; // each nf has its own characterCount in full mode
	const spriteFile = p.spriteName ?? p.name;

	return (
		<div style={styles.overlay} onClick={onClose}>
			<div style={styles.popup} onClick={(e) => e.stopPropagation()}>
				{/* Header */}
				<div style={styles.popupHeader}>
					<img
						src={assetUrl(`/sprites/pokemon/mid/${spriteFile}.png`)}
						alt={p.name}
						style={styles.popupHeaderSprite}
					/>
					<div style={styles.popupHeaderInfo}>
						<span style={styles.popupName}>{p.displayName ?? p.name}</span>
						<div style={styles.popupTypes}>
							{(p.types ?? []).map((t) => (
								<span
									key={t}
									style={{
										...styles.typeBadge,
										background: TYPE_COLORS[t] ?? "#9FA19F",
									}}>
									{t}
								</span>
							))}
						</div>
						<span style={styles.popupCatchCount}>×{rootCaught} caught</span>
					</div>
				</div>

				<div style={styles.divider} />

				{/* Evolution options */}
				<div style={styles.evoList}>
					{evolutions.map((nf, i) => {
						const toPoke = byId[nf.nextCharacterID];
						const toFile = toPoke ? (toPoke.spriteName ?? toPoke.name) : null;
						const item =
							nf.evolutionItemID != null &&
							(nf.evolutionMethod === "Item" ||
								nf.evolutionMethod === "ItemAndCharacterRequired")
								? byItemId[nf.evolutionItemID]
								: null;
						const itemSrc = item
							? item.tmType
								? assetUrl(`/sprites/items/TM ${item.tmType}.png`)
								: assetUrl(`/sprites/items/${item.name}.png`)
							: null;
						const reqChar = nf.characterRequiredID
							? byId[nf.characterRequiredID]
							: null;
						const reqFile = reqChar
							? (reqChar.spriteName ?? reqChar.name)
							: null;
						const methodLabel =
							{
								LevelUp: "Level Up",
								Item: "Item",
								CharacterRequired: "Pokémon",
								ItemAndCharacterRequired: "Item + Pokémon",
							}[nf.evolutionMethod] ?? nf.evolutionMethod;

						return (
							<div key={i} style={styles.evoOption}>
								{/* From → To sprites */}
								<div style={styles.evoSprites}>
									<img
										src={assetUrl(`/sprites/pokemon/mid/${spriteFile}.png`)}
										alt={p.name}
										style={styles.evoSprite}
									/>
									<span style={styles.evoArrow}>→</span>
									{toFile && (
										<img
											src={assetUrl(`/sprites/pokemon/mid/${toFile}.png`)}
											alt={toPoke?.name}
											style={styles.evoSprite}
										/>
									)}
								</div>

								{/* Details */}
								<div style={styles.evoDetails}>
									<span style={styles.evoToName}>
										{toPoke?.displayName ?? toPoke?.name ?? "???"}
									</span>
									<div style={styles.evoMeta}>
										<span style={styles.methodBadge}>{methodLabel}</span>
										{gameMode !== "easy" && (
											<span
												style={{
													...styles.countBadge,
													color:
														rootCaught >= nf.characterCount
															? "var(--accent-bright)"
															: "var(--text-secondary)",
												}}>
												{rootCaught} / {nf.characterCount}
											</span>
										)}
										{itemSrc && (
											<img
												src={itemSrc}
												alt={item?.name}
												title={item?.displayName ?? item?.name}
												style={styles.reqSprite}
											/>
										)}
										{reqFile && (
											<img
												src={assetUrl(`/sprites/pokemon/mid/${reqFile}.png`)}
												alt={reqChar?.name}
												title={reqChar?.displayName ?? reqChar?.name}
												style={styles.reqSprite}
											/>
										)}
									</div>
								</div>

								{/* Evolve button */}
								<button style={styles.evolveBtn} onClick={() => onEvolve(nf)}>
									Evolve
								</button>
							</div>
						);
					})}
				</div>
			</div>
		</div>
	);
}

// Phases: 1=fade-to-white  2=swap  3=fade-to-color  4=done
const PHASE_DURATION = { 1: 800, 2: 900, 3: 900 };

export function EvolveResultPopup({ fromPoke, toPoke, onClose }) {
	const [phase, setPhase] = useState(1);

	useEffect(() => {
		if (phase >= 4) return;
		const t = setTimeout(() => setPhase((p) => p + 1), PHASE_DURATION[phase]);
		return () => clearTimeout(t);
	}, [phase]);

	const fromFile = fromPoke ? (fromPoke.spriteName ?? fromPoke.name) : null;
	const toFile = toPoke ? (toPoke.spriteName ?? toPoke.name) : null;
	const fromName = fromPoke ? (fromPoke.displayName ?? fromPoke.name) : "???";
	const toName = toPoke ? (toPoke.displayName ?? toPoke.name) : "???";
	const fromSrc = fromFile
		? assetUrl(`/sprites/pokemon/large/${fromFile}.png`)
		: "";
	const toSrc = toFile ? assetUrl(`/sprites/pokemon/large/${toFile}.png`) : "";

	const done = phase >= 3;

	return (
		<div
			style={styles.overlay}
			onClick={() => (phase < 4 ? setPhase(4) : onClose())}>
			<div
				style={{ ...styles.resultPopup, ...styles.resultPopupGold }}
				onClick={(e) => e.stopPropagation()}>
				<p style={styles.resultLine}>
					<span style={styles.resultFrom}>{fromName}</span>
					<span style={styles.resultArrow}> evolved into </span>
					<span style={styles.resultTo}>{toName}!</span>
				</p>

				{/* Animation stage */}
				<div style={styles.evoStage}>
					{/* From sprite — visible during phases 1–2 */}
					{phase <= 2 && fromFile && (
						<img
							key={`from-${phase}`}
							src={fromSrc}
							alt={fromName}
							style={{
								...styles.evoStageLarge,
								animation:
									phase === 1
										? "evo-to-white 0.8s ease-in both"
										: "evo-scale-out 0.9s ease-in both",
							}}
							onError={(e) => {
								e.target.onerror = null;
								e.target.src = assetUrl(
									`/sprites/pokemon/large/${fromPoke.name}.png`,
								);
							}}
						/>
					)}
					{/* To sprite — visible during phases 2–4 */}
					{phase >= 2 && toFile && (
						<img
							key="to"
							src={toSrc}
							alt={toName}
							style={{
								...styles.evoStageLarge,
								animation:
									phase === 2
										? "evo-scale-in 0.9s ease-out both"
										: phase === 3
											? "evo-from-white 0.9s ease-out both"
											: "first-catch-glow 2.5s ease-in-out infinite",
							}}
							onError={(e) => {
								e.target.onerror = null;
								e.target.src = assetUrl(
									`/sprites/pokemon/large/${toPoke.name}.png`,
								);
							}}
						/>
					)}
				</div>

				<p style={styles.resultDismiss}>
					{phase < 4 ? "Tap to skip…" : "Click anywhere to close"}
				</p>
			</div>
		</div>
	);
}

// ── Styles ────────────────────────────────────────────────────────────────────
const styles = {
	root: {
		flex: 1,
		display: "flex",
		flexDirection: "column",
		overflow: "hidden",
	},
	empty: {
		flex: 1,
		display: "flex",
		flexDirection: "column",
		alignItems: "center",
		justifyContent: "center",
		gap: "8px",
		opacity: 0.4,
	},
	emptyIcon: {
		fontSize: "48px",
		color: "var(--accent)",
	},
	emptyText: {
		fontSize: "16px",
		fontWeight: "600",
		color: "var(--text-secondary)",
	},
	emptySubtext: {
		fontSize: "13px",
		color: "var(--text-muted)",
	},
	testBtn: {
		marginTop: "8px",
		padding: "6px 14px",
		background: "var(--bg-elevated)",
		border: "1px solid var(--border-strong)",
		borderRadius: "var(--radius-sm)",
		color: "var(--text-muted)",
		fontSize: "11px",
		cursor: "pointer",
	},
	grid: {
		display: "grid",
		gridTemplateColumns: "repeat(auto-fill, minmax(110px, 1fr))",
		alignItems: "start",
		gap: "10px",
		overflowY: "auto",
		paddingRight: "4px",
		flex: 1,
	},
	card: {
		background: "var(--bg-elevated)",
		border: "1px solid var(--border)",
		borderRadius: "var(--radius-md)",
		padding: "10px 6px 8px",
		display: "flex",
		flexDirection: "column",
		alignItems: "center",
		gap: "6px",
		cursor: "pointer",
		transition: "border-color var(--transition), background var(--transition)",
		height: "120px",
		boxSizing: "border-box",
	},
	imageWrap: {
		width: "56px",
		height: "56px",
		display: "flex",
		alignItems: "center",
		justifyContent: "center",
		position: "relative",
	},
	image: {
		width: "56px",
		height: "56px",
		objectFit: "contain",
		imageRendering: "pixelated",
	},
	cardInfo: {
		display: "flex",
		flexDirection: "column",
		alignItems: "center",
		gap: "2px",
		width: "100%",
	},
	cardName: {
		fontSize: "10px",
		fontWeight: "600",
		color: "var(--text-primary)",
		textAlign: "center",
		lineHeight: "1.3",
		wordBreak: "break-word",
	},
	cardCount: {
		fontSize: "10px",
		color: "var(--accent-bright)",
		fontWeight: "600",
	},
	// ── Popup ──
	overlay: {
		position: "fixed",
		top: 0,
		right: 0,
		bottom: 0,
		left: "var(--sidebar-width)",
		background: "rgba(0,0,0,0.7)",
		display: "flex",
		alignItems: "center",
		justifyContent: "center",
		zIndex: 100,
	},
	popup: {
		background: "var(--bg-elevated)",
		border: "1px solid var(--border-strong)",
		borderRadius: "var(--radius-lg)",
		padding: "28px 32px 24px",
		display: "flex",
		flexDirection: "column",
		gap: "16px",
		boxShadow: "var(--shadow-md)",
		minWidth: "380px",
		maxWidth: "500px",
		maxHeight: "85vh",
		overflowY: "auto",
		overflowX: "hidden",
	},
	popupHeader: {
		display: "flex",
		alignItems: "center",
		gap: "16px",
	},
	popupHeaderSprite: {
		width: "120px",
		height: "120px",
		objectFit: "contain",
		imageRendering: "pixelated",
		flexShrink: 0,
	},
	popupHeaderInfo: {
		display: "flex",
		flexDirection: "column",
		gap: "4px",
	},
	popupName: {
		fontSize: "20px",
		fontWeight: "700",
		color: "var(--text-primary)",
	},
	popupTypes: {
		display: "flex",
		gap: "4px",
		flexWrap: "wrap",
	},
	typeBadge: {
		fontSize: "9px",
		fontWeight: "700",
		color: "#fff",
		borderRadius: "3px",
		padding: "2px 6px",
		textTransform: "uppercase",
		letterSpacing: "0.04em",
	},
	popupCatchCount: {
		fontSize: "12px",
		color: "var(--accent-bright)",
		fontWeight: "600",
	},
	divider: {
		height: "1px",
		background: "var(--border)",
		margin: "0 -32px",
	},
	evoList: {
		display: "flex",
		flexDirection: "column",
		gap: "10px",
	},
	evoOption: {
		display: "flex",
		alignItems: "center",
		gap: "12px",
		background: "var(--bg-surface)",
		border: "1px solid var(--border)",
		borderRadius: "var(--radius-md)",
		padding: "10px 12px",
	},
	evoSprites: {
		display: "flex",
		alignItems: "center",
		gap: "6px",
		flexShrink: 0,
	},
	evoSprite: {
		width: "96px",
		height: "96px",
		objectFit: "contain",
		imageRendering: "pixelated",
	},
	evoArrow: {
		fontSize: "16px",
		color: "var(--text-muted)",
	},
	evoDetails: {
		flex: 1,
		display: "flex",
		flexDirection: "column",
		gap: "4px",
		minWidth: 0,
	},
	evoToName: {
		fontSize: "13px",
		fontWeight: "600",
		color: "var(--text-primary)",
		whiteSpace: "nowrap",
		overflow: "hidden",
		textOverflow: "ellipsis",
	},
	evoMeta: {
		display: "flex",
		alignItems: "center",
		gap: "6px",
		flexWrap: "wrap",
	},
	methodBadge: {
		fontSize: "10px",
		fontWeight: "600",
		color: "var(--accent)",
		background: "color-mix(in srgb, var(--accent) 15%, transparent)",
		border: "1px solid color-mix(in srgb, var(--accent) 40%, transparent)",
		borderRadius: "4px",
		padding: "2px 7px",
		whiteSpace: "nowrap",
	},
	countBadge: {
		fontSize: "11px",
		fontWeight: "700",
	},
	reqSprite: {
		width: "36px",
		height: "36px",
		objectFit: "contain",
		imageRendering: "pixelated",
	},
	evolveBtn: {
		flexShrink: 0,
		padding: "8px 16px",
		background: "var(--accent)",
		color: "#fff",
		border: "none",
		borderRadius: "var(--radius-sm)",
		fontSize: "13px",
		fontWeight: "700",
		cursor: "pointer",
		transition: "opacity var(--transition)",
	},
	resultPopupGold: {
		borderColor: "#FFD700",
		boxShadow: "0 0 32px rgba(255, 215, 0, 0.25)",
	},
	resultPopup: {
		background: "var(--bg-elevated)",
		border: "2px solid var(--border-strong)",
		borderRadius: "var(--radius-lg)",
		padding: "40px 56px 32px",
		display: "flex",
		flexDirection: "column",
		alignItems: "center",
		gap: "20px",
		boxShadow: "var(--shadow-md)",
		minWidth: "320px",
		maxWidth: "480px",
		maxHeight: "85vh",
		overflowY: "auto",
		overflowX: "hidden",
	},
	resultLine: {
		fontSize: "18px",
		fontWeight: "600",
		textAlign: "center",
		color: "var(--text-primary)",
	},
	resultFrom: {
		color: "var(--text-secondary)",
	},
	resultArrow: {
		color: "var(--text-muted)",
	},
	resultTo: {
		color: "var(--accent-bright)",
		fontWeight: "700",
	},
	evoStage: {
		position: "relative",
		width: "220px",
		height: "220px",
		display: "flex",
		alignItems: "center",
		justifyContent: "center",
	},
	evoStageLarge: {
		position: "absolute",
		width: "220px",
		height: "220px",
		objectFit: "contain",
		imageRendering: "pixelated",
	},
	resultDismiss: {
		fontSize: "11px",
		color: "var(--text-muted)",
		fontStyle: "italic",
	},
};
