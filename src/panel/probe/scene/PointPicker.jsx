import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { useThree } from '@react-three/fiber';

/**
 * Picking a height map's point by where it is drawn (Mateusz, 2026-10-03:
 * *"wizualne kliknięcie punktu powinno go zaznaczać, prawy przycisk albo
 * kliknięcie obok odznacza"*).
 *
 * The hit is measured on the screen, not on the sheet: a click within so many
 * pixels of a point's drawn middle picks it, wherever the camera stands and
 * however the scale raises the sheet. Anywhere else, the empty ground
 * included, lets the point go; so does the right button. A press that moved
 * turned the view and picks nothing.
 *
 * `points`, `[{ i, j, at: [x, y, z] }]` in the scene's coordinates.
 */

// How far a press may move and still be a click, as the Ścieżka's pointer.
const CLICK_SLOP = 4;
// How near a point's middle a click has to land: a pointer's, and a finger's.
const REACH = { mouse: 12, touch: 24 };

const PointPicker = ({ points, onPick }) => {
  const camera = useThree((state) => state.camera);
  const domElement = useThree((state) => state.gl.domElement);
  const latest = useRef({ points, onPick });
  latest.current = { points, onPick };

  useEffect(() => {
    let down = null;
    const begin = (event) => {
      down = { x: event.clientX, y: event.clientY, button: event.button };
    };
    const end = (event) => {
      const from = down;
      down = null;
      if (!from || Math.hypot(event.clientX - from.x, event.clientY - from.y) > CLICK_SLOP) {
        return;
      }
      if (from.button === 2) {
        latest.current.onPick(null);
        return;
      }
      if (from.button !== 0) {
        return;
      }
      const box = domElement.getBoundingClientRect();
      const x = event.clientX - box.left;
      const y = event.clientY - box.top;
      const reach = REACH[event.pointerType] ?? REACH.mouse;
      let best = null;
      for (const point of latest.current.points) {
        const v = new THREE.Vector3(...point.at).project(camera);
        const d = Math.hypot(((v.x + 1) / 2) * box.width - x, ((1 - v.y) / 2) * box.height - y);
        if (d <= reach && (!best || d < best.d)) {
          best = { d, point };
        }
      }
      latest.current.onPick(best ? { i: best.point.i, j: best.point.j } : null);
    };
    const noMenu = (event) => event.preventDefault();
    domElement.addEventListener('pointerdown', begin);
    domElement.addEventListener('pointerup', end);
    domElement.addEventListener('contextmenu', noMenu);
    return () => {
      domElement.removeEventListener('pointerdown', begin);
      domElement.removeEventListener('pointerup', end);
      domElement.removeEventListener('contextmenu', noMenu);
    };
  }, [camera, domElement]);

  return null;
};

export default PointPicker;
