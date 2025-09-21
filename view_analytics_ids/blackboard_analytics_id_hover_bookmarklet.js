(() => {
    function addTooltip(doc) {
        const tooltip = doc.createElement('div');
        tooltip.style.position = 'fixed';
        tooltip.style.background = 'lightgreen';
        tooltip.style.color = 'black';
        tooltip.style.padding = '6px 10px';
        tooltip.style.borderRadius = '4px';
        tooltip.style.fontSize = '12px';
        tooltip.style.pointerEvents = 'none';
        tooltip.style.zIndex = '9999';
        tooltip.style.display = 'none';
        doc.body.appendChild(tooltip);

        const elements = doc.querySelectorAll('[data-analytics-id],[analytics-id]');
        elements.forEach(el => {
            el.style.outline = '2px dashed lightgreen';

            el.addEventListener('mouseenter', () => {
                const dataId = el.getAttribute('data-analytics-id');
                const id = el.getAttribute('analytics-id');
                tooltip.textContent = dataId || id || 'No ID';
                tooltip.style.display = 'block';
            });

            el.addEventListener('mousemove', event => {
                const offset = 12;
                let x = event.clientX + offset;
                let y = event.clientY + offset;
                const tooltipWidth = tooltip.offsetWidth;
                const tooltipHeight = tooltip.offsetHeight;

                if (x + tooltipWidth > window.innerWidth) x = event.clientX - tooltipWidth - offset;
                if (y + tooltipHeight > window.innerHeight) y = event.clientY - tooltipHeight - offset;

                tooltip.style.left = `${x}px`;
                tooltip.style.top = `${y}px`;
            });

            el.addEventListener('mouseleave', () => {
                tooltip.style.display = 'none';
            });
        });
    }

    function processDocument(doc) {
        try {
            addTooltip(doc);
            const frames = doc.querySelectorAll('iframe,frame');
            frames.forEach(f => {
                try {
                    if (f.contentDocument) processDocument(f.contentDocument);
                } catch (err) {
                    // Ignore cross-origin frames
                }
            });
        } catch (err) {
            console.error('Error processing document:', err);
        }
    }

    processDocument(document);
})();
