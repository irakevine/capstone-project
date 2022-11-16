import { LocationType } from '../enums/location-type.enum';

/**
 * Checks if location type is DISTRICT
 * @param locationType {import("../enums/location-type.enum").LocationType}
 */
export const isLocationDistrict = (locationType: string): boolean => {
  return LocationType[locationType] === LocationType.PROVINCE;
};

/**
 * Checks if location child is a respective children of location parent.
 * Rules:
 * - a village is a child of cell;
 * - a cell is child of sector
 * - a sector is child of district
 * - a district is child of province
 * @param childLocationType
 * @param parentLocationType
 */
export const isValidLocationChildren = (
  childLocationType: LocationType,
  parentLocationType: LocationType,
): boolean => {
  switch (childLocationType) {
    case LocationType.DISTRICT:
      return parentLocationType === LocationType.PROVINCE;
    case LocationType.SECTOR:
      return parentLocationType === LocationType.DISTRICT;
    default:
      return false;
  }
};
