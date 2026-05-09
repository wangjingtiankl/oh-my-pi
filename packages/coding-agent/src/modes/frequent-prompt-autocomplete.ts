import type { AutocompleteItem, AutocompleteProvider } from "@oh-my-pi/pi-tui";
import { settings } from "../config/settings";
import { type FrequentEntry, HistoryStorage } from "../session/history-storage";

/**
 * Fuzzy match: check if query chars appear in order in target.
 */
function fuzzyMatch(query: string, target: string): boolean {
	if (query.length === 0) return true;
	if (query.length > target.length) return false;
	let qi = 0;
	for (let ti = 0; ti < target.length && qi < query.length; ti++) {
		if (query[qi] === target[ti]) qi++;
	}
	return qi === query.length;
}

/**
 * Score a fuzzy match. Higher = better match.
 */
function fuzzyScore(query: string, target: string): number {
	if (query.length === 0) return 1;
	if (target === query) return 100;
	if (target.startsWith(query)) return 80;
	if (target.includes(query)) return 60;

	let qi = 0;
	let gaps = 0;
	let lastMatchIdx = -1;
	for (let ti = 0; ti < target.length && qi < query.length; ti++) {
		if (query[qi] === target[ti]) {
			if (lastMatchIdx >= 0 && ti - lastMatchIdx > 1) gaps++;
			lastMatchIdx = ti;
			qi++;
		}
	}
	if (qi !== query.length) return 0;
	return Math.max(1, 40 - gaps * 5);
}

const FREQUENT_PROMPT_CACHE_SIZE = 200;

export class FrequentPromptAutocompleteProvider implements AutocompleteProvider {
	#inner: AutocompleteProvider;
	#historyStorage: HistoryStorage;
	/** Cache of frequent entries, refreshed periodically. */
	#frequentCache: FrequentEntry[] = [];
	#lastCacheTime = 0;
	readonly #CACHE_TTL = 5000; // 5 seconds

	constructor(inner: AutocompleteProvider) {
		this.#inner = inner;
		this.#historyStorage = HistoryStorage.open();
	}

	async getSuggestions(
		lines: string[],
		cursorLine: number,
		cursorCol: number,
	): Promise<{ items: AutocompleteItem[]; prefix: string } | null> {
		const currentLine = lines[cursorLine] || "";
		const textBeforeCursor = currentLine.slice(0, cursorCol);

		// If editing a slash command, @-reference, or #-action, delegate to inner provider
		if (
			textBeforeCursor.trimStart().startsWith("/") ||
			textBeforeCursor.match(/(?:^|[\s])@[^\s]*$/) ||
			textBeforeCursor.match(/#[^\s#]*$/)
		) {
			return this.#inner.getSuggestions(lines, cursorLine, cursorCol);
		}

		// Check if frequent prompt is enabled
		if (!settings.get("frequentPrompt.enabled")) {
			return this.#inner.getSuggestions(lines, cursorLine, cursorCol);
		}

		// Require minimum chars
		const query = textBeforeCursor.trim();
		const minChars = settings.get("frequentPrompt.minChars");
		if (query.length < minChars) return null;

		// Refresh cache periodically
		await this.#ensureFrequentCache();

		// Fuzzy filter and score
		const lowerQuery = query.toLowerCase();
		const scored: Array<AutocompleteItem & { score: number }> = [];

		for (const entry of this.#frequentCache) {
			// Skip if the prompt equals what the user already typed
			if (entry.prompt === query) continue;

			const lowerPrompt = entry.prompt.toLowerCase();
			if (!fuzzyMatch(lowerQuery, lowerPrompt)) continue;

			const fuzzScore = fuzzyScore(lowerQuery, lowerPrompt);
			// Combined score: fuzzy score (0-100) + frequency bonus (capped at 20)
			// This way fuzzy quality dominates but frequency acts as tiebreaker
			const combined = fuzzScore + Math.min(entry.count * 2, 20);

			scored.push({
				value: entry.prompt,
				label: entry.prompt,
				description: entry.count > 1 ? `used ${entry.count} times` : undefined,
				score: combined,
			});
		}

		if (scored.length === 0) return null;

		scored.sort((a, b) => b.score - a.score);

		const maxResults = settings.get("frequentPrompt.maxResults");
		return {
			items: scored.slice(0, maxResults).map(({ score: _, ...item }) => item),
			prefix: textBeforeCursor,
		};
	}

	applyCompletion(
		lines: string[],
		cursorLine: number,
		cursorCol: number,
		item: AutocompleteItem,
		prefix: string,
	): {
		lines: string[];
		cursorLine: number;
		cursorCol: number;
	} {
		// If the prefix starts with a special char, delegate to inner provider
		if (prefix.trimStart().startsWith("/") || prefix.startsWith("@") || prefix.startsWith("#")) {
			return this.#inner.applyCompletion(lines, cursorLine, cursorCol, item, prefix);
		}

		// Replace everything on the current line with the selected prompt
		const newLines = [...lines];
		newLines[cursorLine] = item.value;
		return {
			lines: newLines,
			cursorLine,
			cursorCol: item.value.length,
		};
	}

	getInlineHint(lines: string[], cursorLine: number, cursorCol: number): string | null {
		const currentLine = lines[cursorLine] || "";
		const textBeforeCursor = currentLine.slice(0, cursorCol);
		if (
			textBeforeCursor.trimStart().startsWith("/") ||
			textBeforeCursor.match(/(?:^|[\s])@[^\s]*$/) ||
			textBeforeCursor.match(/#[^\s#]*$/)
		) {
			return this.#inner.getInlineHint?.(lines, cursorLine, cursorCol) ?? null;
		}
		return null;
	}

	async #ensureFrequentCache(): Promise<void> {
		const now = Date.now();
		if (now - this.#lastCacheTime < this.#CACHE_TTL && this.#frequentCache.length > 0) return;
		const maxLength = settings.get("frequentPrompt.maxPromptLength");
		this.#frequentCache = this.#historyStorage.getFrequent(maxLength, FREQUENT_PROMPT_CACHE_SIZE);
		this.#lastCacheTime = now;
	}
}
