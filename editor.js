document.addEventListener('DOMContentLoaded', () => {
    // 1. Element Selection
    const editor = document.getElementById('editor');
    const preview = document.getElementById('preview');
    const viewToggle = document.getElementById('view-toggle');
    const themeToggle = document.getElementById('theme-toggle');
    const sidebarToggle = document.getElementById('sidebar-toggle');
    const newFileBtn = document.getElementById('new-file-btn');
    const appTitle = document.getElementById('app-title');
    const wordCountEl = document.getElementById('word-count');
    const charCountEl = document.getElementById('char-count');
    const sidebar = document.getElementById('sidebar');
    const fileList = document.getElementById('file-list');
    const modalOverlay = document.getElementById('modal-overlay');
    const modalTitle = document.getElementById('modal-title');
    const modalMessage = document.getElementById('modal-message');
    const modalInput = document.getElementById('modal-input');
    const modalCancelBtn = document.getElementById('modal-cancel-btn');
    const modalConfirmBtn = document.getElementById('modal-confirm-btn');

    // 2. State Management
    let state = {
        files: [],
        activeFileId: null,
        isPreview: false,
        isSidebarVisible: true,
    };

    // 3. Markdown & Highlighting Setup
    marked.setOptions({
        gfm: true,
        breaks: true,
        langPrefix: 'language-',
    });
    
    // 4. Functions
    const updatePreview = () => {
        const activeFile = state.files.find(f => f.id === state.activeFileId);
        const content = activeFile ? activeFile.content : '';
        preview.innerHTML = marked.parse(content);

        preview.querySelectorAll('pre code').forEach(codeElement => {
            if (codeElement.parentElement.parentElement.classList.contains('code-block-container')) return;
            hljs.highlightElement(codeElement);
            const lang = (Array.from(codeElement.classList).find(c => c.startsWith('language-')) || '').replace('language-', '');
            const container = document.createElement('div');
            container.className = 'code-block-container';
            const header = document.createElement('div');
            header.className = 'code-block-header';
            const langName = document.createElement('span');
            langName.className = 'lang-name';
            langName.textContent = lang || 'plaintext';
            const copyButton = document.createElement('button');
            copyButton.className = 'copy-btn';
            copyButton.innerHTML = '<i class="far fa-copy"></i> Copy';
            copyButton.onclick = () => {
                navigator.clipboard.writeText(codeElement.innerText).then(() => {
                    copyButton.innerHTML = '<i class="fas fa-check"></i> Copied!';
                    setTimeout(() => { copyButton.innerHTML = '<i class="far fa-copy"></i> Copy'; }, 2000);
                });
            };
            header.append(langName, copyButton);
            const preElement = codeElement.parentElement;
            preElement.parentNode.insertBefore(container, preElement);
            container.append(header, preElement);
        });
    };

    const updateStats = () => {
        const text = editor.value;
        const wordCount = text.trim() ? text.trim().split(/\s+/).length : 0;
        charCountEl.textContent = text.length;
        wordCountEl.textContent = wordCount;
    };
    
    const saveState = () => {
        const { files, activeFileId } = state;
        localStorage.setItem('markdown_files', JSON.stringify(files));
        localStorage.setItem('active_file_id', activeFileId);
    };

    const loadState = () => {
        const savedFiles = localStorage.getItem('markdown_files');
        const savedActiveId = localStorage.getItem('active_file_id');

        if (savedFiles) {
            state.files = JSON.parse(savedFiles);
        }

        if (savedActiveId) {
            state.activeFileId = savedActiveId;
        }

        if (state.files.length === 0) {
            // Create a default file if none exist
            createNewFile(false); // Don't save state yet, it will be saved in loadState
        }

        if (!state.activeFileId || !state.files.find(f => f.id === state.activeFileId)) {
            state.activeFileId = state.files[0]?.id || null;
        }
    };

    const renderFileList = () => {
        fileList.innerHTML = '';
        if (state.files.length === 0) {
            // Optionally, show a message like "No files yet."
            return;
        }

        state.files.forEach(file => {
            const li = document.createElement('li');
            li.className = 'file-item';
            li.dataset.id = file.id;
            if (file.id === state.activeFileId) {
                li.classList.add('active');
            }

            const fileNameSpan = document.createElement('span');
            fileNameSpan.className = 'file-item-name';
            fileNameSpan.textContent = file.name;

            const actionsDiv = document.createElement('div');
            actionsDiv.className = 'file-item-actions';

            const renameBtn = document.createElement('button');
            renameBtn.innerHTML = '<i class="fas fa-pen"></i>';
            renameBtn.title = 'Rename';
            renameBtn.onclick = (e) => { e.stopPropagation(); handleRenameFile(file.id); };

            const downloadBtn = document.createElement('button');
            downloadBtn.innerHTML = '<i class="fas fa-download"></i>';
            downloadBtn.title = 'Download';
            downloadBtn.onclick = (e) => { e.stopPropagation(); handleDownloadFile(file.id); };

            const deleteBtn = document.createElement('button');
            deleteBtn.innerHTML = '<i class="fas fa-trash"></i>';
            deleteBtn.title = 'Delete';
            deleteBtn.onclick = (e) => { e.stopPropagation(); handleDeleteFile(file.id); };

            actionsDiv.append(renameBtn, downloadBtn, deleteBtn);
            li.append(fileNameSpan, actionsDiv);
            li.addEventListener('click', () => switchActiveFile(file.id));

            fileList.appendChild(li);
        });
    };

    const updateEditorAndPreview = () => {
        const activeFile = state.files.find(f => f.id === state.activeFileId);
        if (activeFile) {
            editor.value = activeFile.content;
        } else {
            editor.value = ''; // Clear editor if no active file
        }
        updatePreview();
        updateStats();
    };
    
    const applyTheme = (theme) => {
        document.documentElement.setAttribute('data-theme', theme);
        themeToggle.querySelector('i').className = theme === 'dark' ? 'fas fa-sun' : 'fas fa-moon';
        localStorage.setItem('theme', theme);
    };

    const toggleSidebar = (show) => {
        state.isSidebarVisible = show;
        sidebar.classList.toggle('hidden', !show);
        const icon = sidebarToggle.querySelector('i');
        icon.className = show ? 'fas fa-times' : 'fas fa-bars';
        sidebarToggle.title = show ? 'Close Sidebar' : 'Open Sidebar';
    };

    // 5. File Operations
    const createNewFile = (save = true) => {
        const newId = `file_${Date.now()}`;
        const fileNumber = state.files.length + 1;
        const newFile = {
            id: newId,
            name: `Untitled ${fileNumber}`,
            content: `# Untitled ${fileNumber}\n\nStart writing your markdown here.`
        };
        state.files.push(newFile);
        state.activeFileId = newId;

        renderFileList();
        updateEditorAndPreview();
        if (save) saveState();
    };

    const switchActiveFile = (id) => {
        if (id === state.activeFileId) return;
        state.activeFileId = id;

        // Update active class in UI
        document.querySelectorAll('.file-item.active').forEach(el => el.classList.remove('active'));
        document.querySelector(`.file-item[data-id="${id}"]`)?.classList.add('active');

        updateEditorAndPreview();
        saveState();
    };

    const handleRenameFile = async (id) => {
        const file = state.files.find(f => f.id === id);
        if (!file) return;

        const newName = await showModal({
            title: 'Rename File',
            message: `Enter a new name for "${file.name}":`,
            type: 'prompt',
            inputValue: file.name,
            inputPlaceholder: 'Enter file name'
        });

        if (newName && newName.trim() !== '' && newName !== file.name) {
            file.name = newName.trim();
            renderFileList();
            saveState();
        }
    };
    
    const handleDownloadFile = (id) => {
        const file = state.files.find(f => f.id === id);
        if (!file) return;

        const blob = new Blob([file.content], { type: 'text/markdown;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${file.name.replace(/ /g, '_')}.md`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    };

    const handleDeleteFile = async (id) => {
        const fileIndex = state.files.findIndex(f => f.id === id);
        if (fileIndex === -1) return;

        const file = state.files[fileIndex];
        const confirmed = await showModal({
            title: 'Delete File',
            message: `Are you sure you want to delete "${file.name}"? This action cannot be undone.`
        });

        if (!confirmed) {
            return;
        }

        state.files.splice(fileIndex, 1);

        if (state.activeFileId === id) {
            if (state.files.length > 0) {
                const newActiveIndex = Math.max(0, fileIndex - 1);
                state.activeFileId = state.files[newActiveIndex].id;
            } else {
                createNewFile(false);
            }
        }

        renderFileList();
        updateEditorAndPreview();
        saveState();
    };

    // 6. Event Listeners
    editor.addEventListener('input', () => {
        const activeFile = state.files.find(f => f.id === state.activeFileId);
        if (activeFile) {
            activeFile.content = editor.value;
            updatePreview();
            updateStats();
            saveState();
        }
    });

    viewToggle.addEventListener('click', () => {
        state.isPreview = !state.isPreview;
        editor.classList.toggle('hidden', state.isPreview);
        preview.classList.toggle('hidden', !state.isPreview);
        viewToggle.querySelector('i').className = state.isPreview ? 'fas fa-pencil-alt' : 'fas fa-eye';
        viewToggle.title = state.isPreview ? 'Toggle Editor' : 'Toggle Preview';
        appTitle.textContent = state.isPreview ? 'Pro Preview' : 'Pro Editor';
    });

    themeToggle.addEventListener('click', () => {
        const currentTheme = document.documentElement.getAttribute('data-theme');
        applyTheme(currentTheme === 'dark' ? 'light' : 'dark');
    });

    sidebarToggle.addEventListener('click', () => {
        toggleSidebar(!state.isSidebarVisible);
    });

    newFileBtn.addEventListener('click', () => createNewFile());

    // 7. Modal Logic
    let modalResolve = null;

    const showModal = ({ title, message, inputValue = '', inputPlaceholder = '', type = 'confirm' }) => {
        modalTitle.textContent = title;
        modalMessage.textContent = message;

        if (type === 'prompt') {
            modalInput.classList.remove('hidden');
            modalInput.value = inputValue;
            modalInput.placeholder = inputPlaceholder;
        } else {
            modalInput.classList.add('hidden');
        }

        modalOverlay.classList.remove('hidden');
        if (type === 'prompt') {
            modalInput.focus();
            modalInput.select();
        }

        return new Promise((resolve) => {
            modalResolve = resolve;
        });
    };

    const hideModal = () => {
        modalOverlay.classList.add('hidden');
        modalResolve = null;
    };

    modalConfirmBtn.addEventListener('click', () => {
        if (modalResolve) {
            const isPrompt = !modalInput.classList.contains('hidden');
            modalResolve(isPrompt ? modalInput.value : true);
            hideModal();
        }
    });

    modalCancelBtn.addEventListener('click', () => {
        if (modalResolve) {
            modalResolve(null); // Resolve with null on cancel
            hideModal();
        }
    });

    modalOverlay.addEventListener('click', (e) => {
        if (e.target === modalOverlay) {
            if (modalResolve) {
                modalResolve(null);
                hideModal();
            }
        }
    });

    // 8. Initialization
    const init = () => {
        const savedTheme = localStorage.getItem('theme') || (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
        applyTheme(savedTheme);

        // Check for file ID in URL
        const urlParams = new URLSearchParams(window.location.search);
        const fileIdFromUrl = urlParams.get('file');

        loadState();

        if (fileIdFromUrl && state.files.find(f => f.id === fileIdFromUrl)) {
            state.activeFileId = fileIdFromUrl;
        }

        renderFileList();
        updateEditorAndPreview();
        toggleSidebar(state.isSidebarVisible); // Set initial sidebar state
    };

    init();
});