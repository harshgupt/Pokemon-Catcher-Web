import { useEffect, useState } from "react";

const DURATION = 2000; // ms before auto-dismiss
const EXIT_MS = 350; // ms for exit animation

function AchievementToast({ toast, onDismiss }) {
	const [exiting, setExiting] = useState(false);

	function dismiss() {
		if (exiting) return;
		setExiting(true);
		setTimeout(() => onDismiss(toast.id), EXIT_MS);
	}

	useEffect(() => {
		const t = setTimeout(dismiss, DURATION);
		return () => clearTimeout(t);
	}, []);

	return (
		<div
			style={{
				...styles.toast,
				animation: exiting
					? `achievement-exit ${EXIT_MS}ms ease-in forwards`
					: "achievement-enter 0.35s ease-out",
			}}
			onClick={dismiss}>
			{/* Gold left stripe */}
			<div style={styles.stripe} />

			{/* Icon */}
			<span style={styles.icon}>✦</span>

			{/* Text */}
			<div style={styles.content}>
				<span style={styles.title}>{toast.title}</span>
				<span style={styles.desc}>{toast.description}</span>
			</div>

			{/* Close button */}
			<button
				style={styles.closeBtn}
				onClick={(e) => {
					e.stopPropagation();
					dismiss();
				}}>
				✕
			</button>
		</div>
	);
}

export default function AchievementToaster({ toasts, onDismiss }) {
	if (!toasts.length) return null;

	return (
		<div style={styles.container}>
			{toasts.map((t) => (
				<AchievementToast key={t.id} toast={t} onDismiss={onDismiss} />
			))}
		</div>
	);
}

const styles = {
	container: {
		position: "fixed",
		bottom: "24px",
		right: "24px",
		display: "flex",
		flexDirection: "column",
		gap: "10px",
		zIndex: 999,
		pointerEvents: "none",
	},
	toast: {
		position: "relative",
		display: "flex",
		alignItems: "center",
		gap: "12px",
		width: "320px",
		background: "var(--bg-elevated)",
		border: "1px solid rgba(255, 215, 0, 0.3)",
		borderRadius: "var(--radius-md)",
		boxShadow: "0 4px 20px rgba(0,0,0,0.6), 0 0 24px rgba(255, 215, 0, 0.08)",
		padding: "14px 36px 14px 16px",
		cursor: "pointer",
		overflow: "hidden",
		pointerEvents: "all",
		flexShrink: 0,
	},
	stripe: {
		position: "absolute",
		top: 0,
		left: 0,
		bottom: 0,
		width: "4px",
		background: "linear-gradient(180deg, #FFD700 0%, #b8860b 100%)",
		borderRadius: "var(--radius-md) 0 0 var(--radius-md)",
	},
	icon: {
		fontSize: "16px",
		flexShrink: 0,
		lineHeight: 1,
		color: "#FFD700",
		filter: "drop-shadow(0 0 6px rgba(255, 215, 0, 0.7))",
	},
	content: {
		flex: 1,
		display: "flex",
		flexDirection: "column",
		gap: "3px",
		minWidth: 0,
	},
	title: {
		fontSize: "13px",
		fontWeight: "700",
		color: "#FFD700",
		whiteSpace: "nowrap",
		overflow: "hidden",
		textOverflow: "ellipsis",
	},
	desc: {
		fontSize: "11px",
		color: "var(--text-secondary)",
		lineHeight: "1.4",
	},
	closeBtn: {
		position: "absolute",
		top: "8px",
		right: "10px",
		background: "none",
		border: "none",
		color: "var(--text-muted)",
		fontSize: "10px",
		cursor: "pointer",
		padding: "2px 4px",
		lineHeight: 1,
	},
};
