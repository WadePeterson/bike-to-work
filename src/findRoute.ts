import * as fs from 'fs';
import * as path from 'path';
import * as _ from 'lodash';
const stringify = require('json-stringify-pretty-compact');

const travelTimeMatrix: Array<number[]> = JSON.parse(fs.readFileSync(path.join(__dirname, '../data/travelTimeMatrix.json'), 'utf8'));
const places: Place[] = (JSON.parse(fs.readFileSync(path.join(__dirname, '../data/places.json'), 'utf8')) as InputPlace[]).map((place, index) => {
  return { ...place, index };
});

const nodes = places.map((place) => {
  return getNeighbors(place);
});

function getNeighbors(origin: Place) {
  const neighbors = places.reduce((acc, destination) => {
    if (destination.index !== origin.index && travelTimeMatrix[origin.index][destination.index] < 5 * 60) {
      acc.push(destination.index);
    }
    return acc;
  }, [] as number[]);

  const minNumNeighbors = 3;

  if (neighbors.length >= minNumNeighbors) {
    return neighbors;
  }

  return _.sortBy(travelTimeMatrix[origin.index].map((time, index) => ({ time, index })), 'time')
    .filter((node) => node.index !== origin.index)
    .slice(3)
    .map((node) => node.index);
}

export interface RoutesFile {
  routes: Route[];
}

const routesFile: RoutesFile = { routes: [] };
const defaultWaitTimeInMinutes = 2;
const defaultValue = 1;
const maximumAllowedTimeInSeconds = 2.5 * 60 * 60;

export interface InputPlace {
  name: string;
  lat: number;
  lon: number;
  value?: number;
  waitTime?: number;
}

export interface Place extends InputPlace {
  index: number;
}

export interface Route {
  path: number[];
  value: number;
  totalTime: number;
}

let lastRoute: Route;

function recordRoute(route: Route) {
  routesFile.routes.push(route);
  lastRoute = route;
  writeOutput();
}

const writeOutput = _.debounce(() => {
  routesFile.routes = _.orderBy(routesFile.routes, 'value', 'desc').slice(0, 15);
  console.log('current highest value:', routesFile.routes[0].value);
  console.log(`last path: `);
  console.log(`  value: ${lastRoute.value}, time: ${lastRoute.totalTime}`);
  console.log(' ', lastRoute.path.join(' -> '));
  fs.writeFileSync(path.join(__dirname, '../data', 'routes.json'), stringify(routesFile), 'utf8');
}, 200, { maxWait: 1000 });

async function followPath(route: Route) {
  const { path, value, totalTime } = route;
  if (path.length === 0) {
    return;
  }

  const currentNodeIndex = route.path[route.path.length - 1];
  const validNeighbors = nodes[currentNodeIndex].map((index) => {
    const node = places[index];
    const waitTimeInSeconds = (node.waitTime || defaultWaitTimeInMinutes) * 60;
    const travelTime = travelTimeMatrix[currentNodeIndex][index];
    const newTotalTime = totalTime + waitTimeInSeconds + travelTime;
    const newValue = value + (node.value || defaultValue);
    return { index, waitTimeInSeconds, travelTime, newTotalTime, newValue };
  }).filter((node) => {
    return node.index !== currentNodeIndex && path.indexOf(node.index) === -1 && node.newTotalTime <= maximumAllowedTimeInSeconds;
  }).sort(((a, b) => {
    const vTA = a.newValue / a.newTotalTime;
    const vTB = b.newValue / b.newTotalTime;
    return vTB - vTA;
  }));

  if (validNeighbors.length === 0) {
    return recordRoute(route);
  }

  for (const neighbor of validNeighbors) {
    if (neighbor.newTotalTime > maximumAllowedTimeInSeconds) {
      continue;
    }

    await followPath({ path: path.concat([neighbor.index]), value: neighbor.newValue, totalTime: neighbor.newTotalTime });
  }
}

followPath({ path: [48], value: places[48].value || 1, totalTime: places[48].waitTime || 2 });
