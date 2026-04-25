import * as vscode from 'vscode';

export class MetronomePanel {
    public static currentPanel: MetronomePanel | undefined;
    private static _onDidDispose = new vscode.EventEmitter<void>();

    private readonly _panel: vscode.WebviewPanel;
    private _disposed = false;

    public static onDidDispose = MetronomePanel._onDidDispose.event;

    public static createOrShow(extensionUri: vscode.Uri) {
        if (MetronomePanel.currentPanel) {
            MetronomePanel.currentPanel._panel.reveal(vscode.ViewColumn.Beside);
            return;
        }

        const panel = vscode.window.createWebviewPanel(
            'metronome',
            'Metronome',
            vscode.ViewColumn.Beside,
            {
                enableScripts: true,
            }
        );

        MetronomePanel.currentPanel = new MetronomePanel(panel);
    }

    public static updateBpm(bpm: number, songName: string) {
        if (MetronomePanel.currentPanel) {
            MetronomePanel.currentPanel._panel.webview.postMessage({
                type: 'bpm',
                bpm,
                songName,
            });
        }
    }

    public static sendCommand(command: string) {
        if (MetronomePanel.currentPanel) {
            MetronomePanel.currentPanel._panel.webview.postMessage({
                type: command,
            });
        }
    }

    private constructor(panel: vscode.WebviewPanel) {
        this._panel = panel;
        this._panel.webview.html = this._getHtml();

        this._panel.onDidDispose(() => {
            this._disposed = true;
            MetronomePanel.currentPanel = undefined;
            MetronomePanel._onDidDispose.fire();
        });
    }

    private _getHtml(): string {
        return /*html*/ `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        height: 100vh;
        background: var(--vscode-editor-background, #1e1e1e);
        color: var(--vscode-editor-foreground, #ccc);
        font-family: var(--vscode-font-family, sans-serif);
        user-select: none;
        overflow: hidden;
    }
    #song-name {
        font-size: 1.4em;
        font-weight: 600;
        margin-bottom: 8px;
        text-align: center;
        opacity: 0.9;
    }
    #bpm-display {
        font-size: 3em;
        font-weight: 700;
        margin-bottom: 24px;
        font-variant-numeric: tabular-nums;
    }
    #circle {
        width: 180px;
        height: 180px;
        border-radius: 50%;
        background: #333;
        transition: none;
        margin-bottom: 32px;
    }
    #circle.on {
        background: #ff5722;
        box-shadow: 0 0 60px 10px rgba(255, 87, 34, 0.6);
    }
    #circle.off {
        background: #444;
        box-shadow: none;
    }
    .controls {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 12px;
    }
    .controls label {
        font-size: 0.9em;
        opacity: 0.7;
    }
    #volume {
        width: 160px;
        accent-color: #ff5722;
    }
    #status {
        font-size: 0.85em;
        opacity: 0.5;
        margin-top: 16px;
    }
    #no-bpm {
        font-size: 1.2em;
        opacity: 0.5;
        display: none;
    }
</style>
</head>
<body>
    <div id="song-name">--</div>
    <div id="bpm-display">-- BPM</div>
    <div id="circle" class="off"></div>
    <div id="no-bpm">No BPM detected — place cursor under a song heading</div>
    <div class="controls">
        <label for="volume">Volume</label>
        <input type="range" id="volume" min="0" max="100" value="50">
    </div>
    <div id="status">Stopped</div>

<script>
(function() {
    const vscode = acquireVsCodeApi();
    const circle = document.getElementById('circle');
    const bpmDisplay = document.getElementById('bpm-display');
    const songNameEl = document.getElementById('song-name');
    const noBpmEl = document.getElementById('no-bpm');
    const volumeSlider = document.getElementById('volume');
    const statusEl = document.getElementById('status');

    let currentBpm = 0;
    let running = false;
    let audioCtx = null;
    let intervalId = null;
    let beatOn = false;

    function getAudioCtx() {
        if (!audioCtx) {
            audioCtx = new AudioContext();
        }
        return audioCtx;
    }

    function playClick() {
        const vol = parseInt(volumeSlider.value, 10) / 100;
        if (vol === 0) return;
        try {
            const ctx = getAudioCtx();
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.frequency.value = 1000;
            osc.type = 'sine';
            gain.gain.setValueAtTime(vol * 0.5, ctx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.05);
            osc.start(ctx.currentTime);
            osc.stop(ctx.currentTime + 0.05);
        } catch (e) {
            // Audio not available
        }
    }

    function beat() {
        // Flash on
        circle.className = 'on';
        playClick();
        beatOn = true;

        // Flash off after 60ms
        setTimeout(() => {
            if (running) {
                circle.className = 'off';
            }
            beatOn = false;
        }, 80);
    }

    function startMetronome() {
        if (currentBpm <= 0) return;
        stopInterval();
        running = true;
        statusEl.textContent = 'Playing';
        const ms = 60000 / currentBpm;
        beat(); // Immediate first beat
        intervalId = setInterval(beat, ms);
    }

    function stopInterval() {
        if (intervalId !== null) {
            clearInterval(intervalId);
            intervalId = null;
        }
    }

    function stopMetronome() {
        running = false;
        stopInterval();
        circle.className = 'off';
        statusEl.textContent = 'Stopped';
    }

    function updateDisplay() {
        if (currentBpm > 0) {
            bpmDisplay.textContent = currentBpm + ' BPM';
            bpmDisplay.style.display = '';
            noBpmEl.style.display = 'none';
        } else {
            bpmDisplay.textContent = '-- BPM';
            noBpmEl.style.display = 'block';
        }
    }

    window.addEventListener('message', (event) => {
        const msg = event.data;
        switch (msg.type) {
            case 'bpm': {
                const newBpm = msg.bpm;
                const newSong = msg.songName || '';
                songNameEl.textContent = newSong || '--';
                if (newBpm !== currentBpm) {
                    currentBpm = newBpm;
                    updateDisplay();
                    if (running && currentBpm > 0) {
                        // Restart with new BPM
                        startMetronome();
                    } else if (running && currentBpm <= 0) {
                        stopMetronome();
                    }
                }
                break;
            }
            case 'start':
                if (currentBpm > 0) {
                    startMetronome();
                }
                break;
            case 'stop':
                stopMetronome();
                break;
            case 'toggle':
                if (running) {
                    stopMetronome();
                } else if (currentBpm > 0) {
                    startMetronome();
                }
                break;
        }
    });
})();
</script>
</body>
</html>`;
    }
}
