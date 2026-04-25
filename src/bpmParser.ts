export interface BpmInfo {
    bpm: number;
    songName: string;
}

export interface LineAccessor {
    lineCount: number;
    lineAt(line: number): string;
}

export function findBpmAboveCursor(doc: LineAccessor, cursorLine: number): BpmInfo | null {
    const bpmPattern = /^##\s+(.+?)\s*\((\d+)bpm\*?\)/i;
    const headerPattern = /^##\s+/;
    for (let line = cursorLine; line >= 0; line--) {
        const text = doc.lineAt(line);
        const match = bpmPattern.exec(text);
        if (match) {
            return {
                songName: match[1].trim(),
                bpm: parseInt(match[2], 10),
            };
        }
        if (headerPattern.test(text)) {
            return null;
        }
    }
    return null;
}
