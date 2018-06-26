import * as fs from 'fs';
import * as path from 'path';
import { InputPlace, Place, RoutesFile } from './findRoute';
const places: Place[] = (JSON.parse(fs.readFileSync(path.join(__dirname, '../data/places.json'), 'utf8')) as InputPlace[]).map((place, index) => {
  return { ...place, index };
});
const routesFile: RoutesFile = JSON.parse(fs.readFileSync(path.join(__dirname, '../data/routes.json'), 'utf8'));

routesFile.routes.forEach((route) => {
  console.log(`Value:      ${route.value}`)
  console.log(`Total time: ${route.totalTime}`)
  console.log(`Path:`)
  route.path.forEach((nodeIndex, i, list) => {
    console.log(`  ${places[nodeIndex].name}${i === list.length - 1 ? '' : ' ->'}`)
  });
  console.log('\n\n')
});