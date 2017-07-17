const fs = require('fs');
const path = require('path');
const moment = require('moment-timezone/moment-timezone-utils');
const data = require('moment-timezone/data/unpacked/latest.json');

const parseOffset = rawMinutes => {
  const hours = Math.floor(Math.abs(rawMinutes) / 60);
  const minutes = Math.abs(rawMinutes) - (hours * 60);
  const hoursFormatted = hours < 10 ? `0${hours}` : hours;
  const minutesFormatted = minutes < 10 ? `0${minutes}` : minutes;
  const sign = rawMinutes < 0 ? '-' : '+';
  return `UTC${sign}${hoursFormatted}:${minutesFormatted}`;
}

// build a map of zones for simplified data access
const zoneMap = data.zones.reduce(
  (map, zone) => Object.assign(map, { [zone.name]: zone }),
  {}
);

// build minimal filtered and linked list of time zones
const linkedData = moment.tz.filterLinkPack(data, 2017, 2017);

fs.writeFileSync(path.resolve('./data/moment-timezones.json'), JSON.stringify(linkedData, null, 2));

// map cities of linked timezones to their parents
const linkMap = Object.keys(zoneMap).reduce(
  (map, zone) =>
    Object.assign(
      map,
      { [zone]: [
        ...linkedData.links
          .filter(link => link.match(new RegExp(`^${zone}`))) // find links for current zone
          .map(link => link.replace(`${zone}|`, '')) // extract name of linked zone
          .map(zoneName => zoneMap[zoneName]) // get zone data
          .sort((a, b) => b.population - a.population) // sort by population (descending)
          .filter(data => data.name.match('/')) // remove country entries from list
          .filter(data => !data.name.match(/[A-Z]{3}/)) // remove timezone abbreviations from list
          .map(data => data.name.replace(/^.*\//, '')) // remove countries from names
      ] }
    ),
  {}
);

// build full data list, sorted by offset (ascending)
const listData = linkedData.zones
  .filter(zone => !zone.match(/^Etc\//) && !zone.match(/MET/))
  .map(zone => moment.tz.unpack(zone))
  .sort((a, b) =>  b.offsets[0] - a.offsets[0])
  .map(zone => ({
    name: zone.name,
    cities: [zone.name.replace(/^.*\//, ''), ...linkMap[zone.name]].map(city => city.replace(/_/g, ' ')),
    offset: zone.offsets[0],
  }));

fs.writeFileSync(path.resolve('./data/full-list.json'), JSON.stringify(listData, null, 2));

// build list for select interfaces
const selectList = listData.map(zone => ({
  label: `(${parseOffset(zone.offset * -1)}) ${zone.cities.slice(0, 3).join(', ')}`,
  value: zone.name,
}))

fs.writeFileSync(path.resolve('./data/select-list.json'), JSON.stringify(selectList, null, 2));
