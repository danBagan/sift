const { contextBridge, ipcRenderer } = require('electron');
const confetti = require('canvas-confetti');

window.confetti = confetti;

contextBridge.exposeInMainWorld('electronAPI', {
    getAppVersion: () => ipcRenderer.invoke('get-app-version'),
});