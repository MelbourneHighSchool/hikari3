appRegistry.register('assistant', {
    title: 'ChatGPT',
    icon: 'person',
    template: `
        <style>
            /* Import Roboto Mono from Google Fonts */
            @import url('https://fonts.googleapis.com/css2?family=Roboto+Mono:wght@400;500&display=swap');

            #chat-interface {
                display: flex;
                flex-direction: column;
                height: 100%;
                user-select: text; /* Enable text selection for entire interface */
            }

            #chat-container {
                display: flex;
                flex-direction: column;
                flex: 1;
                gap: 0.5rem;
                margin-top: 1rem;
                position: relative;
                height: calc(100% - 3rem); /* Account for header height */
                user-select: text; /* Enable text selection */
            }

            #chat-messages {
                position: absolute;
                top: 0;
                left: 0;
                right: 0;
                bottom: 2.5rem; /* Reduced to match new input height */
                overflow-y: auto;
                scrollbar-width: none;
                -ms-overflow-style: none;
            }

            #chat-messages::-webkit-scrollbar {
                display: none;
            }

            .message {
                padding: 0.5rem;
                margin: 0;
                margin-bottom: 1rem;
                border-radius: 4px;
                max-width: 80%;
                white-space: pre-wrap;
                word-wrap: break-word;
                line-height: 1.4;
                font-size: 0.75rem;
                background: rgba(var(--card-bg-rgb), 0.05);
                user-select: text; /* Enable text selection */
            }

            /* Style for selected text - apply to all selectable elements */
            #chat-interface ::selection {
                background: rgba(var(--accent-rgb), 0.3);
                color: var(--foreground);
            }

            /* For Firefox */
            #chat-interface ::-moz-selection {
                background: rgba(var(--accent-rgb), 0.3);
                color: var(--foreground);
            }

            .message code {
                background: rgba(var(--background-rgb), 0.05);
                padding: 0.1rem 0.3rem;
                border-radius: 3px;
                font-family: 'Roboto Mono', monospace;
                font-size: 0.7rem; /* Slightly smaller than regular text */
            }

            .message pre,
            .message code {
                user-select: text;
                -webkit-user-select: text;
                -moz-user-select: text;
                -ms-user-select: text;
            }

            .message pre {
                background: rgba(var(--background-rgb), 0.05);
                padding: 0.5rem;
                border-radius: 4px;
                overflow-x: auto;
                margin: 0.5rem 0;
            }

            .message pre code {
                background: none;
                padding: 0;
                user-select: text;
                -webkit-user-select: text;
                -moz-user-select: text;
                -ms-user-select: text;
            }

            .message strong {
                font-weight: 600;
            }

            .message em {
                font-style: italic;
            }

            .user-message {
                margin-left: auto;
            }

            .assistant-message {
                margin-right: auto;
            }

            #chat-input-container {
                display: flex;
                align-items: center;
                padding: 0.2rem 0.4rem;
                background: rgba(var(--card-bg-rgb), 0.05);
                border-radius: 4px;
                height: 1.75rem;
                position: absolute;
                bottom: 0;
                left: 0;
                right: 0;
            }

            #chat-input {
                width: 100%;
                background: transparent;
                border: none;
                color: inherit;
                font-family: inherit;
                font-size: 0.75rem;
                padding: 0;
                outline: none;
                user-select: text;
                -webkit-user-select: text;
            }
        </style>
        <div class="card-content">
            <div class="app-content">
                <div class="subcard" id="chat-interface">
                    <div class="app-header">
                        <span class="material-icons">person</span>
                        <h3>ChatGPT</h3>
                    </div>
                    <div id="chat-container">
                        <div id="chat-messages"></div>
                        <div id="chat-input-container">
                            <input type="text" id="chat-input" placeholder="Type a message..." autocomplete="off">
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `,
    setup: async function() {
        // DOM Elements
        const chatMessages = document.querySelector('#chat-messages');
        const chatInput = document.querySelector('#chat-input');

        // Chat history
        let messageHistory = [];

        // OpenAI API configuration
        const OPENAI_API_KEY = '';
        const MODEL = 'gpt-4o-mini';

        // Add helper function for scrolling chat to bottom
        function scrollChatToBottom(element) {
            const messagesDiv = element.querySelector('#chat-messages');
            if (messagesDiv) {
                messagesDiv.scrollTop = messagesDiv.scrollHeight;
            }
        }

        async function appendMessage(content, isUser = false) {
            const messageDiv = document.createElement('div');
            messageDiv.className = `message ${isUser ? 'user-message' : 'assistant-message'}`;
            messageDiv.innerHTML = isUser ? escapeHtml(content) : markdownToHtml(content);
            chatMessages.appendChild(messageDiv);
            // Use requestAnimationFrame to ensure DOM is updated
            requestAnimationFrame(() => {
                chatMessages.scrollTop = chatMessages.scrollHeight;
            });
            
            // Add to history
            messageHistory.push({
                role: isUser ? "user" : "assistant",
                content: content
            });
            return messageDiv;
        }

        // Helper function to convert markdown to HTML
        function markdownToHtml(text) {
            // Escape HTML first
            text = escapeHtml(text);
            
            // Convert code blocks with language support
            text = text.replace(/```(\w*)\n([\s\S]*?)```/g, '<pre><code class="language-$1">$2</code></pre>');
            
            // Convert inline code (do this after code blocks)
            text = text.replace(/`([^`]+)`/g, '<code>$1</code>');
            
            // Convert bold (using non-greedy match)
            text = text.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
            
            // Convert italic (using non-greedy match)
            text = text.replace(/\*(.+?)\*/g, '<em>$1</em>');
            
            // Convert newlines to <br>
            text = text.replace(/\n/g, '<br>');
            
            return text;
        }

        // Helper function to escape HTML
        function escapeHtml(text) {
            const div = document.createElement('div');
            div.textContent = text;
            return div.innerHTML;
        }

        // Make scrollChatToBottom available globally for animations
        window.scrollChatToBottom = scrollChatToBottom;

        async function sendMessage() {
            const message = chatInput.value.trim();
            if (!message) return;

            // Clear input
            chatInput.value = '';

            // Display user message
            appendMessage(message, true);

            try {
                const response = await fetch("https://api.openai.com/v1/chat/completions", {
                    method: "POST",
                    headers: {
                        "Authorization": `Bearer ${OPENAI_API_KEY}`,
                        "Content-Type": "application/json"
                    },
                    body: JSON.stringify({
                        "model": MODEL,
                        "messages": [
                            {
                                "role": "system",
                                "content": "Be concise and straight to the point, very concise."
                            },
                            ...messageHistory
                        ],
                        "temperature": 0.7,
                        "max_tokens": 1000,
                        "stream": true // Enable streaming
                    })
                });

                if (!response.ok) {
                    const errorData = await response.json();
                    throw new Error(errorData.error?.message || `HTTP error! status: ${response.status}`);
                }

                // Create message div for streaming response
                const messageDiv = await appendMessage("", false);
                const reader = response.body.getReader();
                const decoder = new TextDecoder();
                let buffer = '';
                let fullText = ''; // Add this to accumulate the raw text

                while (true) {
                    const {value, done} = await reader.read();
                    if (done) break;
                    
                    buffer += decoder.decode(value);
                    
                    while (true) {
                        const newlineIndex = buffer.indexOf('\n');
                        if (newlineIndex === -1) break;
                        
                        const line = buffer.slice(0, newlineIndex);
                        buffer = buffer.slice(newlineIndex + 1);
                        
                        if (line.startsWith('data: ')) {
                            const data = line.slice(6);
                            if (data === '[DONE]') continue;
                            
                            try {
                                const parsed = JSON.parse(data);
                                const content = parsed.choices[0]?.delta?.content || '';
                                // Accumulate the raw text and convert all at once
                                fullText += content;
                                messageDiv.innerHTML = markdownToHtml(fullText);
                                chatMessages.scrollTop = chatMessages.scrollHeight;
                            } catch (e) {
                                console.error('Error parsing SSE message:', e);
                            }
                        }
                    }
                }
            } catch (error) {
                appendMessage(`Error: ${error.message}`, false);
                console.error('API Error:', error);
            }
        }

        // Event Listeners
        chatInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                sendMessage();
            }
        });
    }
}); 