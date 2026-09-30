import { describe, expect, it } from 'vitest';
import { cameraPose, viewOf } from './camera';

describe('cameraPose', () => {
  const nodes = [
    { x: -100, y: 0, z: 0 },
    { x: 100, y: 30, z: 0 },
    { x: 0, y: 0, z: 0 },
  ];
  it('rests above and in front of the centre, by the scene’s extent', () => {
    const { centre, rest, from } = cameraPose(nodes);
    expect(centre).toEqual({ x: 0, y: 10, z: 0 });
    expect(rest).toEqual({ x: 0, y: 10 + 85, z: 175 });
    expect(from).toEqual({ x: 120, y: 10 + 260, z: 320 });
  });
});

describe('viewOf', () => {
  it('looks at a term from further out along its own direction, a little above', () => {
    expect(viewOf({ x: 300, y: 5, z: 400 })).toEqual({ x: 456, y: 135, z: 608 });
  });
  it('picks a side for a term on the axis', () => {
    expect(viewOf({ x: 0, y: 0, z: 0 })).toEqual({ x: 0, y: 130, z: 0 });
  });
});
