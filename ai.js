document.addEventListener('DOMContentLoaded', () => {
    const aiModeBtn = document.getElementById('ai-mode-btn');
    const aiModalOverlay = document.getElementById('ai-modal-overlay');
    const aiModalCloseBtn = document.getElementById('ai-modal-close-btn');
    const aiSendBtn = document.getElementById('ai-send-btn');
    const aiInput = document.getElementById('ai-input');
    const aiChatContainer = document.getElementById('ai-chat-container');
    const editor = document.getElementById('editor');
    const aiActionsTemplate = document.getElementById('ai-actions-template');

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

        const aiMessage = appendMessage('ai', '', true);

        try {
            const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-3-flash-preview:streamGenerateContent?alt=sse&key=${apiKey}`, {
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

            const reader = response.body.getReader();
            const decoder = new TextDecoder();
            let accumulatedText = '';

            aiMessage.innerHTML = '';

            while (true) {
                const { value, done } = await reader.read();
                if (done) break;

                const chunk = decoder.decode(value);
                const lines = chunk.split('\n');

                for (const line of lines) {
                    if (line.startsWith('data: ')) {
                        const jsonString = line.substring(6);
                        try {
                            const data = JSON.parse(jsonString);
                            if (data.candidates && data.candidates[0].content.parts[0].text) {
                                const textPart = data.candidates[0].content.parts[0].text;
                                accumulatedText += textPart;
                                aiMessage.innerHTML = marked.parse(accumulatedText);
                                aiChatContainer.scrollTop = aiChatContainer.scrollHeight;
                            }
                        } catch (e) {
                            console.error("Failed to parse JSON from stream:", jsonString, e);
                        }
                    }
                }
            }

            finalizeMessage(aiMessage, accumulatedText);

        } catch (error) {
            console.error('Error fetching AI response:', error);
            aiMessage.innerHTML = marked.parse('Sorry, I encountered an error. Please try again.');
        }
    }

    function appendMessage(sender, text, isLoading = false) {
        const messageElement = document.createElement('div');
        messageElement.classList.add('chat-message', `${sender}-message`);

        if (isLoading) {
            messageElement.innerHTML = '<div class="loading-spinner"></div>';
        } else {
            messageElement.innerHTML = marked.parse(text);
        }

        aiChatContainer.appendChild(messageElement);
        aiChatContainer.scrollTop = aiChatContainer.scrollHeight;
        return messageElement;
    }

    function finalizeMessage(messageElement, text) {
        messageElement.innerHTML = marked.parse(text);

        const codeBlocks = text.match(/```(\w+)?\n([\s\S]*?)```/g);
        if (codeBlocks) {
            const actionsContainer = aiActionsTemplate.cloneNode(true);
            actionsContainer.removeAttribute('id');
            actionsContainer.style.display = 'flex';

            const replaceBtn = actionsContainer.querySelector('.replace-btn');
            const replaceSaveBtn = actionsContainer.querySelector('.replace-save-btn');

            const codeToInsert = codeBlocks.map(block => block.replace(/```(\w+)?\n|```/g, '')).join('\n');

            replaceBtn.onclick = () => {
                editor.value = codeToInsert;
                editor.dispatchEvent(new Event('input', { bubbles: true }));
                aiModalOverlay.classList.add('hidden');
            };

            replaceSaveBtn.onclick = () => {
                editor.value = codeToInsert;
                editor.dispatchEvent(new Event('input', { bubbles: true }));
                editor.dispatchEvent(new CustomEvent('save-content'));
                aiModalOverlay.classList.add('hidden');
            };

            messageElement.appendChild(actionsContainer);
        }

        aiChatContainer.scrollTop = aiChatContainer.scrollHeight;
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
