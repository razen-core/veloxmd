document.addEventListener('DOMContentLoaded', () => {
    const documentsGrid = document.getElementById('documents-grid');
    const copyrightYear = document.getElementById('copyright-year');
    const newDocumentBtn = document.getElementById('new-document-btn');

    // Dynamically set the copyright year
    if (copyrightYear) {
        copyrightYear.textContent = new Date().getFullYear();
    }

    // Handle creation of a new document
    newDocumentBtn.addEventListener('click', (e) => {
        e.preventDefault();
        // Set a flag to indicate a new file should be created
        localStorage.setItem('create_new_file', 'true');
        window.location.href = 'editor.html';
    });

    // Load and display documents
    if (documentsGrid) {
        const files = JSON.parse(localStorage.getItem('markdown_files') || '[]');

        if (files.length > 0) {
            // Sort files by last modified date (newest first)
            const sortedFiles = files.sort((a, b) => {
                const timeA = parseInt(a.id.split('_')[1], 10);
                const timeB = parseInt(b.id.split('_')[1], 10);
                return timeB - timeA;
            });

            documentsGrid.innerHTML = sortedFiles.map(file => `
                <a href="editor.html?file=${file.id}" class="document-card">
                    <h3 class="document-title">${file.name}</h3>
                    <p class="document-date">
                        Last modified: ${new Date(parseInt(file.id.split('_')[1], 10)).toLocaleDateString()}
                    </p>
                </a>
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
});
