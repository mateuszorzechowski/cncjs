import {
  P1, P2, PLATE_H, mapGroups, mapOrder, mapParams, mapPlayAt, mapScene, surfaceAt,
} from '../mapCycle';

describe('the height map Setup with the Z plate', () => {
  test('the plate is put under the tool by hand between the move over the next point and the touch there', () => {
    expect(mapOrder('board')).toEqual(['fast', 'retract', 'slow', 'lift', 'over', 'next']);
    expect(mapOrder('plate')).toEqual(['fast', 'retract', 'slow', 'lift', 'over', 'place', 'next']);
    expect(mapGroups('plate')[1].subs[0].moves).toEqual(['lift', 'over', 'place', 'next']);
  });

  test('every touch is on the plate, its thickness over the board; the plate slides from point to point', () => {
    const touched = mapScene('fast', 1, { tool: 'plate' });
    expect(touched.tip).toBeCloseTo(surfaceAt(P1) - PLATE_H);
    expect(touched.plate.x).toBe(P1);
    expect(mapScene('place', 0, { tool: 'plate' }).plate.x).toBe(P1);
    expect(mapScene('place', 1, { tool: 'plate' }).plate.x).toBe(P2);
    expect(mapScene('next', 1, { tool: 'plate' }).tip).toBeCloseTo(surfaceAt(P2) - PLATE_H);
    expect(mapScene('fast', 1, { tool: 'board' }).plate).toBeNull();
  });

  test('its thickness shows once the plate lies there, and is set only with the plate', () => {
    const texts = { plateThickness: '10' };
    expect(mapScene('place', 0.5, { tool: 'plate', texts }).dim).toBeNull();
    expect(mapScene('place', 1, { tool: 'plate', texts }).dim.text).toBe('10');
    expect(mapParams('board').some((group) => group.fields.includes('plateThickness'))).toBe(false);
    expect(mapParams('plate').some((group) => group.fields.includes('plateThickness'))).toBe(true);
    expect(mapPlayAt(0, { field: 'plateThickness', tool: 'plate' }).name).toBe('place');
  });

  test('with the plate it rises by the lift of the Z plate method, not by the map lift', () => {
    const texts = { lift: '10', mapLift: '2' };
    expect(mapScene('lift', 1, { tool: 'plate', texts }).dim.text).toBe('10');
    expect(mapScene('lift', 1, { tool: 'board', texts }).dim.text).toBe('2');
    expect(mapParams('plate').flatMap((group) => group.fields)).not.toContain('mapLift');
    expect(mapParams('board').flatMap((group) => group.fields)).not.toContain('lift');
  });
});
