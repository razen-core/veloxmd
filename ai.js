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

        const model = document.getElementById('ai-model-selector').value;
        const streaming = true; // For this example, we'll always stream

        appendMessage('ai', '', true); // Add a placeholder for the AI response

        try {
            const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:${streaming ? 'streamGenerateContent' : 'generateContent'}?key=${apiKey}`, {
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

            while (true) {
                const {
                    done,
                    value
                } = await reader.read();
                if (done) break;

                const chunk = decoder.decode(value, {
                    stream: true
                });
                const lines = chunk.split('\n');

                for (const line of lines) {
                    if (line.startsWith('data: ')) {
                        try {
                            const json = JSON.parse(line.substring(6));
                            if (json.candidates && json.candidates[0].content.parts[0].text) {
                                const text = json.candidates[0].content.parts[0].text;
                                accumulatedText += text;
                                updateLastMessage(accumulatedText, false);
                            }
                        } catch (error) {
                            console.error('Error parsing streaming JSON:', error);
                        }
                    }
                }
            }

            // Final update to add the "Replace Code" button if applicable
            updateLastMessage(accumulatedText, true);


        } catch (error) {
            console.error('Error fetching AI response:', error);
            updateLastMessage('Sorry, I encountered an error. Please try again.', true);
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

    function updateLastMessage(text, isFinal) {
        const lastMessage = aiChatContainer.querySelector('.ai-message:last-child');
        if (lastMessage) {
            // Render markdown content
            lastMessage.innerHTML = marked.parse(text);

            // Highlight code blocks
            lastMessage.querySelectorAll('pre code').forEach((block) => {
                hljs.highlightElement(block);
            });

            if (isFinal) {
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
