document.addEventListener('DOMContentLoaded', () => {
    // 1. Element Selection
    const appContainer = document.getElementById('app-container');
    const editor = document.getElementById('editor');
    const preview = document.getElementById('preview');
    const viewToggle = document.getElementById('view-toggle');
    const themeToggle = document.getElementById('theme-toggle');
    const appTitle = document.getElementById('app-title');
    const wordCountEl = document.getElementById('word-count');
    const charCountEl = document.getElementById('char-count');

    // 2. State
    let isPreview = false;

    // 3. Markdown & Highlighting Setup
    marked.setOptions({
        highlight: function(code, lang) {
            const language = hljs.getLanguage(lang) ? lang : 'plaintext';
            return hljs.highlight(code, { language }).value;
        },
        gfm: true,
        breaks: true,
    });

    // 4. Functions
    const updatePreview = () => {
        preview.innerHTML = marked.parse(editor.value);
        // After updating, re-highlight the code blocks in the preview
        preview.querySelectorAll('pre code').forEach((block) => {
            hljs.highlightElement(block);
        });
    };

    const updateStats = () => {
        const text = editor.value;
        const wordCount = text.trim() === '' ? 0 : text.trim().split(/\s+/).length;
        const charCount = text.length;
        wordCountEl.textContent = wordCount;
        charCountEl.textContent = charCount;
    };

    const saveContent = () => {
        localStorage.setItem('markdown_content', editor.value);
    };

    const loadContent = () => {
        const savedContent = localStorage.getItem('markdown_content');
        if (savedContent) {
            editor.value = savedContent;
        }
        updatePreview();
        updateStats();
    };

    const applyTheme = (theme) => {
        document.documentElement.setAttribute('data-theme', theme);
        const themeIcon = themeToggle.querySelector('i');
        if (theme === 'dark') {
            themeIcon.classList.remove('fa-moon');
            themeIcon.classList.add('fa-sun');
        } else {
            themeIcon.classList.remove('fa-sun');
            themeIcon.classList.add('fa-moon');
        }
        localStorage.setItem('theme', theme);
    };

    // 5. Event Listeners
    editor.addEventListener('input', () => {
        updatePreview();
        updateStats();
        saveContent();
    });

    viewToggle.addEventListener('click', () => {
        isPreview = !isPreview;
        const viewIcon = viewToggle.querySelector('i');
        editor.classList.toggle('hidden');
        preview.classList.toggle('hidden');

        if (isPreview) {
            appTitle.textContent = 'Preview';
            viewIcon.classList.remove('fa-eye');
            viewIcon.classList.add('fa-pencil-alt');
            viewToggle.title = 'Toggle Editor';
        } else {
            appTitle.textContent = 'Editor';
            viewIcon.classList.remove('fa-pencil-alt');
            viewIcon.classList.add('fa-eye');
            viewToggle.title = 'Toggle Preview';
        }
    });

    themeToggle.addEventListener('click', () => {
        const currentTheme = document.documentElement.getAttribute('data-theme');
        const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
        applyTheme(newTheme);
    });

    // 6. Initialization
    const savedTheme = localStorage.getItem('theme') || (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
    applyTheme(savedTheme);
    loadContent();

    // --- Focus Mode ---
    let focusModeTimer;
    editor.addEventListener('input', () => {
        if (!appContainer.classList.contains('is-writing')) {
            appContainer.classList.add('is-writing');
        }
        clearTimeout(focusModeTimer);
        focusModeTimer = setTimeout(() => {
            appContainer.classList.remove('is-writing');
        }, 1500);
    });
});
