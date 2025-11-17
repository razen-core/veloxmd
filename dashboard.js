document.addEventListener('DOMContentLoaded', () => {
    const recentFilesList = document.getElementById('recent-files-list');
    const copyrightYear = document.getElementById('copyright-year');

    // Dynamically set the copyright year
    if (copyrightYear) {
        copyrightYear.textContent = new Date().getFullYear();
    }

    // Load and display recent files
    if (recentFilesList) {
        const files = JSON.parse(localStorage.getItem('markdown_files') || '[]');

        if (files.length > 0) {
            // Sort files by last modified (assuming Date.now() was used for IDs)
            const sortedFiles = files.sort((a, b) => {
                const timeA = parseInt(a.id.split('_')[1], 10);
                const timeB = parseInt(b.id.split('_')[1], 10);
                return timeB - timeA;
            });

            // Get the 5 most recent files
            const recentFiles = sortedFiles.slice(0, 5);

            recentFilesList.innerHTML = recentFiles.map(file => `
                <li>
                    <a href="editor.html?file=${file.id}">
                        <span class="file-name">${file.name}</span>
                        <span class="file-date">${new Date(parseInt(file.id.split('_')[1], 10)).toLocaleDateString()}</span>
                    </a>
                </li>
            `).join('');
        } else {
            recentFilesList.innerHTML = '<p class="no-recent-files">No recent documents found. <a href="editor.html">Create one!</a></p>';
        }
    }
});
