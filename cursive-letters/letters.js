(() => {
  'use strict';
  const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const alphabets = {
    script: {
      upper: Array.from(document.getElementById('script-alphabet-upper').textContent),
      lower: Array.from(document.getElementById('script-alphabet-lower').textContent)
    },
    bold: {
      upper: Array.from(document.getElementById('bold-alphabet-upper').textContent),
      lower: Array.from(document.getElementById('bold-alphabet-lower').textContent)
    }
  };
  const choices = Array.from(document.querySelectorAll('[data-letter]'));
  const status = document.getElementById('copy-status');
  choices.forEach(button => button.addEventListener('click', () => {
    const letter = button.dataset.letter;
    const index = letters.indexOf(letter);
    choices.forEach(choice => choice.setAttribute('aria-pressed', String(choice === button)));
    document.getElementById('selected-letter').firstChild.textContent = `Letter ${letter} `;
    for (const style of ['script', 'bold']) {
      for (const kind of ['upper', 'lower']) {
        document.getElementById(`${style}-${kind}`).textContent = alphabets[style][kind][index];
      }
    }
    status.textContent = `Letter ${letter} selected. Choose uppercase or lowercase to copy.`;
  }));
  async function copyText(text) {
    if (navigator.clipboard?.writeText) {
      try { await navigator.clipboard.writeText(text); return true; } catch (_) { /* Use local fallback. */ }
    }
    const focused = document.activeElement;
    const field = document.createElement('textarea');
    field.value = text;
    field.setAttribute('readonly', '');
    field.style.cssText = 'position:fixed;opacity:0;pointer-events:none';
    document.body.appendChild(field);
    field.select(); field.setSelectionRange(0, field.value.length);
    let copied = false;
    try { copied = document.execCommand('copy'); } catch (_) { copied = false; }
    field.remove(); focused?.focus();
    return copied;
  }
  document.querySelectorAll('[data-copy]').forEach(button => {
    button.addEventListener('click', async () => {
      const text = document.getElementById(button.dataset.copy).textContent;
      const success = await copyText(text);
      status.textContent = success ? `Copied ${text} to clipboard.` : 'Copy unavailable. Please select the letters and copy them manually.';
    });
  });
})();
