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

    const exportAsPDF = async () => {
        const activeFile = state.files.find(f => f.id === state.activeFileId);
        if (!activeFile) return;
        
        toast('Preparing PDF…', 'info');
        
        let iframe = document.getElementById('print-iframe');
        if (iframe) iframe.remove();
        iframe = document.createElement('iframe');
        iframe.id = 'print-iframe';
        iframe.style.cssText = 'position:fixed;top:-9999px;left:-9999px;width:210mm;height:297mm;border:none;visibility:hidden;';
        document.body.appendChild(iframe);
        
        const doc = iframe.contentWindow.document;
        const currentTheme = document.documentElement.getAttribute('data-theme') || 'light';
        const previewHTML = preview.innerHTML;
        
        doc.open();
        doc.write(`<!DOCTYPE html>
    <html lang="en">
    <head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width,initial-scale=1.0">
    <title>${activeFile.name}</title>
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@600;700&family=Lexend:wght@400;500;600&family=PT+Mono&display=swap" rel="stylesheet">
    <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/katex@0.16.21/dist/katex.min.css">
    <style>
      /* === Reset & Base === */
      *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    
      html { font-size: 11pt; }
    
      body {
        font-family: 'Lexend', 'Segoe UI', sans-serif;
        line-height: 1.75;
        color: #1a1a1a;
        background: #ffffff;
        padding: 0;
        margin: 0;
        -webkit-print-color-adjust: exact;
        print-color-adjust: exact;
      }
    
      /* === Page Layout === */
      .page-content {
        max-width: 680px;
        margin: 0 auto;
        padding: 0 8mm;
      }
    
      @page {
        size: A4;
        margin: 22mm 20mm 22mm 20mm;
      }
    
      /* === Typography === */
      h1, h2, h3, h4, h5, h6 {
        font-family: 'Outfit', sans-serif;
        font-weight: 700;
        color: #0f0f0f;
        line-height: 1.25;
        margin-top: 1.6em;
        margin-bottom: 0.5em;
        page-break-after: avoid;
        break-after: avoid;
      }
      h1 { font-size: 2rem; border-bottom: 2px solid #e5e5e5; padding-bottom: 0.35em; margin-top: 0; }
      h2 { font-size: 1.5rem; border-bottom: 1px solid #ececec; padding-bottom: 0.25em; }
      h3 { font-size: 1.2rem; }
      h4 { font-size: 1.05rem; }
      h5, h6 { font-size: 1rem; color: #444; }
    
      p { margin-bottom: 1em; orphans: 3; widows: 3; }
    
      a { color: #1a56db; text-decoration: underline; word-break: break-word; }
    
      strong { font-weight: 600; color: #111; }
      em { font-style: italic; }
    
      /* === Lists === */
      ul, ol {
        margin: 0.5em 0 1em 1.75em;
        padding: 0;
      }
      li { margin-bottom: 0.35em; }
      ul ul, ol ol, ul ol, ol ul { margin-top: 0.25em; margin-bottom: 0.25em; }
    
      /* === Blockquote === */
      blockquote {
        border-left: 4px solid #d0d0d0;
        margin: 1.25em 0;
        padding: 0.6em 1em;
        color: #555;
        font-style: italic;
        background: #f9f9f9;
        border-radius: 0 6px 6px 0;
      }
      blockquote p { margin-bottom: 0; }
    
      /* === Horizontal Rule === */
      hr {
        border: none;
        border-top: 1px solid #e0e0e0;
        margin: 1.75em 0;
      }
    
      /* === Tables === */
      table {
        width: 100%;
        border-collapse: collapse;
        margin: 1.25em 0;
        font-size: 0.9em;
        page-break-inside: avoid;
        break-inside: avoid;
      }
      th, td {
        border: 1px solid #d8d8d8;
        padding: 0.55em 0.85em;
        text-align: left;
        vertical-align: top;
      }
      th {
        background-color: #f2f2f2;
        font-weight: 600;
        font-size: 0.85em;
        text-transform: uppercase;
        letter-spacing: 0.04em;
        color: #333;
      }
      tr:nth-child(even) td { background-color: #fafafa; }
    
      /* === Inline Code === */
      code {
        font-family: 'PT Mono', 'Courier New', monospace;
        font-size: 0.875em;
        background: #f0f0f0;
        color: #c7254e;
        padding: 0.15em 0.45em;
        border-radius: 4px;
        border: 1px solid #e4e4e4;
      }
    
      /* === Code Blocks === */
      pre {
        background: #f6f8fa;
        border: 1px solid #e1e4e8;
        border-radius: 8px;
        padding: 1em 1.2em;
        overflow-x: auto;
        margin: 1.25em 0;
        page-break-inside: avoid;
        break-inside: avoid;
      }
      pre code {
        font-family: 'PT Mono', 'Courier New', monospace;
        font-size: 0.85em;
        background: none;
        color: #24292e;
        padding: 0;
        border: none;
        border-radius: 0;
      }
    
      /* Code block container (from hljs enhancer) */
      .code-block-container {
        margin: 1.25em 0;
        border: 1px solid #e1e4e8;
        border-radius: 8px;
        overflow: hidden;
        page-break-inside: avoid;
        break-inside: avoid;
      }
      .code-block-header { display: none !important; }
      .code-block-container pre {
        margin: 0;
        border: none;
        border-radius: 0;
      }
    
      /* === Images === */
      img { max-width: 100%; height: auto; border-radius: 4px; }
    
      /* === Task Lists === */
      .task-list-item { list-style: none; margin-left: -1.25em; }
      .task-list-item input[type="checkbox"] {
        appearance: none;
        -webkit-appearance: none;
        width: 13px;
        height: 13px;
        border: 2px solid #888;
        border-radius: 3px;
        vertical-align: middle;
        margin-right: 0.5em;
        position: relative;
        top: -1px;
        display: inline-block;
      }
      .task-list-item input[type="checkbox"]:checked {
        background: #1a56db;
        border-color: #1a56db;
      }
      .task-list-item input[type="checkbox"]:checked::after {
        content: '✓';
        color: white;
        font-size: 9px;
        position: absolute;
        left: 1px;
        top: -1px;
      }
    
      /* === Syntax Highlighting (GitHub Light) === */
      .hljs{color:#24292e;background:#f6f8fa}
      .hljs-doctag,.hljs-keyword,.hljs-meta .hljs-keyword,.hljs-template-tag,.hljs-template-variable,.hljs-type,.hljs-variable.language_{color:#d73a49}
      .hljs-title,.hljs-title.class_,.hljs-title.class_.inherited__,.hljs-title.function_{color:#6f42c1}
      .hljs-attr,.hljs-attribute,.hljs-literal,.hljs-meta,.hljs-number,.hljs-operator,.hljs-selector-attr,.hljs-selector-class,.hljs-selector-id,.hljs-variable{color:#005cc5}
      .hljs-regexp,.hljs-string,.hljs-symbol{color:#032f62}
      .hljs-built_in,.hljs-code,.hljs-comment,.hljs-formula,.hljs-name,.hljs-quote,.hljs-selector-pseudo,.hljs-selector-tag,.hljs-subst,.hljs-tag{color:#6a737d}
      .hljs-section{color:#005cc5;font-weight:700}
      .hljs-bullet{color:#735c0f}
      .hljs-emphasis{font-style:italic}
      .hljs-strong{font-weight:700}
      .hljs-addition{color:#22863a;background:#f0fff4}
      .hljs-deletion{color:#b31d28;background:#ffeef0}
    
      /* === KaTeX === */
      .katex-display { overflow-x: auto; margin: 1.25em 0; }
    
      /* === Print Utilities === */
      @media print {
        body { padding: 0; }
        a { color: #1a56db !important; }
        pre, .code-block-container, table, blockquote {
          page-break-inside: avoid !important;
          break-inside: avoid !important;
        }
        h1, h2, h3, h4 {
          page-break-after: avoid !important;
          break-after: avoid !important;
        }
      }
    </style>
    </head>
    <body>
    <div class="page-content">
    ${previewHTML}
    </div>
    <script>
      // Wait for fonts + all resources before printing
      document.fonts.ready.then(function() {
        setTimeout(function() { window.print(); }, 250);
      });
    <\/script>
    </body>
    </html>`);
        doc.close();
    };

    const exportAsHTML = () => {
        const activeFile = state.files.find(f => f.id === state.activeFileId);
        if (!activeFile) return;
        
        const previewHTML = preview.innerHTML;
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
      /* === CSS Variables === */
      :root {
        --bg: #ffffff;
        --bg2: #f7f7f8;
        --text: #1a1a1a;
        --text2: #555;
        --border: #e2e2e2;
        --accent: #1a56db;
        --code-bg: #f0f0f0;
        --code-text: #c7254e;
        --pre-bg: #f6f8fa;
        --pre-border: #e1e4e8;
        --quote-bg: #f9f9f9;
        --th-bg: #f2f2f2;
        --font-sans: 'Lexend', 'Segoe UI', sans-serif;
        --font-header: 'Outfit', sans-serif;
        --font-mono: 'PT Mono', 'Courier New', monospace;
      }
      [data-theme="dark"] {
        --bg: #111827;
        --bg2: #1f2937;
        --text: #f0f0f0;
        --text2: #9ca3af;
        --border: #374151;
        --accent: #60a5fa;
        --code-bg: #1e293b;
        --code-text: #f472b6;
        --pre-bg: #0d1117;
        --pre-border: #30363d;
        --quote-bg: #1a2335;
        --th-bg: #1f2937;
      }
    
      /* === Reset === */
      *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    
      /* === Base === */
      html { scroll-behavior: smooth; }
    
      body {
        font-family: var(--font-sans);
        font-size: 1rem;
        line-height: 1.8;
        color: var(--text);
        background: var(--bg);
        padding: 0;
        margin: 0;
        -webkit-font-smoothing: antialiased;
      }
    
      /* === Page Shell === */
      .page-wrapper {
        max-width: 780px;
        margin: 0 auto;
        padding: 3rem 2rem 5rem;
      }
    
      /* === Typography === */
      h1, h2, h3, h4, h5, h6 {
        font-family: var(--font-header);
        font-weight: 700;
        color: var(--text);
        line-height: 1.25;
        margin-top: 1.75em;
        margin-bottom: 0.6em;
      }
      h1 { font-size: 2.25rem; border-bottom: 2px solid var(--border); padding-bottom: 0.4em; margin-top: 0; }
      h2 { font-size: 1.65rem; border-bottom: 1px solid var(--border); padding-bottom: 0.3em; }
      h3 { font-size: 1.35rem; }
      h4 { font-size: 1.1rem; }
      h5 { font-size: 1rem; }
      h6 { font-size: 0.95rem; color: var(--text2); }
    
      p { margin-bottom: 1.1em; }
    
      a { color: var(--accent); text-decoration: underline; text-underline-offset: 3px; word-break: break-word; }
      a:hover { opacity: 0.8; }
    
      strong { font-weight: 600; }
    
      /* === Lists === */
      ul, ol { margin: 0.5em 0 1.1em 1.85em; padding: 0; }
      li { margin-bottom: 0.4em; }
      ul ul, ol ol, ul ol, ol ul { margin: 0.25em 0 0.25em 1.5em; }
    
      /* === Blockquote === */
      blockquote {
        border-left: 4px solid var(--border);
        margin: 1.5em 0;
        padding: 0.75em 1.25em;
        color: var(--text2);
        font-style: italic;
        background: var(--quote-bg);
        border-radius: 0 8px 8px 0;
      }
      blockquote p:last-child { margin-bottom: 0; }
    
      /* === HR === */
      hr { border: none; border-top: 1px solid var(--border); margin: 2em 0; }
    
      /* === Tables === */
      .table-wrap { overflow-x: auto; margin: 1.5em 0; border-radius: 8px; border: 1px solid var(--border); }
      table { width: 100%; border-collapse: collapse; font-size: 0.925rem; }
      th, td { border-bottom: 1px solid var(--border); padding: 0.65em 1em; text-align: left; vertical-align: top; }
      th {
        background: var(--th-bg);
        font-weight: 600;
        font-size: 0.8rem;
        text-transform: uppercase;
        letter-spacing: 0.05em;
        color: var(--text2);
      }
      tr:last-child td { border-bottom: none; }
      tbody tr:nth-child(even) td { background: var(--bg2); }
    
      /* === Inline Code === */
      code {
        font-family: var(--font-mono);
        font-size: 0.875em;
        background: var(--code-bg);
        color: var(--code-text);
        padding: 0.18em 0.48em;
        border-radius: 5px;
        border: 1px solid var(--border);
      }
    
      /* === Code Blocks === */
      pre {
        background: var(--pre-bg);
        border: 1px solid var(--pre-border);
        border-radius: 10px;
        padding: 1.1em 1.3em;
        overflow-x: auto;
        margin: 1.5em 0;
        line-height: 1.6;
      }
      pre code {
        font-family: var(--font-mono);
        font-size: 0.875em;
        background: none;
        color: inherit;
        padding: 0;
        border: none;
        border-radius: 0;
      }
    
      /* Code block container */
      .code-block-container {
        margin: 1.5em 0;
        border: 1px solid var(--pre-border);
        border-radius: 10px;
        overflow: hidden;
      }
      .code-block-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        background: var(--bg2);
        padding: 0.5em 1em;
        border-bottom: 1px solid var(--pre-border);
      }
      .lang-name {
        font-family: var(--font-mono);
        font-size: 0.75rem;
        color: var(--text2);
        text-transform: uppercase;
        letter-spacing: 0.06em;
      }
      .copy-btn { display: none !important; }
      .code-block-container pre {
        margin: 0;
        border: none;
        border-radius: 0;
      }
    
      /* === Images === */
      img { max-width: 100%; height: auto; border-radius: 6px; display: block; margin: 1em auto; }
    
      /* === Task Lists === */
      .task-list-item { list-style: none; margin-left: -1.5em; }
      .task-list-item input[type="checkbox"] {
        appearance: none;
        -webkit-appearance: none;
        width: 15px;
        height: 15px;
        border: 2px solid var(--border);
        border-radius: 4px;
        vertical-align: middle;
        margin-right: 0.5em;
        position: relative;
        top: -1px;
        cursor: default;
        display: inline-block;
      }
      .task-list-item input[type="checkbox"]:checked {
        background: var(--accent);
        border-color: var(--accent);
      }
      .task-list-item input[type="checkbox"]:checked::after {
        content: '✓';
        color: white;
        font-size: 10px;
        position: absolute;
        left: 1px;
        top: -1px;
      }
    
      /* === Syntax Highlighting — Light === */
      [data-theme="light"] .hljs{color:#24292e;background:#f6f8fa}
      [data-theme="light"] .hljs-doctag,[data-theme="light"] .hljs-keyword,[data-theme="light"] .hljs-meta .hljs-keyword,[data-theme="light"] .hljs-type,[data-theme="light"] .hljs-variable.language_{color:#d73a49}
      [data-theme="light"] .hljs-title,[data-theme="light"] .hljs-title.class_,[data-theme="light"] .hljs-title.function_{color:#6f42c1}
      [data-theme="light"] .hljs-attr,[data-theme="light"] .hljs-number,[data-theme="light"] .hljs-operator,[data-theme="light"] .hljs-variable{color:#005cc5}
      [data-theme="light"] .hljs-string,[data-theme="light"] .hljs-regexp,[data-theme="light"] .hljs-symbol{color:#032f62}
      [data-theme="light"] .hljs-comment,[data-theme="light"] .hljs-tag,[data-theme="light"] .hljs-name{color:#6a737d}
      [data-theme="light"] .hljs-section{color:#005cc5;font-weight:700}
      [data-theme="light"] .hljs-addition{color:#22863a;background:#f0fff4}
      [data-theme="light"] .hljs-deletion{color:#b31d28;background:#ffeef0}
    
      /* === Syntax Highlighting — Dark === */
      [data-theme="dark"] .hljs{color:#c9d1d9;background:#0d1117}
      [data-theme="dark"] .hljs-doctag,[data-theme="dark"] .hljs-keyword,[data-theme="dark"] .hljs-type,[data-theme="dark"] .hljs-variable.language_{color:#ff7b72}
      [data-theme="dark"] .hljs-title,[data-theme="dark"] .hljs-title.class_,[data-theme="dark"] .hljs-title.function_{color:#d2a8ff}
      [data-theme="dark"] .hljs-attr,[data-theme="dark"] .hljs-number,[data-theme="dark"] .hljs-operator,[data-theme="dark"] .hljs-variable{color:#79c0ff}
      [data-theme="dark"] .hljs-string,[data-theme="dark"] .hljs-regexp,[data-theme="dark"] .hljs-symbol{color:#a5d6ff}
      [data-theme="dark"] .hljs-comment,[data-theme="dark"] .hljs-tag,[data-theme="dark"] .hljs-name{color:#8b949e}
      [data-theme="dark"] .hljs-section{color:#1f6feb;font-weight:700}
      [data-theme="dark"] .hljs-addition{color:#aff5b4;background:#033a16}
      [data-theme="dark"] .hljs-deletion{color:#ffdcd7;background:#67060c}
    
      /* === KaTeX === */
      .katex-display { overflow-x: auto; padding: 0.5em 0; }
    
      /* === Scrollbar === */
      ::-webkit-scrollbar { width: 8px; height: 8px; }
      ::-webkit-scrollbar-track { background: var(--bg); }
      ::-webkit-scrollbar-thumb { background: var(--border); border-radius: 4px; }
      ::-webkit-scrollbar-thumb:hover { background: var(--text2); }
    
      /* === Responsive === */
      @media (max-width: 640px) {
        .page-wrapper { padding: 2rem 1.1rem 4rem; }
        h1 { font-size: 1.75rem; }
        h2 { font-size: 1.35rem; }
        pre, .code-block-container { border-radius: 6px; }
      }
    </style>
    </head>
    <body>
    <div class="page-wrapper">
    ${previewHTML}
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