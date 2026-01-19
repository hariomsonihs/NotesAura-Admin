class ProfessionalEditor {
    constructor() {
        this.initializeEditor();
        this.setupEventListeners();
        this.loadFromStorage();
        this.updateWordCount();
    }

    initializeEditor() {
        // Quill editor configuration
        this.quill = new Quill('#editor', {
            theme: 'snow',
            modules: {
                toolbar: [
                    [{ 'header': [1, 2, 3, 4, 5, 6, false] }],
                    [{ 'font': [] }],
                    [{ 'size': ['small', false, 'large', 'huge'] }],
                    ['bold', 'italic', 'underline', 'strike'],
                    [{ 'color': [] }, { 'background': [] }],
                    [{ 'script': 'sub'}, { 'script': 'super' }],
                    [{ 'list': 'ordered'}, { 'list': 'bullet' }],
                    [{ 'indent': '-1'}, { 'indent': '+1' }],
                    [{ 'align': [] }],
                    ['blockquote', 'code-block'],
                    ['link', 'image', 'video'],
                    ['clean'],
                    ['undo', 'redo']
                ],
                history: {
                    delay: 1000,
                    maxStack: 100,
                    userOnly: true
                }
            },
            placeholder: 'Start writing your content here...'
        });

        // Add custom undo/redo buttons
        const toolbar = this.quill.getModule('toolbar');
        toolbar.addHandler('undo', () => {
            this.quill.history.undo();
        });
        toolbar.addHandler('redo', () => {
            this.quill.history.redo();
        });

        // Auto-save functionality
        this.quill.on('text-change', () => {
            this.saveToStorage();
            this.updateWordCount();
        });

        // Keyboard shortcuts
        this.quill.keyboard.addBinding({
            key: 'Z',
            ctrlKey: true
        }, () => {
            this.quill.history.undo();
        });

        this.quill.keyboard.addBinding({
            key: 'Y',
            ctrlKey: true
        }, () => {
            this.quill.history.redo();
        });

        this.quill.keyboard.addBinding({
            key: 'Z',
            ctrlKey: true,
            shiftKey: true
        }, () => {
            this.quill.history.redo();
        });
    }

    setupEventListeners() {
        // Save HTML
        document.getElementById('saveHtmlBtn').addEventListener('click', () => {
            this.saveAsHtml();
        });

        // Save Markdown
        document.getElementById('saveMarkdownBtn').addEventListener('click', () => {
            this.saveAsMarkdown();
        });

        // Load file
        document.getElementById('loadBtn').addEventListener('click', () => {
            document.getElementById('fileInput').click();
        });

        // File input
        document.getElementById('fileInput').addEventListener('change', (e) => {
            this.loadFile(e.target.files[0]);
        });

        // Undo button
        document.getElementById('undoBtn').addEventListener('click', () => {
            this.quill.history.undo();
        });

        // Redo button
        document.getElementById('redoBtn').addEventListener('click', () => {
            this.quill.history.redo();
        });

        // Top undo button
        document.getElementById('undoBtn2').addEventListener('click', () => {
            this.quill.history.undo();
        });

        // Top redo button
        document.getElementById('redoBtn2').addEventListener('click', () => {
            this.quill.history.redo();
        });

        // Top preview button
        document.getElementById('previewBtn2').addEventListener('click', () => {
            this.showPreview();
        });

        // Clear all
        document.getElementById('clearBtn').addEventListener('click', () => {
            if (confirm('Are you sure you want to clear all content?')) {
                this.quill.setContents([]);
                this.clearStorage();
                this.updateWordCount();
            }
        });

        // Preview
        document.getElementById('previewBtn').addEventListener('click', () => {
            this.showPreview();
        });
    }

    saveToStorage() {
        const content = this.quill.getContents();
        localStorage.setItem('professionalEditor_content', JSON.stringify(content));
    }

    loadFromStorage() {
        const savedContent = localStorage.getItem('professionalEditor_content');
        if (savedContent) {
            try {
                const content = JSON.parse(savedContent);
                this.quill.setContents(content);
            } catch (e) {
                console.log('Could not load saved content');
            }
        }
    }

    clearStorage() {
        localStorage.removeItem('professionalEditor_content');
    }

    updateWordCount() {
        const text = this.quill.getText().trim();
        const words = text ? text.split(/\s+/).length : 0;
        document.getElementById('wordCount').textContent = `${words} words`;
    }

    saveAsHtml() {
        const html = this.quill.root.innerHTML;
        const blob = new Blob([html], { type: 'text/html' });
        this.downloadFile(blob, 'content.html');
        this.showMessage('Content saved as HTML file!', 'success');
    }

    saveAsMarkdown() {
        const html = this.quill.root.innerHTML;
        const markdown = this.htmlToMarkdown(html);
        const blob = new Blob([markdown], { type: 'text/markdown' });
        this.downloadFile(blob, 'content.md');
        this.showMessage('Content saved as Markdown file!', 'success');
    }

    downloadFile(blob, filename) {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }

    loadFile(file) {
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (e) => {
            const content = e.target.result;
            
            if (file.name.endsWith('.md')) {
                const html = this.markdownToHtml(content);
                this.quill.root.innerHTML = html;
            } else if (file.name.endsWith('.html')) {
                this.quill.root.innerHTML = content;
            } else {
                this.quill.setText(content);
            }
            
            this.saveToStorage();
            this.updateWordCount();
            this.showMessage('File loaded successfully!', 'success');
        };
        
        reader.readAsText(file);
    }

    showPreview() {
        const html = this.quill.root.innerHTML;
        const markdown = this.htmlToMarkdown(html);
        
        document.getElementById('htmlContent').innerHTML = html;
        document.getElementById('markdownContent').textContent = markdown;
        
        const modal = new bootstrap.Modal(document.getElementById('previewModal'));
        modal.show();
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
                        return `**${children}**`;
                    case 'em':
                        return `*${children}*`;
                    case 'u':
                        return `<u>${children}</u>`;
                    case 'code':
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
                    case 'blockquote':
                        return `> ${children}\n\n`;
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

    markdownToHtml(markdown) {
        let html = markdown;
        
        // Headers
        html = html.replace(/^#{6}\s+(.*$)/gm, '<h6>$1</h6>');
        html = html.replace(/^#{5}\s+(.*$)/gm, '<h5>$1</h5>');
        html = html.replace(/^#{4}\s+(.*$)/gm, '<h4>$1</h4>');
        html = html.replace(/^#{3}\s+(.*$)/gm, '<h3>$1</h3>');
        html = html.replace(/^#{2}\s+(.*$)/gm, '<h2>$1</h2>');
        html = html.replace(/^#{1}\s+(.*$)/gm, '<h1>$1</h1>');
        
        // Bold and Italic
        html = html.replace(/\*\*\*(.*?)\*\*\*/g, '<strong><em>$1</em></strong>');
        html = html.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
        html = html.replace(/\*(.*?)\*/g, '<em>$1</em>');
        
        // Code
        html = html.replace(/```([\s\S]*?)```/g, '<pre>$1</pre>');
        html = html.replace(/`(.*?)`/g, '<code>$1</code>');
        
        // Links
        html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>');
        
        // Lists
        html = html.replace(/^[-*+]\s+(.*$)/gm, '<li>$1</li>');
        html = html.replace(/^(\d+)\.\s+(.*$)/gm, '<li>$2</li>');
        
        // Wrap consecutive list items
        html = html.replace(/(<li>.*<\/li>\s*)+/gs, '<ul>$&</ul>');
        
        // Blockquotes
        html = html.replace(/^>\s+(.*$)/gm, '<blockquote>$1</blockquote>');
        
        // Paragraphs
        html = html.replace(/\n\n/g, '</p><p>');
        html = '<p>' + html + '</p>';
        
        // Clean up
        html = html.replace(/<p><\/p>/g, '');
        html = html.replace(/<p>(<h[1-6]>)/g, '$1');
        html = html.replace(/(<\/h[1-6]>)<\/p>/g, '$1');
        html = html.replace(/<p>(<ul>)/g, '$1');
        html = html.replace(/(<\/ul>)<\/p>/g, '$1');
        html = html.replace(/<p>(<blockquote>)/g, '$1');
        html = html.replace(/(<\/blockquote>)<\/p>/g, '$1');
        
        return html;
    }

    showMessage(message, type = 'info') {
        const toast = document.createElement('div');
        toast.className = `alert alert-${type} position-fixed`;
        toast.style.cssText = 'top: 20px; right: 20px; z-index: 9999; min-width: 300px;';
        toast.innerHTML = `
            ${message}
            <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
        `;
        
        document.body.appendChild(toast);
        
        setTimeout(() => {
            if (toast.parentNode) {
                toast.parentNode.removeChild(toast);
            }
        }, 3000);
    }
}

// Initialize editor when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new ProfessionalEditor();
});