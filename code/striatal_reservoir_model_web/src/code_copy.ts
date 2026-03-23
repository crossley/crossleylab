const COPY_LABEL = 'Copy';
const COPIED_LABEL = 'Copied';
const FAILED_LABEL = 'Copy failed';

function fallbackCopy(text: string): boolean {
  const textarea = document.createElement('textarea');
  textarea.value = text;
  textarea.setAttribute('readonly', 'true');
  textarea.style.position = 'fixed';
  textarea.style.opacity = '0';
  textarea.style.pointerEvents = 'none';
  document.body.appendChild(textarea);
  textarea.select();
  let ok = false;
  try {
    ok = document.execCommand('copy');
  } catch {
    ok = false;
  }
  document.body.removeChild(textarea);
  return ok;
}

async function copyText(text: string): Promise<boolean> {
  if (navigator.clipboard && window.isSecureContext) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch {
      return fallbackCopy(text);
    }
  }
  return fallbackCopy(text);
}

export function initializeCodeCopy(): void {
  const blocks = document.querySelectorAll<HTMLElement>('pre.code-block');
  blocks.forEach((block) => {
    if (block.querySelector('.code-copy-btn')) {
      return;
    }
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'code-copy-btn';
    button.textContent = COPY_LABEL;
    button.setAttribute('aria-label', 'Copy code block');
    button.addEventListener('click', async () => {
      const text = block.textContent ?? '';
      const ok = await copyText(text);
      button.textContent = ok ? COPIED_LABEL : FAILED_LABEL;
      window.setTimeout(() => {
        button.textContent = COPY_LABEL;
      }, 1400);
    });
    block.appendChild(button);
  });
}
