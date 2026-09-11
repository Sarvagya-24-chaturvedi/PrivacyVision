let _observer = null;
let _debounceTimer = null;
const DEBOUNCE_MS = 400;
export function startMutationWatch(engine, onDetection) {
    if (_observer) {
        _observer.disconnect();
    }
    _observer = new MutationObserver((mutations) => {
        const hasRelevantMutations = mutations.some((m) => {
            if (m.type === 'childList') {
                // New elements added to DOM
                for (const node of m.addedNodes) {
                    if (node.nodeType === Node.ELEMENT_NODE) {
                        const el = node;
                        if (el.matches('input, textarea, select, form, [contenteditable]') ||
                            el.querySelector('input, textarea, select, form, [contenteditable]'))
                            return true;
                    }
                }
            }
            if (m.type === 'attributes') {
                const el = m.target;
                if (['type', 'name', 'placeholder', 'aria-label', 'value'].includes(m.attributeName || ''))
                    return true;
            }
            return false;
        });
        if (!hasRelevantMutations)
            return;
        if (_debounceTimer)
            clearTimeout(_debounceTimer);
        _debounceTimer = setTimeout(async () => {
            const detections = await engine.scanDocument();
            if (detections.length > 0) {
                onDetection(detections);
            }
        }, DEBOUNCE_MS);
    });
    _observer.observe(document.body, {
        childList: true,
        subtree: true,
        attributes: true,
        attributeFilter: ['type', 'name', 'placeholder', 'aria-label', 'value', 'class']
    });
    return () => {
        _observer?.disconnect();
        _observer = null;
    };
}
export function stopMutationWatch() {
    _observer?.disconnect();
    _observer = null;
}
