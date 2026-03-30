document.addEventListener('DOMContentLoaded', () => {
    const documentsGrid = document.getElementById('documents-grid');
    const copyrightYear = document.getElementById('copyright-year');
    const newDocumentBtn = document.getElementById('new-document-btn');
    const modalOverlay = document.getElementById('modal-overlay');
    const modalTitle = document.getElementById('modal-title');
    const modalMessage = document.getElementById('modal-message');
    const modalInput = document.getElementById('modal-input');
    const modalCancelBtn = document.getElementById('modal-cancel-btn');
    const modalConfirmBtn = document.getElementById('modal-confirm-btn');
    const themeToggle = document.getElementById('theme-toggle');
    const docCountBadge = document.getElementById('doc-count-badge');
    const dropOverlay = document.getElementById('drop-overlay');

    let files = [];
    let modalResolve = null;

    // Card accent palette — cycles through for visual variety
    const CARD_ACCENTS = [
        'card-accent-blue',
        'card-accent-purple',
        'card-accent-green',
        'card-accent-amber',
        'card-accent-rose',
        'card-accent-teal',
    ];

    if (copyrightYear) {
        copyrightYear.textContent = new Date().getFullYear();
    }

    newDocumentBtn.addEventListener('click', (e) => {
        e.preventDefault();
        localStorage.setItem('create_new_file', 'true');
        window.location.href = 'editor.html';
    });

    const loadFiles = async () => {
        files = await RazenFS.getAllFiles();
    };

    window.toast = (message, type = 'info') => {
        const container = document.getElementById('toast-container');
        if (!container) return;

        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;

        let icon = 'info-circle';
        if (type === 'success') icon = 'check-circle';
        if (type === 'error') icon = 'exclamation-circle';
        if (type === 'warning') icon = 'exclamation-triangle';

        toast.innerHTML = `
            <i class="fas fa-${icon}"></i>
            <span>${message}</span>
        `;

        container.appendChild(toast);

        const dismiss = () => {
            toast.classList.add('fade-out');
            setTimeout(() => toast.remove(), 300);
        };

        toast.onclick = dismiss;
        setTimeout(dismiss, 3000);
    };

    const updateDocCount = () => {
        if (!docCountBadge) return;
        const n = files.length;
        docCountBadge.textContent = n === 0 ? 'No files yet' : `${n} file${n === 1 ? '' : 's'}`;
    };

    const renderDocuments = () => {
        if (!documentsGrid) return;

        updateDocCount();

        const sortedFiles = [...files].sort((a, b) => {
            const timeA = parseInt(a.id.split('_')[1], 10);
            const timeB = parseInt(b.id.split('_')[1], 10);
            return timeB - timeA;
        });

        if (sortedFiles.length > 0) {
            documentsGrid.innerHTML = sortedFiles.map((file, index) => {
                const accentClass = CARD_ACCENTS[index % CARD_ACCENTS.length];
                const date = new Date(parseInt(file.id.split('_')[1], 10));
                const dateStr = date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
                // Preview: first ~80 chars of content after stripping markdown symbols
                const preview = (file.content || '')
                    .replace(/^#{1,6}\s+/gm, '')
                    .replace(/[*_`~]/g, '')
                    .replace(/\n+/g, ' ')
                    .trim()
                    .slice(0, 90);

                return `
                <div class="document-card ${accentClass}">
                    <a href="editor.html?file=${file.id}" class="document-card-inner">
                        <div class="document-card-preview">
                            <div class="doc-preview-lines">
                                <span></span><span></span><span></span>
                                <span class="short"></span>
                            </div>
                            <div class="doc-preview-badge">MD</div>
                        </div>
                        <div class="document-card-body">
                            <h3 class="document-title">${file.name}</h3>
                            ${preview ? `<p class="document-preview-text">${preview}</p>` : ''}
                        </div>
                    </a>
                    <div class="document-card-footer">
                        <span class="document-date">
                            <i class="far fa-calendar-alt"></i> ${dateStr}
                        </span>
                        <div class="document-actions">
                            <button class="action-btn rename-btn" data-id="${file.id}" title="Rename">
                                <i class="fas fa-pen"></i>
                            </button>
                            <button class="action-btn download-btn" data-id="${file.id}" title="Download">
                                <i class="fas fa-download"></i>
                            </button>
                            <button class="action-btn delete-btn" data-id="${file.id}" title="Delete">
                                <i class="fas fa-trash"></i>
                            </button>
                        </div>
                    </div>
                </div>`;
            }).join('');
        } else {
            documentsGrid.innerHTML = `
                <div class="no-documents-message">
                    <div class="no-docs-icon">
                        <i class="fas fa-feather-alt"></i>
                    </div>
                    <h3>Nothing here yet</h3>
                    <p>Create your first document to get started</p>
                    <a href="editor.html" class="cta-button no-docs-cta" onclick="localStorage.setItem('create_new_file','true')">
                        <i class="fas fa-plus"></i> New Document
                    </a>
                </div>`;
        }
    };

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
            requestAnimationFrame(() => { modalInput.focus(); modalInput.select(); });
        }

        return new Promise((resolve) => { modalResolve = resolve; });
    };

    const hideModal = () => {
        modalOverlay.classList.add('hidden');
        modalResolve = null;
    };

    const handleRenameFile = async (id) => {
        const file = files.find(f => f.id === id);
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
            await RazenFS.saveFile(file);
            renderDocuments();
        }
    };

    const handleFileImport = (file) => {
        if (!file.name.endsWith('.md') && !file.name.endsWith('.txt')) {
            toast('Only .md and .txt files are supported', 'error');
            return;
        }

        const reader = new FileReader();
        reader.onload = async (e) => {
            const content = e.target.result;
            const name = file.name.replace(/\.(md|txt)$/, '');
            const newId = `file_${Date.now()}`;
            const newFile = {
                id: newId,
                name: name,
                content: content
            };
            await RazenFS.saveFile(newFile);
            files.push(newFile);
            renderDocuments();
            toast('File imported', 'success');
        };
        reader.readAsText(file);
    };

    // Drag and Drop
    const handleDragOver = (e) => {
        e.preventDefault();
        e.stopPropagation();
        dropOverlay.classList.remove('hidden');
    };

    const handleDragLeave = (e) => {
        e.preventDefault();
        e.stopPropagation();
        if (e.relatedTarget === null || !dropOverlay.contains(e.relatedTarget)) {
             dropOverlay.classList.add('hidden');
        }
    };

    const handleDrop = (e) => {
        e.preventDefault();
        e.stopPropagation();
        dropOverlay.classList.add('hidden');

        const file = e.dataTransfer.files[0];
        if (file) {
            handleFileImport(file);
        }
    };

    if (documentsGrid) {
        documentsGrid.addEventListener('dragenter', handleDragOver);
        dropOverlay.addEventListener('dragover', (e) => e.preventDefault());
        dropOverlay.addEventListener('dragleave', handleDragLeave);
        dropOverlay.addEventListener('drop', handleDrop);
    }

    const handleDownloadFile = (id) => {
        const file = files.find(f => f.id === id);
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
        const fileIndex = files.findIndex(f => f.id === id);
        if (fileIndex === -1) return;

        const file = files[fileIndex];
        const confirmed = await showModal({
            title: 'Delete File',
            message: `Are you sure you want to delete "${file.name}"? This action cannot be undone.`
        });

        if (confirmed) {
            await RazenFS.deleteFile(id);
            files.splice(fileIndex, 1);
            renderDocuments();
        }
    };

    documentsGrid.addEventListener('click', (e) => {
        const target = e.target.closest('.action-btn');
        if (!target) return;
        const id = target.dataset.id;
        if (target.classList.contains('rename-btn')) handleRenameFile(id);
        else if (target.classList.contains('download-btn')) handleDownloadFile(id);
        else if (target.classList.contains('delete-btn')) handleDeleteFile(id);
    });

    modalConfirmBtn.addEventListener('click', () => {
        if (modalResolve) {
            const isPrompt = !modalInput.classList.contains('hidden');
            modalResolve(isPrompt ? modalInput.value : true);
            hideModal();
        }
    });

    modalCancelBtn.addEventListener('click', () => {
        if (modalResolve) { modalResolve(null); hideModal(); }
    });

    modalOverlay.addEventListener('click', (e) => {
        if (e.target === modalOverlay && modalResolve) { modalResolve(null); hideModal(); }
    });

    const applyTheme = (theme) => {
        document.documentElement.setAttribute('data-theme', theme);
        themeToggle.querySelector('i').className = theme === 'dark' ? 'fas fa-sun' : 'fas fa-moon';
        localStorage.setItem('theme', theme);
    };

    themeToggle.addEventListener('click', () => {
        const current = document.documentElement.getAttribute('data-theme');
        applyTheme(current === 'dark' ? 'light' : 'dark');
    });

    const init = async () => {
        const savedTheme = localStorage.getItem('theme') || (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
        applyTheme(savedTheme);
        await loadFiles();
        renderDocuments();
    };

    init();
});