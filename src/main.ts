import { AbstractInputSuggest, App, Plugin, PluginSettingTab, Setting, TAbstractFile, TFile, TFolder, moment } from 'obsidian';
import {v4 as uuidv4} from 'uuid';

interface NewFilenameSettings {
	filenamePattern: string;
	dateFormat: string;
	watchedFolders: string[];
}

const DEFAULT_SETTINGS: NewFilenameSettings = {
	filenamePattern: 'Untitled',
	dateFormat: 'YYYY-MM-DD',
	watchedFolders: [],
}

export default class NewFileNamePlugin extends Plugin {
	settings: NewFilenameSettings;

	async onload() {
		await this.loadSettings();
		this.addSettingTab(new NewFIleNameSettingTab(this.app, this));

		this.app.workspace.onLayoutReady(() => {
			this.registerEvent(this.app.vault.on('create', file => {
				if (!(file instanceof TFile) || file.extension !== 'md') return;
				if (!this.isWatched(file)) return;
				const filename = this.resolvePattern() || 'Untitled';
				const newBasename = this.getLowestNonColidingFilename(filename);
				const parentPath = file.parent?.path;
				const newPath = parentPath && parentPath !== '/'
					? `${parentPath}/${newBasename}.md`
					: `${newBasename}.md`;
				const tryRename = async (retriesLeft: number) => {
					try {
						await this.app.fileManager.renameFile(file, newPath);
					} catch (e) {
						if (retriesLeft > 0) {
							setTimeout(() => tryRename(retriesLeft - 1), 100);
						}
					}
				};
				setTimeout(() => tryRename(5), 0);
			}));
		});
	}

	private resolvePattern(): string {
		return this.settings.filenamePattern
			.replace(/{{date}}/g, moment().format(this.settings.dateFormat))
			.replace(/{{uuid}}/g, uuidv4());
	}

	private isWatched(file: TFile): boolean {
		if (this.settings.watchedFolders.length === 0) return true;
		const folder = file.parent?.path ?? '/';
		return this.settings.watchedFolders.some(f => {
			const watched = f.trim().replace(/\/+$/, '');
			return folder === watched || folder.startsWith(watched + '/');
		});
	}

	private getLowestNonColidingFilename(filename: string) {
		const files = this.app.vault.getMarkdownFiles();
		const potentially_coliding_files = files.filter((file) => file.basename.includes(filename));
		const potentially_coliding_filenames = new Set(potentially_coliding_files.map((file) => file.basename));
		for (let i = 0; i < potentially_coliding_filenames.size + 1; i++) {
			let file_name_to_attempt = filename;
			if (i > 0) {
				file_name_to_attempt = `${filename} ${i}`;
			}
			if (!potentially_coliding_filenames.has(file_name_to_attempt)) {
				return file_name_to_attempt;
			}
		}
		throw new Error("Encountered Logic Mistake When Trying To Create New File");
	}

	onunload() {

	}

	async loadSettings() {
		this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
	}

	async saveSettings() {
		await this.saveData(this.settings);
	}
}

class FolderSuggest extends AbstractInputSuggest<TFolder> {
	constructor(app: App, public inputEl: HTMLInputElement) {
		super(app, inputEl);
	}
	getSuggestions(inputStr: string): TFolder[] {
		const lower = inputStr.toLowerCase();
		return this.app.vault.getAllLoadedFiles()
			.filter((f: TAbstractFile): f is TFolder => f instanceof TFolder && f.path.toLowerCase().includes(lower))
			.slice(0, 1000);
	}
	renderSuggestion(folder: TFolder, el: HTMLElement): void {
		el.setText(folder.path);
	}
	selectSuggestion(folder: TFolder): void {
		this.setValue(folder.path);
		this.inputEl.trigger('input');
		this.close();
	}
}

class NewFIleNameSettingTab extends PluginSettingTab {
	plugin: NewFileNamePlugin;

	constructor(app: App, plugin: NewFileNamePlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		const {containerEl} = this;
		containerEl.empty();

		const CARD = 'background:var(--background-secondary);border-radius:var(--radius-m);border:1px solid var(--background-modifier-border);overflow:hidden;margin-bottom:16px;';

		// --- Card 1: File name pattern + Date format ---
		const patternCardEl = containerEl.createDiv();
		patternCardEl.style.cssText = CARD;

		let liveDateFormat = this.plugin.settings.dateFormat;

		const patternSetting = new Setting(patternCardEl)
			.setName('File name pattern')
			.setDesc('Pattern for new note filenames. Use {{date}} and {{uuid}} as tokens.')
			.addText(text => text
				.setPlaceholder('Untitled')
				.setValue(this.plugin.settings.filenamePattern)
				.onChange(async (value) => {
					this.plugin.settings.filenamePattern = value;
					await this.plugin.saveSettings();
					updatePatternPreview(value);
				}));
		patternSetting.settingEl.style.borderTop = 'none';

		const patternPreviewLine = patternSetting.descEl.createEl('div');
		patternPreviewLine.appendText('Your current pattern looks like this: ');
		const patternPreviewValue = patternPreviewLine.createEl('span');
		patternPreviewValue.style.color = 'var(--link-color)';
		patternPreviewValue.style.fontWeight = 'bold';

		const updatePatternPreview = (pattern: string) => {
			const resolved = (pattern || 'Untitled')
				.replace(/{{date}}/g, moment().format(liveDateFormat || 'YYYY-MM-DD'))
				.replace(/{{uuid}}/g, uuidv4());
			patternPreviewValue.setText(resolved);
		};

		updatePatternPreview(this.plugin.settings.filenamePattern);

		patternCardEl.createEl('hr').style.margin = '0';

		const dateFormatSetting = new Setting(patternCardEl)
			.setName('Date format')
			.setDesc('Format for {{date}} in the file name pattern. Uses Moment.js tokens.')
			.addText(text => text
				.setPlaceholder('YYYY-MM-DD')
				.setValue(this.plugin.settings.dateFormat)
				.onChange(async (value) => {
					liveDateFormat = value;
					this.plugin.settings.dateFormat = value;
					await this.plugin.saveSettings();
					updateDatePreview(value);
					updatePatternPreview(this.plugin.settings.filenamePattern);
				}));
		dateFormatSetting.settingEl.style.borderTop = 'none';

		const datePreviewLine = dateFormatSetting.descEl.createEl('div');
		datePreviewLine.appendText('Your current format looks like this: ');
		const datePreviewValue = datePreviewLine.createEl('span');
		datePreviewValue.style.color = 'var(--link-color)';
		datePreviewValue.style.fontWeight = 'bold';

		const updateDatePreview = (format: string) => {
			try {
				datePreviewValue.setText(moment().format(format || 'YYYY-MM-DD'));
			} catch {
				datePreviewValue.setText('Invalid format');
			}
		};

		updateDatePreview(this.plugin.settings.dateFormat);

		// --- Card 2: Watched folders ---
		const foldersCardEl = containerEl.createDiv();
		foldersCardEl.style.cssText = CARD;

		const watchedHeader = new Setting(foldersCardEl)
			.setName('Watched folders')
			.setDesc('Only rename notes in these folders (includes subfolders). Leave empty to apply everywhere.');
		watchedHeader.settingEl.style.borderTop = 'none';

		const rowContainerEl = foldersCardEl.createDiv();

		const renderFolderRows = () => {
			rowContainerEl.empty();
			this.plugin.settings.watchedFolders.forEach((folder, index) => {
				const s = new Setting(rowContainerEl)
					.addSearch(cb => {
						new FolderSuggest(this.app, cb.inputEl);
						cb.setPlaceholder('Folder path')
							.setValue(folder)
							.onChange(async value => {
								this.plugin.settings.watchedFolders[index] = value;
								await this.plugin.saveSettings();
							});
						cb.inputEl.style.width = '100%';
					})
					.addExtraButton(cb => {
						cb.setIcon('cross')
							.setTooltip('Remove')
							.onClick(async () => {
								this.plugin.settings.watchedFolders.splice(index, 1);
								await this.plugin.saveSettings();
								renderFolderRows();
							});
					});
				s.infoEl.remove();
				s.controlEl.style.flex = '1';
				s.settingEl.style.borderTop = 'none';
				s.settingEl.style.paddingTop = '4px';
				s.settingEl.style.paddingBottom = '4px';
			});
		};

		renderFolderRows();

		foldersCardEl.createEl('hr').style.margin = '0';

		const addBtnSetting = new Setting(foldersCardEl)
			.addButton(btn => btn
				.setButtonText('Add watched folder')
				.setCta()
				.onClick(async () => {
					this.plugin.settings.watchedFolders.push('');
					await this.plugin.saveSettings();
					renderFolderRows();
				}));
		addBtnSetting.settingEl.style.borderTop = 'none';
		addBtnSetting.infoEl.remove();
	}
}
