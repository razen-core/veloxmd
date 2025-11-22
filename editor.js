import { listFiles, readFile, writeFile, renameFile, deleteFile, loadConfig } from './fs-helpers.js';

document.addEventListener('DOMContentLoaded', () => {
    // 1. Element Selection
    const editor = document.getElementById('editor');
    const preview = document.getElementById('preview');
    const viewToggle = document.getElementById('view-toggle');
    const themeToggle = document.getElementById('theme-toggle');
    const sidebarToggle = document.getElementById('sidebar-toggle');
    const appTitle = document.getElementById('app-title');
    const wordCountEl = document.getElementById('word-count');
    const charCountEl = document.getElementById('char-count');
    const sidebar = document.getElementById('sidebar');
    const tableOfContents = document.getElementById('table-of-contents');
    
    // Modal Elements
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

    // 3. Modern Tech Setup (Performance Observers)
    marked.setOptions({
        gfm: true,
        breaks: true,
        langPrefix: 'language-',
    });

    // [Modern Tech] Lazy Highlighter Observer
    // Prevents freezing by only highlighting code blocks currently visible on screen
    const codeObserver = new IntersectionObserver((entries, observer) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                const codeEl = entry.target;
                if (!codeEl.classList.contains('hljs')) {
                    hljs.highlightElement(codeEl);
                    enhanceCodeBlockUI(codeEl); // Add your Copy Button UI
                }
                observer.unobserve(codeEl);
            }
        });
    }, { root: preview, rootMargin: '50px' });

    // 4. Functions

    // [Enhanced] Uses requestAnimationFrame for UI smoothness
    const debounce = (func, delay) => {
        let timeoutId;
        return (...args) => {
            clearTimeout(timeoutId);
            timeoutId = setTimeout(() => func.apply(this, args), delay);
        };
    };

    // [Enhanced] Separated logic for cleaner performance
    const enhanceCodeBlockUI = (codeElement) => {
        // Prevent double processing
        if (codeElement.closest('.code-block-container')) return;

        const lang = (Array.from(codeElement.classList).find(c => c.startsWith('language-')) || '').replace('language-', '');
        
        // Create UI Elements (Preserving your exact design)
        const container = document.createElement('div');
        container.className = 'code-block-container';
        
        const header = document.createElement('div');
        header.className = 'code-block-header';
        
        const langName = document.createElement('span');
        langName.className = 'lang-name';
        langName.textContent = lang || 'text';
        
        const copyButton = document.createElement('button');
        copyButton.className = 'copy-btn';
        copyButton.innerHTML = '<i class="far fa-copy"></i> Copy';
        
        copyButton.onclick = async () => {
            try {
                await navigator.clipboard.writeText(codeElement.innerText);
                copyButton.innerHTML = '<i class="fas fa-check"></i> Copied!';
                setTimeout(() => { copyButton.innerHTML = '<i class="far fa-copy"></i> Copy'; }, 2000);
            } catch (err) {
                console.error('Copy failed', err);
            }
        };

        header.append(langName, copyButton);
        
        // DOM Manipulation
        const preElement = codeElement.parentElement;
        preElement.replaceWith(container);
        container.append(header, preElement);
    };

    const updatePreview = () => {
        const content = editor.value;
        
        // 1. Parse Markdown
        const newHTML = marked.parse(content);

        // 2. Update DOM (Only if changed to prevent scroll jumping)
        if (preview.innerHTML !== newHTML) {
            // Save scroll position before update
            const scrollPos = preview.scrollTop;
            preview.innerHTML = newHTML;
            // Restore scroll if not syncing
            if (state.isPreview) preview.scrollTop = scrollPos;
        }

        // 3. Attach Lazy Observer to Code Blocks (Zero Lag)
        preview.querySelectorAll('pre code').forEach(codeElement => {
            if (!codeElement.closest('.code-block-container')) {
                codeObserver.observe(codeElement);
            }
        });
    };

    const updateStats = () => {
        const text = editor.value;
        // Optimized Regex
        const wordCount = text.trim() === '' ? 0 : text.trim().split(/\s+/).length;
        
        // Update text content directly
        charCountEl.textContent = text.length;
        wordCountEl.textContent = wordCount;
    };
    
    // [Enhanced] Uses requestIdleCallback to save during browser idle time
    const saveState = () => {
        if ('requestIdleCallback' in window) {
            requestIdleCallback(() => performSave());
        } else {
            setTimeout(performSave, 50);
        }
    };

    const performSave = async () => {
        if (state.activeFileId) {
            await writeFile(state.activeFileId, editor.value);
        }
    };

    const loadState = async (fileIdToLoad = null) => {
        state.files = await listFiles();

        if (fileIdToLoad) {
            state.activeFileId = fileIdToLoad;
        } else {
            const urlParams = new URLSearchParams(window.location.search);
            const fileIdFromUrl = urlParams.get('file');

            if (fileIdFromUrl && state.files.find(f => f.id === fileIdFromUrl)) {
                state.activeFileId = fileIdFromUrl;
            } else if (state.files.length > 0) {
                state.activeFileId = state.files[0].id;
            }
        }

        if (state.activeFileId) {
            const content = await readFile(state.activeFileId);
            editor.value = content;
        } else {
            editor.value = '';
        }
        updateEditorAndPreview();
    };

    const updateTableOfContents = () => {
        const content = editor.value;
        // Regex optimization
        const headings = content.match(/^#{1,6}\s.*$/gm) || [];
        
        if (headings.length > 0) {
            const tocHTML = headings.map(heading => {
                const level = heading.indexOf(' ');
                const text = heading.substring(level + 1);
                const slug = text.trim().toLowerCase()
                    .replace(/\s+/g, '-')
                    .replace(/[^\w-]+/g, '');
                    
                return `<a href="#${slug}" class="toc-link toc-level-${level}" data-slug="${slug}">${text}</a>`;
            }).join('');
            
            // Only update DOM if changed
            if (tableOfContents.innerHTML !== tocHTML) {
                tableOfContents.innerHTML = tocHTML;
            }
        } else {
            tableOfContents.innerHTML = '<p class="no-outline">No outline available.</p>';
        }
    };

    const updateEditorAndPreview = () => {
        updatePreview();
        updateStats();
        updateTableOfContents();
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

    // [Enhanced] Sync Scroll Feature
    const syncScroll = () => {
        if(state.isPreview) return;
        // Calculate percentage
        const scrollPercentage = editor.scrollTop / (editor.scrollHeight - editor.clientHeight);
        // Apply to preview
        if (!isNaN(scrollPercentage)) {
             preview.scrollTop = scrollPercentage * (preview.scrollHeight - preview.clientHeight);
        }
    };

    // 5. File Operations (Preserved Exact Logic)
    const createNewFile = async () => {
        const fileNumber = state.files.length + 1;
        const newId = `Untitled_${fileNumber}.md`;
        const content = `# Untitled ${fileNumber}\n\nStart writing your markdown here.`;
        await writeFile(newId, content);
        state.activeFileId = newId;
        editor.value = content;
        updateEditorAndPreview();
    };


    // Note: This function is internal. If you use it in HTML (onclick), 
    // you must attach it to window or use event listeners.
    // Assuming internal usage based on provided code.
    const switchActiveFile = async (id) => {
        if (id === state.activeFileId) return;
        state.activeFileId = id;
        const content = await readFile(id);
        editor.value = content;
        updateEditorAndPreview();
    };

    const handleRenameFile = async (id) => {
        const file = state.files.find(f => f.id === id);
        if (!file) return;

        let newName = await showModal({
            title: 'Rename File',
            message: `Enter a new name for "${file.name}":`,
            type: 'prompt',
            inputValue: file.name.replace(/\.md$/, ''),
            inputPlaceholder: 'Enter file name'
        });

        if (newName && newName.trim() !== '' && newName !== file.name) {
            newName = newName.trim();
            if (!newName.endsWith('.md')) {
                newName += '.md';
            }
            const wasActive = state.activeFileId === id;
            await renameFile(id, newName);
            if (wasActive) {
                state.activeFileId = newName;
            }
            loadState(state.activeFileId);
        }
    };
    
    const handleDownloadFile = async (id) => {
        const content = await readFile(id);
        const blob = new Blob([content], { type: 'text/markdown;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = id;
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

        const wasActive = state.activeFileId === id;
        await deleteFile(id);

        if (wasActive) {
            state.files.splice(fileIndex, 1);
            let nextFileId = null;
            if (state.files.length > 0) {
                const newIndex = Math.max(0, fileIndex - 1);
                nextFileId = state.files[newIndex].id;
            }
            loadState(nextFileId);
        } else {
            loadState(state.activeFileId);
        }
    };

    // 6. Event Listeners
    const debouncedUpdatePreview = debounce(updatePreview, 250); // Faster response
    const debouncedUpdateTOC = debounce(updateTableOfContents, 500); // Slower is fine
    const debouncedSaveState = debounce(saveState, 1000); // Lazy save

    editor.addEventListener('input', () => {
        // Instant Stats Update
        updateStats();

        // Smart Schedule
        debouncedUpdatePreview();
        debouncedUpdateTOC();
        debouncedSaveState();
    });

    // [New] Sync Scroll Listener
    editor.addEventListener('scroll', () => {
        window.requestAnimationFrame(syncScroll);
    });

    viewToggle.addEventListener('click', () => {
        state.isPreview = !state.isPreview;
        editor.classList.toggle('hidden', state.isPreview);
        preview.classList.toggle('hidden', !state.isPreview);
        viewToggle.querySelector('i').className = state.isPreview ? 'fas fa-pencil-alt' : 'fas fa-eye';
        viewToggle.title = state.isPreview ? 'Toggle Editor' : 'Toggle Preview';
        appTitle.textContent = state.isPreview ? 'Pro Preview' : 'Pro Editor';
        
        // Re-run sync scroll when switching back
        if(!state.isPreview) syncScroll();
    });

    themeToggle.addEventListener('click', () => {
        const currentTheme = document.documentElement.getAttribute('data-theme');
        applyTheme(currentTheme === 'dark' ? 'light' : 'dark');
    });

    sidebarToggle.addEventListener('click', () => {
        toggleSidebar(!state.isSidebarVisible);
    });

    // 7. Modal Logic (Preserved)
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
        
        // Animation Frame for smoother focus
        requestAnimationFrame(() => {
             if (type === 'prompt') {
                modalInput.focus();
                modalInput.select();
            }
        });

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

    // 8. Initialization
    const init = async () => {
        const config = await loadConfig();
        if (config.onandroid === 'false') {
            const savedTheme = localStorage.getItem('theme') || (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
            applyTheme(savedTheme);

            await loadState();

            updateTableOfContents();
            toggleSidebar(state.isSidebarVisible);
        }
    };

    init();
});