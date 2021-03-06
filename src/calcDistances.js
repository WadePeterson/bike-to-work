const fs = require('fs');
const path = require('path');
const places = JSON.parse(fs.readFileSync(path.join(__dirname, '../data/places.json')));
const mapsClient = require('@google/maps').createClient({ key: process.env.GOOGLE_MAPS_API_KEY, Promise: Promise });

function getLatLon(place) {
  return `${place.lat},${place.lon}`;
}

const distances = JSON.parse(fs.readFileSync(path.join(__dirname, '../data/distances.json'))) || {};

async function makeRequest(origins, destinations) {
  const [response] = await Promise.all([
    mapsClient.distanceMatrix({ origins, destinations, mode: 'bicycling', units: 'imperial' }).asPromise(),
    new Promise((resolve) => setTimeout(() => resolve(), 1000))
  ]);

  return response.json.rows[0].elements.map(({ distance, duration }) => {
    return { distance, duration };
  });
}

async function handleOrigin(originIndex) {
  const origin = places[originIndex];
  console.log(`origin ${originIndex + 1}/${places.length}: ${origin.name}`)
  const origins = [getLatLon(origin)];
  const destinations = places.reduce((acc, place) => {
    if (place.name !== origin.name) {
      acc.names.push(place.name);
      acc.coords.push(getLatLon(place));
    }
    return acc;
  }, { names: [], coords: [] });

  let results = [];

  for (let i = 0; i < destinations.coords.length; i += 25) {
    console.log('destination', i)
    const batchResults = await makeRequest(origins, destinations.coords.slice(i, i + 25));
    results = results.concat(batchResults);
  }

  distances[origin.name] = results.reduce((acc, result, index) => {
    const destinationName = destinations.names[index];
    acc[destinationName] = result;
    return acc;
  }, {});
}

async function parseDistances() {
  for (let i = 0; i < places.length; i++) {
    try {
      await handleOrigin(i);
    } catch (e) {
      console.error(e);
      writeOutput();
    }
  }
}

function writeOutput() {
  fs.writeFileSync(path.join(__dirname, '../data', 'distances.json'), JSON.stringify(distances, null, 2), 'utf8');
}

parseDistances().then(() => {
  writeOutput();
});