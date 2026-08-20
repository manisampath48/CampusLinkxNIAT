const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

// Exact color codes sampled from official NIAT logo
// Red background: #8E181D
// Cream: #FDF6D8

const svg = `
<svg xmlns="http://www.w3.org/2000/svg" width="800" height="800" viewBox="0 0 800 800">
  <defs>
    <style>
      @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@700&amp;display=swap');
      .serif-letter {
        font-family: 'Playfair Display', 'Georgia', 'Times New Roman', serif;
        font-weight: 700;
        text-anchor: middle;
        dominant-baseline: central;
      }
    </style>
  </defs>

  <!-- Full Red Background -->
  <rect width="800" height="800" fill="#8E181D" />

  <!-- Shield Container -->
  <g id="shield">
    <!-- Left Half Shield (Cream Fill) -->
    <path d="M 235 215 
             L 400 215 
             L 400 640 
             C 305 640 235 530 235 420 
             Z" 
          fill="#FDF6D8" />

    <!-- Right Half Shield (Red Fill) -->
    <path d="M 400 215 
             L 565 215 
             L 565 420 
             C 565 530 495 640 400 640 
             Z" 
          fill="#8E181D" />

    <!-- Outer Cream Border for Entire Shield -->
    <path d="M 235 215 
             L 565 215 
             L 565 420 
             C 565 530 495 640 400 640 
             C 305 640 235 530 235 420 
             Z" 
          fill="none" 
          stroke="#FDF6D8" 
          stroke-width="18" 
          stroke-linejoin="round" 
          stroke-linecap="round" />

    <!-- Horizontal Center Bar -->
    <!-- Left Half: Red Bar over Cream Background -->
    <line x1="244" y1="415" x2="400" y2="415" stroke="#8E181D" stroke-width="16" />
    
    <!-- Right Half: Cream Bar over Red Background -->
    <line x1="400" y1="415" x2="556" y2="415" stroke="#FDF6D8" stroke-width="16" />

    <!-- Letters in Quadrants -->
    <!-- Top-Left: N (Red) -->
    <text x="317" y="315" fill="#8E181D" font-size="130" class="serif-letter">N</text>

    <!-- Top-Right: I (Cream) -->
    <text x="483" y="315" fill="#FDF6D8" font-size="130" class="serif-letter">I</text>

    <!-- Bottom-Left: A (Red) -->
    <text x="317" y="515" fill="#8E181D" font-size="130" class="serif-letter">A</text>

    <!-- Bottom-Right: T (Cream) -->
    <text x="483" y="515" fill="#FDF6D8" font-size="130" class="serif-letter">T</text>
  </g>
</svg>
`;

const dirs = [
  path.join(__dirname, 'public'),
  path.join(__dirname, 'public', 'assets'),
  path.join(__dirname, 'assets'),
  path.join(__dirname, 'src', 'assets')
];

dirs.forEach(d => {
  if (!fs.existsSync(d)) {
    fs.mkdirSync(d, { recursive: true });
  }
});

const fileLocations = [
  path.join(__dirname, 'public', 'niat-logo.png'),
  path.join(__dirname, 'public', 'assets', 'niat-logo.png'),
  path.join(__dirname, 'assets', 'niat-logo.png'),
  path.join(__dirname, 'src', 'assets', 'niat-logo.png'),
  path.join(__dirname, 'public', 'assets', 'logo.png')
];

async function generate() {
  const buffer = Buffer.from(svg);
  for (const fileLoc of fileLocations) {
    await sharp(buffer).png().toFile(fileLoc);
    console.log('Saved generated logo PNG to:', fileLoc);
  }
}

generate().catch(console.error);
