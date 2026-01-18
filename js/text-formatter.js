// Text Formatter for NotesAura Admin Panel

function toggleFormatter() {
    const formatter = document.getElementById('formatterTool');
    formatter.style.display = formatter.style.display === 'none' ? 'block' : 'none';
}

function formatText() {
    const plainText = document.getElementById('plainText').value;
    const formatted = autoFormatText(plainText);
    document.getElementById('formattedText').value = formatted;
}

function autoFormatText(text) {
    const lines = text.split('\n');
    const formatted = [];
    
    for (let line of lines) {
        const trimmed = line.trim();
        
        // Skip empty lines, headings, code blocks, images, quotes, dividers
        if (!trimmed || trimmed === '---' || 
            trimmed.startsWith('#') || trimmed.startsWith('```') || 
            trimmed.startsWith('![') || trimmed.startsWith('>')) {
            formatted.push(line);
            continue;
        }
        
        // Convert bullet points: * text → *• text*
        if (/^\*\s+(.+)/.test(trimmed)) {
            const match = trimmed.match(/^\*\s+(.+)/);
            formatted.push(`*• ${match[1]}*`);
            continue;
        }
        
        // Convert checkmarks: ✅ text → *✅ text*
        if (/^✅\s+(.+)/.test(trimmed)) {
            const match = trimmed.match(/^✅\s+(.+)/);
            formatted.push(`*✅ ${match[1]}*`);
            continue;
        }
        
        // Convert numbered lists with bold: 1. **Title** – description
        if (/^\d+\.\s+\*\*(.+?)\*\*\s*[–-]\s*(.+)/.test(trimmed)) {
            const match = trimmed.match(/^(\d+)\.\s+\*\*(.+?)\*\*\s*[–-]\s*(.+)/);
            formatted.push(`*${match[1]}. **${match[2]}** – ${match[3]}*`);
            continue;
        }
        
        // Already formatted (starts and ends with *)
        if (trimmed.startsWith('*') && trimmed.endsWith('*')) {
            formatted.push(line);
            continue;
        }
        
        // Keep as is
        formatted.push(line);
    }
    
    return formatted.join('\n');
}

function copyFormatted() {
    const formattedText = document.getElementById('formattedText');
    formattedText.select();
    document.execCommand('copy');
    
    // Show success message
    const btn = event.target;
    const originalText = btn.innerHTML;
    btn.innerHTML = '<i class="fas fa-check"></i> Copied!';
    btn.classList.remove('btn-secondary');
    btn.classList.add('btn-success');
    
    setTimeout(() => {
        btn.innerHTML = originalText;
        btn.classList.remove('btn-success');
        btn.classList.add('btn-secondary');
    }, 2000);
}
