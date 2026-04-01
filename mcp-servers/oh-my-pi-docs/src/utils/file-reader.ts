/**
 * File reader utilities using Bun.file() with error handling.
 */
import { isEnoent } from "@oh-my-pi/pi-utils";

export type FileReaderSuccess = {
	success: true;
	content: string;
	path: string;
};

export type FileReaderFailure = {
	success: false;
	error: string;
	path: string;
};

export type FileReaderResult = FileReaderSuccess | FileReaderFailure;

/**
 * Read a file using Bun.file() with error handling.
 */
export async function readFile(absolutePath: string): Promise<FileReaderResult> {
	try {
		const content = await Bun.file(absolutePath).text();
		return {
			success: true,
			content,
			path: absolutePath,
		};
	} catch (err) {
		if (isEnoent(err)) {
			return {
				success: false,
				error: `File not found: ${absolutePath}`,
				path: absolutePath,
			};
		}
		return {
			success: false,
			error: `Failed to read file: ${err instanceof Error ? err.message : String(err)}`,
			path: absolutePath,
		};
	}
}

/**
 * Read multiple files and return results.
 */
export async function readFiles(absolutePaths: string[]): Promise<FileReaderResult[]> {
	return Promise.all(absolutePaths.map(readFile));
}

/**
 * Read a file or return null if not found.
 */
export async function readFileOrNull(absolutePath: string): Promise<string | null> {
	const result = await readFile(absolutePath);
	return result.success ? result.content : null;
}

/**
 * Read JSON from a file.
 */
export async function readJsonFile<T>(absolutePath: string): Promise<T | null> {
	try {
		const content = await Bun.file(absolutePath).json();
		return content as T;
	} catch (err) {
		if (isEnoent(err)) {
			return null;
		}
		throw err;
	}
}
