(() => {
  'use strict';
  const input = document.querySelector('#signature-name');
  const size = document.querySelector('#size');
  const slant = document.querySelector('#slant');
  const ink = document.querySelector('#ink');
  const canvas = document.querySelector('#signature-canvas');
  const download = document.querySelector('#download');
  const status = document.querySelector('#status');
  const choices = [...document.querySelectorAll('.font-choice')];
  let selected = 0;
  let revision = 0;
  let readyRevision = -1;
  let readyName = '';
  const coverage = JSON.parse(document.querySelector('#font-coverage').textContent);
  function invalidate(message) {
    download.disabled = true;
    readyRevision = -1;
    canvas.hidden = true;
    status.textContent = message;
    document.querySelector('#dimensions').textContent = '';
  }
  async function render() {
    const current = ++revision;
    const name = input.value.trim().normalize('NFC');
    document.querySelector('#size-value').textContent = size.value + ' px';
    document.querySelector('#slant-value').textContent = slant.value + '°';
    choices.forEach((button, i) => {
      button.setAttribute('aria-pressed', String(i === selected));
      button.querySelector('.font-sample').textContent = name || 'Emma Wilson';
    });
    invalidate('Loading your signature…');
    if (!name) return invalidate('Type your name to create a signature.');
    if ([...name].length > 60) return invalidate('Please use 60 characters or fewer.');
    const supported = new Set(coverage[selected]);
    if ([...name].some(c => !supported.has(c.codePointAt(0)))) {
      return invalidate('This font does not support every character in your name. Try another style or use Latin letters.');
    }
    const family = choices[selected].dataset.family;
    const fontSize = Number(size.value) * 2;
    const shear = Math.tan(Number(slant.value) * Math.PI / 180);
    try {
      const faces = await document.fonts.load(`${fontSize}px "${family}"`, name);
      if (current !== revision) return;
      if (!faces.length) throw new Error('Font unavailable');
      const scratch = document.createElement('canvas');
      let ctx = scratch.getContext('2d', {willReadFrequently:true});
      ctx.font = `${fontSize}px "${family}"`;
      const metrics = ctx.measureText(name);
      const left = Math.min(0, -metrics.actualBoundingBoxLeft);
      const right = Math.max(metrics.width, metrics.actualBoundingBoxRight);
      const top = -metrics.actualBoundingBoxAscent;
      const bottom = metrics.actualBoundingBoxDescent;
      const xs = [left - shear * top, right - shear * top, left - shear * bottom, right - shear * bottom];
      const minX = Math.min(...xs), maxX = Math.max(...xs);
      const padding = 24;
      scratch.width = Math.ceil(maxX - minX) + padding * 2;
      scratch.height = Math.ceil(bottom - top) + padding * 2;
      if (scratch.width > 8192 || scratch.height > 2048) return invalidate('This signature is too wide. Reduce the size or shorten the name.');
      ctx = scratch.getContext('2d', {willReadFrequently:true});
      ctx.font = `${fontSize}px "${family}"`;
      ctx.fillStyle = ink.value;
      ctx.setTransform(1, 0, -shear, 1, padding - minX, padding - top);
      ctx.fillText(name, 0, 0);
      // Crop actual ink, leaving transparent padding for flourishes and placement.
      const pixels = ctx.getImageData(0, 0, scratch.width, scratch.height).data;
      let x0 = scratch.width, y0 = scratch.height, x1 = -1, y1 = -1;
      for (let y = 0; y < scratch.height; y++) for (let x = 0; x < scratch.width; x++) {
        if (pixels[(y * scratch.width + x) * 4 + 3]) {
          x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y);
        }
      }
      if (x1 < 0) return invalidate('Please enter a name with visible letters.');
      canvas.width = x1 - x0 + 1 + padding * 2;
      canvas.height = y1 - y0 + 1 + padding * 2;
      canvas.getContext('2d').drawImage(scratch, x0, y0, x1 - x0 + 1, y1 - y0 + 1, padding, padding, x1 - x0 + 1, y1 - y0 + 1);
      canvas.hidden = false;
      canvas.setAttribute('aria-label', `Signature preview: ${name}, ${choices[selected].dataset.label}`);
      readyRevision = current;
      readyName = name;
      download.disabled = false;
      status.textContent = 'Ready to download. The checkerboard is not included in your PNG.';
      document.querySelector('#dimensions').textContent = `${canvas.width} × ${canvas.height} px · Transparent PNG`;
    } catch (error) {
      if (current === revision) invalidate('The font could not load. Check your connection, then choose a style to retry.');
    }
  }
  [input, size, slant, ink].forEach(control => control.addEventListener('input', render));
  choices.forEach((button, index) => button.addEventListener('click', () => {selected = index; render();}));
  document.querySelector('#reset').addEventListener('click', () => {
    input.value = 'Emma Wilson'; size.value = '72'; slant.value = '0'; ink.value = '#242238'; selected = 0; render();
  });
  download.addEventListener('click', () => {
    const snapshot = readyRevision, name = readyName;
    if (snapshot !== revision || download.disabled) return;
    canvas.toBlob(blob => {
      if (snapshot !== revision) return;
      if (!blob) {status.textContent = 'Download could not be created. Please try again.'; return;}
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = `${name.replace(/[^a-z0-9-]+/gi, '-').replace(/^-|-$/g, '') || 'cursive'}-signature.png`;
      document.body.appendChild(anchor); anchor.click(); anchor.remove();
      setTimeout(() => URL.revokeObjectURL(url), 30000);
    }, 'image/png');
  });
  render();
})();
