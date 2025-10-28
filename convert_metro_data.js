import { readFileSync, writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Read the source file
const sourcePath = join(__dirname, 'src-guagnzhou-merto.json');
const targetPath = join(__dirname, 'public/data/guangzhou_metro_converted.json');

console.log('Reading source file...');
const sourceData = JSON.parse(readFileSync(sourcePath, 'utf-8'));

// Helper function to convert hex color to RGB
function hexToRgb(hex) {
  // Remove # if present
  hex = hex.replace('#', '');
  
  // Convert 3-digit hex to 6-digit
  if (hex.length === 3) {
    hex = hex.split('').map(c => c + c).join('');
  }
  
  // Parse the hex value
  const r = parseInt(hex.substring(0, 2), 16);
  const g = parseInt(hex.substring(2, 4), 16);
  const b = parseInt(hex.substring(4, 6), 16);
  
  return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`.toUpperCase();
}

// Process the data
console.log('Processing data...');
const lines = sourceData.businessObject.map(line => {
  // Skip if no stations or line data
  if (!line.stations || !line.stations.length) return null;
  
  // Process line color - handle both with and without alpha
  let color = line.lineColor || '#000000';
  if (color.length === 8) {
    // Remove alpha channel if present
    color = color.substring(0, 6);
  }
  
  // Convert to proper hex color format
  color = `#${color}`.toUpperCase();
  
  // Get unique station names (in case of duplicates)
  const stationNames = [];
  const seenStations = new Set();
  
  line.stations.forEach(station => {
    const name = station.stationName.trim();
    if (name && !seenStations.has(name)) {
      stationNames.push(name);
      seenStations.add(name);
    }
  });
  
  // Special handling for line names to match target format
  let lineName = line.lineName;
  const lineNumMatch = lineName.match(/[0-9]+/);
  
  // If line name contains a number, format it as "X号线"
  if (lineNumMatch) {
    const num = lineNumMatch[0];
    lineName = `${num}号线`;
  }
  
  // Special cases for known line names
  if (line.lineNameEn === 'Line 3' && line.lineName.includes('北延')) {
    lineName = '3号线北延段';
  } else if (line.lineNameEn === 'Line 14' && line.lineName.includes('知识城')) {
    lineName = '14号线支线';
  } else if (line.lineNameEn === 'Guangfo Line' && line.lineName === '广佛线后通段') {
    lineName = '广佛线后通段';
  } else if (line.lineNameEn === 'APM') {
    lineName = 'APM线';
  }
  
  return {
    id: line.lineShowCode.toLowerCase(),
    name: lineName,
    color: color,
    stations: stationNames
  };
}).filter(Boolean); // Remove any null entries

// Write the output file
console.log('Writing output file...');
writeFileSync(targetPath, JSON.stringify(lines, null, 2), 'utf-8');

console.log(`Conversion complete! Output written to ${targetPath}`);
