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

    let files = [];
    let modalResolve = null;

    // Dynamically set the copyright year
    if (copyrightYear) {
        copyrightYear.textContent = new Date().getFullYear();
    }

    // Handle creation of a new document
    newDocumentBtn.addEventListener('click', (e) => {
        e.preventDefault();
        localStorage.setItem('create_new_file', 'true');
        window.location.href = 'editor.html';
    });

    const loadFiles = async () => {
        files = await RazenFS.getAllFiles();
    };

    const renderDocuments = () => {
        if (documentsGrid) {
            const sortedFiles = files.sort((a, b) => {
                const timeA = parseInt(a.id.split('_')[1], 10);
                const timeB = parseInt(b.id.split('_')[1], 10);
                return timeB - timeA;
            });

            if (sortedFiles.length > 0) {
                documentsGrid.innerHTML = sortedFiles.map(file => `
                    <div class="document-card">
                        <a href="editor.html?file=${file.id}" class="document-card-link">
                            <h3 class="document-title">${file.name}</h3>
                        </a>
                        <div class="document-info">
                             <p class="document-date">
                                ${new Date(parseInt(file.id.split('_')[1], 10)).toLocaleDateString()}
                            </p>
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
                    </div>
                `).join('');
            } else {
                documentsGrid.innerHTML = `
                    <div class="no-documents-message">
                        <h3>You don't have any documents yet.</h3>
                        <p>Click the "New Document" button to get started.</p>
                    </div>
                `;
            }
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

    const createNewFile = () => {
        const newId = `file_${Date.now()}`;
        const fileNumber = files.length + 1;
        const newFile = {
            id: newId,
            name: `Untitled ${fileNumber}`,
            content: `# Untitled ${fileNumber}\n\nStart writing your markdown here.`
        };
        files.push(newFile);
        saveFiles();
        return newFile.id;
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
        if (target.classList.contains('rename-btn')) {
            handleRenameFile(id);
        } else if (target.classList.contains('download-btn')) {
            handleDownloadFile(id);
        } else if (target.classList.contains('delete-btn')) {
            handleDeleteFile(id);
        }
    });

    modalConfirmBtn.addEventListener('click', () => {
        if (modalResolve) {
            const isPrompt = !modalInput.classList.contains('hidden');
            modalResolve(isPrompt ? modalInput.value : true);
            hideModal();
        }
    });

    modalCancelBtn.addEventListener('click', () => {
        if (modalResolve) {
            modalResolve(null);
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

    const applyTheme = (theme) => {
        document.documentElement.setAttribute('data-theme', theme);
        themeToggle.querySelector('i').className = theme === 'dark' ? 'fas fa-sun' : 'fas fa-moon';
        localStorage.setItem('theme', theme);
    };

    themeToggle.addEventListener('click', () => {
        const currentTheme = document.documentElement.getAttribute('data-theme');
        applyTheme(currentTheme === 'dark' ? 'light' : 'dark');
    });

    const init = async () => {
        const savedTheme = localStorage.getItem('theme') || (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
        applyTheme(savedTheme);
        await loadFiles();
        renderDocuments();
    };

    init();
});
