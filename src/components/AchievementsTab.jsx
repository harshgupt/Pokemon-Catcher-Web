import { useState } from "react";
import { achievementsData } from "../lib/achievements";

const TOTAL = achievementsData.length;

export default function AchievementsTab({ gameState }) {
	const completed = new Set(gameState.completedAchievements ?? []);
	const [filter, setFilter] = useState("all"); // 'all' | 'completed' | 'incomplete'
	const [selected, setSelected] = useState(null); // achievement object

	const completedCount = completed.size;
	const pct = TOTAL > 0 ? (completedCount / TOTAL) * 100 : 0;

	// Sort: completed first (by id), then incomplete (by id)
	const sorted = [...achievementsData].sort((a, b) => {
		const ac = completed.has(a.id);
		const bc = completed.has(b.id);
		if (ac !== bc) return ac ? -1 : 1;
		return a.id - b.id;
	});

	const visible = sorted.filter(a => {
		if (filter === "completed") return completed.has(a.id);
		if (filter === "incomplete") return !completed.has(a.id);
		return true;
	});

	return (
		<div style={styles.root}>
			{/* Progress bar */}
			<div style={styles.progressRow}>
				<div style={styles.progressTrack}>
					<div style={{ ...styles.progressFill, width: `${pct}%` }} />
				</div>
				<span style={styles.progressLabel}>
					{completedCount} / {TOTAL} unlocked
				</span>
			</div>

			{/* Filter buttons */}
			<div style={styles.filterRow}>
				{["all", "completed", "incomplete"].map(f => (
					<button
						key={f}
						style={{ ...styles.filterBtn, ...(filter === f ? styles.filterBtnActive : {}) }}
						onClick={() => setFilter(f === filter ? "all" : f)}
					>
						{f === "all" ? "All" : f === "completed" ? "Unlocked" : "Locked"}
					</button>
				))}
			</div>

			{/* Grid */}
			<div style={styles.grid}>
				{visible.map(ach => {
					const done = completed.has(ach.id);
					return (
						<AchievementCard
							key={ach.id}
							ach={ach}
							done={done}
							onClick={() => setSelected(ach)}
						/>
					);
				})}
			</div>

			{/* Popup */}
			{selected && (
				<AchievementPopup
					ach={selected}
					done={completed.has(selected.id)}
					onClose={() => setSelected(null)}
				/>
			)}
		</div>
	);
}

function AchievementCard({ ach, done, onClick }) {
	return (
		<div
			className={done ? "ach-card-done" : "ach-card-locked"}
			style={{ ...styles.card, ...(done ? styles.cardDone : styles.cardLocked) }}
			onClick={onClick}
		>
			<span style={{ ...styles.cardName, ...(done ? {} : styles.cardNameLocked) }}>
				{ach.name}
			</span>
			{done && ach.flavorText && (
				<span style={styles.cardFlavor}>{ach.flavorText}</span>
			)}
			{!done && <span style={styles.lockIcon}>◇</span>}
		</div>
	);
}

function AchievementPopup({ ach, done, onClose }) {
	return (
		<div style={styles.overlay} onClick={onClose}>
			<div
				style={{ ...styles.popup, ...(done ? styles.popupDone : styles.popupLocked) }}
				onClick={e => e.stopPropagation()}
			>
				<div style={styles.popupHeader}>
					<span style={styles.popupIcon}>{done ? "◆" : "◇"}</span>
					<span style={{ ...styles.popupName, ...(done ? {} : styles.popupNameLocked) }}>
						{ach.name}
					</span>
				</div>

				{done && ach.flavorText && (
					<p style={styles.popupFlavor}>{ach.flavorText}</p>
				)}

				<div style={styles.divider} />

				<div style={styles.popupCriteriaRow}>
					<span style={styles.popupCriteriaLabel}>How to unlock</span>
					<p style={{ ...styles.popupCriteria, ...(done ? {} : styles.popupCriteriaLocked) }}>
						{ach.unlockCriteria}
					</p>
				</div>

				<button style={styles.closeBtn} onClick={onClose}>✕</button>
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
		gap: "16px",
		overflow: "hidden",
	},
	progressRow: {
		display: "flex",
		alignItems: "center",
		gap: "14px",
		flexShrink: 0,
	},
	progressTrack: {
		flex: 1,
		height: "6px",
		background: "var(--border-strong)",
		borderRadius: "3px",
		overflow: "hidden",
	},
	progressFill: {
		height: "100%",
		background: "var(--accent)",
		borderRadius: "3px",
		transition: "width 0.4s ease",
		boxShadow: "0 0 8px var(--accent)",
	},
	progressLabel: {
		fontSize: "12px",
		color: "var(--text-muted)",
		whiteSpace: "nowrap",
		flexShrink: 0,
	},
	filterRow: {
		display: "flex",
		gap: "8px",
		flexShrink: 0,
	},
	filterBtn: {
		padding: "6px 16px",
		borderRadius: "var(--radius-sm)",
		border: "1px solid var(--border-strong)",
		background: "transparent",
		color: "var(--text-muted)",
		fontSize: "12px",
		fontWeight: "600",
		cursor: "pointer",
		transition: "all var(--transition)",
		letterSpacing: "0.03em",
	},
	filterBtnActive: {
		background: "var(--accent-glow)",
		borderColor: "var(--accent)",
		color: "var(--accent)",
	},
	grid: {
		display: "grid",
		gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))",
		gap: "10px",
		overflowY: "auto",
		paddingRight: "4px",
		flex: 1,
		alignContent: "start",
	},
	card: {
		borderRadius: "var(--radius-md)",
		padding: "12px 14px",
		cursor: "pointer",
		display: "flex",
		flexDirection: "column",
		gap: "6px",
		transition: "border-color var(--transition), background var(--transition)",
		minHeight: "64px",
		boxSizing: "border-box",
	},
	cardDone: {
		background: "var(--bg-elevated)",
		border: "1px solid rgba(255, 215, 0, 0.35)",
	},
	cardLocked: {
		background: "var(--bg-surface)",
		border: "1px solid var(--border)",
		opacity: 0.55,
	},
	cardName: {
		fontSize: "12px",
		fontWeight: "700",
		color: "#FFD700",
		lineHeight: "1.3",
	},
	cardNameLocked: {
		color: "var(--text-muted)",
	},
	cardFlavor: {
		fontSize: "10px",
		color: "var(--text-secondary)",
		lineHeight: "1.4",
		overflow: "hidden",
		display: "-webkit-box",
		WebkitLineClamp: 2,
		WebkitBoxOrient: "vertical",
	},
	lockIcon: {
		fontSize: "11px",
		color: "var(--text-muted)",
		opacity: 0.5,
	},
	// Popup
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
		borderRadius: "var(--radius-lg)",
		padding: "28px 32px 24px",
		display: "flex",
		flexDirection: "column",
		gap: "14px",
		boxShadow: "var(--shadow-md)",
		minWidth: "360px",
		maxWidth: "480px",
		position: "relative",
	},
	popupDone: {
		background: "var(--bg-elevated)",
		border: "1px solid rgba(255,215,0,0.5)",
		boxShadow: "0 4px 32px rgba(255,215,0,0.12), var(--shadow-md)",
	},
	popupLocked: {
		background: "var(--bg-surface)",
		border: "1px solid var(--border-strong)",
		opacity: 0.85,
	},
	popupHeader: {
		display: "flex",
		alignItems: "center",
		gap: "12px",
	},
	popupIcon: {
		fontSize: "22px",
		flexShrink: 0,
		lineHeight: 1,
		color: "var(--accent)",
		filter: "drop-shadow(0 0 6px var(--accent))",
	},
	popupName: {
		fontSize: "18px",
		fontWeight: "700",
		color: "#FFD700",
		lineHeight: "1.3",
	},
	popupNameLocked: {
		color: "var(--text-secondary)",
	},
	popupFlavor: {
		fontSize: "13px",
		color: "var(--text-secondary)",
		lineHeight: "1.6",
		fontStyle: "italic",
		margin: 0,
	},
	divider: {
		height: "1px",
		background: "var(--border)",
		margin: "0 -32px",
	},
	popupCriteriaRow: {
		display: "flex",
		flexDirection: "column",
		gap: "6px",
	},
	popupCriteriaLabel: {
		fontSize: "10px",
		fontWeight: "700",
		color: "var(--text-muted)",
		textTransform: "uppercase",
		letterSpacing: "0.08em",
	},
	popupCriteria: {
		fontSize: "13px",
		color: "var(--text-primary)",
		lineHeight: "1.5",
		margin: 0,
	},
	popupCriteriaLocked: {
		color: "var(--text-secondary)",
	},
	closeBtn: {
		position: "absolute",
		top: "12px",
		right: "14px",
		background: "none",
		border: "none",
		color: "var(--text-muted)",
		fontSize: "12px",
		cursor: "pointer",
		padding: "4px 6px",
		lineHeight: 1,
	},
};
