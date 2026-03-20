let conversationHistory = [];

document.addEventListener('DOMContentLoaded', () => {
    const aiModeBtn = document.getElementById('ai-mode-btn');
    const aiModalOverlay = document.getElementById('ai-modal-overlay');
    const aiModalCloseBtn = document.getElementById('ai-modal-close-btn');
    const aiSendBtn = document.getElementById('ai-send-btn');
    const aiStopBtn = document.getElementById('ai-stop-btn');
    const aiInput = document.getElementById('ai-input');
    const aiInputContainer = document.getElementById('ai-input-container');
    const aiChatContainer = document.getElementById('ai-chat-container');
    const editor = document.getElementById('editor');
    const aiActionsTemplate = document.getElementById('ai-actions-template');
    const aiNewChatBtn = document.getElementById('ai-new-chat-btn');

    let apiKey = localStorage.getItem('gemini-api-key');
    let abortController = null;

    aiModeBtn.addEventListener('click', () => {
        aiModalOverlay.classList.remove('hidden');
    });

    aiModalCloseBtn.addEventListener('click', () => {
        aiModalOverlay.classList.add('hidden');
    });

    const sendMessage = async () => {
        const prompt = aiInput.value.trim();
        if (prompt && !aiInput.disabled) {
            appendMessage('user', prompt);
            aiInput.value = '';

            let fullPrompt = prompt;
            if (prompt.includes('@code')) {
                fullPrompt = prompt.replace('@code', `\n\n\`\`\`\n${editor.value}\n\`\`\`\n\n`);
            }
            conversationHistory.push({ role: 'user', parts: [{ text: fullPrompt }] });

            await getAiResponse();
        }
    };

    aiSendBtn.addEventListener('click', sendMessage);

    aiInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            sendMessage();
        }
    });

    aiStopBtn.addEventListener('click', () => {
        if (abortController) {
            abortController.abort();
            if (window.toast) window.toast('AI response stopped', 'info');
        }
    });

    async function getAiResponse() {
        if (!apiKey) {
            appendMessage('ai', 'API key is not set. Please set it in the settings.');
            return;
        }

        abortController = new AbortController();

        // UI Updates for streaming
        aiInput.disabled = true;
        aiInputContainer.classList.add('streaming');
        aiSendBtn.classList.add('hidden');
        aiStopBtn.classList.remove('hidden');

        const aiMessage = appendMessage('ai', '', true);

        try {
            const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-3-flash-preview:streamGenerateContent?alt=sse&key=${apiKey}`, {
                method: 'POST',
                signal: abortController.signal,
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    contents: conversationHistory
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
            conversationHistory.push({ role: 'model', parts: [{ text: accumulatedText }] });

        } catch (error) {
            if (error.name === 'AbortError') {
                aiMessage.innerHTML += '<p><em>Response cancelled by user.</em></p>';
            } else {
                console.error('Error fetching AI response:', error);
                aiMessage.innerHTML = marked.parse('Sorry, I encountered an error. Please try again.');
            }
        } finally {
            abortController = null;
            aiInput.disabled = false;
            aiInputContainer.classList.remove('streaming');
            aiSendBtn.classList.remove('hidden');
            aiStopBtn.classList.add('hidden');
            aiInput.focus();
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
                if (window.toast) window.toast('Code replaced', 'success');
            };

            replaceSaveBtn.onclick = () => {
                editor.value = codeToInsert;
                editor.dispatchEvent(new Event('input', { bubbles: true }));
                editor.dispatchEvent(new CustomEvent('save-content'));
                aiModalOverlay.classList.add('hidden');
                if (window.toast) window.toast('Code replaced & saved', 'success');
            };

            messageElement.appendChild(actionsContainer);
        }

        aiChatContainer.scrollTop = aiChatContainer.scrollHeight;
    }

    // Settings Modal Logic
    const settingsBtn = document.getElementById('settings-btn');
    const mobileSettingsBtn = document.getElementById('mobile-settings-btn');
    const settingsModalOverlay = document.getElementById('settings-modal-overlay');
    const settingsModalCloseBtn = document.getElementById('settings-modal-close-btn');
    const apiKeyInput = document.getElementById('api-key-input');
    const settingsSaveBtn = document.getElementById('settings-save-btn');

    const openSettings = () => {
        apiKeyInput.value = localStorage.getItem('gemini-api-key') || '';
        settingsModalOverlay.classList.remove('hidden');
    };

    settingsBtn.addEventListener('click', openSettings);
    if (mobileSettingsBtn) {
        mobileSettingsBtn.addEventListener('click', () => {
            openSettings();
            const headerMoreMenu = document.getElementById('header-more-menu');
            if (headerMoreMenu) headerMoreMenu.classList.add('hidden');
        });
    }

    settingsModalCloseBtn.addEventListener('click', () => {
        settingsModalOverlay.classList.add('hidden');
    });

    settingsSaveBtn.addEventListener('click', () => {
        apiKey = apiKeyInput.value.trim();
        localStorage.setItem('gemini-api-key', apiKey);
        settingsModalOverlay.classList.add('hidden');
        if (window.toast) window.toast('API key saved', 'success');
    });

    aiNewChatBtn.addEventListener('click', () => {
        conversationHistory = [];
        aiChatContainer.style.transition = 'opacity 0.3s ease';
        aiChatContainer.style.opacity = '0';

        setTimeout(() => {
            aiChatContainer.innerHTML = '';
            aiChatContainer.style.opacity = '1';
            if (window.toast) window.toast('Chat cleared', 'info');
        }, 300);
    });
});
