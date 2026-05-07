import { App, Plugin, PluginSettingTab, Setting, TFile } from 'obsidian';
import {v4 as uuidv4} from 'uuid';

interface NewFilenameSettings {
	defaultFilename: string;
	useUuid: boolean;
	watchedFolders: string[];
}

const DEFAULT_SETTINGS: NewFilenameSettings = {
	defaultFilename: 'Untitled',
	useUuid: false,
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
				const filename = this.settings.useUuid ? uuidv4() : (this.settings.defaultFilename || 'Untitled');
				const newBasename = this.getLowestNonColidingFilename(filename);
				const parentPath = file.parent?.path;
				const newPath = parentPath && parentPath !== '/'
					? `${parentPath}/${newBasename}.md`
					: `${newBasename}.md`;
				setTimeout(() => this.app.fileManager.renameFile(file, newPath), 0);
			}));
		});
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

class NewFIleNameSettingTab extends PluginSettingTab {
	plugin: NewFileNamePlugin;

	constructor(app: App, plugin: NewFileNamePlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		const {containerEl} = this;

		containerEl.empty();

		let textComponent: import('obsidian').TextComponent;

		new Setting(containerEl)
			.setName('Default filename')
			.setDesc('Filename for new markdown notes.')
			.addText(text => {
				textComponent = text;
				text
					.setPlaceholder('Untitled')
					.setValue(this.plugin.settings.defaultFilename)
					.setDisabled(this.plugin.settings.useUuid)
					.onChange(async (value) => {
						this.plugin.settings.defaultFilename = value;
						await this.plugin.saveSettings();
					});
			});

		new Setting(containerEl)
			.setName('Use UUID for new markdown files')
			.setDesc('When enabled, new notes get a UUID filename instead of the default filename above.')
			.addToggle(toggle => toggle
				.setValue(this.plugin.settings.useUuid)
				.onChange(async (value) => {
					this.plugin.settings.useUuid = value;
					textComponent.setDisabled(value);
					await this.plugin.saveSettings();
				}));

		new Setting(containerEl)
			.setName('Watched folders')
			.setDesc('Only apply to new notes in these folders (one per line, includes subfolders). Leave empty to apply everywhere.')
			.addTextArea(text => text
				.setPlaceholder('Notes\nJournal/Daily')
				.setValue(this.plugin.settings.watchedFolders.join('\n'))
				.onChange(async (value) => {
					this.plugin.settings.watchedFolders = value
						.split('\n')
						.map(f => f.trim())
						.filter(f => f.length > 0);
					await this.plugin.saveSettings();
				}));
	}
}
