import { findBpmAboveCursor, LineAccessor } from '../src/bpmParser';

function makeDoc(lines: string[]): LineAccessor {
    return {
        lineCount: lines.length,
        lineAt: (line: number) => lines[line],
    };
}

describe('findBpmAboveCursor', () => {
    it('returns BPM when cursor is on a heading with BPM', () => {
        const doc = makeDoc([
            '## Song Name (120bpm)',
        ]);
        const result = findBpmAboveCursor(doc, 0);
        expect(result).toEqual({ songName: 'Song Name', bpm: 120 });
    });

    it('returns BPM when cursor is below a heading with BPM', () => {
        const doc = makeDoc([
            '## My Song (90bpm)',
            'Some lyrics here',
            'More lyrics',
        ]);
        const result = findBpmAboveCursor(doc, 2);
        expect(result).toEqual({ songName: 'My Song', bpm: 90 });
    });

    it('returns null when header has no BPM', () => {
        const doc = makeDoc([
            '## Goldband - Noodgeval',
            'Some content',
        ]);
        const result = findBpmAboveCursor(doc, 1);
        expect(result).toBeNull();
    });

    it('does NOT bleed BPM from a previous song into a header without BPM', () => {
        const doc = makeDoc([
            "## Gavin DeGraw - I Don't Wanna Be (155bpm)",
            'Lyrics of first song',
            '',
            '## Goldband - Noodgeval',
            'Lyrics of second song',
        ]);
        // Cursor on the lyrics of Goldband (line 4)
        expect(findBpmAboveCursor(doc, 4)).toBeNull();
        // Cursor on the heading itself (line 3)
        expect(findBpmAboveCursor(doc, 3)).toBeNull();
    });

    it('returns correct BPM when cursor is under the first song with BPM', () => {
        const doc = makeDoc([
            "## Gavin DeGraw - I Don't Wanna Be (155bpm)",
            'Lyrics of first song',
            '',
            '## Goldband - Noodgeval',
            'Lyrics of second song',
        ]);
        expect(findBpmAboveCursor(doc, 1)).toEqual({
            songName: "Gavin DeGraw - I Don't Wanna Be",
            bpm: 155,
        });
    });

    it('returns null when there are no headings above the cursor', () => {
        const doc = makeDoc([
            'Just some random text',
            'No headers here',
        ]);
        expect(findBpmAboveCursor(doc, 1)).toBeNull();
    });

    it('handles BPM with asterisk suffix (e.g. 120bpm*)', () => {
        const doc = makeDoc([
            '## Song Title (120bpm*)',
            'Content',
        ]);
        const result = findBpmAboveCursor(doc, 1);
        expect(result).toEqual({ songName: 'Song Title', bpm: 120 });
    });

    it('is case-insensitive for BPM marker', () => {
        const doc = makeDoc([
            '## Song Title (120BPM)',
            'Content',
        ]);
        const result = findBpmAboveCursor(doc, 1);
        expect(result).toEqual({ songName: 'Song Title', bpm: 120 });
    });

    it('returns null when cursor is before any heading', () => {
        const doc = makeDoc([
            'Intro text',
            '',
            '## First Song (100bpm)',
        ]);
        expect(findBpmAboveCursor(doc, 0)).toBeNull();
    });

    it('skips multiple songs correctly', () => {
        const doc = makeDoc([
            '## Song A (100bpm)',
            'Lyrics A',
            '',
            '## Song B (200bpm)',
            'Lyrics B',
            '',
            '## Song C',
            'Lyrics C',
            '',
            '## Song D (140bpm)',
            'Lyrics D',
        ]);
        // Under Song A
        expect(findBpmAboveCursor(doc, 1)).toEqual({ songName: 'Song A', bpm: 100 });
        // Under Song B
        expect(findBpmAboveCursor(doc, 4)).toEqual({ songName: 'Song B', bpm: 200 });
        // Under Song C (no BPM)
        expect(findBpmAboveCursor(doc, 7)).toBeNull();
        // Under Song D
        expect(findBpmAboveCursor(doc, 10)).toEqual({ songName: 'Song D', bpm: 140 });
    });

    it('handles consecutive headers without BPM', () => {
        const doc = makeDoc([
            '## Song A (120bpm)',
            '',
            '## Song B',
            '',
            '## Song C',
            'Content under C',
        ]);
        expect(findBpmAboveCursor(doc, 5)).toBeNull();
    });

    it('returns null for cursor on line 0 with no heading', () => {
        const doc = makeDoc(['Just text']);
        expect(findBpmAboveCursor(doc, 0)).toBeNull();
    });

    it('matches heading on the cursor line itself', () => {
        const doc = makeDoc([
            '## Direct Hit (88bpm)',
        ]);
        expect(findBpmAboveCursor(doc, 0)).toEqual({ songName: 'Direct Hit', bpm: 88 });
    });

    it('does not match # (h1) or ### (h3) headings', () => {
        const doc = makeDoc([
            '# Top Level (100bpm)',
            'Content',
        ]);
        expect(findBpmAboveCursor(doc, 1)).toBeNull();
    });

    it('does not match ### headings with BPM', () => {
        const doc = makeDoc([
            '### Subsection (100bpm)',
            'Content',
        ]);
        expect(findBpmAboveCursor(doc, 1)).toBeNull();
    });

    it('handles song name with special characters', () => {
        const doc = makeDoc([
            "## Beyoncé - Crazy in Love (ft. Jay-Z) (99bpm)",
            'Content',
        ]);
        const result = findBpmAboveCursor(doc, 1);
        expect(result).toEqual({ songName: 'Beyoncé - Crazy in Love (ft. Jay-Z)', bpm: 99 });
    });

    it('returns null for empty document', () => {
        const doc = makeDoc(['']);
        expect(findBpmAboveCursor(doc, 0)).toBeNull();
    });
});
