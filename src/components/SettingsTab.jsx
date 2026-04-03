import { useState, useRef } from "react";
import { loadSave, saveGame, deleteSave, newGame } from "../lib/save";
import ConfirmDialog from "./ConfirmDialog";

export default function SettingsTab({
	gameState,
	setGameState,
	pushAchievement,
}) {
	const [toast, setToast] = useState(null);
	const [confirmAction, setConfirmAction] = useState(null); // { title, message, onConfirm, variant? }
	const importRef = useRef(null);
	const currentMode = gameState.gameMode ?? "easy";

	function showToast(message, type = "success") {
		setToast({ message, type });
		setTimeout(() => setToast(null), 2500);
	}

	function handleSave() {
		saveGame(gameState);
		showToast("Game saved.");
	}

	function handleLoad() {
		const saved = loadSave();
		setGameState(saved);
		showToast("Save loaded.");
	}

	function handleReset() {
		setConfirmAction({
			title: "Reset Game?",
			message:
				"All progress will be permanently deleted. This cannot be undone.",
			variant: "danger",
			onConfirm: () => {
				deleteSave();
				setGameState(loadSave());
				setConfirmAction(null);
				showToast("Game reset.", "warn");
			},
		});
	}

	function handleModeSwitch(mode) {
		if (mode === currentMode) return;
		setConfirmAction({
			title: `Switch to ${mode === "easy" ? "Easy" : "Full"} Mode?`,
			message:
				"This will start a new game and all current progress will be lost.",
			variant: "danger",
			onConfirm: () => {
				const fresh = newGame(mode);
				saveGame(fresh);
				setGameState(fresh);
				setConfirmAction(null);
				showToast(`Switched to ${mode === "easy" ? "Easy" : "Full"} mode.`);
			},
		});
	}

	function handleExport() {
		const json = JSON.stringify(gameState, null, 2);
		const blob = new Blob([json], { type: "application/json" });
		const url = URL.createObjectURL(blob);
		const a = document.createElement("a");
		a.href = url;
		a.download = `pokemon-catcher-save-${new Date().toISOString().slice(0, 10)}.json`;
		a.click();
		URL.revokeObjectURL(url);
		showToast("Save exported.");
	}

	function handleImportFile(e) {
		const file = e.target.files[0];
		if (!file) return;
		const reader = new FileReader();
		reader.onload = (evt) => {
			try {
				const parsed = JSON.parse(evt.target.result);
				if (!parsed.pokemon || !parsed.items)
					throw new Error("Invalid save file");
				saveGame(parsed);
				setGameState(loadSave());
				showToast("Save imported.");
			} catch {
				showToast("Invalid save file.", "warn");
			}
			e.target.value = "";
		};
		reader.readAsText(file);
	}

	return (
		<div style={styles.root}>
			<input
				ref={importRef}
				type="file"
				accept=".json"
				style={{ display: "none" }}
				onChange={handleImportFile}
			/>
			<div style={styles.sections}>
				<Section title="Gameplay">
					<div style={styles.actionRow}>
						<div style={styles.actionInfo}>
							<span style={styles.actionLabel}>Game Mode</span>
							<span style={styles.actionDesc}>
								{currentMode === "full"
									? "Full — evolution requires catching the amount specified in the Pokédex."
									: "Easy — each evolution costs one additional catch of the base form."}
							</span>
						</div>
						<div style={styles.modeToggle}>
							<button
								style={{
									...styles.modeBtn,
									...(currentMode === "full" ? styles.modeBtnActive : {}),
								}}
								onClick={() => handleModeSwitch("full")}>
								Full
							</button>
							<button
								style={{
									...styles.modeBtn,
									...(currentMode === "easy" ? styles.modeBtnActive : {}),
								}}
								onClick={() => handleModeSwitch("easy")}>
								Easy
							</button>
						</div>
					</div>
				</Section>

				<Section title="Save Data">
					<ActionRow
						label="Save Game"
						description="Write current progress to the save file."
						buttonLabel="Save"
						buttonVariant="primary"
						onClick={handleSave}
					/>
					<ActionRow
						label="Reload Save"
						description="Revert to the last saved state, discarding unsaved progress."
						buttonLabel="Load"
						buttonVariant="default"
						onClick={handleLoad}
					/>
					<ActionRow
						label="Reset Game"
						description="Permanently delete all progress and start fresh."
						buttonLabel="Reset"
						buttonVariant="danger"
						onClick={handleReset}
					/>
				</Section>

				<Section title="Backup">
					<ActionRow
						label="Export Save"
						description="Download your save as a .json file for backup."
						buttonLabel="Export"
						buttonVariant="default"
						onClick={handleExport}
					/>
					<ActionRow
						label="Import Save"
						description="Restore progress from a previously exported .json file."
						buttonLabel="Import"
						buttonVariant="default"
						onClick={() => importRef.current.click()}
					/>
				</Section>

				<Section title="Debug">
					<ActionRow
						label="Test Achievement"
						description="Trigger a sample achievement toast to preview how it looks."
						buttonLabel="Trigger"
						buttonVariant="default"
						onClick={() =>
							pushAchievement({
								icon: "🏆",
								title: "First Steps",
								description: "You caught your first Pokémon!",
							})
						}
					/>
				</Section>
			</div>

			{confirmAction && (
				<ConfirmDialog
					title={confirmAction.title}
					message={confirmAction.message}
					variant={confirmAction.variant}
					onConfirm={confirmAction.onConfirm}
					onCancel={() => setConfirmAction(null)}
				/>
			)}

			{toast && (
				<div
					style={{
						...styles.toast,
						...(toast.type === "warn" ? styles.toastWarn : styles.toastSuccess),
					}}>
					{toast.message}
				</div>
			)}
		</div>
	);
}

function Section({ title, children }) {
	return (
		<div style={styles.section}>
			<h2 style={styles.sectionTitle}>{title}</h2>
			<div style={styles.sectionBody}>{children}</div>
		</div>
	);
}

function ActionRow({
	label,
	description,
	buttonLabel,
	buttonVariant,
	onClick,
}) {
	const btnStyle = {
		...styles.btn,
		...(buttonVariant === "primary"
			? styles.btnPrimary
			: buttonVariant === "danger"
				? styles.btnDanger
				: styles.btnDefault),
	};
	return (
		<div style={styles.actionRow}>
			<div style={styles.actionInfo}>
				<span style={styles.actionLabel}>{label}</span>
				<span style={styles.actionDesc}>{description}</span>
			</div>
			<button style={btnStyle} onClick={onClick}>
				{buttonLabel}
			</button>
		</div>
	);
}

const styles = {
	root: {
		flex: 1,
		display: "flex",
		flexDirection: "column",
		overflow: "hidden",
		position: "relative",
	},
	sections: {
		display: "flex",
		flexDirection: "column",
		gap: "32px",
		overflowY: "auto",
		maxWidth: "600px",
	},
	section: {
		display: "flex",
		flexDirection: "column",
		gap: "4px",
	},
	sectionTitle: {
		fontSize: "12px",
		fontWeight: "700",
		color: "var(--text-muted)",
		textTransform: "uppercase",
		letterSpacing: "0.08em",
		marginBottom: "8px",
	},
	sectionBody: {
		background: "var(--bg-elevated)",
		border: "1px solid var(--border)",
		borderRadius: "var(--radius-md)",
		overflow: "hidden",
	},
	actionRow: {
		display: "flex",
		alignItems: "center",
		justifyContent: "space-between",
		gap: "24px",
		padding: "16px 20px",
		borderBottom: "1px solid var(--border)",
		":lastChild": { borderBottom: "none" },
	},
	actionInfo: {
		display: "flex",
		flexDirection: "column",
		gap: "3px",
	},
	actionLabel: {
		fontSize: "14px",
		fontWeight: "600",
		color: "var(--text-primary)",
	},
	actionDesc: {
		fontSize: "12px",
		color: "var(--text-muted)",
	},
	btn: {
		flexShrink: 0,
		padding: "7px 20px",
		borderRadius: "var(--radius-sm)",
		border: "none",
		fontSize: "13px",
		fontWeight: "600",
		cursor: "pointer",
		transition: "opacity var(--transition)",
	},
	btnPrimary: {
		background: "var(--accent)",
		color: "#fff",
	},
	btnDefault: {
		background: "var(--bg-surface)",
		color: "var(--text-secondary)",
		border: "1px solid var(--border-strong)",
	},
	btnDanger: {
		background: "transparent",
		color: "#e57373",
		border: "1px solid #e57373",
	},
	modeToggle: {
		display: "flex",
		flexShrink: 0,
		border: "1px solid var(--border-strong)",
		borderRadius: "var(--radius-sm)",
		overflow: "hidden",
	},
	modeBtn: {
		padding: "7px 20px",
		border: "none",
		background: "var(--bg-surface)",
		color: "var(--text-muted)",
		fontSize: "13px",
		fontWeight: "600",
		cursor: "pointer",
		transition: "all 0.15s ease",
	},
	modeBtnActive: {
		background: "var(--accent)",
		color: "#fff",
	},
	toast: {
		position: "absolute",
		bottom: "24px",
		left: "50%",
		transform: "translateX(-50%)",
		padding: "10px 24px",
		borderRadius: "20px",
		fontSize: "13px",
		fontWeight: "600",
		pointerEvents: "none",
	},
	toastSuccess: {
		background: "rgba(30, 40, 60, 0.92)",
		color: "var(--accent-bright)",
		border: "1px solid var(--accent)",
	},
	toastWarn: {
		background: "rgba(40, 20, 20, 0.92)",
		color: "#e57373",
		border: "1px solid #e57373",
	},
};
