import * as fs from 'fs';
import * as path from 'path';
import * as _ from 'lodash';
const stringify = require('json-stringify-pretty-compact');

const travelTimeMatrix: Array<number[]> = JSON.parse(fs.readFileSync(path.join(__dirname, '../data/travelTimeMatrix.json'), 'utf8'));
const places: Place[] = (JSON.parse(fs.readFileSync(path.join(__dirname, '../data/places.json'), 'utf8')) as InputPlace[]).map((place, index) => {
  return { ...place, index };
});

interface RoutesFile {
  lastPath: number[];
  routes: Route[];
}

const getRouteKey = (route: Route) => route.path.join(',');
function calcRoutesRecorded(routes: Route[]) {
  return routes.reduce((acc, route) => {
    return Object.assign(acc, { [getRouteKey(route)]: true });
  }, {} as { [key: string]: boolean })
}

const routesFilePath = path.join(__dirname, '../data/routes.json');
const routesFile: RoutesFile = fs.existsSync(routesFilePath) ? JSON.parse(fs.readFileSync(routesFilePath, 'utf8')) : { lastPath: [], routes: [] };
let routesRecorded = calcRoutesRecorded(routesFile.routes);

const defaultWaitTimeInMinutes = 2;
const defaultValue = 1;
const maximumAllowedTimeInSeconds = 2.5 * 60 * 60;

interface InputPlace {
  name: string;
  lat: number;
  lon: number;
  value?: number;
  waitTime?: number;
}

interface Place extends InputPlace {
  index: number;
}

interface Route {
  path: number[];
  value: number;
  totalTime: number;
}

function recordRoute(route: Route) {
  const key = getRouteKey(route);
  if (routesRecorded[key]) {
    return;
  }

  routesFile.lastPath = route.path;
  routesFile.routes.push(route);
  routesRecorded[key] = true;
  writeOutput();
}

const writeOutput = _.debounce(() => {
  routesFile.routes = _.orderBy(routesFile.routes, 'value', 'desc').slice(0, 20);
  routesRecorded = calcRoutesRecorded(routesFile.routes);
  console.log('current highest value:', routesFile.routes[0].value, '\nlast path:', routesFile.lastPath.join(' -> '));
  fs.writeFileSync(path.join(__dirname, '../data', 'routes.json'), stringify(routesFile), 'utf8');
}, 2000, { maxWait: 10000 });

async function followPath(route: Route, initializePath: number[] = []) {
  const { path, value, totalTime } = route;
  let foundChildPath = false;
  let initialIndex = initializePath[0] || 0;

  for (let i = initialIndex; i < places.length; i++) {
    if (path.indexOf(i) !== -1) {
      continue;
    }

    const destinationNode = places[i];
    const waitTimeInSeconds = (destinationNode.waitTime || defaultWaitTimeInMinutes) * 60;
    const travelTime = path.length === 0 ? 0 : travelTimeMatrix[path[path.length - 1]][i];
    const newTotalTime = totalTime + waitTimeInSeconds + travelTime;

    if (newTotalTime > maximumAllowedTimeInSeconds) {
      continue;
    }

    foundChildPath = true;
    const newValue = value + (destinationNode.value || defaultValue);

    await followPath({ path: path.concat([i]), value: newValue, totalTime: newTotalTime }, initializePath.slice(1));
  }

  if (!foundChildPath) {
    recordRoute(route);
  }
}

followPath({ path: [], value: 0, totalTime: 0 }, routesFile.lastPath);
