'use strict';

/*
 * Minimal Markdown renderer for Copyfish screencapture tab.
 * Supports: GFM pipe tables, **bold**, *italic*, blank-line separation.
 * No external dependencies.
 */
(function () {

    function escapeHtml(str) {
        return str
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;');
    }

    function renderInline(str) {
        // Escape first, then apply inline markup on the escaped string.
        // Bold before italic so **x** doesn't partially match *x*.
        return escapeHtml(str)
            .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
            .replace(/\*([^*]+?)\*/g, '<em>$1</em>');
    }

    /** Split a pipe-delimited row into trimmed cell strings. */
    function parseCells(line) {
        return line
            .replace(/^\s*\|/, '')   // strip leading |
            .replace(/\|\s*$/, '')   // strip trailing |
            .split('|')
            .map(function (c) { return c.trim(); });
    }

    /** True when a line is a GFM separator row: | --- | :---: | --- | */
    function isSeparator(line) {
        return /^\s*\|[\s\-|: ]+\|\s*$/.test(line);
    }

    /** True when a line looks like a table row (starts with |). */
    function isTableLine(line) {
        return /^\s*\|/.test(line);
    }

    function renderTable(lines) {
        // Find the separator row index (marks end of header).
        var sepIdx = -1;
        for (var i = 0; i < lines.length; i++) {
            if (isSeparator(lines[i])) { sepIdx = i; break; }
        }

        var colCount = 0;
        var html = '<table class="md-table">';

        if (sepIdx > 0) {
            // ── header ──────────────────────────────────────────────────
            html += '<thead>';
            for (var i = 0; i < sepIdx; i++) {
                var cells = parseCells(lines[i]);
                if (cells.length > colCount) colCount = cells.length;
                html += '<tr>' + cells.map(function (c) {
                    return '<th>' + renderInline(c) + '</th>';
                }).join('') + '</tr>';
            }
            html += '</thead>';

            // ── body ─────────────────────────────────────────────────────
            html += '<tbody>';
            for (var i = sepIdx + 1; i < lines.length; i++) {
                var cells = parseCells(lines[i]);
                // If this row has fewer cells it's a span/label row — give the
                // last cell a colspan so it fills the rest of the table width.
                var extraCols = colCount - cells.length;
                html += '<tr>';
                cells.forEach(function (c, idx) {
                    var isLast = (idx === cells.length - 1);
                    var span = (isLast && extraCols > 0)
                        ? ' colspan="' + (extraCols + 1) + '"'
                        : '';
                    html += '<td' + span + '>' + renderInline(c) + '</td>';
                });
                html += '</tr>';
            }
            html += '</tbody>';

        } else {
            // No separator found — render everything as body rows.
            html += '<tbody>';
            lines.forEach(function (line) {
                var cells = parseCells(line);
                html += '<tr>' + cells.map(function (c) {
                    return '<td>' + renderInline(c) + '</td>';
                }).join('') + '</tr>';
            });
            html += '</tbody>';
        }

        return html + '</table>';
    }

    /**
     * Convert a Markdown string to an HTML string.
     * Exposed as window.renderMarkdown so screencapture.js can call it.
     */
    window.renderMarkdown = function renderMarkdown(text) {
        if (!text || !text.trim()) {
            return '<p class="md-empty">No OCR result to display.</p>';
        }

        var lines = text.split(/\r?\n/);
        var html = '';
        var i = 0;

        while (i < lines.length) {
            var line = lines[i];

            if (isTableLine(line)) {
                // Collect all consecutive table lines.
                var tableLines = [];
                while (i < lines.length && isTableLine(lines[i])) {
                    tableLines.push(lines[i]);
                    i++;
                }
                html += renderTable(tableLines);

            } else if (line.trim() === '') {
                // Blank line — paragraph break.
                i++;

            } else {
                // Plain text line.
                html += '<p>' + renderInline(line) + '</p>';
                i++;
            }
        }

        return html;
    };

}());
