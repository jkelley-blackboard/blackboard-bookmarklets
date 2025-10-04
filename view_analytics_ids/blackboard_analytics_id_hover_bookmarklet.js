(() => {
  // Main function to add tooltip and toggle functionality
  function addTooltip(doc) {
    // Create the floating tooltip element
    const tooltip = doc.createElement('div');
    tooltip.style.position = 'fixed';
    tooltip.style.background = 'lightgreen';
    tooltip.style.color = 'black';
    tooltip.style.padding = '6px 10px';
    tooltip.style.borderRadius = '4px';
    tooltip.style.fontSize = '12px';
    tooltip.style.pointerEvents = 'none'; // allows mouse events to pass through
    tooltip.style.zIndex = '9999';
    tooltip.style.display = 'none';
    doc.body.appendChild(tooltip);

    // Create a toggle button to enable/disable tooltips
    const toggle = doc.createElement('div');
    toggle.textContent = 'Disable Tooltips';
    toggle.style.position = 'fixed';
    toggle.style.top = '10px';
    toggle.style.right = '10px';
    toggle.style.background = 'lightgreen';
    toggle.style.color = 'black';
    toggle.style.padding = '6px 10px';
    toggle.style.border = '1px solid green';
    toggle.style.borderRadius = '4px';
    toggle.style.cursor = 'pointer';
    toggle.style.fontSize = '12px';
    toggle.style.zIndex = '10000';
    doc.body.appendChild(toggle);

    // State variable to track whether tooltips are enabled
    let enabled = true;

    // Toggle button click handler
    toggle.addEventListener('click', () => {
      enabled = !enabled;
      toggle.textContent = enabled ? 'Disable Tooltips' : 'Enable Tooltips';
      tooltip.style.display = 'none';
    });

    // Find all elements with analytics IDs
    const elements = doc.querySelectorAll('[data-analytics-id],[analytics-id]');
    elements.forEach(el => {
      el.style.outline = '2px dashed lightgreen';
      el.style.cursor = 'pointer';

      // Show tooltip on hover
      el.addEventListener('mouseenter', () => {
        if (!enabled) return;
        const dataId = el.getAttribute('data-analytics-id');
        const id = el.getAttribute('analytics-id');
        tooltip.textContent = dataId || id || 'No ID';
        tooltip.style.display = 'block';
      });

      // Move tooltip with mouse
      el.addEventListener('mousemove', event => {
        if (!enabled) return;
        const offset = 12;
        let x = event.clientX + offset;
        let y = event.clientY + offset;
        const w = tooltip.offsetWidth;
        const h = tooltip.offsetHeight;
        if (x + w > window.innerWidth) x = event.clientX - w - offset;
        if (y + h > window.innerHeight) y = event.clientY - h - offset;
        tooltip.style.left = `${x}px`;
        tooltip.style.top = `${y}px`;
      });

      // Hide tooltip on mouse leave
      el.addEventListener('mouseleave', () => {
        tooltip.style.display = 'none';
      });

      // Copy ID to clipboard on click
      el.addEventListener('click', () => {
        const text = el.getAttribute('data-analytics-id') || el.getAttribute('analytics-id');
        navigator.clipboard.writeText(text).then(() => {
          tooltip.textContent = 'Copied!';
          tooltip.style.display = 'block';
          setTimeout(() => {
            tooltip.style.display = 'none';
          }, 1000);
        }).catch(err => {
          console.error('Clipboard copy failed:', err);
        });
      });
    });
  }

  // Recursively process document and its frames
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

  // Start processing the current document
  processDocument(document);
})();
