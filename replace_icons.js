const fs = require('fs');
let file = '/Users/saicharan/Downloads/Portal-main/student_dashboard_mockup_v3.html';
let data = fs.readFileSync(file, 'utf8');

// Add lucide script to head if not present
if (!data.includes('unpkg.com/lucide')) {
  data = data.replace('</head>', '  <script src="https://unpkg.com/lucide@latest"></script>\n</head>');
}

// Add createIcons to the existing script block
if (!data.includes('lucide.createIcons()')) {
  data = data.replace('function refreshIcons() {', 'function refreshIcons() {\n      if (window.lucide) lucide.createIcons();');
}

// Map FA icons to Lucide data-lucide attributes
const iconMap = {
  'fa-house': 'home',
  'fa-briefcase': 'briefcase',
  'fa-file-lines': 'file-text',
  'fa-calendar': 'calendar',
  'fa-list-check': 'clipboard-list',
  'fa-camera': 'camera',
  'fa-shield-halved': 'shield',
  'fa-book-open': 'book-open',
  'fa-envelope': 'mail',
  'fa-pen': 'pen-square',
  'fa-circle-exclamation': 'alert-circle',
  'fa-right-from-bracket': 'log-out',
  'fa-arrow-up-right-from-square': 'external-link',
  'fa-user': 'user',
  'fa-circle-plus': 'plus-circle',
  'fa-check': 'check',
  'fa-circle-xmark': 'x-circle',
  'fa-graduation-cap': 'graduation-cap',
  'fa-school': 'building-2',
  'fa-folder': 'folder',
  'fa-trophy': 'trophy',
  'fa-shield': 'shield',
  'fa-eye': 'eye',
  'fa-clock': 'clock',
  'fa-star': 'star',
  'fa-indian-rupee-sign': 'indian-rupee',
  'fa-chart-line': 'trending-up',
  'fa-activity': 'activity',
  'fa-award': 'award'
};

for (const [fa, lucide] of Object.entries(iconMap)) {
  // Regex to match <i class="... fa-solid fa-house ..."></i>
  // and replace the i tag with one having data-lucide
  const regex = new RegExp(`<i class="([^"]*)fa-solid ${fa}([^"]*)"(><\\/i>|><\\/i>)`, 'g');
  data = data.replace(regex, (match, p1, p2) => {
    // Keep other classes
    let otherClasses = `${p1}${p2}`.trim().replace(/\s+/g, ' ');
    return `<i data-lucide="${lucide}" class="${otherClasses}"></i>`;
  });
}

fs.writeFileSync(file, data);
console.log('Icons replaced successfully.');
