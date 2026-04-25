import * as vscode from 'vscode';
import { MetronomePanel } from './metronomePanel';
import { findBpmAboveCursor, BpmInfo } from './bpmParser';

function findBpmForEditor(document: vscode.TextDocument, cursorLine: number): BpmInfo | null {
    const adapter = {
        lineCount: document.lineCount,
        lineAt: (line: number) => document.lineAt(line).text,
    };
    return findBpmAboveCursor(adapter, cursorLine);
}

let statusBarItem: vscode.StatusBarItem;
let cursorListener: vscode.Disposable | undefined;
let lastBpmInfo: BpmInfo | null = null;

function updateBpmFromCursor(editor: vscode.TextEditor | undefined) {
    if (!editor) {
        return;
    }
    const info = findBpmForEditor(editor.document, editor.selection.active.line);
    if (info && (lastBpmInfo?.bpm !== info.bpm || lastBpmInfo?.songName !== info.songName)) {
        lastBpmInfo = info;
        MetronomePanel.updateBpm(info.bpm, info.songName);
        statusBarItem.text = `♩ ${info.bpm} BPM`;
    } else if (!info && lastBpmInfo !== null) {
        lastBpmInfo = null;
        MetronomePanel.updateBpm(0, '');
        statusBarItem.text = '♩ --';
    }
}

export function activate(context: vscode.ExtensionContext) {
    statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 100);
    statusBarItem.command = 'metronome.toggle';
    statusBarItem.text = '♩ Off';
    statusBarItem.tooltip = 'Toggle Metronome';
    statusBarItem.show();
    context.subscriptions.push(statusBarItem);

    const toggleCmd = vscode.commands.registerCommand('metronome.toggle', () => {
        if (!MetronomePanel.currentPanel) {
            // Create panel and start
            MetronomePanel.createOrShow(context.extensionUri);
            // Start listening for cursor changes
            if (!cursorListener) {
                cursorListener = vscode.window.onDidChangeTextEditorSelection((e) => {
                    updateBpmFromCursor(e.textEditor);
                });
                context.subscriptions.push(cursorListener);
            }
            // Initial BPM detection
            const editor = vscode.window.activeTextEditor;
            if (editor) {
                const info = findBpmForEditor(editor.document, editor.selection.active.line);
                if (info) {
                    lastBpmInfo = info;
                    statusBarItem.text = `♩ ${info.bpm} BPM`;
                    // Small delay to let webview initialize
                    setTimeout(() => {
                        MetronomePanel.updateBpm(info.bpm, info.songName);
                        MetronomePanel.sendCommand('start');
                    }, 300);
                } else {
                    statusBarItem.text = '♩ --';
                }
            }
        } else {
            // Toggle running state
            MetronomePanel.sendCommand('toggle');
        }
    });

    context.subscriptions.push(toggleCmd);

    // Clean up when panel is disposed
    MetronomePanel.onDidDispose(() => {
        statusBarItem.text = '♩ Off';
        lastBpmInfo = null;
        if (cursorListener) {
            cursorListener.dispose();
            cursorListener = undefined;
        }
    });
}

export function deactivate() {}
