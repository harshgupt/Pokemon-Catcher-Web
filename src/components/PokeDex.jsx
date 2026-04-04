import { useState } from "react";
import pokemon from "../data/pokemon.json";
import itemsData from "../data/items.json";
import filters from "../data/pokedex-filters.json";
import { assetUrl } from "../lib/assetUrl";
import {
	canEvolveInto,
	countUnlockedInChain,
	countChainForms,
} from "../lib/evolve";

const byId = Object.fromEntries(pokemon.map((p) => [p.id, p]));
const byItemId = Object.fromEntries(itemsData.map((i) => [i.id, i]));

// ── Evolution chain helpers ───────────────────────────────────────────────────
const parentOf = {};
pokemon.forEach((p) => {
	if (Array.isArray(p.nextForms)) {
		p.nextForms.forEach((nf) => {
			if (parentOf[nf.nextCharacterID] === undefined)
				parentOf[nf.nextCharacterID] = p.id;
		});
	}
});

function getBaseId(id, seen = new Set()) {
	if (seen.has(id)) return id;
	seen.add(id);
	return parentOf[id] !== undefined ? getBaseId(parentOf[id], seen) : id;
}

/** Walk the whole chain from root, returning every evolution step. */
function getAllChainEvolutions(selectedId) {
	const evolutions = [];
	const visited = new Set();
	function walk(id) {
		if (visited.has(id)) return;
		visited.add(id);
		const p = byId[id];
		if (!p || !Array.isArray(p.nextForms)) return;
		for (const nf of p.nextForms) {
			evolutions.push({ fromId: id, ...nf });
			walk(nf.nextCharacterID);
		}
	}
	walk(getBaseId(selectedId));
	return evolutions;
}

// ── Filter options ────────────────────────────────────────────────────────────
const TYPES = [
	"Normal",
	"Fire",
	"Water",
	"Electric",
	"Grass",
	"Ice",
	"Fighting",
	"Poison",
	"Ground",
	"Flying",
	"Psychic",
	"Bug",
	"Rock",
	"Ghost",
	"Dragon",
	"Dark",
	"Steel",
	"Fairy",
];

const REGIONS = [
	"Kanto",
	"Johto",
	"Hoenn",
	"Sinnoh",
	"Unova",
	"Kalos",
	"Alola",
	"Galar",
	"Hisui",
	"Paldea",
];
const FORMS = [
	{ value: "MegaEvolution", label: "Mega Evolution" },
	{ value: "RegionalForm", label: "Regional Form" },
	{ value: "GigantamaxForm", label: "Gigantamax" },
	{ value: "ConvergentForm", label: "Convergent Form" },
	{ value: "AlternateForm", label: "Alternate Form" },
];
const CLASSES = [
	{ value: "Starter", label: "Starter" },
	{ value: "Baby", label: "Baby" },
	{ value: "Fossil", label: "Fossil" },
	{ value: "PseudoLegendary", label: "Pseudo-Legendary" },
	{ value: "Legendary", label: "Legendary" },
	{ value: "Mythical", label: "Mythical" },
	{ value: "UltraBeast", label: "Ultra Beast" },
	{ value: "Paradox", label: "Paradox" },
];

// Pre-build Sets for O(1) lookup — all derived from pokemon.json
const formSets = {
	MegaEvolution:  new Set(pokemon.filter(p => Array.isArray(p.forms) && p.forms.includes('MegaEvolution')).map(p => p.id)),
	GigantamaxForm: new Set(pokemon.filter(p => Array.isArray(p.forms) && p.forms.includes('GigantamaxForm')).map(p => p.id)),
	RegionalForm:   new Set(pokemon.filter(p => Array.isArray(p.forms) && p.forms.includes('RegionalForm')).map(p => p.id)),
	AlternateForm:  new Set(pokemon.filter(p => Array.isArray(p.forms) && p.forms.includes('AlternateForm')).map(p => p.id)),
	ConvergentForm: new Set(pokemon.filter(p => Array.isArray(p.forms) && p.forms.includes('ConvergentForm')).map(p => p.id)),
};
const classSets = {
	UltraBeast:    new Set(pokemon.filter(p => Array.isArray(p.categories) && p.categories.includes('UltraBeast')).map(p => p.id)),
	Baby:          new Set(pokemon.filter(p => Array.isArray(p.categories) && p.categories.includes('Baby')).map(p => p.id)),
	Fossil:        new Set(pokemon.filter(p => Array.isArray(p.categories) && p.categories.includes('Fossil')).map(p => p.id)),
	Starter:       new Set(pokemon.filter(p => Array.isArray(p.categories) && p.categories.includes('Starter')).map(p => p.id)),
	Paradox:          new Set(pokemon.filter(p => Array.isArray(p.categories) && p.categories.includes('Paradox')).map(p => p.id)),
	PseudoLegendary:  new Set(pokemon.filter(p => Array.isArray(p.categories) && p.categories.includes('PseudoLegendary')).map(p => p.id)),
	Legendary:        new Set(pokemon.filter(p => Array.isArray(p.categories) && p.categories.includes('Legendary')).map(p => p.id)),
	...Object.fromEntries(Object.entries(filters.classes).map(([k, ids]) => [k, new Set(ids)])),
};

// ── Official Pokémon HOME type colours ────────────────────────────────────────
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

function isEvoReady(p, gameState, gameMode = "easy") {
	if (!gameState?.pokemon[p.id]?.isUnlocked) return false;
	if (!Array.isArray(p.nextForms) || p.nextForms.length === 0) return false;
	return p.nextForms.some((nf) =>
		canEvolveInto({ ...nf, fromId: p.id }, gameState, gameMode),
	);
}

export default function PokeDex({ gameState, gameMode = "easy" }) {
	const [query, setQuery] = useState("");
	const [type1, setType1] = useState("");
	const [type2, setType2] = useState("");
	const [region, setRegion] = useState("");
	const [form, setForm] = useState("");
	const [cls, setCls] = useState("");
	const [showCaught, setShowCaught] = useState(false);
	const [showUncaught, setShowUncaught] = useState(false);
	const [selected, setSelected] = useState(null);

	const allEntries = pokemon;
	const lowerQuery = query.toLowerCase();
	const hasFilters =
		query ||
		type1 ||
		type2 ||
		region ||
		form ||
		cls ||
		showCaught ||
		showUncaught;

	function resetFilters() {
		setQuery("");
		setType1("");
		setType2("");
		setRegion("");
		setForm("");
		setCls("");
		setShowCaught(true);
		setShowUncaught(true);
	}

	function isUnlocked(p) {
		return gameState?.pokemon[p.id]?.isUnlocked ?? false;
	}

	function matchesCategory(p) {
		if (query && !(p.displayName ?? p.name).toLowerCase().includes(lowerQuery))
			return false;
		if (type1 && !p.types?.includes(type1)) return false;
		if (type2 && !p.types?.includes(type2)) return false;
		if (region && p.region !== region) return false;
		if (form && !formSets[form]?.has(p.id)) return false;
		if (cls && !classSets[cls]?.has(p.id)) return false;
		return true;
	}

	function isHidden(p) {
		if (!matchesCategory(p)) return true;
		const caught = isUnlocked(p);
		if (showCaught && !showUncaught && !caught) return true;
		if (showUncaught && !showCaught && caught) return true;
		return false;
	}

	const progressEntries = allEntries.filter(matchesCategory);
	const progressTotal = progressEntries.length;
	const progressCaught = progressEntries.filter(isUnlocked).length;
	const progressPct =
		progressTotal > 0 ? (progressCaught / progressTotal) * 100 : 0;

	return (
		<div style={styles.root}>
			<input
				style={styles.search}
				type="text"
				placeholder="Search Pokémon…"
				value={query}
				onChange={(e) => setQuery(e.target.value)}
			/>
			<div style={styles.filters}>
				<select
					style={styles.select}
					value={type1}
					onChange={(e) => setType1(e.target.value)}>
					<option value="">Type 1</option>
					{TYPES.map((t) => (
						<option key={t} value={t}>
							{t}
						</option>
					))}
				</select>
				<select
					style={styles.select}
					value={type2}
					onChange={(e) => setType2(e.target.value)}>
					<option value="">Type 2</option>
					{TYPES.map((t) => (
						<option key={t} value={t}>
							{t}
						</option>
					))}
				</select>
				<select
					style={styles.select}
					value={region}
					onChange={(e) => setRegion(e.target.value)}>
					<option value="">Region</option>
					{REGIONS.map((r) => (
						<option key={r} value={r}>
							{r}
						</option>
					))}
				</select>
				<select
					style={{ ...styles.select, flex: "1.5 1 0" }}
					value={form}
					onChange={(e) => setForm(e.target.value)}>
					<option value="">Form</option>
					{FORMS.map((f) => (
						<option key={f.value} value={f.value}>
							{f.label}
						</option>
					))}
				</select>
				<select
					style={{ ...styles.select, flex: "1.5 1 0" }}
					value={cls}
					onChange={(e) => setCls(e.target.value)}>
					<option value="">Class</option>
					{CLASSES.map((c) => (
						<option key={c.value} value={c.value}>
							{c.label}
						</option>
					))}
				</select>
				<button
					style={{
						...styles.toggleBtn,
						...(showCaught ? styles.toggleBtnActive : {}),
					}}
					onClick={() => setShowCaught((v) => !v)}>
					Caught
				</button>
				<button
					style={{
						...styles.toggleBtn,
						...(showUncaught ? styles.toggleBtnActive : {}),
					}}
					onClick={() => setShowUncaught((v) => !v)}>
					Uncaught
				</button>
				{hasFilters && (
					<button
						style={styles.resetBtn}
						onClick={resetFilters}
						title="Reset filters">
						✕
					</button>
				)}
			</div>
			<div style={styles.progressBar}>
				<div style={styles.progressTrack}>
					<div style={{ ...styles.progressFill, width: `${progressPct}%` }} />
				</div>
				<span style={styles.progressLabel}>
					{progressCaught} / {progressTotal} caught
				</span>
			</div>
			<div style={styles.grid}>
				{allEntries.map((p, i) => (
					<PokeCard
						key={`${p.id}-${i}`}
						pokemon={p}
						hidden={isHidden(p)}
						unlocked={isUnlocked(p)}
						evoReady={isEvoReady(p, gameState, gameMode)}
						onSelect={setSelected}
						greyedLocked={true}
					/>
				))}
			</div>

			{selected &&
				(() => {
					const selUnlocked = isUnlocked(selected);
					const selName = selUnlocked
						? (selected.displayName ?? selected.name)
						: "?????";
					const rawRemaining =
						gameState?.pokemon[selected.id]?.numberToSpawn ?? 0;
					const remaining =
						gameMode === "easy"
							? Math.min(rawRemaining, countChainForms(selected.id))
							: rawRemaining;
					const numberCaught =
						gameState?.pokemon[selected.id]?.numberCaught ?? 0;
					const evolutions = getAllChainEvolutions(selected.id);

					return (
						<div style={styles.overlay} onClick={() => setSelected(null)}>
							<div style={styles.popup} onClick={(e) => e.stopPropagation()}>
								{/* ── Sprite + dex ID + name + types ── */}
								<img
									src={assetUrl(
										`/sprites/pokemon/large/${selected.spriteName ?? selected.name}.png`,
									)}
									alt={selected.name}
									style={{
										...styles.popupImage,
										filter: selUnlocked ? "none" : "brightness(0)",
									}}
									onError={(e) => {
										e.target.onerror = null;
										e.target.src = assetUrl(
											`/sprites/pokemon/large/${selected.name}.png`,
										);
									}}
								/>
								{selUnlocked && (
									<div style={styles.popupDexId}>
										#{String(selected.dexId).padStart(4, "0")}
									</div>
								)}
								<div style={styles.popupName}>
									<GenderedName name={selName} />
								</div>
								<div style={styles.popupTypes}>
									{(selected.types ?? []).map((t) => (
										<TypeBadge key={t} type={t} large />
									))}
								</div>

								{/* ── Stats row (base Pokémon only — evolved forms cannot be caught) ── */}
								{getBaseId(selected.id) === selected.id && (
									<div style={styles.statsRow}>
										<div style={styles.statChip}>
											<span style={styles.statLabel}>Caught</span>
											<span style={styles.statValue}>{numberCaught}</span>
										</div>
										<div style={styles.statChip}>
											<span style={styles.statLabel}>In the wild</span>
											<span style={styles.statValue}>{remaining}</span>
										</div>
									</div>
								)}

								{/* ── Evolution chain ── */}
								{evolutions.length > 0 && (
									<div style={styles.evoSection}>
										{evolutions.map((ev, i) => {
											const fromPoke = byId[ev.fromId];
											const toPoke = byId[ev.nextCharacterID];
											const fromFile = fromPoke
												? (fromPoke.spriteName ?? fromPoke.name)
												: null;
											const toFile = toPoke
												? (toPoke.spriteName ?? toPoke.name)
												: null;
											const fromLocked = !(
												gameState?.pokemon[ev.fromId]?.isUnlocked ?? false
											);
											const toLocked = !(
												gameState?.pokemon[ev.nextCharacterID]?.isUnlocked ??
												false
											);

											// Full detail only when selected pokemon is directly involved
											const involved =
												ev.fromId === selected.id ||
												ev.nextCharacterID === selected.id;

											if (!involved) {
												// Context row — sprites only
												return (
													<div
														key={i}
														style={{ ...styles.evoRow, opacity: 0.5 }}>
														{fromFile && (
															<img
																src={assetUrl(
																	`/sprites/pokemon/mid/${fromFile}.png`,
																)}
																style={{
																	...styles.evoSprite,
																	filter: fromLocked ? "brightness(0)" : "none",
																}}
																alt=""
															/>
														)}
														<span style={styles.evoArrow}>→</span>
														{toFile && (
															<img
																src={assetUrl(
																	`/sprites/pokemon/mid/${toFile}.png`,
																)}
																style={{
																	...styles.evoSprite,
																	filter: toLocked ? "brightness(0)" : "none",
																}}
																alt={toPoke?.name}
															/>
														)}
													</div>
												);
											}

											// Full detail row
											const rootId = getBaseId(ev.fromId);
											const rootCaught =
												gameState?.pokemon[rootId]?.numberCaught ?? 0;
											const methodLabel =
												{
													LevelUp: "Level Up",
													Item: "Item",
													CharacterRequired: "Pokémon",
													ItemAndCharacterRequired: "Item + Pokémon",
												}[ev.evolutionMethod] ?? ev.evolutionMethod;
											const needsItem =
												ev.evolutionMethod === "Item" ||
												ev.evolutionMethod === "ItemAndCharacterRequired";
											const needsChar =
												ev.evolutionMethod === "CharacterRequired" ||
												ev.evolutionMethod === "ItemAndCharacterRequired";
											const item = needsItem
												? byItemId[ev.evolutionItemID]
												: null;
											const itemSrc = item
												? item.tmType
													? assetUrl(`/sprites/items/TM ${item.tmType}.png`)
													: assetUrl(`/sprites/items/${item.name}.png`)
												: null;
											const hasItem = needsItem
												? (gameState?.items[ev.evolutionItemID]
														?.numberCollected ?? 0) > 0
												: true;
											const reqChar =
												needsChar && ev.characterRequiredID
													? byId[ev.characterRequiredID]
													: null;
											const reqCharFile = reqChar
												? (reqChar.spriteName ?? reqChar.name)
												: null;
											const reqCharUnlocked = needsChar
												? (gameState?.pokemon[ev.characterRequiredID]
														?.isUnlocked ?? false)
												: true;
											const easyRequired =
												countUnlockedInChain(rootId, gameState) + 1;
											const countMet =
												gameMode === "easy"
													? rootCaught >= easyRequired
													: rootCaught >= ev.characterCount;

											return (
												<div key={i} style={styles.evoRow}>
													{fromFile && (
														<img
															src={assetUrl(
																`/sprites/pokemon/mid/${fromFile}.png`,
															)}
															style={{
																...styles.evoSprite,
																filter: fromLocked ? "brightness(0)" : "none",
															}}
															alt=""
														/>
													)}
													<span style={styles.evoArrow}>→</span>
													{toFile && (
														<img
															src={assetUrl(
																`/sprites/pokemon/mid/${toFile}.png`,
															)}
															style={{
																...styles.evoSprite,
																filter: toLocked ? "brightness(0)" : "none",
															}}
															alt={toPoke?.name}
														/>
													)}
													{gameMode !== "easy" && (
														<span
															style={{
																...styles.evoCount,
																color: countMet
																	? "var(--accent-bright)"
																	: "var(--text-secondary)",
															}}>
															{rootCaught} / {ev.characterCount}
														</span>
													)}
													<span style={styles.methodBadge}>{methodLabel}</span>
													{needsItem && itemSrc && (
														<img
															src={itemSrc}
															alt={item?.name}
															title={item?.displayName ?? item?.name}
															style={{
																...styles.evoReqSprite,
																filter: hasItem ? "none" : "brightness(0.3)",
															}}
														/>
													)}
													{needsChar && reqCharFile && (
														<img
															src={assetUrl(
																`/sprites/pokemon/mid/${reqCharFile}.png`,
															)}
															alt={reqChar?.name}
															title={reqChar?.displayName ?? reqChar?.name}
															style={{
																...styles.evoReqSprite,
																filter: reqCharUnlocked
																	? "none"
																	: "brightness(0)",
															}}
														/>
													)}
												</div>
											);
										})}
									</div>
								)}
							</div>
						</div>
					);
				})()}
		</div>
	);
}

function GenderedName({ name }) {
	const femaleIdx = name.indexOf(" ♀");
	const maleIdx = name.indexOf(" ♂");
	if (femaleIdx !== -1) {
		return (
			<>
				{name.slice(0, femaleIdx)} <span style={{ color: "#f48fb1" }}>♀</span>
			</>
		);
	}
	if (maleIdx !== -1) {
		return (
			<>
				{name.slice(0, maleIdx)} <span style={{ color: "#90caf9" }}>♂</span>
			</>
		);
	}
	return <>{name}</>;
}

function TypeBadge({ type, large }) {
	const bg = TYPE_COLORS[type] ?? "#9FA19F";
	const override = large
		? { fontSize: "13px", padding: "3px 12px", borderRadius: "5px" }
		: {};
	return (
		<span style={{ ...styles.typeBadge, background: bg, ...override }}>
			{type}
		</span>
	);
}

function PokeCard({ pokemon: p, hidden, unlocked, evoReady, onSelect, greyedLocked }) {
	const [imgState, setImgState] = useState("loading");
	const displayName = unlocked ? (p.displayName ?? p.name) : "?????";
	const spriteFile = p.spriteName ?? p.name;

	const lockedFilter = greyedLocked
		? "grayscale(100%) brightness(0.4) opacity(0.6)"
		: "brightness(0)";

	return (
		<div
			style={
				hidden
					? { ...styles.card, display: "none" }
					: evoReady
						? {
								...styles.card,
								animation: "evo-ready-pulse 2s ease-in-out infinite",
							}
						: styles.card
			}
			onClick={() => onSelect(p)}>
			<div style={styles.imageWrap}>
				{imgState === "loading" && <div className="sprite-spinner" />}
				<img
					src={assetUrl(`/sprites/pokemon/mid/${spriteFile}.png`)}
					alt={p.name}
					style={{
						...styles.image,
						opacity: imgState === "loaded" ? 1 : 0,
						filter: unlocked ? "none" : lockedFilter,
					}}
					onLoad={() => setImgState("loaded")}
					onError={() => setImgState("error")}
				/>
			</div>
			<div style={styles.info}>
				<span style={styles.dexId}>
					{unlocked ? `#${String(p.dexId).padStart(4, "0")}` : "?????"}
				</span>
				<span style={styles.name}>
					<GenderedName name={displayName} />
				</span>
				<div style={styles.types}>
					{(p.types ?? []).map((t) => (
						<TypeBadge key={t} type={t} />
					))}
				</div>
			</div>
		</div>
	);
}

const styles = {
	root: {
		display: "flex",
		flexDirection: "column",
		gap: "8px",
		height: "100%",
	},
	search: {
		flexShrink: 0,
		width: "100%",
		padding: "6px 10px",
		background: "var(--bg-elevated)",
		border: "1px solid var(--border-strong)",
		borderRadius: "var(--radius-sm)",
		color: "var(--text-primary)",
		fontSize: "13px",
		outline: "none",
	},
	filters: {
		display: "flex",
		gap: "6px",
		flexShrink: 0,
		flexWrap: "wrap",
	},
	select: {
		flex: "1 1 0",
		minWidth: "80px",
		padding: "5px 6px",
		background: "var(--bg-elevated)",
		border: "1px solid var(--border-strong)",
		borderRadius: "var(--radius-sm)",
		color: "var(--text-primary)",
		fontSize: "11px",
		cursor: "pointer",
		outline: "none",
	},
	toggleBtn: {
		flexShrink: 0,
		padding: "5px 10px",
		background: "var(--bg-elevated)",
		border: "1px solid var(--border-strong)",
		borderRadius: "var(--radius-sm)",
		color: "var(--text-secondary)",
		fontSize: "11px",
		fontWeight: "600",
		cursor: "pointer",
		whiteSpace: "nowrap",
	},
	toggleBtnActive: {
		background: "color-mix(in srgb, var(--accent) 20%, transparent)",
		border: "1px solid var(--accent)",
		color: "var(--accent-bright)",
	},
	resetBtn: {
		flexShrink: 0,
		width: "28px",
		height: "28px",
		padding: "0",
		background: "var(--bg-elevated)",
		border: "1px solid var(--border-strong)",
		borderRadius: "50%",
		color: "var(--text-muted)",
		fontSize: "11px",
		cursor: "pointer",
		display: "flex",
		alignItems: "center",
		justifyContent: "center",
	},
	progressBar: {
		flexShrink: 0,
		display: "flex",
		alignItems: "center",
		gap: "10px",
	},
	progressTrack: {
		flex: 1,
		height: "6px",
		background: "var(--bg-elevated)",
		border: "1px solid var(--border-strong)",
		borderRadius: "999px",
		overflow: "hidden",
	},
	progressFill: {
		height: "100%",
		background: "var(--accent)",
		borderRadius: "999px",
		transition: "width 0.4s ease",
	},
	progressLabel: {
		flexShrink: 0,
		fontSize: "11px",
		fontWeight: "600",
		color: "var(--text-secondary)",
		whiteSpace: "nowrap",
	},
	grid: {
		display: "grid",
		gridTemplateColumns: "repeat(auto-fill, minmax(100px, 1fr))",
		alignItems: "start",
		alignContent: "start",
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
		justifyContent: "center",
		gap: "6px",
		cursor: "pointer",
		transition: "border-color var(--transition), background var(--transition)",
		height: "132px",
		boxSizing: "border-box",
	},
	imageWrap: {
		width: "52px",
		height: "52px",
		display: "flex",
		alignItems: "center",
		justifyContent: "center",
		position: "relative",
	},
	image: {
		width: "52px",
		height: "52px",
		objectFit: "contain",
		imageRendering: "pixelated",
	},
	info: {
		display: "flex",
		flexDirection: "column",
		alignItems: "center",
		width: "100%",
		gap: "4px",
	},
	dexId: {
		fontSize: "9px",
		color: "var(--text-muted)",
		fontWeight: "600",
		letterSpacing: "0.04em",
	},
	name: {
		fontSize: "10px",
		color: "var(--text-primary)",
		fontWeight: "500",
		textAlign: "center",
		lineHeight: "1.3",
		wordBreak: "break-word",
		height: "26px",
		display: "flex",
		alignItems: "center",
		justifyContent: "center",
		overflow: "hidden",
		width: "100%",
	},
	types: {
		display: "flex",
		gap: "3px",
		justifyContent: "center",
	},
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
		padding: "40px 48px 36px",
		display: "flex",
		flexDirection: "column",
		alignItems: "center",
		gap: "14px",
		boxShadow: "var(--shadow-md)",
		minWidth: "340px",
		maxWidth: "480px",
		maxHeight: "85vh",
		overflowY: "auto",
		overflowX: "hidden",
	},
	popupImage: {
		width: "300px",
		height: "300px",
		objectFit: "contain",
		imageRendering: "pixelated",
	},
	popupName: {
		fontSize: "24px",
		fontWeight: "700",
		color: "var(--text-primary)",
		textAlign: "center",
	},
	popupTypes: {
		display: "flex",
		gap: "8px",
		justifyContent: "center",
	},
	typeBadge: {
		fontSize: "8px",
		fontWeight: "700",
		color: "#fff",
		borderRadius: "3px",
		padding: "1px 5px",
		textTransform: "uppercase",
		letterSpacing: "0.04em",
		whiteSpace: "nowrap",
	},
	wildChip: {
		fontSize: "12px",
		color: "var(--text-secondary)",
		background: "var(--bg-surface)",
		border: "1px solid var(--border)",
		borderRadius: "var(--radius-sm)",
		padding: "4px 12px",
	},
	evoSection: {
		display: "flex",
		flexDirection: "column",
		gap: "6px",
		width: "100%",
		borderTop: "1px solid var(--border)",
		paddingTop: "12px",
	},
	evoRow: {
		display: "flex",
		alignItems: "center",
		gap: "8px",
		background: "var(--bg-surface)",
		border: "1px solid var(--border)",
		borderRadius: "var(--radius-sm)",
		padding: "6px 10px",
	},
	evoSprite: {
		width: "52px",
		height: "52px",
		objectFit: "contain",
		imageRendering: "pixelated",
		flexShrink: 0,
	},
	evoArrow: {
		fontSize: "14px",
		color: "var(--text-muted)",
		flexShrink: 0,
	},
	evoCount: {
		fontSize: "12px",
		fontWeight: "600",
		minWidth: "44px",
		textAlign: "right",
		marginRight: "4px",
	},
	evoReqSprite: {
		width: "28px",
		height: "28px",
		objectFit: "contain",
		imageRendering: "pixelated",
		flexShrink: 0,
		marginLeft: "2px",
	},
	popupDexId: {
		fontSize: "12px",
		fontWeight: "600",
		color: "var(--text-muted)",
		letterSpacing: "0.06em",
		marginBottom: "-8px",
	},
	statsRow: {
		display: "flex",
		gap: "8px",
		justifyContent: "center",
		flexWrap: "wrap",
	},
	statChip: {
		display: "flex",
		flexDirection: "column",
		alignItems: "center",
		gap: "2px",
		background: "var(--bg-surface)",
		border: "1px solid var(--border)",
		borderRadius: "var(--radius-sm)",
		padding: "6px 16px",
		minWidth: "80px",
	},
	statLabel: {
		fontSize: "10px",
		color: "var(--text-muted)",
		fontWeight: "500",
		textTransform: "uppercase",
		letterSpacing: "0.05em",
	},
	statValue: {
		fontSize: "20px",
		fontWeight: "700",
		color: "var(--text-primary)",
		lineHeight: 1,
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
		flexShrink: 0,
	},
};
