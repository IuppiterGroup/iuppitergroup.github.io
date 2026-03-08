// Mobile nav toggle
document.addEventListener('DOMContentLoaded', () => {
  const toggle = document.querySelector('.nav-toggle');
  const links = document.querySelector('.nav-links');
  if (toggle && links) {
    toggle.addEventListener('click', () => links.classList.toggle('open'));
    links.querySelectorAll('a').forEach(a =>
      a.addEventListener('click', () => links.classList.remove('open'))
    );
  }

  // Init homepage quote if present
  if (document.getElementById('quoteText') && typeof getRandomQuote === 'function') {
    nextQuote();
  }

  // Category filter (research page)
  document.querySelectorAll('.filter-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const cat = btn.dataset.cat;
      document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      document.querySelectorAll('.card[data-cat]').forEach(card => {
        card.style.display = (cat === 'all' || card.dataset.cat === cat) ? '' : 'none';
      });
    });
  });
});

// Quote widget
function nextQuote(category) {
  if (typeof getRandomQuote !== 'function') return;
  const q = getRandomQuote(category || 'all');
  if (!q) return;
  const t = document.getElementById('quoteText');
  const a = document.getElementById('quoteAuthor');
  const e = document.getElementById('quoteEra');
  if (t) t.textContent = '\u201C' + q.q + '\u201D';
  if (a) a.textContent = '\u2014 ' + q.a.toUpperCase();
  if (e) e.textContent = q.era + ' \u00B7 ' + q.civ;
}
