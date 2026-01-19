class RichTextEditor {
    constructor() {
        this.editor = document.getElementById('editor');
        this.markdownPreview = document.getElementById('markdownPreview');
        this.undoStack = [];
        this.redoStack = [];
        this.maxUndoSteps = 50;
        this.init();
    }

    init() {
        this.setupToolbarEvents();
        this.setupTabEvents();
        this.setupFileOperations();
        this.setupUndoRedo();
        this.setupAutoSave();
        this.loadFromStorage();
        this.updatePreview();
        
        // Save initial state
        this.saveState();
        
        // Update preview when content changes
        this.editor.addEventListener('input', () => {
            this.updatePreview();
        });
    }

    setupAutoSave() {
        // Auto-save every 2 seconds
        this.editor.addEventListener('input', this.debounce(() => {
            this.saveToStorage();
        }, 2000));
        
        // Save before page unload
        window.addEventListener('beforeunload', () => {
            this.saveToStorage();
        });
    }

    saveToStorage() {
        const content = this.editor.innerHTML;
        localStorage.setItem('richEditor_content', content);
    }

    loadFromStorage() {
        const savedContent = localStorage.getItem('richEditor_content');
        if (savedContent) {
            this.editor.innerHTML = savedContent;
        }
    }

    setupUndoRedo() {
        // Save state on significant changes
        this.editor.addEventListener('input', this.debounce(() => {
            this.saveState();
        }, 500));
        
        // Save state before formatting commands
        this.editor.addEventListener('beforeinput', () => {
            this.saveState();
        });
    }

    debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    }

    saveState() {
        const currentState = this.editor.innerHTML;
        
        // Don't save if it's the same as the last state
        if (this.undoStack.length > 0 && this.undoStack[this.undoStack.length - 1] === currentState) {
            return;
        }
        
        this.undoStack.push(currentState);
        
        // Limit undo stack size
        if (this.undoStack.length > this.maxUndoSteps) {
            this.undoStack.shift();
        }
        
        // Clear redo stack when new action is performed
        this.redoStack = [];
    }

    undo() {
        if (this.undoStack.length > 1) {
            const currentState = this.undoStack.pop();
            this.redoStack.push(currentState);
            
            const previousState = this.undoStack[this.undoStack.length - 1];
            this.editor.innerHTML = previousState;
            this.updatePreview();
            
            // Focus editor and place cursor at end
            this.editor.focus();
            this.placeCursorAtEnd();
        }
    }

    redo() {
        if (this.redoStack.length > 0) {
            const nextState = this.redoStack.pop();
            this.undoStack.push(nextState);
            
            this.editor.innerHTML = nextState;
            this.updatePreview();
            
            // Focus editor and place cursor at end
            this.editor.focus();
            this.placeCursorAtEnd();
        }
    }

    placeCursorAtEnd() {
        const range = document.createRange();
        const selection = window.getSelection();
        range.selectNodeContents(this.editor);
        range.collapse(false);
        selection.removeAllRanges();
        selection.addRange(range);
    }

    setupToolbarEvents() {
        // Basic formatting commands
        document.querySelectorAll('[data-command]').forEach(btn => {
            btn.addEventListener('mousedown', (e) => {
                e.preventDefault(); // Prevent losing selection
            });
            
            btn.addEventListener('click', (e) => {
                e.preventDefault();
                const command = btn.dataset.command;
                
                // Handle undo/redo specially
                if (command === 'undo') {
                    this.undo();
                    return;
                }
                if (command === 'redo') {
                    this.redo();
                    return;
                }
                
                // Save state before making changes
                this.saveState();
                
                // Special handling for list commands
                if (command === 'insertUnorderedList' || command === 'insertOrderedList') {
                    this.editor.focus();
                    this.applyListToSelection(command);
                } else {
                    // Execute command immediately without focusing first
                    document.execCommand(command, false, null);
                    this.editor.focus();
                }
                
                this.updateButtonStates();
                this.updatePreview();
            });
        });

        // Heading buttons
        document.querySelectorAll('[data-heading]').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.preventDefault();
                this.saveState();
                this.editor.focus();
                const heading = btn.dataset.heading;
                document.execCommand('formatBlock', false, heading);
                this.updateButtonStates();
                this.updatePreview();
            });
        });

        // Font family
        document.getElementById('fontFamily').addEventListener('change', (e) => {
            this.editor.focus();
            document.execCommand('fontName', false, e.target.value);
            this.updatePreview();
        });

        // Font size
        document.getElementById('fontSize').addEventListener('change', (e) => {
            this.editor.focus();
            document.execCommand('fontSize', false, '7');
            const selection = window.getSelection();
            if (selection.rangeCount > 0) {
                const range = selection.getRangeAt(0);
                const span = document.createElement('span');
                span.style.fontSize = e.target.value;
                try {
                    range.surroundContents(span);
                } catch (ex) {
                    span.appendChild(range.extractContents());
                    range.insertNode(span);
                }
            }
            this.updatePreview();
        });

        // Text color
        document.getElementById('textColor').addEventListener('change', (e) => {
            this.editor.focus();
            document.execCommand('foreColor', false, e.target.value);
            this.updatePreview();
        });

        // Background color
        document.getElementById('bgColor').addEventListener('change', (e) => {
            this.editor.focus();
            document.execCommand('backColor', false, e.target.value);
            this.updatePreview();
        });

        // Code block
        document.getElementById('codeBtn').addEventListener('click', (e) => {
            e.preventDefault();
            this.saveState();
            this.insertCodeBlock();
        });

        // Quote block
        document.getElementById('quoteBtn').addEventListener('click', (e) => {
            e.preventDefault();
            this.saveState();
            this.insertQuoteBlock();
        });

        // Link
        document.getElementById('linkBtn').addEventListener('click', (e) => {
            e.preventDefault();
            this.insertLink();
        });

        // Image
        document.getElementById('imageBtn').addEventListener('click', (e) => {
            e.preventDefault();
            this.insertImage();
        });

        // Clear all
        document.getElementById('clearBtn').addEventListener('click', (e) => {
            e.preventDefault();
            if (confirm('Are you sure you want to clear all content?')) {
                this.editor.innerHTML = '';
                this.saveToStorage(); // Clear from storage too
                this.undoStack = [];
                this.redoStack = [];
                this.saveState();
                this.updatePreview();
            }
        });

        // Clear formatting
        document.getElementById('clearFormatBtn').addEventListener('click', (e) => {
            e.preventDefault();
            this.saveState();
            this.clearFormatting();
        });

        // Update button states on selection change
        document.addEventListener('selectionchange', () => {
            this.updateButtonStates();
        });
    }

    setupTabEvents() {
        document.getElementById('preview-tab').addEventListener('click', () => {
            this.updatePreview();
        });
    }

    setupFileOperations() {
        // Save button
        document.getElementById('saveBtn').addEventListener('click', () => {
            this.saveAsMarkdown();
        });

        // Load button
        document.getElementById('loadBtn').addEventListener('click', () => {
            document.getElementById('fileInput').click();
        });

        // File input
        document.getElementById('fileInput').addEventListener('change', (e) => {
            this.loadFile(e.target.files[0]);
        });
    }

    updateButtonStates() {
        const commands = ['bold', 'italic', 'underline', 'strikeThrough'];
        commands.forEach(command => {
            const btn = document.querySelector(`[data-command="${command}"]`);
            if (btn) {
                btn.classList.toggle('active', document.queryCommandState(command));
            }
        });
        
        // Check for list states
        const selection = window.getSelection();
        if (selection.rangeCount > 0) {
            const range = selection.getRangeAt(0);
            const parentElement = range.commonAncestorContainer.nodeType === Node.TEXT_NODE 
                ? range.commonAncestorContainer.parentElement 
                : range.commonAncestorContainer;
            
            // Check if selection is inside a list
            const inUL = parentElement.closest('ul');
            const inOL = parentElement.closest('ol');
            
            const ulBtn = document.querySelector('[data-command="insertUnorderedList"]');
            const olBtn = document.querySelector('[data-command="insertOrderedList"]');
            
            if (ulBtn) ulBtn.classList.toggle('active', !!inUL);
            if (olBtn) olBtn.classList.toggle('active', !!inOL);
        }
    }

    applyListToSelection(listType) {
        const selection = window.getSelection();
        if (selection.rangeCount === 0) return;
        
        const range = selection.getRangeAt(0);
        const parentElement = range.commonAncestorContainer.nodeType === Node.TEXT_NODE 
            ? range.commonAncestorContainer.parentElement 
            : range.commonAncestorContainer;
        
        // Check if already in a list
        const existingList = parentElement.closest('ul, ol');
        
        if (existingList) {
            // Remove from list - convert back to paragraphs
            const listItems = existingList.querySelectorAll('li');
            const fragment = document.createDocumentFragment();
            
            listItems.forEach(li => {
                const p = document.createElement('p');
                p.innerHTML = li.innerHTML;
                fragment.appendChild(p);
            });
            
            existingList.parentNode.replaceChild(fragment, existingList);
        } else {
            // Create new list
            const selectedText = selection.toString();
            
            if (selectedText) {
                const listElement = document.createElement(listType === 'insertUnorderedList' ? 'ul' : 'ol');
                const lines = selectedText.split('\n').filter(line => line.trim());
                
                if (lines.length === 0) {
                    lines.push(selectedText.trim());
                }
                
                lines.forEach(line => {
                    if (line.trim()) {
                        const li = document.createElement('li');
                        li.textContent = line.trim();
                        listElement.appendChild(li);
                    }
                });
                
                range.deleteContents();
                range.insertNode(listElement);
                selection.removeAllRanges();
            } else {
                const listElement = document.createElement(listType === 'insertUnorderedList' ? 'ul' : 'ol');
                const li = document.createElement('li');
                li.innerHTML = '&nbsp;';
                listElement.appendChild(li);
                
                range.insertNode(listElement);
                
                const newRange = document.createRange();
                newRange.selectNodeContents(li);
                newRange.collapse(true);
                selection.removeAllRanges();
                selection.addRange(newRange);
            }
        }
        
        this.updatePreview();
    }

    insertCodeBlock() {
        const selection = window.getSelection();
        const selectedText = selection.toString();
        
        if (selectedText) {
            const pre = document.createElement('pre');
            const code = document.createElement('code');
            code.textContent = selectedText;
            pre.appendChild(code);
            
            const range = selection.getRangeAt(0);
            range.deleteContents();
            range.insertNode(pre);
            
            selection.removeAllRanges();
        } else {
            const pre = document.createElement('pre');
            const code = document.createElement('code');
            code.textContent = 'Your code here';
            pre.appendChild(code);
            
            const range = selection.getRangeAt(0);
            range.insertNode(pre);
        }
        this.updatePreview();
    }

    clearFormatting() {
        const selection = window.getSelection();
        if (selection.rangeCount === 0) return;
        
        this.editor.focus();
        
        const selectedText = selection.toString();
        
        if (selectedText) {
            const range = selection.getRangeAt(0);
            const parentElement = range.commonAncestorContainer.nodeType === Node.TEXT_NODE 
                ? range.commonAncestorContainer.parentElement 
                : range.commonAncestorContainer;
            
            // Check if selection is inside a list
            const listElement = parentElement.closest('ul, ol');
            
            if (listElement) {
                // Convert list items back to paragraphs
                const listItems = Array.from(listElement.querySelectorAll('li'));
                const fragment = document.createDocumentFragment();
                
                listItems.forEach(li => {
                    const p = document.createElement('p');
                    p.textContent = li.textContent;
                    fragment.appendChild(p);
                });
                
                listElement.parentNode.replaceChild(fragment, listElement);
            } else {
                // Remove other formatting
                document.execCommand('removeFormat', false, null);
                
                // Manual cleanup for stubborn formatting
                setTimeout(() => {
                    const currentSelection = window.getSelection();
                    if (currentSelection.rangeCount > 0) {
                        const range = currentSelection.getRangeAt(0);
                        const plainText = range.toString();
                        
                        if (plainText) {
                            range.deleteContents();
                            const textNode = document.createTextNode(plainText);
                            range.insertNode(textNode);
                        }
                    }
                }, 10);
            }
        } else {
            document.execCommand('removeFormat', false, null);
        }
        
        this.updatePreview();
    }

    insertLink() {
        const url = prompt('Enter URL:');
        if (url) {
            const text = window.getSelection().toString() || url;
            document.execCommand('createLink', false, url);
        }
        this.updatePreview();
    }

    insertImage() {
        const url = prompt('Enter image URL:');
        if (url) {
            document.execCommand('insertImage', false, url);
        }
        this.updatePreview();
    }

    htmlToMarkdown(html) {
        // Create a temporary div to parse HTML
        const temp = document.createElement('div');
        temp.innerHTML = html;

        let markdown = '';
        
        const processNode = (node) => {
            if (node.nodeType === Node.TEXT_NODE) {
                return node.textContent;
            }
            
            if (node.nodeType === Node.ELEMENT_NODE) {
                const tagName = node.tagName.toLowerCase();
                const children = Array.from(node.childNodes).map(processNode).join('');
                
                switch (tagName) {
                    case 'h1':
                        return `# ${children}\n\n`;
                    case 'h2':
                        return `## ${children}\n\n`;
                    case 'h3':
                        return `### ${children}\n\n`;
                    case 'h4':
                        return `#### ${children}\n\n`;
                    case 'h5':
                        return `##### ${children}\n\n`;
                    case 'h6':
                        return `###### ${children}\n\n`;
                    case 'p':
                        return `${children}\n\n`;
                    case 'strong':
                    case 'b':
                        return `**${children}**`;
                    case 'em':
                    case 'i':
                        return `*${children}*`;
                    case 'u':
                        return `<u>${children}</u>`;
                    case 'code':
                        if (node.parentNode.tagName.toLowerCase() === 'pre') {
                            return children;
                        }
                        return `\`${children}\``;
                    case 'pre':
                        return `\`\`\`\n${children}\n\`\`\`\n\n`;
                    case 'ul':
                        return `${children}\n`;
                    case 'ol':
                        return `${children}\n`;
                    case 'li':
                        const parent = node.parentNode.tagName.toLowerCase();
                        if (parent === 'ul') {
                            return `- ${children}\n`;
                        } else if (parent === 'ol') {
                            const index = Array.from(node.parentNode.children).indexOf(node) + 1;
                            return `${index}. ${children}\n`;
                        }
                        return children;
                    case 'a':
                        const href = node.getAttribute('href');
                        return `[${children}](${href})`;
                    case 'img':
                        const src = node.getAttribute('src');
                        const alt = node.getAttribute('alt') || '';
                        return `![${alt}](${src})`;
                    case 'br':
                        return '\n';
                    case 'hr':
                        return '\n---\n\n';
                    case 'blockquote':
                        return `> ${children}\n\n`;
                    case 'div':
                        return `${children}\n`;
                    case 'span':
                        // Handle styled spans
                        let result = children;
                        const style = node.getAttribute('style');
                        if (style) {
                            if (style.includes('font-weight: bold') || style.includes('font-weight:bold')) {
                                result = `**${result}**`;
                            }
                            if (style.includes('font-style: italic') || style.includes('font-style:italic')) {
                                result = `*${result}*`;
                            }
                        }
                        return result;
                    default:
                        return children;
                }
            }
            
            return '';
        };

        markdown = processNode(temp);
        
        // Clean up extra newlines
        markdown = markdown.replace(/\n{3,}/g, '\n\n');
        markdown = markdown.trim();
        
        return markdown;
    }

    updatePreview() {
        const html = this.editor.innerHTML;
        const markdown = this.htmlToMarkdown(html);
        this.markdownPreview.textContent = markdown;
    }

    saveAsMarkdown() {
        const markdown = this.markdownPreview.textContent;
        const blob = new Blob([markdown], { type: 'text/markdown' });
        const url = URL.createObjectURL(blob);
        
        const a = document.createElement('a');
        a.href = url;
        a.download = 'content.md';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        
        // Show success message
        this.showMessage('Content saved as Markdown file!', 'success');
    }

    loadFile(file) {
        if (!file) return;
        
        const reader = new FileReader();
        reader.onload = (e) => {
            const content = e.target.result;
            
            if (file.name.endsWith('.md') || file.name.endsWith('.txt')) {
                // Auto-detect markdown and convert to HTML
                this.editor.innerHTML = this.markdownToHtml(content);
            } else {
                // Plain text
                this.editor.textContent = content;
            }
            
            this.saveToStorage(); // Save loaded content
            this.updatePreview();
            this.showMessage('File loaded successfully!', 'success');
        };
        
        reader.readAsText(file);
    }

    markdownToHtml(markdown) {
        let html = markdown;
        
        // Escape HTML first
        html = html.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
        
        // Code blocks (must be before inline code)
        html = html.replace(/```([\s\S]*?)```/g, '<pre><code>$1</code></pre>');
        
        // Headers
        html = html.replace(/^#{6}\s+(.*$)/gm, '<h6>$1</h6>');
        html = html.replace(/^#{5}\s+(.*$)/gm, '<h5>$1</h5>');
        html = html.replace(/^#{4}\s+(.*$)/gm, '<h4>$1</h4>');
        html = html.replace(/^#{3}\s+(.*$)/gm, '<h3>$1</h3>');
        html = html.replace(/^#{2}\s+(.*$)/gm, '<h2>$1</h2>');
        html = html.replace(/^#{1}\s+(.*$)/gm, '<h1>$1</h1>');
        
        // Bold and Italic (order matters)
        html = html.replace(/\*\*\*(.*?)\*\*\*/g, '<strong><em>$1</em></strong>');
        html = html.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
        html = html.replace(/\*(.*?)\*/g, '<em>$1</em>');
        
        // Inline code
        html = html.replace(/`(.*?)`/g, '<code>$1</code>');
        
        // Links
        html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>');
        
        // Images
        html = html.replace(/!\[([^\]]*)\]\(([^)]+)\)/g, '<img src="$2" alt="$1">');
        
        // Strikethrough
        html = html.replace(/~~(.*?)~~/g, '<del>$1</del>');
        
        // Horizontal rule
        html = html.replace(/^---$/gm, '<hr>');
        
        // Lists - handle nested structure
        const lines = html.split('\n');
        let result = [];
        let inList = false;
        let listType = null;
        
        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];
            const unorderedMatch = line.match(/^\s*[-*+]\s+(.*)$/);
            const orderedMatch = line.match(/^\s*(\d+)\.\s+(.*)$/);
            
            if (unorderedMatch) {
                if (!inList || listType !== 'ul') {
                    if (inList) result.push(`</${listType}>`);
                    result.push('<ul>');
                    listType = 'ul';
                    inList = true;
                }
                result.push(`<li>${unorderedMatch[1]}</li>`);
            } else if (orderedMatch) {
                if (!inList || listType !== 'ol') {
                    if (inList) result.push(`</${listType}>`);
                    result.push('<ol>');
                    listType = 'ol';
                    inList = true;
                }
                result.push(`<li>${orderedMatch[2]}</li>`);
            } else {
                if (inList) {
                    result.push(`</${listType}>`);
                    inList = false;
                    listType = null;
                }
                result.push(line);
            }
        }
        
        if (inList) {
            result.push(`</${listType}>`);
        }
        
        html = result.join('\n');
        
        // Blockquotes
        html = html.replace(/^>\s+(.*$)/gm, '<blockquote>$1</blockquote>');
        
        // Paragraphs - split by double newlines
        const paragraphs = html.split('\n\n');
        html = paragraphs.map(p => {
            p = p.trim();
            if (!p) return '';
            
            // Don't wrap if already wrapped in block elements
            if (p.match(/^<(h[1-6]|ul|ol|pre|blockquote|hr)/)) {
                return p;
            }
            
            // Don't wrap single line breaks within lists
            if (p.includes('<li>')) {
                return p;
            }
            
            return `<p>${p.replace(/\n/g, '<br>')}</p>`;
        }).join('\n\n');
        
        // Clean up
        html = html.replace(/\n{3,}/g, '\n\n');
        html = html.replace(/<p><\/p>/g, '');
        
        return html;
    }

    showMessage(message, type = 'info') {
        // Create toast notification
        const toast = document.createElement('div');
        toast.className = `alert alert-${type} position-fixed`;
        toast.style.cssText = 'top: 20px; right: 20px; z-index: 9999; min-width: 300px;';
        toast.innerHTML = `
            ${message}
            <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
        `;
        
        document.body.appendChild(toast);
        
        // Auto remove after 3 seconds
        setTimeout(() => {
            if (toast.parentNode) {
                toast.parentNode.removeChild(toast);
            }
        }, 3000);
    }
}

// Initialize editor when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new RichTextEditor();
});