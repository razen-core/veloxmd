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
        activeTab: 'outline',
        findMatches: [],
        currentMatchIndex: -1,
    };

    // 3. Modern Tech Setup
    marked.setOptions({
        gfm: true,
        breaks: true,
        langPrefix: 'language-',
    });

    const options = {
        throwOnError: false
    };
    marked.use(markedKatex(options));

    const codeObserver = new IntersectionObserver((entries, observer) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                const codeEl = entry.target;
                if (!codeEl.classList.contains('hljs')) {
                    hljs.highlightElement(codeEl);
                    enhanceCodeBlockUI(codeEl);
                }
                observer.unobserve(codeEl);
            }
        });
    }, { root: preview, rootMargin: '50px' });

    // 4. Functions

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

    const debounce = (func, delay) => {
        let timeoutId;
        return (...args) => {
            clearTimeout(timeoutId);
            timeoutId = setTimeout(() => func.apply(this, args), delay);
        };
    };

    const enhanceCodeBlockUI = (codeElement) => {
        if (codeElement.closest('.code-block-container')) return;

        const lang = (Array.from(codeElement.classList).find(c => c.startsWith('language-')) || '').replace('language-', '');
        
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
        
        const preElement = codeElement.parentElement;
        preElement.replaceWith(container);
        container.append(header, preElement);
    };

    const updatePreview = () => {
        const activeFile = state.files.find(f => f.id === state.activeFileId);
        const content = activeFile ? activeFile.content : '';
        
        const newHTML = marked.parse(content);

        if (preview.innerHTML !== newHTML) {
            const scrollPos = preview.scrollTop;
            preview.innerHTML = newHTML;
            if (state.isPreview) preview.scrollTop = scrollPos;
        }

        preview.querySelectorAll('pre code').forEach(codeElement => {
            if (!codeElement.closest('.code-block-container')) {
                codeObserver.observe(codeElement);
            }
        });
    };

    const updateStats = () => {
        const text = editor.value;
        const wordCount = text.trim() === '' ? 0 : text.trim().split(/\s+/).length;
        
        charCountEl.textContent = text.length;
        wordCountEl.textContent = wordCount;
    };
    
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

        if (localStorage.getItem('create_new_file') === 'true') {
            localStorage.removeItem('create_new_file');
            const newFileId = await createNewFile();
            window.location.replace(`editor.html?file=${newFileId}`);
            return;
        }

        if (state.files.length === 0) {
            await createNewFile();
        }

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
        themeToggle.querySelector('i').className = theme === 'dark' ? 'fas fa-sun' : 'fas fa-moon';
        localStorage.setItem('theme', theme);
        // Sync more-menu theme icon too
        const moreThemeIcon = document.getElementById('more-theme-icon');
        if (moreThemeIcon) {
            moreThemeIcon.className = theme === 'dark' ? 'fas fa-sun' : 'fas fa-moon';
        }
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

    const syncScroll = () => {
        if(state.isPreview) return;
        const scrollPercentage = editor.scrollTop / (editor.scrollHeight - editor.clientHeight);
        if (!isNaN(scrollPercentage)) {
             preview.scrollTop = scrollPercentage * (preview.scrollHeight - preview.clientHeight);
        }
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
        editorBackdrop.innerHTML = highlightedText + (text.endsWith('\n') ? ' ' : '');

        if (state.currentMatchIndex !== -1) {
            const currentMark = editorBackdrop.querySelector('.search-match.current');
            if (currentMark) {
                const match = state.findMatches[state.currentMatchIndex];
                editor.selectionStart = match.index;
                editor.selectionEnd = match.index + match.length;

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

        performSearch();
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

    // 5. File Operations
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
        return newId;
    };

    const switchActiveFile = (id) => {
        if (id === state.activeFileId) return;
        state.activeFileId = id;

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
    
    // ─── Export Helper ────────────────────────────────────────────────────────────
    // CRITICAL: Never use preview.innerHTML for exports.
    // The IntersectionObserver in updatePreview() highlights lazily — only blocks
    // that have scrolled into view get hljs classes. Blocks off-screen are plain text.
    // This helper re-parses from source and runs hljs synchronously on ALL blocks.
    const getExportReadyHTML = () => {
        const activeFile = state.files.find(f => f.id === state.activeFileId);
        if (!activeFile) return '';
    
        const temp = document.createElement('div');
        temp.innerHTML = marked.parse(activeFile.content);
    
        // Synchronous highlight — no IntersectionObserver, no viewport dependency
        temp.querySelectorAll('pre code').forEach(block => {
            hljs.highlightElement(block);
        });
    
        // Wrap tables for horizontal scroll (the markup from marked has no wrapper)
        temp.querySelectorAll('table').forEach(table => {
            const wrap = document.createElement('div');
            wrap.className = 'table-scroll-wrap';
            table.parentNode.insertBefore(wrap, table);
            wrap.appendChild(table);
        });
    
        return temp.innerHTML;
    };

    const exportAsPDF = () => {
        const activeFile = state.files.find(f => f.id === state.activeFileId);
        if (!activeFile) return;
        
        toast('Preparing PDF…', 'info');
        const contentHTML = getExportReadyHTML();
        
        // Remove any leftover frame from a previous export
        document.getElementById('_velox_pdf_frame')?.remove();
        
        const iframe = document.createElement('iframe');
        iframe.id = '_velox_pdf_frame';
        // Full-page overlay — visible so browser renders fonts & styles correctly.
        // Hidden iframes skip font loading. window.open() depends on CDN network timing.
        // This is the only approach that works reliably without external dependencies.
        iframe.style.cssText = `
            position: fixed; inset: 0;
            width: 100%; height: 100%;
            z-index: 99999; border: none;
            background: #fff;
        `;
        document.body.appendChild(iframe);
        
        const doc = iframe.contentDocument;
        doc.open();
        doc.write(`<!DOCTYPE html>
    <html lang="en">
    <head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width,initial-scale=1.0">
    <title>${activeFile.name}</title>
    <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/katex@0.16.21/dist/katex.min.css">
    <style>
    /* ── No Google Fonts — system stack is instant, looks perfect in print ── */
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    
    @page {
        size: A4 portrait;
        margin: 22mm 20mm 22mm 20mm;
    }
    
    html { font-size: 10.5pt; }
    
    body {
        font-family: 'Segoe UI', system-ui, -apple-system, BlinkMacSystemFont,
                     'Helvetica Neue', Arial, sans-serif;
        line-height: 1.78;
        color: #1c1c1e;
        background: #fff;
        -webkit-print-color-adjust: exact;
        print-color-adjust: exact;
    }
    
    /* ── Screen: show a "print is loading" message ───────── */
    .print-bar {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 1rem;
        background: #1c1c1e;
        color: #fff;
        padding: 0.9rem 1.5rem;
        font-size: 0.9rem;
        font-weight: 500;
        position: sticky;
        top: 0;
        z-index: 10;
    }
    .print-bar-actions { display: flex; gap: 0.75rem; }
    .print-bar button {
        background: rgba(255,255,255,0.15);
        border: 1px solid rgba(255,255,255,0.25);
        color: #fff;
        padding: 0.4rem 1rem;
        border-radius: 20px;
        cursor: pointer;
        font-size: 0.85rem;
        font-weight: 500;
        transition: background 0.15s;
    }
    .print-bar button:hover { background: rgba(255,255,255,0.28); }
    .print-bar button.primary {
        background: #fff;
        color: #1c1c1e;
        border-color: #fff;
    }
    .print-bar button.primary:hover { background: #e8e8e8; }
    
    .page-content {
        max-width: 680px;
        margin: 0 auto;
        padding: 2rem 1.5rem 4rem;
    }
    
    /* ── Typography ────────────── */
    h1, h2, h3, h4, h5, h6 {
        font-family: Georgia, 'Times New Roman', serif;
        font-weight: 700;
        color: #0a0a0a;
        line-height: 1.22;
        margin-top: 1.6em;
        margin-bottom: 0.45em;
        page-break-after: avoid;
        break-after: avoid;
    }
    h1 {
        font-size: 2em; margin-top: 0;
        padding-bottom: 0.3em;
        border-bottom: 2px solid #e0e0e0;
    }
    h2 {
        font-size: 1.5em;
        padding-bottom: 0.25em;
        border-bottom: 1px solid #ebebeb;
    }
    h3 { font-size: 1.2em; }
    h4 { font-size: 1.05em; }
    h5, h6 { font-size: 1em; color: #555; }
    
    p { margin-bottom: 0.9em; orphans: 3; widows: 3; }
    
    a { color: #1a56db; text-decoration: underline; word-break: break-word; }
    strong { font-weight: 700; }
    em { font-style: italic; }
    
    /* ── Lists ─────────────────── */
    ul, ol { margin: 0.3em 0 0.9em 1.8em; padding: 0; }
    li { margin-bottom: 0.3em; }
    ul ul, ol ol, ul ol, ol ul { margin-top: 0.2em; margin-bottom: 0.2em; }
    
    /* ── Blockquote ────────────── */
    blockquote {
        border-left: 3px solid #ccc;
        margin: 1.1em 0;
        padding: 0.55em 1em;
        color: #555;
        font-style: italic;
        background: #f8f8f8;
        border-radius: 0 5px 5px 0;
        page-break-inside: avoid; break-inside: avoid;
    }
    blockquote p:last-child { margin-bottom: 0; }
    
    /* ── HR ────────────────────── */
    hr { border: none; border-top: 1px solid #ddd; margin: 1.5em 0; }
    
    /* ── Tables ────────────────── */
    .table-scroll-wrap {
        margin: 1.2em 0;
        page-break-inside: avoid; break-inside: avoid;
    }
    table { width: 100%; border-collapse: collapse; font-size: 0.88em; }
    th, td {
        border: 1px solid #d0d0d0;
        padding: 0.5em 0.85em;
        text-align: left; vertical-align: top;
    }
    th {
        background: #f2f2f2;
        font-weight: 700;
        font-size: 0.8em;
        text-transform: uppercase;
        letter-spacing: 0.05em;
        color: #333;
    }
    tr:nth-child(even) td { background: #fafafa; }
    
    /* ── Inline code ───────────── */
    code {
        font-family: 'Cascadia Code', 'Fira Code', 'Courier New', monospace;
        font-size: 0.85em;
        background: #f0f0f0;
        color: #c7254e;
        padding: 0.15em 0.42em;
        border-radius: 3px;
        border: 1px solid #e4e4e4;
    }
    
    /* ── Code blocks ───────────── */
    pre {
        background: #f6f8fa;
        border: 1px solid #e1e4e8;
        border-radius: 7px;
        padding: 0.9em 1.1em;
        margin: 1em 0;
        overflow-x: auto;
        page-break-inside: avoid; break-inside: avoid;
    }
    pre code {
        font-family: 'Cascadia Code', 'Fira Code', 'Courier New', monospace;
        font-size: 0.83em;
        line-height: 1.55;
        background: none;
        color: inherit;
        padding: 0; border: none; border-radius: 0;
    }
    
    /* ── Images ─────────────────── */
    img { max-width: 100%; height: auto; border-radius: 4px; display: block; margin: 0.8em 0; }
    
    /* ── Task lists ────────────── */
    .task-list-item { list-style: none; margin-left: -1.4em; }
    .task-list-item input[type="checkbox"] {
        appearance: none; -webkit-appearance: none;
        width: 12px; height: 12px;
        border: 1.5px solid #888; border-radius: 3px;
        vertical-align: middle; margin-right: 0.45em;
        position: relative; top: -1px; display: inline-block;
    }
    .task-list-item input[type="checkbox"]:checked {
        background: #1a56db; border-color: #1a56db;
    }
    .task-list-item input[type="checkbox"]:checked::after {
        content: '✓'; color: #fff; font-size: 8px;
        position: absolute; left: 1px; top: -1px;
    }
    
    /* ── KaTeX ──────────────────── */
    .katex-display {
        overflow-x: auto; margin: 1em 0;
        page-break-inside: avoid; break-inside: avoid;
    }
    
    /* ── hljs — GitHub Light ───── */
    .hljs { color: #24292e; background: #f6f8fa; }
    .hljs-keyword,.hljs-meta .hljs-keyword,.hljs-template-tag,
    .hljs-type,.hljs-variable.language_ { color: #d73a49; }
    .hljs-title,.hljs-title.class_,.hljs-title.function_ { color: #6f42c1; }
    .hljs-attr,.hljs-attribute,.hljs-literal,.hljs-meta,
    .hljs-number,.hljs-operator,.hljs-variable { color: #005cc5; }
    .hljs-regexp,.hljs-string,.hljs-symbol { color: #032f62; }
    .hljs-built_in,.hljs-code,.hljs-comment,.hljs-formula,
    .hljs-name,.hljs-quote,.hljs-tag { color: #6a737d; }
    .hljs-section { color: #005cc5; font-weight: 700; }
    .hljs-bullet { color: #735c0f; }
    .hljs-emphasis { font-style: italic; }
    .hljs-strong { font-weight: 700; }
    .hljs-addition { color: #22863a; background: #f0fff4; }
    .hljs-deletion { color: #b31d28; background: #ffeef0; }
    
    /* ── Hide print bar when printing ── */
    @media print {
        .print-bar { display: none !important; }
        body { padding: 0; }
        .page-content { padding: 0; max-width: none; }
    }
    </style>
    </head>
    <body>
    
    <div class="print-bar">
        <span>📄 ${activeFile.name} — ready to print</span>
        <div class="print-bar-actions">
            <button onclick="window.frameElement.dispatchEvent(new CustomEvent('velox-cancel',{bubbles:true}))">✕ Close</button>
            <button class="primary" onclick="window.print()">🖨 Print / Save PDF</button>
        </div>
    </div>
    
    <div class="page-content">
    ${contentHTML}
    </div>
    
    </body>
    </html>`);
        doc.close();
        
        // Cancel button inside iframe communicates up via custom event
        iframe.addEventListener('velox-cancel', () => {
            iframe.remove();
        });
        
        // Print triggered from parent — no script timing issues inside iframe
        iframe.addEventListener('load', () => {
            // KaTeX CSS is the only external resource. Give it one tick to apply.
            requestAnimationFrame(() => {
                requestAnimationFrame(() => {
                    iframe.contentWindow.print();
                    // After print dialog closes, the parent window regains focus
                    window.addEventListener('focus', () => {
                        setTimeout(() => iframe.remove(), 400);
                    }, { once: true });
                });
            });
        });
    };

    const exportAsHTML = () => {
        const activeFile = state.files.find(f => f.id === state.activeFileId);
        if (!activeFile) return;
    
        const contentHTML = getExportReadyHTML();
        const currentTheme = document.documentElement.getAttribute('data-theme') || 'light';
    
        const fullHTML = `<!DOCTYPE html>
    <html lang="en" data-theme="${currentTheme}">
    <head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta http-equiv="X-UA-Compatible" content="IE=edge">
    <title>${activeFile.name}</title>
    
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@500;600;700;800&family=Lexend:wght@400;500;600;700&family=PT+Mono&display=swap" rel="stylesheet">
    <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/katex@0.16.21/dist/katex.min.css">
    
    <style>
    /* ── Variables ────────────────────────────────────────── */
    :root {
        --bg:          #ffffff;
        --bg2:         #f7f7f8;
        --bg3:         #f0f0f1;
        --text:        #1c1c1e;
        --text2:       #555;
        --border:      #e0e0e0;
        --accent:      #1a56db;
        --code-bg:     #f0f0f0;
        --code-fg:     #c7254e;
        --pre-bg:      #f6f8fa;
        --pre-border:  #e1e4e8;
        --quote-bg:    #f9f9f9;
        --th-bg:       #f2f2f2;
        --scrollbar:   #d0d0d0;
        --shadow:      0 1px 3px rgba(0,0,0,0.07), 0 4px 14px rgba(0,0,0,0.05);
    }
    [data-theme="dark"] {
        --bg:          #111827;
        --bg2:         #1a2235;
        --bg3:         #222e42;
        --text:        #e8eaf0;
        --text2:       #8892a4;
        --border:      #2d3748;
        --accent:      #60a5fa;
        --code-bg:     #1e2a3a;
        --code-fg:     #f9a8d4;
        --pre-bg:      #0d1117;
        --pre-border:  #30363d;
        --quote-bg:    #161f2e;
        --th-bg:       #1a2235;
        --scrollbar:   #374151;
        --shadow:      0 1px 3px rgba(0,0,0,0.3), 0 4px 14px rgba(0,0,0,0.25);
    }
    
    /* ── Reset ────────────────────────────────────────────── */
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    
    /* ── Base ─────────────────────────────────────────────── */
    html { scroll-behavior: smooth; }
    
    body {
        font-family: 'Lexend', 'Segoe UI', system-ui, sans-serif;
        font-size: 1rem;
        line-height: 1.8;
        color: var(--text);
        background: var(--bg);
        -webkit-font-smoothing: antialiased;
        -moz-osx-font-smoothing: grayscale;
    }
    
    /* ── Layout ───────────────────────────────────────────── */
    .page-wrapper {
        max-width: 760px;
        margin: 0 auto;
        padding: 3.5rem 2rem 6rem;
    }
    
    /* ── Typography ───────────────────────────────────────── */
    h1, h2, h3, h4, h5, h6 {
        font-family: 'Outfit', sans-serif;
        font-weight: 700;
        color: var(--text);
        line-height: 1.22;
        margin-top: 1.85em;
        margin-bottom: 0.55em;
    }
    h1 {
        font-size: 2.2rem;
        margin-top: 0;
        padding-bottom: 0.4em;
        border-bottom: 2px solid var(--border);
    }
    h2 {
        font-size: 1.6rem;
        padding-bottom: 0.3em;
        border-bottom: 1px solid var(--border);
    }
    h3 { font-size: 1.3rem; }
    h4 { font-size: 1.1rem; }
    h5 { font-size: 1rem; }
    h6 { font-size: 0.95rem; color: var(--text2); }
    
    p { margin-bottom: 1.1em; }
    
    a {
        color: var(--accent);
        text-decoration: underline;
        text-underline-offset: 3px;
        text-decoration-thickness: 1px;
        word-break: break-word;
        transition: opacity 0.15s;
    }
    a:hover { opacity: 0.75; }
    
    strong { font-weight: 600; }
    em { font-style: italic; }
    
    /* ── Lists ────────────────────────────────────────────── */
    ul, ol { margin: 0.4em 0 1em 1.85em; padding: 0; }
    li { margin-bottom: 0.35em; }
    ul ul, ol ol, ul ol, ol ul { margin: 0.2em 0 0.2em 1.5em; }
    
    /* ── Blockquote ───────────────────────────────────────── */
    blockquote {
        border-left: 3px solid var(--border);
        margin: 1.4em 0;
        padding: 0.7em 1.2em;
        color: var(--text2);
        font-style: italic;
        background: var(--quote-bg);
        border-radius: 0 8px 8px 0;
    }
    blockquote p:last-child { margin-bottom: 0; }
    
    /* ── HR ───────────────────────────────────────────────── */
    hr { border: none; border-top: 1px solid var(--border); margin: 2em 0; }
    
    /* ── Tables ───────────────────────────────────────────── */
    .table-scroll-wrap {
        overflow-x: auto;
        margin: 1.4em 0;
        border: 1px solid var(--border);
        border-radius: 10px;
        box-shadow: var(--shadow);
    }
    table {
        width: 100%;
        border-collapse: collapse;
        font-size: 0.92rem;
        min-width: 400px;
    }
    th, td {
        border-bottom: 1px solid var(--border);
        padding: 0.6em 1em;
        text-align: left;
        vertical-align: top;
    }
    th {
        background: var(--th-bg);
        font-family: 'Outfit', sans-serif;
        font-weight: 600;
        font-size: 0.78rem;
        text-transform: uppercase;
        letter-spacing: 0.06em;
        color: var(--text2);
    }
    tr:last-child td { border-bottom: none; }
    tbody tr:nth-child(even) td { background: var(--bg2); }
    tbody tr:hover td { background: var(--bg3); transition: background 0.1s; }
    
    /* ── Inline code ──────────────────────────────────────── */
    code {
        font-family: 'PT Mono', 'Courier New', monospace;
        font-size: 0.875em;
        background: var(--code-bg);
        color: var(--code-fg);
        padding: 0.18em 0.48em;
        border-radius: 5px;
        border: 1px solid var(--border);
    }
    
    /* ── Code blocks ──────────────────────────────────────── */
    pre {
        background: var(--pre-bg);
        border: 1px solid var(--pre-border);
        border-radius: 10px;
        padding: 1.1em 1.3em;
        overflow-x: auto;
        margin: 1.4em 0;
        box-shadow: var(--shadow);
    }
    pre code {
        font-family: 'PT Mono', 'Courier New', monospace;
        font-size: 0.875em;
        line-height: 1.6;
        background: none;
        color: inherit;
        padding: 0;
        border: none;
        border-radius: 0;
    }
    
    /* ── Images ───────────────────────────────────────────── */
    img {
        max-width: 100%;
        height: auto;
        border-radius: 8px;
        display: block;
        margin: 1em auto;
        box-shadow: var(--shadow);
    }
    
    /* ── Task lists ───────────────────────────────────────── */
    .task-list-item { list-style: none; margin-left: -1.5em; }
    .task-list-item input[type="checkbox"] {
        appearance: none; -webkit-appearance: none;
        width: 15px; height: 15px;
        border: 2px solid var(--border); border-radius: 4px;
        vertical-align: middle; margin-right: 0.5em;
        position: relative; top: -1px; cursor: default;
        display: inline-block;
        transition: background 0.15s, border-color 0.15s;
    }
    .task-list-item input[type="checkbox"]:checked {
        background: var(--accent); border-color: var(--accent);
    }
    .task-list-item input[type="checkbox"]:checked::after {
        content: '✓'; color: #fff; font-size: 10px;
        position: absolute; left: 1px; top: -1px;
    }
    
    /* ── KaTeX ────────────────────────────────────────────── */
    .katex-display { overflow-x: auto; padding: 0.5em 0; margin: 1em 0; }
    
    /* ── Scrollbar ────────────────────────────────────────── */
    ::-webkit-scrollbar { width: 8px; height: 8px; }
    ::-webkit-scrollbar-track { background: transparent; }
    ::-webkit-scrollbar-thumb { background: var(--scrollbar); border-radius: 4px; }
    ::-webkit-scrollbar-thumb:hover { background: var(--text2); }
    
    /* ── Syntax highlighting — GitHub Light ──────────────── */
    [data-theme="light"] .hljs { color: #24292e; background: #f6f8fa; }
    [data-theme="light"] .hljs-keyword,
    [data-theme="light"] .hljs-meta .hljs-keyword,
    [data-theme="light"] .hljs-template-tag,
    [data-theme="light"] .hljs-template-variable,
    [data-theme="light"] .hljs-type,
    [data-theme="light"] .hljs-variable.language_ { color: #d73a49; }
    [data-theme="light"] .hljs-title,
    [data-theme="light"] .hljs-title.class_,
    [data-theme="light"] .hljs-title.class_.inherited__,
    [data-theme="light"] .hljs-title.function_ { color: #6f42c1; }
    [data-theme="light"] .hljs-attr,
    [data-theme="light"] .hljs-attribute,
    [data-theme="light"] .hljs-literal,
    [data-theme="light"] .hljs-meta,
    [data-theme="light"] .hljs-number,
    [data-theme="light"] .hljs-operator,
    [data-theme="light"] .hljs-selector-attr,
    [data-theme="light"] .hljs-selector-class,
    [data-theme="light"] .hljs-selector-id,
    [data-theme="light"] .hljs-variable { color: #005cc5; }
    [data-theme="light"] .hljs-regexp,
    [data-theme="light"] .hljs-string,
    [data-theme="light"] .hljs-symbol { color: #032f62; }
    [data-theme="light"] .hljs-built_in,
    [data-theme="light"] .hljs-code,
    [data-theme="light"] .hljs-comment,
    [data-theme="light"] .hljs-formula,
    [data-theme="light"] .hljs-name,
    [data-theme="light"] .hljs-quote,
    [data-theme="light"] .hljs-selector-pseudo,
    [data-theme="light"] .hljs-selector-tag,
    [data-theme="light"] .hljs-subst,
    [data-theme="light"] .hljs-tag { color: #6a737d; }
    [data-theme="light"] .hljs-section { color: #005cc5; font-weight: 700; }
    [data-theme="light"] .hljs-bullet { color: #735c0f; }
    [data-theme="light"] .hljs-emphasis { font-style: italic; }
    [data-theme="light"] .hljs-strong { font-weight: 700; }
    [data-theme="light"] .hljs-addition { color: #22863a; background: #f0fff4; }
    [data-theme="light"] .hljs-deletion { color: #b31d28; background: #ffeef0; }
    
    /* ── Syntax highlighting — GitHub Dark ───────────────── */
    [data-theme="dark"] .hljs { color: #c9d1d9; background: #0d1117; }
    [data-theme="dark"] .hljs-keyword,
    [data-theme="dark"] .hljs-meta .hljs-keyword,
    [data-theme="dark"] .hljs-template-tag,
    [data-theme="dark"] .hljs-template-variable,
    [data-theme="dark"] .hljs-type,
    [data-theme="dark"] .hljs-variable.language_ { color: #ff7b72; }
    [data-theme="dark"] .hljs-title,
    [data-theme="dark"] .hljs-title.class_,
    [data-theme="dark"] .hljs-title.class_.inherited__,
    [data-theme="dark"] .hljs-title.function_ { color: #d2a8ff; }
    [data-theme="dark"] .hljs-attr,
    [data-theme="dark"] .hljs-attribute,
    [data-theme="dark"] .hljs-literal,
    [data-theme="dark"] .hljs-meta,
    [data-theme="dark"] .hljs-number,
    [data-theme="dark"] .hljs-operator,
    [data-theme="dark"] .hljs-selector-attr,
    [data-theme="dark"] .hljs-selector-class,
    [data-theme="dark"] .hljs-selector-id,
    [data-theme="dark"] .hljs-variable { color: #79c0ff; }
    [data-theme="dark"] .hljs-regexp,
    [data-theme="dark"] .hljs-string,
    [data-theme="dark"] .hljs-symbol { color: #a5d6ff; }
    [data-theme="dark"] .hljs-built_in,
    [data-theme="dark"] .hljs-code,
    [data-theme="dark"] .hljs-comment,
    [data-theme="dark"] .hljs-formula,
    [data-theme="dark"] .hljs-name,
    [data-theme="dark"] .hljs-quote,
    [data-theme="dark"] .hljs-selector-pseudo,
    [data-theme="dark"] .hljs-selector-tag,
    [data-theme="dark"] .hljs-subst,
    [data-theme="dark"] .hljs-tag { color: #8b949e; }
    [data-theme="dark"] .hljs-section { color: #1f6feb; font-weight: 700; }
    [data-theme="dark"] .hljs-bullet { color: #f2cc60; }
    [data-theme="dark"] .hljs-emphasis { font-style: italic; }
    [data-theme="dark"] .hljs-strong { font-weight: 700; }
    [data-theme="dark"] .hljs-addition { color: #aff5b4; background: #033a16; }
    [data-theme="dark"] .hljs-deletion { color: #ffdcd7; background: #67060c; }
    
    /* ── Responsive ───────────────────────────────────────── */
    @media (max-width: 640px) {
        .page-wrapper { padding: 2rem 1.1rem 4rem; }
        h1 { font-size: 1.7rem; }
        h2 { font-size: 1.3rem; }
    }
    
    /* ── Print ────────────────────────────────────────────── */
    @media print {
        body { background: #fff; color: #000; }
        .table-scroll-wrap { overflow: visible; box-shadow: none; }
        pre, blockquote, .table-scroll-wrap { page-break-inside: avoid; }
    }
    </style>
    </head>
    <body>
    <div class="page-wrapper">
    ${contentHTML}
    </div>
    </body>
    </html>`;
    
        const blob = new Blob([fullHTML], { type: 'text/html;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${activeFile.name.replace(/[^a-z0-9_\-. ]/gi, '_')}.html`;
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

        updateEditorAndPreview();
    };

    // 6. Event Listeners
    const debouncedUpdatePreview = debounce(updatePreview, 250);
    const debouncedUpdateTOC = debounce(updateTableOfContents, 500);
    const debouncedSaveState = debounce(saveState, 1000);

    editor.addEventListener('input', () => {
        const activeFile = state.files.find(f => f.id === state.activeFileId);
        if (activeFile) {
            activeFile.content = editor.value;

            updateStats();

            debouncedUpdatePreview();
            debouncedUpdateTOC();
            debouncedSaveState();

            if (!findReplacePanel.classList.contains('hidden')) {
                performSearch();
            } else {
                highlightMatches();
            }
        }
    });

    editor.addEventListener('scroll', () => {
        window.requestAnimationFrame(syncScroll);
    });

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
        
        if(!state.isPreview) syncScroll();
    });

    themeToggle.addEventListener('click', () => {
        const currentTheme = document.documentElement.getAttribute('data-theme');
        applyTheme(currentTheme === 'dark' ? 'light' : 'dark');
    });

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

    document.addEventListener('click', (e) => {
        if (!e.target.closest('.export-dropdown')) {
            exportMenu.classList.add('hidden');
        }
    });

    // --- More Menu (Mobile) ---
    const moreMenuBtn = document.getElementById('more-menu-btn');
    const moreDropdown = document.getElementById('more-dropdown');

    const positionMoreDropdown = () => {
        if (!moreMenuBtn || !moreDropdown) return;
        const rect = moreMenuBtn.getBoundingClientRect();
        const DROPDOWN_WIDTH = 210;
        const MARGIN = 8;
        // Right-align the dropdown with the button's right edge
        let left = rect.right - DROPDOWN_WIDTH;
        // Don't go off-screen left
        if (left < MARGIN) left = MARGIN;
        // Don't go off-screen right
        if (left + DROPDOWN_WIDTH > window.innerWidth - MARGIN) {
            left = window.innerWidth - DROPDOWN_WIDTH - MARGIN;
        }
        moreDropdown.style.top = (rect.bottom + 6) + 'px';
        moreDropdown.style.left = left + 'px';
        moreDropdown.style.right = 'auto';
    };

    if (moreMenuBtn && moreDropdown) {
        moreMenuBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            const isHidden = moreDropdown.classList.contains('hidden');
            if (isHidden) {
                positionMoreDropdown();
            }
            moreDropdown.classList.toggle('hidden');
        });

        document.getElementById('more-export-pdf')?.addEventListener('click', () => {
            moreDropdown.classList.add('hidden');
            exportAsPDF();
        });

        document.getElementById('more-export-html')?.addEventListener('click', () => {
            moreDropdown.classList.add('hidden');
            exportAsHTML();
        });

        document.getElementById('more-theme-toggle')?.addEventListener('click', () => {
            moreDropdown.classList.add('hidden');
            const currentTheme = document.documentElement.getAttribute('data-theme');
            applyTheme(currentTheme === 'dark' ? 'light' : 'dark');
        });

        document.getElementById('more-settings-btn')?.addEventListener('click', () => {
            moreDropdown.classList.add('hidden');
            // Delegate to the existing settings button (handled in ai.js)
            document.getElementById('settings-btn').click();
        });

        // Close more-dropdown when clicking outside
        document.addEventListener('click', (e) => {
            if (!e.target.closest('.more-menu-wrapper')) {
                moreDropdown.classList.add('hidden');
            }
        });
    }

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

        if (state.files.length > 0) {
            updateEditorAndPreview();
            updateTableOfContents();
            updateSidebar();
            toggleSidebar(state.isSidebarVisible);
        }
    };

    // Global keyboard shortcuts
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