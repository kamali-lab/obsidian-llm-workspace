import { PluginSettingTab, App, Setting, Notice } from "obsidian"
import type LlmPlugin from "src/main"
import { DEFAULT_SYSTEM_PROMPT } from "./prompts"
import { Pruner } from "src/storage/pruner"
import { logger } from "src/utils/logger"

import OpenAI from "openai"

export interface LlmPluginSettings {
	openAIApiKey: string
	anthropicApikey: string
	customModelUrl: string
	customModelApiKey: string
	customEmbeddingModelName: string
	customEmbeddingModelUrl: string
	customEmbeddingModelApiKey: string

	systemPrompt: string
	noteContextMinChars: number
	chunkSize: number
	retrievedNodeCount: number

	questionAndAnswerModel: string
	noteContextModel: string

	promptFolder: string
}

export const DEFAULT_SETTINGS: LlmPluginSettings = {
	openAIApiKey: "",
	anthropicApikey: "",
	customModelUrl: "",
	customModelApiKey: "",
	customEmbeddingModelName: "",
	customEmbeddingModelUrl: "",
	customEmbeddingModelApiKey: "",

	systemPrompt: DEFAULT_SYSTEM_PROMPT,
	noteContextMinChars: 500,
	chunkSize: 1000,
	retrievedNodeCount: 10,

	questionAndAnswerModel: "",
	noteContextModel: "",

	promptFolder: "Resources/LLM/Prompts"
}

const MODELS = [
	"gpt-4-turbo-2024-04-09",
	"gpt-4o-2024-08-06",
	"gpt-4o-mini-2024-07-18",
	"claude-3-5-haiku-20241022",
	"claude-3-5-sonnet-20241022",
	"claude-3-opus-20240229",
	"claude-3-7-sonnet-20250219"
]

export class LlmSettingTab extends PluginSettingTab {
	plugin: LlmPlugin
	private fetchedModels: string[] = []
	private fetchedEmbeddingModels: string[] = []

	constructor(app: App, plugin: LlmPlugin) {
		super(app, plugin)
		this.plugin = plugin
		this.fetchAvailableModels()
	}

	display(): void {
		const { containerEl } = this

		containerEl.empty()

		new Setting(containerEl)
		.setName("Model for conversations")
		.setDesc("The model used to answer questions in the LLM workspace view")
		.addDropdown((dropdown) => {
			dropdown
				.addOptions(this.modelOptions())
				.setValue(this.plugin.settings.questionAndAnswerModel)
				.onChange(async (value) => {
					this.plugin.settings.questionAndAnswerModel = value;
					await this.plugin.saveSettings();
				})
		})

		new Setting(containerEl)
			.setName("Model for note context")
			.setDesc("The model used to generate note context (summary, key topics)")
			.addDropdown((dropdown) => {
				dropdown
					.addOptions(this.modelOptions())
					.setValue(this.plugin.settings.noteContextModel)
					.onChange(async (value) => {
						this.plugin.settings.noteContextModel = value
						await this.plugin.saveSettings()
					})
			})

		if (this.plugin.settings.customEmbeddingModelUrl && this.plugin.settings.customEmbeddingModelApiKey)
			new Setting(containerEl)
			.setName("Model for embeddings")
			.setDesc("The model used to generate embeddings (this must be an embedding model!)")
			.addDropdown((dropdown) => {
				dropdown
					.addOptions(this.embeddingModelOptions())
					.setValue(this.plugin.settings.customEmbeddingModelName)
					.onChange(async (value) => {
						this.plugin.settings.customEmbeddingModelName = value
						await this.plugin.saveSettings()
					})
			})

		new Setting(containerEl)
			.setName("Prompt folder location")
			.setDesc(
				"Files in this folder will be available as prompts. Type @ in the chat input to open the prompt selector.",
			)
			.addText((text) => {
				text
				.setValue(this.plugin.settings.promptFolder)
				.setPlaceholder("Select a folder")
				.onChange(async (value) => {
					this.plugin.settings.promptFolder = value
					await this.plugin.saveSettings()
				})
			})


		new Setting(containerEl)
			.setName("Note context minimum length")
			.setDesc(
				"Don't create note context (summary, key topics) for notes shorter than this many characters.",
			)
			.addSlider((slider) => {
				slider
					.setLimits(0, 1000, 100)
					.setValue(this.plugin.settings.noteContextMinChars)
					.setDynamicTooltip()
					.onChange(async (value) => {
						this.plugin.settings.noteContextMinChars = value
						await this.plugin.saveSettings()
					})
			})
		
		new Setting(containerEl)
			.setName("Prune database")
			.setDesc("For most file change events in your vault, the plugin's database is kept in sync automatically. However, some vault changes don't remove plugin data immediately to avoid expensive LLM API calls in case it's needed again (such as building embeddings). This button manually prunes the plugin database.")
			.addButton((button) => {
				button.setButtonText("Prune")
					.onClick(async () => {
						const pruner = new Pruner(this.app.vault, this.plugin.db)
						const count = await pruner.prune()
						new Notice(`Pruned ${count} database entries.`, 0)
					})
			})
		
		new Setting(containerEl)
			.setName("Enable logging")
			.setDesc("Enable logging to the developer console.")
			.addToggle((toggle) => {
				toggle
					.setValue(logger.isEnabled())
					.onChange(async (value) => {
						logger.toggleLogging(value)
					})
			})

		new Setting(containerEl)
			.setName("API keys")
			.setHeading()

		const openaiApiKeyDesc = document.createDocumentFragment()
		const openaiLink = document.createElement("a")
		openaiLink.href = "https://platform.openai.com"
		openaiLink.textContent = "platform.openai.com"
		openaiApiKeyDesc.append(
			"Required when using workspace chat mode, even if a different LLM provider is used for answering questions (document embedding always uses the OpenAI API).",
			document.createElement("br"),
			"Create a key at ",
			openaiLink,
		)

		new Setting(containerEl)
			.setName("OpenAI API key")
			.setDesc(openaiApiKeyDesc)
			.addText((text) =>
				text
					.setPlaceholder("sk-")
					.setValue(this.plugin.settings.openAIApiKey)
					.onChange(async (value) => {
						this.plugin.settings.openAIApiKey = value
						await this.plugin.saveSettings()
			}),
			)

		const anthropicApiKeyDesc = document.createDocumentFragment()
		const anthropicLink = document.createElement("a")
		anthropicLink.href = "https://console.anthropic.com"
		anthropicLink.textContent = "console.anthropic.com"
		anthropicApiKeyDesc.append(
			"Required when using an Anthropic model.",
			document.createElement("br"),
			"Create a key at ",
			anthropicLink,
		)
		new Setting(containerEl)
			.setName("Anthropic API key")
			.setDesc(anthropicApiKeyDesc)
			.addText((text) =>
				text
					.setPlaceholder("sk-ant-")
					.setValue(this.plugin.settings.anthropicApikey)
					.onChange(async (value) => {
						this.plugin.settings.anthropicApikey = value
						await this.plugin.saveSettings()
			}),
			)

		// New custom model section.	
		new Setting(containerEl)
		.setName("Custom OpenAI-Compatible Endpoint")
		.setDesc("Bring your own model! Connect any OpenAI-compatible LLM")
		.setHeading();
		  


		new Setting(containerEl)
			.setName("API Base URL")
			.setDesc("Endpoint URL for the OpenAI-compatible model")
			.addText(text =>
				text
					.setPlaceholder("https://api.custom-llm.com/v1/")
					.setValue(this.plugin.settings.customModelUrl)
					.onChange(async (value) => {
						if (value.endsWith("/v1") && !value.endsWith("/v1/")) {
							value += "/"
						}
						this.plugin.settings.customModelUrl = value
						await this.plugin.saveSettings()
						this.fetchAvailableModels();
						if (this.fetchedModels)
							new Notice(`Fetched ${this.fetchedModels.length} models from custom endpoint`);
			  }),
			)

		new Setting(containerEl)
			.setName("API Key")
			.setDesc("Key for your custom endpoint")
			.addText(text =>
				text
					.setPlaceholder("sk-custom-...")
					.setValue(this.plugin.settings.customModelApiKey)
					.onChange(async (value) => {
						this.plugin.settings.customModelApiKey = value
						await this.plugin.saveSettings()
						this.fetchAvailableModels();
						if (this.fetchedModels)
							new Notice(`Fetched ${this.fetchedModels.length} models from custom endpoint`);
			}),
			)

		new Setting(containerEl)
			.setName("Embedding API Base URL")
			.setDesc("Endpoint URL for the OpenAI-compatible embedding model")
			.addText(text =>
				text
					.setPlaceholder("https://api.custom-llm.com/v1/")
					.setValue(this.plugin.settings.customEmbeddingModelUrl)
					.onChange(async (value) => {
						if (value.endsWith("/v1") && !value.endsWith("/v1/")) {
							value += "/"
						}
						this.plugin.settings.customEmbeddingModelUrl = value
						if (!this.plugin.settings.customEmbeddingModelUrl || !this.plugin.settings.customEmbeddingModelApiKey) {
							this.plugin.settings.customEmbeddingModelName = ""
						}
						await this.plugin.saveSettings()
						this.fetchAvailableModels();
						if (this.fetchedEmbeddingModels)
							new Notice(`Fetched ${this.fetchedEmbeddingModels.length} embedding models from custom endpoint`);
			  }),
			)

		new Setting(containerEl)
			.setName("Embedding API Key")
			.setDesc("Key for your custom embedding endpoint")
			.addText(text =>
				text
					.setPlaceholder("sk-custom-...")
					.setValue(this.plugin.settings.customEmbeddingModelApiKey)
					.onChange(async (value) => {
						this.plugin.settings.customEmbeddingModelApiKey = value
						if (!this.plugin.settings.customEmbeddingModelUrl || !this.plugin.settings.customEmbeddingModelApiKey) {
							this.plugin.settings.customEmbeddingModelName = ""
						}
						await this.plugin.saveSettings()
						this.fetchAvailableModels();
						if (this.fetchedEmbeddingModels)
							new Notice(`Fetched ${this.fetchedEmbeddingModels.length} embedding models from custom endpoint`);
			}),
			)

		new Setting(containerEl)
			.setName("Retrieval parameters")
			.setHeading()

		new Setting(containerEl)
			.setName("System prompt")
			.setDesc("The instructions and extra context included in all LLM queries.")
			.addTextArea((textarea) => {
				textarea
					.setPlaceholder("System prompt")
					.setValue(this.plugin.settings.systemPrompt)
					.onChange(async (value) => {
						this.plugin.settings.systemPrompt = value
						await this.plugin.saveSettings()
					})
				textarea.inputEl.rows = 10
				textarea.inputEl.style.width = "100%"
			})

		new Setting(containerEl)
			.setName("Chunk size")
			.setDesc(
				"Notes are chunked into smaller parts before indexing and during retrieval. This setting controls the maximum size of a chunk (in characters).",
			)
			.addText((text) => {
				text.setPlaceholder("Number of characters")
					.setValue(this.plugin.settings.chunkSize.toString())
					.onChange(async (value) => {
						try {
							const chunkSize = parseInt(value)
							if (isNaN(chunkSize)) {
								throw new Error("Chunk size must be a number")
							}
							this.plugin.settings.chunkSize = chunkSize
							await this.plugin.saveSettings()
						} catch (e) {
							console.error(e)
							new Notice("Chunk size must be a number")
						}
					})
			})

		new Setting(containerEl)
			.setName("Number of chunks in context")
			.setDesc(
				"In workspace chat mode, the most relevant notes are added to the LLM context. This setting controls the number of chunks to include.\nNote: one note does not necessarily equal one chunk, as notes are split into smaller chunks.",
			)
			.addText((text) => {
				text.setPlaceholder("Number of chunks")
					.setValue(this.plugin.settings.retrievedNodeCount.toString())
					.onChange(async (value) => {
						try {
							const nodeCount = parseInt(value)
							if (isNaN(nodeCount)) {
								throw new Error("Chunk count must be a number")
							}
							this.plugin.settings.retrievedNodeCount = nodeCount
							await this.plugin.saveSettings()
						} catch (e) {
							console.error(e)
							new Notice("Chunk count must be a number")
						}
					})
			})
	}

	private modelOptions(): Record<string, string> {
        const options = new Map<string, string>();

        // Add custom endpoint models
		if (this.plugin.settings.customModelUrl && this.plugin.settings.customModelApiKey)
			this.fetchedModels.forEach(model => options.set(model, model));

        // Add standard models
		else
			MODELS.forEach(model => options.set(model, model));

        return Object.fromEntries(options);
    }

	private embeddingModelOptions(): Record<string, string> {
        const options = new Map<string, string>();

        // Add custom endpoint models
		if (this.plugin.settings.customEmbeddingModelUrl && this.plugin.settings.customEmbeddingModelApiKey)
			this.fetchedEmbeddingModels.forEach(model => options.set(model, model));

        // Add standard models
		else
			MODELS.forEach(model => options.set(model, model));

        return Object.fromEntries(options);
    }

    private async fetchAvailableModels() {
        if (this.plugin.settings.customModelUrl && this.plugin.settings.customModelApiKey) {
			try {
				const client = new OpenAI({
					apiKey: this.plugin.settings.customModelApiKey,
					baseURL: this.plugin.settings.customModelUrl,
					dangerouslyAllowBrowser: true
				});

				const response = await client.models.list();
				this.fetchedModels = response.data.map(m => m.id);
				this.display(); // Refresh UI to show new models
			} catch (error) {
				console.error("Model fetch error:", error);
			}
		}
        if (this.plugin.settings.customEmbeddingModelUrl && this.plugin.settings.customEmbeddingModelApiKey) {
			try {
				const client = new OpenAI({
					apiKey: this.plugin.settings.customEmbeddingModelApiKey,
					baseURL: this.plugin.settings.customEmbeddingModelUrl,
					dangerouslyAllowBrowser: true
				});

				const response = await client.models.list();
				this.fetchedEmbeddingModels = response.data.map(m => m.id);
				this.display(); // Refresh UI to show new models
			} catch (error) {
				console.error("Model fetch error:", error);
			}
		}
    }
}


