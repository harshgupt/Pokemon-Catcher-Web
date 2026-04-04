import { useState, useEffect, useRef } from "react";
import { achievementsData } from "../lib/achievements";

const TOTAL = achievementsData.length;

export default function AchievementsTab({ gameState, unreadIds = new Set(), onRead, isActive }) {
	const completed = new Set(gameState.completedAchievements ?? []);
	const [filter, setFilter] = useState("all"); // 'all' | 'completed' | 'incomplete' | 'unread'
	const [selected, setSelected] = useState(null); // achievement object

	// Snapshot of unread IDs taken when the tab was last opened — used for stable sort
	const [pinnedUnread, setPinnedUnread] = useState(() => new Set(unreadIds));
	const prevActive = useRef(false);
	useEffect(() => {
		if (isActive && !prevActive.current) {
			setPinnedUnread(new Set(unreadIds));
		}
		prevActive.current = isActive;
	}, [isActive]); // eslint-disable-line react-hooks/exhaustive-deps

	const completedCount = completed.size;
	const pct = TOTAL > 0 ? (completedCount / TOTAL) * 100 : 0;

	// Sort: pinned-unread first, then completed, then incomplete — all by id within group
	const sorted = [...achievementsData].sort((a, b) => {
		const au = pinnedUnread.has(a.id);
		const bu = pinnedUnread.has(b.id);
		if (au !== bu) return au ? -1 : 1;
		const ac = completed.has(a.id);
		const bc = completed.has(b.id);
		if (ac !== bc) return ac ? -1 : 1;
		return a.id - b.id;
	});

	const visible = sorted.filter(a => {
		if (filter === "completed")  return completed.has(a.id);
		if (filter === "incomplete") return !completed.has(a.id);
		if (filter === "unread")     return unreadIds.has(a.id);
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
				{[
					{ key: "all",        label: "All" },
					{ key: "completed",  label: "Unlocked" },
					{ key: "incomplete", label: "Locked" },
					{ key: "unread",     label: `Unread${unreadIds.size > 0 ? ` (${unreadIds.size})` : ""}` },
				].map(({ key, label }) => (
					<button
						key={key}
						style={{ ...styles.filterBtn, ...(filter === key ? styles.filterBtnActive : {}) }}
						onClick={() => setFilter(key === filter ? "all" : key)}
					>
						{label}
					</button>
				))}
			</div>

			{/* Grid */}
			<div style={styles.grid}>
				{visible.map(ach => {
					const done = completed.has(ach.id);
					const isUnread = unreadIds.has(ach.id);
					return (
						<AchievementCard
							key={ach.id}
							ach={ach}
							done={done}
							isUnread={isUnread}
							onClick={() => { onRead?.(ach.id); setSelected(ach); }}
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

function AchievementCard({ ach, done, isUnread, onClick }) {
	return (
		<div
			className={done ? "ach-card-done" : "ach-card-locked"}
			style={{
				...styles.card,
				...(done ? styles.cardDone : styles.cardLocked),
				...(isUnread ? styles.cardUnread : {}),
				position: "relative",
			}}
			onClick={onClick}
		>
			{isUnread && <span style={styles.unreadDot} />}
			<div style={styles.cardInner}>
				<span style={done ? styles.diamondDone : styles.diamondLocked}>◆</span>
				<span style={{ ...styles.cardName, ...(done ? {} : styles.cardNameLocked) }}>
					{ach.name}
				</span>
			</div>
			{done && ach.flavorText && (
				<div style={styles.cardFlavorWrap}>
					<p style={styles.cardFlavor}>{ach.flavorText}</p>
				</div>
			)}
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
		gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))",
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
		transition: "border-color var(--transition), background var(--transition)",
		boxSizing: "border-box",
		display: "flex",
		flexDirection: "column",
		gap: "8px",
		height: "110px",
	},
	cardInner: {
		display: "flex",
		alignItems: "center",
		gap: "7px",
		flexShrink: 0,
	},
	cardFlavorWrap: {
		flex: 1,
		overflow: "hidden",
		maskImage: "linear-gradient(to bottom, black 40%, transparent 100%)",
		WebkitMaskImage: "linear-gradient(to bottom, black 40%, transparent 100%)",
	},
	cardFlavor: {
		fontSize: "12px",
		color: "var(--text-secondary)",
		lineHeight: "1.5",
		fontStyle: "italic",
		margin: 0,
	},
	diamondDone: {
		fontSize: "8px",
		color: "#FFD700",
		flexShrink: 0,
	},
	diamondLocked: {
		fontSize: "8px",
		color: "var(--text-muted)",
		flexShrink: 0,
	},
	cardDone: {
		background: "var(--bg-elevated)",
		border: "1px solid rgba(255, 215, 0, 0.35)",
	},
	cardUnread: {
		border: "1px solid rgba(255, 215, 0, 0.8)",
		boxShadow: "0 0 10px rgba(255, 215, 0, 0.25)",
	},
	unreadDot: {
		position: "absolute",
		top: "6px",
		right: "7px",
		width: "7px",
		height: "7px",
		borderRadius: "50%",
		background: "#FFD700",
		boxShadow: "0 0 6px rgba(255, 215, 0, 0.9)",
	},
	cardLocked: {
		background: "var(--bg-surface)",
		border: "1px solid var(--border)",
		opacity: 0.55,
	},
	cardName: {
		fontSize: "13px",
		fontWeight: "700",
		color: "#FFD700",
		lineHeight: "1.3",
	},
	cardNameLocked: {
		color: "var(--text-muted)",
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
		fontSize: "14px",
		flexShrink: 0,
		lineHeight: 1,
		color: "#FFD700",
		filter: "drop-shadow(0 0 6px rgba(255, 215, 0, 0.6))",
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
