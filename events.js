// Return to the previous page on this site; direct visits return home.
document.querySelector('[data-back]').addEventListener('click', event => {
  if (event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
  if (document.referrer && new URL(document.referrer).origin === location.origin && history.length > 1) {
    event.preventDefault();
    history.back();
  }
});
