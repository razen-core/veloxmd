document.addEventListener('DOMContentLoaded', () => {
    // 1. Element Selection
    const editor = document.getElementById('editor');
    const preview = document.getElementById('preview');
    const viewToggle = document.getElementById('view-toggle');
    const themeToggle = document.getElementById('theme-toggle');
    const exportBtn = document.getElementById('export-btn');
    const exportDropdownToggle = document.getElementById('export-dropdown-toggle');
    const exportMenu = document.getElementById('export-menu');
    const exportPdfBtn = document.getElementById('export-pdf-btn');
    const exportHtmlBtn = document.getElementById('export-html-btn');
    const mobileExportPdfBtn = document.getElementById('mobile-export-pdf-btn');
    const mobileExportHtmlBtn = document.getElementById('mobile-export-html-btn');
    const headerMoreBtn = document.getElementById('header-more-btn');
    const headerMoreMenu = document.getElementById('header-more-menu');
    const mobileThemeToggle = document.getElementById('mobile-theme-toggle');
    const mobileSettingsBtn = document.getElementById('mobile-settings-btn');
    const sidebarToggle = document.getElementById('sidebar-toggle');
    const appTitle = document.getElementById('app-title');
    const wordCountEl = document.getElementById('word-count');
    const charCountEl = document.getElementById('char-count');
    const sidebar = document.getElementById('sidebar');
    const tableOfContents = document.getElementById('table-of-contents');
    const fileList = document.getElementById('file-list');
    const tabOutline = document.getElementById('tab-outline');
    const tabFiles = document.getElementById('tab-files');
    const newFileBtnSidebar = document.getElementById('new-file-btn-sidebar');

    // Find & Replace Elements
    const findReplacePanel = document.getElementById('find-replace-panel');
    const findInput = document.getElementById('find-input');
    const replaceInput = document.getElementById('replace-input');
    const findCounter = document.getElementById('find-counter');
    const findPrevBtn = document.getElementById('find-prev-btn');
    const findNextBtn = document.getElementById('find-next-btn');
    const replaceBtn = document.getElementById('replace-btn');
    const replaceAllBtn = document.getElementById('replace-all-btn');
    const closeFindBtn = document.getElementById('close-find-btn');
    const editorBackdrop = document.getElementById('editor-backdrop');

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
        isSidebarVisible: false,
        activeTab: 'outline', // 'outline' or 'files'
        findMatches: [],
        currentMatchIndex: -1,
    };

    // 3. Modern Tech Setup (Performance Observers)
    marked.setOptions({
        gfm: true,
        breaks: true,
        langPrefix: 'language-',
    });

    // KaTeX Support
    const options = {
        throwOnError: false
    };
    marked.use(markedKatex(options));

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

    // Toast Notification System
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
                toast('Copied to clipboard', 'success');
                copyButton.innerHTML = '<i class="fas fa-check"></i> Copied!';
                setTimeout(() => { copyButton.innerHTML = '<i class="far fa-copy"></i> Copy'; }, 2000);
            } catch (err) {
                console.error('Copy failed', err);
                toast('Copy failed', 'error');
            }
        };

        header.append(langName, copyButton);
        
        // DOM Manipulation
        const preElement = codeElement.parentElement;
        preElement.replaceWith(container);
        container.append(header, preElement);
    };

    const updatePreview = () => {
        const activeFile = state.files.find(f => f.id === state.activeFileId);
        const content = activeFile ? activeFile.content : '';
        
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
        const activeFile = state.files.find(f => f.id === state.activeFileId);
        if (activeFile) {
            try {
                await RazenFS.saveFile(activeFile);
                toast('Save completed', 'success');
            } catch (err) {
                console.error('Save failed', err);
                toast('Save failed', 'error');
            }
        }
    };

    const loadState = async () => {
        state.files = await RazenFS.getAllFiles();

        // Check for a flag from dashboard.js to create a new file
        if (localStorage.getItem('create_new_file') === 'true') {
            localStorage.removeItem('create_new_file');
            const newFileId = await createNewFile();
            // Redirect to the new file's URL to ensure clean state
            window.location.replace(`editor.html?file=${newFileId}`);
            return; // Stop execution to allow redirect
        }

        if (state.files.length === 0) {
            await createNewFile();
        }

        // Determine active file from URL or fallback
        const urlParams = new URLSearchParams(window.location.search);
        const fileIdFromUrl = urlParams.get('file');

        if (fileIdFromUrl && state.files.find(f => f.id === fileIdFromUrl)) {
            state.activeFileId = fileIdFromUrl;
        } else if (!state.activeFileId || !state.files.find(f => f.id === state.activeFileId)) {
            state.activeFileId = state.files[0]?.id || null;
        }
    };

    const updateTableOfContents = () => {
        const activeFile = state.files.find(f => f.id === state.activeFileId);
        if (!activeFile) return;

        // Regex optimization
        const headings = activeFile.content.match(/^#{1,6}\s.*$/gm) || [];
        
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
        const activeFile = state.files.find(f => f.id === state.activeFileId);
        if (activeFile) {
            if (editor.value !== activeFile.content) {
                editor.value = activeFile.content;
            }
        } else {
            editor.value = ''; 
        }
        updatePreview();
        updateStats();
    };
    
    const applyTheme = (theme) => {
        document.documentElement.setAttribute('data-theme', theme);
        const themeIcon = theme === 'dark' ? 'fas fa-sun' : 'fas fa-moon';
        themeToggle.querySelector('i').className = themeIcon;
        if (mobileThemeToggle) {
            mobileThemeToggle.querySelector('i').className = themeIcon;
        }
        localStorage.setItem('theme', theme);
    };

    const toggleSidebar = (show) => {
        state.isSidebarVisible = show;
        sidebar.classList.toggle('hidden', !show);
        const icon = sidebarToggle.querySelector('i');
        icon.className = show ? 'fas fa-times' : 'fas fa-bars';
        sidebarToggle.title = show ? 'Close Sidebar' : 'Open Sidebar';
        if (show) updateSidebar();
    };

    const updateSidebar = () => {
        tabOutline.classList.toggle('active', state.activeTab === 'outline');
        tabFiles.classList.toggle('active', state.activeTab === 'files');
        tableOfContents.classList.toggle('hidden', state.activeTab !== 'outline');
        fileList.classList.toggle('hidden', state.activeTab !== 'files');
        newFileBtnSidebar.classList.toggle('hidden', state.activeTab !== 'files');

        if (state.activeTab === 'outline') {
            updateTableOfContents();
        } else {
            renderFileList();
        }
    };

    const renderFileList = () => {
        fileList.innerHTML = '';
        state.files.forEach(file => {
            const item = document.createElement('div');
            item.className = `file-item ${file.id === state.activeFileId ? 'active' : ''}`;

            const name = document.createElement('span');
            name.className = 'file-item-name';
            name.textContent = file.name;

            // Extract a date from ID or use a placeholder
            const dateStr = file.id.startsWith('file_') ? new Date(parseInt(file.id.split('_')[1])).toLocaleDateString() : 'Unknown';
            const dateChip = document.createElement('span');
            dateChip.className = 'file-date-chip';
            dateChip.textContent = dateStr;

            const actions = document.createElement('div');
            actions.className = 'file-item-actions';

            const renameBtn = document.createElement('button');
            renameBtn.innerHTML = '<i class="fas fa-edit"></i>';
            renameBtn.title = 'Rename';
            renameBtn.onclick = (e) => { e.stopPropagation(); handleRenameFile(file.id); };

            const deleteBtn = document.createElement('button');
            deleteBtn.innerHTML = '<i class="fas fa-trash"></i>';
            deleteBtn.title = 'Delete';
            deleteBtn.onclick = (e) => { e.stopPropagation(); handleDeleteFile(file.id); };

            actions.append(renameBtn, deleteBtn);
            item.append(dateChip, name, actions);

            item.onclick = () => switchActiveFile(file.id);
            fileList.appendChild(item);
        });
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
        // Apply to backdrop
        editorBackdrop.scrollTop = editor.scrollTop;
    };

    // --- Find & Replace Logic ---
    const toggleFindReplace = (show) => {
        if (show === undefined) show = findReplacePanel.classList.contains('hidden');
        findReplacePanel.classList.toggle('hidden', !show);
        if (show) {
            findInput.focus();
            findInput.select();
            performSearch();
        } else {
            state.findMatches = [];
            state.currentMatchIndex = -1;
            updateSearchUI();
            editor.focus();
        }
    };

    const performSearch = () => {
        const query = findInput.value;
        const text = editor.value;
        state.findMatches = [];
        state.currentMatchIndex = -1;

        if (query) {
            let match;
            const regex = new RegExp(query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi');
            while ((match = regex.exec(text)) !== null) {
                state.findMatches.push({
                    index: match.index,
                    length: query.length
                });
            }
            if (state.findMatches.length > 0) {
                state.currentMatchIndex = 0;
            }
        }
        updateSearchUI();
    };

    const updateSearchUI = () => {
        const count = state.findMatches.length;
        const current = state.currentMatchIndex + 1;
        findCounter.textContent = `${count > 0 ? current : 0} of ${count}`;
        highlightMatches();
    };

    const highlightMatches = () => {
        const text = editor.value;
        if (state.findMatches.length === 0) {
            editorBackdrop.innerHTML = text.replace(/[<>&]/g, m => ({'<':'&lt;','>':'&gt;','&':'&amp;'}[m]));
            return;
        }

        let highlightedText = '';
        let lastIndex = 0;

        state.findMatches.forEach((match, i) => {
            highlightedText += text.substring(lastIndex, match.index).replace(/[<>&]/g, m => ({'<':'&lt;','>':'&gt;','&':'&amp;'}[m]));
            const isCurrent = i === state.currentMatchIndex;
            highlightedText += `<mark class="search-match ${isCurrent ? 'current' : ''}">${text.substring(match.index, match.index + match.length).replace(/[<>&]/g, m => ({'<':'&lt;','>':'&gt;','&':'&amp;'}[m]))}</mark>`;
            lastIndex = match.index + match.length;
        });

        highlightedText += text.substring(lastIndex).replace(/[<>&]/g, m => ({'<':'&lt;','>':'&gt;','&':'&amp;'}[m]));
        // Add a zero-width space at the end to ensure the backdrop height matches if the text ends with a newline
        editorBackdrop.innerHTML = highlightedText + (text.endsWith('\n') ? ' ' : '');

        // Scroll current match into view if needed
        if (state.currentMatchIndex !== -1) {
            const currentMark = editorBackdrop.querySelector('.search-match.current');
            if (currentMark) {
                // We don't want to scroll the backdrop independently, we want to sync editor scroll
                // But for find/replace, we might want to jump to the match in the editor
                const match = state.findMatches[state.currentMatchIndex];
                editor.selectionStart = match.index;
                editor.selectionEnd = match.index + match.length;

                // Ensure the selection is visible in the textarea
                const lineHeight = parseFloat(getComputedStyle(editor).lineHeight);
                const scrollTop = editor.scrollTop;
                const offsetTop = currentMark.offsetTop;
                if (offsetTop < scrollTop || offsetTop > scrollTop + editor.clientHeight - lineHeight) {
                    editor.scrollTop = offsetTop - editor.clientHeight / 2;
                }
            }
        }
    };

    const goToNextMatch = () => {
        if (state.findMatches.length === 0) return;
        state.currentMatchIndex = (state.currentMatchIndex + 1) % state.findMatches.length;
        updateSearchUI();
    };

    const goToPrevMatch = () => {
        if (state.findMatches.length === 0) return;
        state.currentMatchIndex = (state.currentMatchIndex - 1 + state.findMatches.length) % state.findMatches.length;
        updateSearchUI();
    };

    const replaceCurrent = () => {
        if (state.currentMatchIndex === -1) return;
        const match = state.findMatches[state.currentMatchIndex];
        const replacement = replaceInput.value;
        const text = editor.value;

        editor.value = text.substring(0, match.index) + replacement + text.substring(match.index + match.length);

        // Re-search after replacement
        performSearch();
        // Try to stay on the same index if possible, or go to next
        if (state.findMatches.length > 0) {
            state.currentMatchIndex = Math.min(state.currentMatchIndex, state.findMatches.length - 1);
        }
        updateSearchUI();
        editor.dispatchEvent(new Event('input'));
    };

    const replaceAll = () => {
        const query = findInput.value;
        if (!query) return;
        const replacement = replaceInput.value;
        const regex = new RegExp(query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi');
        editor.value = editor.value.replace(regex, replacement);

        performSearch();
        editor.dispatchEvent(new Event('input'));
    };

    // 5. File Operations (Preserved Exact Logic)
    const createNewFile = async () => {
        const newId = `file_${Date.now()}`;
        const fileNumber = state.files.length + 1;
        const newFile = {
            id: newId,
            name: `Untitled ${fileNumber}`,
            content: `# Untitled ${fileNumber}\n\nStart writing your markdown here.`
        };
        state.files.push(newFile);
        state.activeFileId = newId;

        await RazenFS.saveFile(newFile);
        toast('File created', 'success');
        updateEditorAndPreview();
        return newId; // Return the ID for redirects
    };

    // Note: This function is internal. If you use it in HTML (onclick), 
    // you must attach it to window or use event listeners.
    // Assuming internal usage based on provided code.
    const switchActiveFile = (id) => {
        if (id === state.activeFileId) return;
        state.activeFileId = id;

        // Update URL without reloading the page for better UX
        const url = new URL(window.location);
        url.searchParams.set('file', id);
        history.pushState({}, '', url);

        updateEditorAndPreview();
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
            await RazenFS.saveFile(file);
            toast('File renamed', 'success');
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
        toast('File downloaded', 'success');
    };

    const exportAsPDF = async () => {
        const activeFile = state.files.find(f => f.id === state.activeFileId);
        if (!activeFile) return;

        toast('Preparing PDF...', 'info');

        // Create a hidden iframe for printing
        let iframe = document.getElementById('print-iframe');
        if (!iframe) {
            iframe = document.createElement('iframe');
            iframe.id = 'print-iframe';
            iframe.style.display = 'none';
            document.body.appendChild(iframe);
        }

        const previewHTML = preview.innerHTML;
        const doc = iframe.contentWindow.document;

        doc.open();
        doc.write(`
            <!DOCTYPE html>
            <html>
            <head>
                <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/katex@0.16.21/dist/katex.min.css">
                <style>
                    body {
                        font-family: Georgia, serif;
                        line-height: 1.6;
                        color: #000;
                        background: #fff;
                        padding: 2rem;
                        max-width: none;
                    }
                    h1, h2, h3, h4, h5, h6 { font-family: 'Outfit', sans-serif; color: #000; }
                    pre { background: #f4f4f4; padding: 1rem; border-radius: 8px; overflow-x: auto; }
                    code { font-family: 'PT Mono', monospace; background: #f4f4f4; padding: 0.2rem 0.4rem; border-radius: 4px; }
                    table { width: 100%; border-collapse: collapse; margin: 1.5em 0; }
                    th, td { border: 1px solid #ddd; padding: 0.75em; text-align: left; }
                    th { background-color: #f8f8f8; }
                    blockquote { border-left: 4px solid #ddd; padding-left: 1rem; color: #666; font-style: italic; }
                    img { max-width: 100%; }
                    .code-block-header { display: none; }
                    @page { margin: 2cm; }
                </style>
                <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@600;700&display=swap" rel="stylesheet">
            </head>
            <body>
                <div id="print-iframe-content">
                    ${previewHTML}
                </div>
                <script>
                    window.onload = () => {
                        window.print();
                    };
                </script>
            </body>
            </html>
        `);
        doc.close();
    };

    const exportAsHTML = () => {
        const activeFile = state.files.find(f => f.id === state.activeFileId);
        if (!activeFile) return;

        const previewHTML = preview.innerHTML;
        const fullHTML = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${activeFile.name}</title>
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@500;600;700;800&family=Lexend:wght@400;500;600;700&family=PT+Mono&display=swap" rel="stylesheet">
    <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/katex@0.16.21/dist/katex.min.css">
    <style>
        :root {
            --font-sans: 'Lexend', sans-serif;
            --font-header: 'Outfit', sans-serif;
            --font-mono: 'PT Mono', monospace;
        }
        body {
            font-family: var(--font-sans);
            line-height: 1.8;
            max-width: 800px;
            margin: 0 auto;
            padding: 2rem;
            color: #1a1a1a;
            background-color: #fff;
        }
        h1, h2, h3, h4, h5, h6 { font-family: var(--font-header); margin-top: 1.5em; margin-bottom: 0.5em; }
        pre { background: #f6f8fa; padding: 1rem; border-radius: 8px; overflow-x: auto; border: 1px solid #ddd; }
        code { font-family: var(--font-mono); background: #f6f8fa; padding: 0.2rem 0.4rem; border-radius: 4px; font-size: 0.9em; }
        blockquote { border-left: 4px solid #ddd; padding-left: 1rem; color: #666; font-style: italic; margin: 1.5em 0; }
        table { width: 100%; border-collapse: collapse; margin: 1.5em 0; }
        th, td { border: 1px solid #ddd; padding: 0.75em; text-align: left; }
        th { background-color: #f8f8f8; }
        img { max-width: 100%; }
        .code-block-header { display: flex; justify-content: space-between; align-items: center; background-color: #f0f0f0; padding: 0.5em 1em; border-bottom: 1px solid #ddd; font-size: 0.8em; font-family: var(--font-mono); }
        .copy-btn { display: none; }
    </style>
</head>
<body>
    ${previewHTML}
</body>
</html>`;

        const blob = new Blob([fullHTML], { type: 'text/html;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${activeFile.name.replace(/ /g, '_')}.html`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        toast('HTML exported', 'success');
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

        await RazenFS.deleteFile(id);
        state.files.splice(fileIndex, 1);
        toast('File deleted', 'info');

        if (state.activeFileId === id) {
            if (state.files.length > 0) {
                const newActiveIndex = Math.max(0, fileIndex - 1);
                switchActiveFile(state.files[newActiveIndex].id);
            } else {
                await createNewFile();
            }
        }

        // No need to saveState, as delete is already persisted
        updateEditorAndPreview();
    };

    // 6. Event Listeners
    const debouncedUpdatePreview = debounce(updatePreview, 250); // Faster response
    const debouncedUpdateTOC = debounce(updateTableOfContents, 500); // Slower is fine
    const debouncedSaveState = debounce(saveState, 1000); // Lazy save

    editor.addEventListener('input', () => {
        const activeFile = state.files.find(f => f.id === state.activeFileId);
        if (activeFile) {
            activeFile.content = editor.value;

            // Instant Stats Update
            updateStats();

            // Smart Schedule
            debouncedUpdatePreview();
            debouncedUpdateTOC();
            debouncedSaveState();

            if (!findReplacePanel.classList.contains('hidden')) {
                performSearch();
            } else {
                highlightMatches(); // Update backdrop
            }
        }
    });

    // [New] Sync Scroll Listener
    editor.addEventListener('scroll', () => {
        window.requestAnimationFrame(syncScroll);
    });

    // Sidebar Tab Listeners
    tabOutline.addEventListener('click', () => {
        state.activeTab = 'outline';
        updateSidebar();
    });

    tabFiles.addEventListener('click', () => {
        state.activeTab = 'files';
        updateSidebar();
    });

    newFileBtnSidebar.addEventListener('click', async () => {
        const newId = await createNewFile();
        // Since we are in the same page, we can just switch
        switchActiveFile(newId);
    });

    // Find & Replace Listeners
    findInput.addEventListener('input', performSearch);
    findNextBtn.addEventListener('click', goToNextMatch);
    findPrevBtn.addEventListener('click', goToPrevMatch);
    replaceBtn.addEventListener('click', replaceCurrent);
    replaceAllBtn.addEventListener('click', replaceAll);
    closeFindBtn.addEventListener('click', () => toggleFindReplace(false));

    findInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            goToNextMatch();
        }
    });

    editor.addEventListener('save-content', () => {
        saveState();
    });

    viewToggle.addEventListener('click', () => {
        state.isPreview = !state.isPreview;
        editor.classList.toggle('hidden', state.isPreview);
        preview.classList.toggle('hidden', !state.isPreview);
        viewToggle.querySelector('i').className = state.isPreview ? 'fas fa-pencil-alt' : 'fas fa-eye';
        viewToggle.title = state.isPreview ? 'Toggle Editor' : 'Toggle Preview';
        appTitle.textContent = state.isPreview ? 'Velox Preview' : 'Velox Editor';
        
        // Re-run sync scroll when switching back
        if(!state.isPreview) syncScroll();
    });

    const toggleAppTheme = () => {
        const currentTheme = document.documentElement.getAttribute('data-theme');
        applyTheme(currentTheme === 'dark' ? 'light' : 'dark');
    };

    themeToggle.addEventListener('click', toggleAppTheme);
    if (mobileThemeToggle) {
        mobileThemeToggle.addEventListener('click', () => {
            toggleAppTheme();
            headerMoreMenu.classList.add('hidden');
        });
    }

    sidebarToggle.addEventListener('click', () => {
        toggleSidebar(!state.isSidebarVisible);
    });

    exportBtn.addEventListener('click', exportAsPDF);

    exportDropdownToggle.addEventListener('click', (e) => {
        e.stopPropagation();
        exportMenu.classList.toggle('hidden');
    });

    exportPdfBtn.addEventListener('click', () => {
        exportAsPDF();
        exportMenu.classList.add('hidden');
    });

    exportHtmlBtn.addEventListener('click', () => {
        exportAsHTML();
        exportMenu.classList.add('hidden');
    });

    if (mobileExportPdfBtn) {
        mobileExportPdfBtn.addEventListener('click', () => {
            exportAsPDF();
            headerMoreMenu.classList.add('hidden');
        });
    }

    if (mobileExportHtmlBtn) {
        mobileExportHtmlBtn.addEventListener('click', () => {
            exportAsHTML();
            headerMoreMenu.classList.add('hidden');
        });
    }

    if (headerMoreBtn) {
        headerMoreBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            headerMoreMenu.classList.toggle('hidden');
        });
    }

    document.addEventListener('click', (e) => {
        if (!e.target.closest('.export-dropdown')) {
            exportMenu.classList.add('hidden');
        }
        if (!e.target.closest('.header-more-dropdown')) {
            if (headerMoreMenu) headerMoreMenu.classList.add('hidden');
        }
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
        const savedTheme = localStorage.getItem('theme') || (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
        applyTheme(savedTheme);

        await loadState();

        // If loadState triggered a redirect, the rest of this won't run
        if (state.files.length > 0) {
            updateEditorAndPreview();
            updateTableOfContents();
            updateSidebar();
            toggleSidebar(state.isSidebarVisible);
        }
    };

    // Handle global keyboard shortcuts
    window.addEventListener('keydown', (e) => {
        const isMod = e.ctrlKey || e.metaKey;

        if (isMod) {
            switch (e.key.toLowerCase()) {
                case 'f':
                    e.preventDefault();
                    toggleFindReplace();
                    break;
                case 'b':
                    e.preventDefault();
                    window.VeloxToolbar?.insertPair('**', 'bold text');
                    break;
                case 'i':
                    e.preventDefault();
                    window.VeloxToolbar?.insertPair('*', 'italic text');
                    break;
                case 'h':
                    e.preventDefault();
                    window.VeloxToolbar?.formatHeading();
                    break;
                case 'k':
                    e.preventDefault();
                    window.VeloxToolbar?.formatLink();
                    break;
                case '`':
                    e.preventDefault();
                    window.VeloxToolbar?.insertPair('`', 'code');
                    break;
                case 's':
                    e.preventDefault();
                    saveState();
                    break;
                case 'n':
                    e.preventDefault();
                    createNewFile().then(id => switchActiveFile(id));
                    break;
                case 'p':
                    e.preventDefault();
                    state.activeTab = 'files';
                    toggleSidebar(true);
                    updateSidebar();
                    break;
                case 'd':
                    e.preventDefault();
                    const currentTheme = document.documentElement.getAttribute('data-theme');
                    applyTheme(currentTheme === 'dark' ? 'light' : 'dark');
                    break;
            }
        } else if (e.key === 'Escape') {
            if (!findReplacePanel.classList.contains('hidden')) {
                toggleFindReplace(false);
            }
        }
    });

    init();
});