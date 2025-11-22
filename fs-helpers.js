// fs-helpers.js

import { get, set } from 'https://cdn.jsdelivr.net/npm/idb-keyval@6/dist/umd.js';

let dirHandle;

async function getDirHandle() {
    try {
        if (dirHandle) {
            return dirHandle;
        }

        dirHandle = await get('directoryHandle');
        if (dirHandle) {
            const perm = await dirHandle.queryPermission();
            if (perm === 'granted') {
                return dirHandle;
            }
        }

        dirHandle = await window.showDirectoryPicker();
        await set('directoryHandle', dirHandle);
        return dirHandle;
    } catch (error) {
        console.error('Error getting directory handle:', error);
        return null;
    }
}

async function listFiles() {
    try {
        const handle = await getDirHandle();
        if (!handle) return [];
        const files = [];
        for await (const entry of handle.values()) {
            if (entry.kind === 'file' && entry.name.endsWith('.md')) {
                files.push({ id: entry.name, name: entry.name });
            }
        }
        return files;
    } catch (error) {
        console.error('Error listing files:', error);
        return [];
    }
}

async function readFile(fileId) {
    try {
        const handle = await getDirHandle();
        if (!handle) return null;
        const fileHandle = await handle.getFileHandle(fileId);
        const file = await fileHandle.getFile();
        return await file.text();
    } catch (error) {
        console.error(`Error reading file ${fileId}:`, error);
        return null;
    }
}

async function writeFile(fileId, content) {
    try {
        const handle = await getDirHandle();
        if (!handle) return;
        const fileHandle = await handle.getFileHandle(fileId, { create: true });
        const writable = await fileHandle.createWritable();
        await writable.write(content);
        await writable.close();
    } catch (error) {
        console.error(`Error writing file ${fileId}:`, error);
    }
}

async function renameFile(oldFileId, newFileId) {
    try {
        const handle = await getDirHandle();
        if (!handle) return;
        const oldFileHandle = await handle.getFileHandle(oldFileId);
        const content = await (await oldFileHandle.getFile()).text();
        const newFileHandle = await handle.getFileHandle(newFileId, { create: true });
        const writable = await newFileHandle.createWritable();
        await writable.write(content);
        await writable.close();
        await handle.removeEntry(oldFileId);
    } catch (error) {
        console.error(`Error renaming file ${oldFileId} to ${newFileId}:`, error);
    }
}


async function deleteFile(fileId) {
    try {
        const handle = await getDirHandle();
        if (!handle) return;
        await handle.removeEntry(fileId);
    } catch (error) {
        console.error(`Error deleting file ${fileId}:`, error);
    }
}

async function loadConfig() {
    try {
        const response = await fetch('config.json');
        return await response.json();
    } catch (error) {
        console.error('Error loading config:', error);
        return { onandroid: 'false' }; // Default config
    }
}

export {
  getDirHandle,
  listFiles,
  readFile,
  writeFile,
  renameFile,
  deleteFile,
  loadConfig,
};
