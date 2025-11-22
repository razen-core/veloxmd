// RAZEN-FS: A configuration-aware file system helper
const RazenFS = {
    _config: null,
    _db: null,

    // Load and cache the configuration
    async _getConfig() {
        if (this._config) return this._config;
        try {
            const response = await fetch('config.json');
            this._config = await response.json();
            return this._config;
        } catch (error) {
            console.error("Failed to load config.json, defaulting to web storage.", error);
            // Default config if loading fails
            this._config = { onAndroid: "false" };
            return this._config;
        }
    },

    // --- Web Storage (IndexedDB) Implementation ---
    _webStorage: {
        async _getDB() {
            if (RazenFS._db) return RazenFS._db;
            return new Promise((resolve, reject) => {
                const request = indexedDB.open("RazenEditorDB", 1);
                request.onerror = () => reject("Error opening database");
                request.onsuccess = (e) => {
                    RazenFS._db = e.target.result;
                    resolve(RazenFS._db);
                };
                request.onupgradeneeded = (e) => {
                    const db = e.target.result;
                    if (!db.objectStoreNames.contains("files")) {
                        db.createObjectStore("files", { keyPath: "id" });
                    }
                };
            });
        },
        async saveFile(fileObject) {
            const db = await this._getDB();
            return new Promise((resolve, reject) => {
                const tx = db.transaction("files", "readwrite");
                const store = tx.objectStore("files");
                store.put(fileObject);
                tx.oncomplete = () => resolve(fileObject);
                tx.onerror = (e) => reject(e.target.error);
            });
        },
        async getAllFiles() {
            const db = await this._getDB();
            return new Promise((resolve, reject) => {
                const tx = db.transaction("files", "readonly");
                const store = tx.objectStore("files");
                const request = store.getAll();
                request.onsuccess = (e) => resolve(e.target.result);
                request.onerror = (e) => reject(e.target.error);
            });
        },
        async getFile(id) {
            const db = await this._getDB();
            return new Promise((resolve, reject) => {
                const tx = db.transaction("files", "readonly");
                const store = tx.objectStore("files");
                const request = store.get(id);
                request.onsuccess = (e) => resolve(e.target.result);
                request.onerror = (e) => reject(e.target.error);
            });
        },
        async deleteFile(id) {
            const db = await this._getDB();
            return new Promise((resolve, reject) => {
                const tx = db.transaction("files", "readwrite");
                const store = tx.objectStore("files");
                store.delete(id);
                tx.oncomplete = () => resolve(true);
                tx.onerror = (e) => reject(e.target.error);
            });
        }
    },

    // --- Native Storage (Android Bridge) Placeholder ---
    _nativeStorage: {
        async saveFile(fileObject) {
            console.log("NATIVE_STORAGE: Saving file:", fileObject.name);
            // Example: window.AndroidInterface.saveFile(JSON.stringify(fileObject));
            return Promise.resolve(fileObject);
        },
        async getAllFiles() {
            console.log("NATIVE_STORAGE: Getting all files.");
            // Example: return JSON.parse(window.AndroidInterface.getAllFiles());
            return Promise.resolve([]);
        },
        async getFile(id) {
            console.log("NATIVE_STORAGE: Getting file:", id);
            // Example: return JSON.parse(window.AndroidInterface.getFile(id));
            return Promise.resolve(null);
        },
        async deleteFile(id) {
            console.log("NATIVE_STORAGE: Deleting file:", id);
            // Example: window.AndroidInterface.deleteFile(id);
            return Promise.resolve(true);
        }
    },

    // --- Public API ---
    async getStorageProvider() {
        const config = await this._getConfig();
        return config.onAndroid === "true" ? this._nativeStorage : this._webStorage;
    },

    async saveFile(fileObject) {
        const provider = await this.getStorageProvider();
        return provider.saveFile(fileObject);
    },
    async getAllFiles() {
        const provider = await this.getStorageProvider();
        return provider.getAllFiles();
    },
    async getFile(id) {
        const provider = await this.getStorageProvider();
        return provider.getFile(id);
    },
    async deleteFile(id) {
        const provider = await this.getStorageProvider();
        return provider.deleteFile(id);
    }
};

// Expose the module
window.RazenFS = RazenFS;
