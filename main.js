document.addEventListener('DOMContentLoaded', () => {
    // 1. Element Selection
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
        gfm: true,
        breaks: true,
        langPrefix: 'language-', // Ensure this is set for hljs to find languages
    });
    
    // 4. Functions
    const updatePreview = () => {
        preview.innerHTML = marked.parse(editor.value);

        preview.querySelectorAll('pre code').forEach(codeElement => {
            const preElement = codeElement.parentElement;

            // Prevent re-wrapping
            if (preElement.parentElement.classList.contains('code-block-container')) {
                return;
            }

            // Highlight the block
            hljs.highlightElement(codeElement);

            // Extract language
            const langClass = Array.from(codeElement.classList).find(cls => cls.startsWith('language-'));
            const lang = langClass ? langClass.replace('language-', '') : 'plaintext';

            // Create container
            const container = document.createElement('div');
            container.className = 'code-block-container';

            // Create header
            const header = document.createElement('div');
            header.className = 'code-block-header';

            const langName = document.createElement('span');
            langName.className = 'lang-name';
            langName.textContent = lang;

            const copyButton = document.createElement('button');
            copyButton.className = 'copy-btn';
            copyButton.innerHTML = '<i class="far fa-copy"></i> Copy';

            copyButton.addEventListener('click', () => {
                navigator.clipboard.writeText(codeElement.innerText).then(() => {
                    copyButton.innerHTML = '<i class="fas fa-check"></i> Copied!';
                    setTimeout(() => {
                        copyButton.innerHTML = '<i class="far fa-copy"></i> Copy';
                    }, 2000);
                }).catch(err => {
                    console.error('Failed to copy text: ', err);
                    copyButton.innerText = 'Error!';
                });
            });

            header.appendChild(langName);
            header.appendChild(copyButton);

            // Assemble and replace
            preElement.parentNode.insertBefore(container, preElement);
            container.appendChild(header);
            container.appendChild(preElement);
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
            appTitle.textContent = 'Pro Preview';
            viewIcon.classList.remove('fa-eye');
            viewIcon.classList.add('fa-pencil-alt');
            viewToggle.title = 'Toggle Editor';
        } else {
            appTitle.textContent = 'Pro Editor';
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
});