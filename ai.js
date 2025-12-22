document.addEventListener('DOMContentLoaded', () => {
    const aiModeBtn = document.getElementById('ai-mode-btn');
    const aiModalOverlay = document.getElementById('ai-modal-overlay');
    const aiModalCloseBtn = document.getElementById('ai-modal-close-btn');
    const aiSendBtn = document.getElementById('ai-send-btn');
    const aiInput = document.getElementById('ai-input');
    const aiChatContainer = document.getElementById('ai-chat-container');
    const editor = document.getElementById('editor');

    let apiKey = localStorage.getItem('gemini-api-key');

    aiModeBtn.addEventListener('click', () => {
        aiModalOverlay.classList.remove('hidden');
    });

    aiModalCloseBtn.addEventListener('click', () => {
        aiModalOverlay.classList.add('hidden');
    });

    aiSendBtn.addEventListener('click', async () => {
        const prompt = aiInput.value.trim();
        if (prompt) {
            appendMessage('user', prompt);
            aiInput.value = '';
            await getAiResponse(prompt);
        }
    });

    async function getAiResponse(prompt) {
        if (!apiKey) {
            appendMessage('ai', 'API key is not set. Please set it in the settings.');
            return;
        }

        let fullPrompt = prompt;
        if (prompt.includes('@code')) {
            fullPrompt = prompt.replace('@code', `\n\n\`\`\`\n${editor.value}\n\`\`\`\n\n`);
        }

        appendMessage('ai', 'Thinking...', true);

        try {
            const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent?key=${apiKey}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    contents: [{
                        parts: [{
                            text: fullPrompt
                        }]
                    }]
                })
            });

            if (!response.ok) {
                throw new Error(`API request failed with status ${response.status}`);
            }

            const data = await response.json();
            const aiResponse = data.candidates[0].content.parts[0].text;
            updateLastMessage(aiResponse);

        } catch (error) {
            console.error('Error fetching AI response:', error);
            updateLastMessage('Sorry, I encountered an error. Please try again.');
        }
    }

    function appendMessage(sender, text, isLoading = false) {
        const messageElement = document.createElement('div');
        messageElement.classList.add('chat-message', `${sender}-message`);
        if (isLoading) {
            messageElement.innerHTML = '<div class="loading-spinner"></div>';
        } else {
            messageElement.textContent = text;
        }
        aiChatContainer.appendChild(messageElement);
        aiChatContainer.scrollTop = aiChatContainer.scrollHeight;
    }

    function updateLastMessage(text) {
        const lastMessage = aiChatContainer.querySelector('.ai-message:last-child');
        if (lastMessage) {
            lastMessage.innerHTML = ''; // Clear spinner
            lastMessage.textContent = text;

            const codeBlocks = text.match(/```(\w+)?\n([\s\S]*?)```/g);
            if (codeBlocks) {
                const replaceBtn = document.createElement('button');
                replaceBtn.textContent = 'Replace Code';
                replaceBtn.classList.add('replace-code-btn');
                replaceBtn.onclick = () => {
                    const codeToInsert = codeBlocks.map(block => block.replace(/```(\w+)?\n|```/g, '')).join('\n');
                    editor.value = codeToInsert;
                    aiModalOverlay.classList.add('hidden');
                };
                lastMessage.appendChild(replaceBtn);
            }
        }
    }

    // Settings Modal Logic
    const settingsBtn = document.getElementById('settings-btn');
    const settingsModalOverlay = document.getElementById('settings-modal-overlay');
    const settingsModalCloseBtn = document.getElementById('settings-modal-close-btn');
    const apiKeyInput = document.getElementById('api-key-input');
    const settingsSaveBtn = document.getElementById('settings-save-btn');

    settingsBtn.addEventListener('click', () => {
        apiKeyInput.value = localStorage.getItem('gemini-api-key') || '';
        settingsModalOverlay.classList.remove('hidden');
    });

    settingsModalCloseBtn.addEventListener('click', () => {
        settingsModalOverlay.classList.add('hidden');
    });

    settingsSaveBtn.addEventListener('click', () => {
        apiKey = apiKeyInput.value.trim();
        localStorage.setItem('gemini-api-key', apiKey);
        settingsModalOverlay.classList.add('hidden');
    });
});
