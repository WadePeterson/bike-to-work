const tj = require('@mapbox/togeojson');
const fs = require('fs');
const path = require('path');
const DOMParser = require('xmldom').DOMParser;

const args = process.argv.slice(2);

if (args.length !== 1) {
  return console.log(`Usage: node parseKml.js <file.kml>`);
}

const filePath = args[0];
const kml = tj.kml(new DOMParser().parseFromString(fs.readFileSync(filePath, 'utf8')));

const places = kml.features.map((place) => {
  return { name: place.properties.name, lat: place.geometry.coordinates[1], lon: place.geometry.coordinates[0] };  
});

fs.writeFileSync(path.join(__dirname, '../data', 'places.json'), JSON.stringify(places, null, 2), 'utf8');
