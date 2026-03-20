document.addEventListener('DOMContentLoaded', () => {
    const editor = document.getElementById('editor');
    const toolbar = document.getElementById('floating-toolbar');
    const showToolbarBtn = document.getElementById('show-toolbar-btn');

    if (!editor || !toolbar) {
        return;
    }

    // Function to insert text at the current cursor position
    const insertText = (text) => {
        const start = editor.selectionStart;
        const end = editor.selectionEnd;
        editor.value = editor.value.substring(0, start) + text + editor.value.substring(end);
        editor.selectionStart = editor.selectionEnd = start + text.length;
        editor.focus();
    };

    // Function to wrap selected text with a pair of characters
    const insertPair = (pair) => {
        const start = editor.selectionStart;
        const end = editor.selectionEnd;
        const selectedText = editor.value.substring(start, end);

        let left, right;
        if (pair === '()') {
            left = '('; right = ')';
        } else if (pair === '{}') {
            left = '{'; right = '}';
        } else if (pair === '[]') {
            left = '['; right = ']';
        } else if (pair === '$$') {
            left = '$$';
            right = '$$';
        } else {
            [left, right] = pair.split('');
        }

        const newText = left + selectedText + right;
        editor.value = editor.value.substring(0, start) + newText + editor.value.substring(end);
        editor.selectionStart = start + left.length;
        editor.selectionEnd = end + left.length;
        editor.focus();
    };

    // Function to move the cursor horizontally
    const moveCaretHorizontal = (direction) => {
        let currentPos = editor.selectionStart;
        if (direction === 'left') {
            editor.selectionStart = editor.selectionEnd = Math.max(0, currentPos - 1);
        } else if (direction === 'right') {
            editor.selectionStart = editor.selectionEnd = Math.min(editor.value.length, currentPos + 1);
        }
        editor.focus();
    };

    // Function to move the cursor vertically
    const moveCaretVertical = (direction) => {
        const text = editor.value;
        const pos = editor.selectionStart;

        // Find the start of the current line and the column
        const lineStart = text.lastIndexOf('\n', pos - 1) + 1;
        const column = pos - lineStart;

        let newPos;

        if (direction === 'up') {
            // Can't move up if we are on the first line
            if (lineStart === 0) return;

            // Find the start and end of the previous line
            const prevLineEnd = lineStart - 1;
            const prevLineStart = text.lastIndexOf('\n', prevLineEnd - 1) + 1;

            // Calculate the new position, clamped to the length of the previous line
            newPos = prevLineStart + Math.min(column, prevLineEnd - prevLineStart);

        } else if (direction === 'down') {
            // Find the end of the current line
            const lineEnd = text.indexOf('\n', pos);

            // Can't move down if we are on the last line
            if (lineEnd === -1) return;

            // Find the start and end of the next line
            const nextLineStart = lineEnd + 1;
            let nextLineEnd = text.indexOf('\n', nextLineStart);
            if (nextLineEnd === -1) {
                nextLineEnd = text.length;
            }

            // Calculate the new position, clamped to the length of the next line
            newPos = nextLineStart + Math.min(column, nextLineEnd - nextLineStart);
        }

        if (newPos !== undefined) {
            editor.selectionStart = editor.selectionEnd = newPos;
            editor.focus();
        }
    };

    // Event listener for toolbar buttons
    const handleToolbarAction = (button) => {
        const action = button.dataset.action;
        const pair = button.dataset.pair;

        switch (action) {
            case 'insert-tab':
                insertText('\t');
                break;
            case 'insert-pair':
                insertPair(pair);
                break;
            case 'move-left':
                moveCaretHorizontal('left');
                break;
            case 'move-right':
                moveCaretHorizontal('right');
                break;
            case 'move-up':
                moveCaretVertical('up');
                break;
            case 'move-down':
                moveCaretVertical('down');
                break;
        }
    };

    toolbar.addEventListener('click', (e) => {
        const button = e.target.closest('.toolbar-btn');
        if (button) {
            handleToolbarAction(button);
        }
    });

    toolbar.addEventListener('mousedown', (e) => {
        // Prevent editor from losing focus
        const button = e.target.closest('.toolbar-btn');
        if (button) {
            e.preventDefault();
        }
    });

    // Event listener for the close button
    const closeBtn = toolbar.querySelector('.toolbar-close-btn');
    if (closeBtn) {
        closeBtn.addEventListener('click', () => {
            toolbar.classList.add('hidden');
            showToolbarBtn.classList.remove('hidden');
        });
    }

    // Event listener for the show button
    if (showToolbarBtn) {
        showToolbarBtn.addEventListener('click', () => {
            toolbar.classList.remove('hidden');
            showToolbarBtn.classList.add('hidden');
        });
    }

    // Drag and drop functionality
    const dragHandle = toolbar.querySelector('.toolbar-drag-handle');
    let isDragging = false;
    let offsetX, offsetY;

    if (dragHandle) {
        const onDragStart = (e) => {
            isDragging = true;

            const styles = window.getComputedStyle(toolbar);
            if (styles.transform !== 'none') {
                toolbar.style.left = `${toolbar.offsetLeft}px`;
                toolbar.style.transform = 'none';
            }

            const clientX = e.clientX || e.touches[0].clientX;
            const clientY = e.clientY || e.touches[0].clientY;

            offsetX = clientX - toolbar.offsetLeft;
            offsetY = clientY - toolbar.offsetTop;

            toolbar.style.cursor = 'grabbing';
            document.body.classList.add('is-dragging-toolbar');

            window.addEventListener('mousemove', onDragMove);
            window.addEventListener('mouseup', onDragEnd);
            window.addEventListener('touchmove', onDragMove);
            window.addEventListener('touchend', onDragEnd);
        };

        const onDragMove = (e) => {
            if (!isDragging) return;

            const clientX = e.clientX || e.touches[0].clientX;
            const clientY = e.clientY || e.touches[0].clientY;

            let x = clientX - offsetX;
            let y = clientY - offsetY;

            const maxX = window.innerWidth - toolbar.offsetWidth;
            const maxY = window.innerHeight - toolbar.offsetHeight;

            x = Math.max(0, Math.min(x, maxX));
            y = Math.max(0, Math.min(y, maxY));

            toolbar.style.left = `${x}px`;
            toolbar.style.top = `${y}px`;
        };

        const onDragEnd = () => {
            if (!isDragging) return;
            isDragging = false;
            toolbar.style.cursor = 'move';
            document.body.classList.remove('is-dragging-toolbar');

            window.removeEventListener('mousemove', onDragMove);
            window.removeEventListener('mouseup', onDragEnd);
            window.removeEventListener('touchmove', onDragMove);
            window.removeEventListener('touchend', onDragEnd);
        };

        dragHandle.addEventListener('mousedown', onDragStart);
        dragHandle.addEventListener('touchstart', onDragStart);
    }
});
