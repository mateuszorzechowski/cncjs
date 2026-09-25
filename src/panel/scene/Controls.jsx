import { useEffect, useLayoutEffect, useRef } from 'react';
import { useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import fitCameraToBounds from 'lib/toolpath/camera-fit';
import { fitToBounds } from './fit';
import { recallCamera, rememberCamera } from './cameraMemory';
import { UP, VIEWS } from './views';
import { orbitAbout, pivotFor } from './pivotOrbit';
import { glide, poseOf } from './glide';
import { RULER_PIXELS } from './GridLabels';

/**
 * The camera: four named views, and a mouse that can go anywhere.
 *
 * The two are not alternatives. A named view is where you start and where you
 * come back to — press GÓRA and the camera is looking straight down from a
 * known place, whatever was done to it since. Dragging from there is how you
 * answer the question the named views do not, and pressing the button again
 * undoes it.
 *
 * **A button stays lit only while it is still true.** The first version kept
 * it lit through everything, on the reasoning that these are destinations
 * rather than modes; the trouble is that a lit GÓRA after the view has been
 * dragged away claims the camera is looking straight down when it is not.
 * The destination is still there — the button still works, and pressing it
 * goes back — but it stops describing where the camera is the moment somebody
 * moves it.
 *
 * `three`'s own `OrbitControls` rather than a wrapper. It is a class that
 * takes a camera and a DOM element, which is all that is wanted, and the
 * alternative is a second dependency to get the same object with JSX round
 * it.
 */
const TWO_PI = Math.PI * 2;

/*
 * A full turn takes a drag of the canvas's height, but never less than this.
 * On a phone the preview is under two hundred pixels tall, and a thumb's
 * flick spun the part round several times (Mateusz, 2026-09-25); a desk's
 * toolpath screen is about this tall, so it turns as it always has.
 */
const TURN_PIXELS = 600;

// How close, in pixels, a drag has to start to the drawn path to turn about it.
const PATH_PICK_PIXELS = 6;

const Controls = ({ view, bounds, revision, memory, object, fit, onFree, onGrab, glideMs = 0, floor }) => {
  const camera = useThree((state) => state.camera);
  const scene = useThree((state) => state.scene);
  // Read through a ref, like the callback: a new floor must not rebuild the
  // controls and drop the pose.
  const floorAt = useRef(floor);
  floorAt.current = floor;
  // The program's box, for a drag that starts over the part but not on a line.
  const programAt = useRef(object);
  programAt.current = object;
  const domElement = useThree((state) => state.gl.domElement);
  const invalidate = useThree((state) => state.invalidate);
  const controls = useRef(null);
  // Held in a ref so that a new callback on every render does not tear down
  // and rebuild the orbit controls — which would drop the camera pose with it.
  const free = useRef(onFree);
  free.current = onFree;
  const grab = useRef(onGrab);
  grab.current = onGrab;
  // A glide under way, stopped by a hand that takes the camera again.
  const stopGlide = useRef(null);

  // What the remembered pose was framed against, and whether this mount has
  // already had its first go.
  const signature = useRef('');
  const mounted = useRef(false);
  // Which press the camera was last pointed by, so a change that is not a
  // press can be told from one that is.
  const pointed = useRef(revision);
  // The same trick for the fit button, which is an action and not a
  // destination: it has no state to compare against, only a count of asks.
  const fitted = useRef(fit);

  // Layout effects, this one and the framing below: they run before the
  // canvas draws its first frame, where a passive effect ran after it and the
  // preview showed the default camera — a plan view — for a frame before the
  // view it was asked for (Mateusz, 2026-09-25).
  useLayoutEffect(() => {
    /*
     * **Z is up, and it has to be said before the controls are built.**
     *
     * `OrbitControls` works out its rotation frame from `object.up` once, in
     * its constructor (`this._quat`, `OrbitControls.js:406`), and never looks
     * at it again. Setting `camera.up` afterwards — which is where it was,
     * in the effect that frames a view — left the scene Z-up and the controls
     * orbiting Y-up, and every symptom followed from that: a horizontal drag
     * tilted the view instead of turning it, the same drag gave a different
     * answer every time, and dragging up stopped dead at what looked like the
     * horizon because it was the controls' own pole, ninety degrees from
     * where the scene's is.
     *
     * Measured before: three identical 100px horizontal drags changed the
     * pitch by -18.6, +31.4 and +43.2 degrees.
     */
    camera.up.fromArray(UP);

    const orbit = new OrbitControls(camera, domElement);

    /*
     * **No damping.** It was tried and taken out again: the whole point of
     * damping is that the camera eases towards where the pointer is rather
     * than being there, and what that reads as at the machine is a view that
     * does not follow the mouse. Predictable beats smooth here — a drag is a
     * measurement of how far you want to turn, not a gesture.
     */
    orbit.enableDamping = false;

    /*
     * Stopped just short of straight down, and at the horizon.
     *
     * This is a turntable: the machine's Z stays up, so there is a pole
     * overhead and the azimuth is undefined at it. Reaching it exactly makes
     * a sideways drag spin the view about the line of sight by an arbitrary
     * amount — the "it stops following the mouse" that comes just before "and
     * now it is stuck". A hundredth of a radian short is half a degree,
     * invisible on the drawing, and the singularity is never reached.
     *
     * **Never below the bed.** It could go down to the other pole, and from
     * under the table a drawing made only of lines is the view from above
     * mirrored: nothing hides anything, so the machine's outline and the
     * position markers read as if they had moved through the floor, a
     * sideways drag turned the other way, and dragging back over the horizon
     * put it all back — *"do góry nogami… sterowanie się odwraca… aż się w
     * głowie kręci"* (Mateusz, 2026-09-25). Measured: an upward drag took the
     * camera to 135° and then 179° from vertical. There is nothing under a
     * machine bed to look at; the front and side views sit exactly on the
     * horizon, so they are still reachable.
     */
    orbit.minPolarAngle = 0.01;
    orbit.maxPolarAngle = Math.PI / 2;

    /*
     * The wheel zooms towards the pointer rather than towards the middle.
     *
     * On a toolpath this is most of what "navigation" means: the thing being
     * looked at is a corner of a part in a corner of a machine, and centre
     * zoom makes reaching it a zoom, a pan, a zoom, a pan.
     */
    orbit.zoomToCursor = true;

    /*
     * About 14% a notch of the wheel rather than the default 5%. At 5% it
     * took some 45 notches to get ten times closer — *"muszę się mocno
     * nascrollować myszą, żeby zrobić zoom"* (Mateusz, 2026-09-25); at 14%,
     * about 15. Pinching on a phone is its own gesture and not affected.
     */
    orbit.zoomSpeed = 3;

    // The scene renders on demand rather than sixty times a second — a panel
    // beside a machine sits untouched for hours. Dragging happens outside
    // React, so it is the one thing that has to ask for frames itself.
    orbit.addEventListener('change', invalidate);
    controls.current = orbit;

    /*
     * Every move of the camera is written down, so that leaving the screen
     * and coming back arrives at the same view. On `change` rather than on
     * unmount: React does not promise that an unmount effect sees a live
     * WebGL context, and this is cheap — four numbers and an array.
     */
    const remember = () => rememberCamera(memory, signature.current, camera, orbit.target);
    orbit.addEventListener('change', remember);

    /*
     * **Telling the operator's move apart from ours.**
     *
     * `change` fires for both — our own `orbit.update()` after a view button
     * emits one — so it cannot answer "has the camera been taken off the
     * named view". `start` and `end` bracket a real interaction: a drag, a
     * wheel. Comparing the pose across that pair is what separates a drag
     * that moved something from a click that merely landed on the canvas,
     * which would otherwise unlight the view button for a press that did
     * nothing.
     */
    let poseAtStart = null;
    const begin = () => {
      stopGlide.current?.();
      grab.current?.();
      poseAtStart = {
        position: camera.position.toArray(),
        zoom: camera.zoom,
        target: orbit.target.toArray(),
      };
    };
    const finish = () => {
      const was = poseAtStart;
      poseAtStart = null;
      if (!was) {
        return;
      }
      const moved = camera.zoom !== was.zoom ||
        camera.position.toArray().some((n, i) => n !== was.position[i]) ||
        orbit.target.toArray().some((n, i) => n !== was.target[i]);
      if (moved && free.current) {
        free.current();
      }
    };
    orbit.addEventListener('start', begin);
    orbit.addEventListener('end', finish);

    /*
     * **Turning is ours; panning and zooming stay the controls'.**
     *
     * The controls turn about their target — the middle of the machine, as a
     * view button left it — and zoomed into a corner that swung the work off
     * screen at a fifth of the view per degree. So a turn is about the point
     * the drag started on instead (`orbitAbout`), chosen by `pivotFor`: the
     * path under the pointer, else inside the part when the pointer is over
     * it, else the machine's floor there, else the target's depth.
     * The rate is a full turn per canvas height, or per `TURN_PIXELS` on a
     * canvas shorter than that.
     *
     * The left button, or one finger. Shift or Ctrl with the left button, the
     * right button and two fingers are still the controls' pan and zoom — a
     * second finger landing ends a turn rather than fighting it.
     */
    orbit.enableRotate = false;
    const raycaster = new THREE.Raycaster();
    raycaster.params.Line2 = { threshold: PATH_PICK_PIXELS };
    const pointers = new Set();
    let turning = null;

    const pivotAt = (event) => {
      const rect = domElement.getBoundingClientRect();
      raycaster.setFromCamera(new THREE.Vector2(
        (((event.clientX - rect.left) / rect.width) * 2) - 1,
        -(((event.clientY - rect.top) / rect.height) * 2) + 1
      ), camera);
      const pickable = [];
      scene.traverse((node) => {
        if (node.userData.pivot) {
          pickable.push(node);
        }
      });
      const [hit] = raycaster.intersectObjects(pickable, false);
      const program = programAt.current;
      let box = null;
      if (program) {
        box = new THREE.Box3(
          new THREE.Vector3(program.min.x, program.min.y, program.min.z),
          new THREE.Vector3(program.max.x, program.max.y, program.max.z)
        );
      }
      return pivotFor({
        ray: raycaster.ray,
        hit: hit ? hit.point : null,
        box,
        floor: floorAt.current,
        target: orbit.target,
      });
    };

    const press = (event) => {
      pointers.add(event.pointerId);
      if (pointers.size > 1) {
        if (turning) {
          turning = null;
          finish();
        }
        return;
      }
      const left = event.pointerType !== 'mouse' || event.button === 0;
      if (!left || event.shiftKey || event.ctrlKey || event.metaKey) {
        return;
      }
      turning = { id: event.pointerId, x: event.clientX, y: event.clientY, pivot: pivotAt(event) };
      domElement.setPointerCapture?.(event.pointerId);
      begin();
    };

    const drag = (event) => {
      if (!turning || event.pointerId !== turning.id) {
        return;
      }
      const height = Math.max(domElement.clientHeight || 1, TURN_PIXELS);
      const dx = event.clientX - turning.x;
      const dy = event.clientY - turning.y;
      turning.x = event.clientX;
      turning.y = event.clientY;
      if (!dx && !dy) {
        return;
      }
      const next = orbitAbout({
        position: camera.position,
        target: orbit.target,
        pivot: turning.pivot,
        theta: -(TWO_PI * dx) / height,
        phi: -(TWO_PI * dy) / height,
      });
      camera.position.copy(next.position);
      orbit.target.copy(next.target);
      // Looks at the target again and says `change`: a frame, and the pose
      // written down.
      orbit.update();
    };

    const release = (event) => {
      pointers.delete(event.pointerId);
      if (turning && event.pointerId === turning.id) {
        turning = null;
        finish();
      }
    };

    domElement.addEventListener('pointerdown', press);
    domElement.addEventListener('pointermove', drag);
    domElement.addEventListener('pointerup', release);
    domElement.addEventListener('pointercancel', release);

    return () => {
      domElement.removeEventListener('pointerdown', press);
      domElement.removeEventListener('pointermove', drag);
      domElement.removeEventListener('pointerup', release);
      domElement.removeEventListener('pointercancel', release);
      orbit.removeEventListener('change', invalidate);
      orbit.removeEventListener('change', remember);
      orbit.removeEventListener('start', begin);
      orbit.removeEventListener('end', finish);
      orbit.dispose();
      controls.current = null;
    };
  }, [camera, domElement, invalidate, memory, scene]);

  /*
   * `revision` is what makes the buttons work twice.
   *
   * Pressing GÓRA, dragging away and pressing GÓRA again passes the same view
   * and the same bounds, so an effect keyed on those alone would not run and
   * the button would look broken. The widget counts presses instead, and the
   * count is what this watches.
   */
  useLayoutEffect(() => {
    const orbit = controls.current;
    if (!orbit) {
      return;
    }

    signature.current = `${view}|${JSON.stringify(bounds)}`;

    /*
     * On the way back in, put the camera where it was rather than where the
     * view button says.
     *
     * Only on the first run of this effect for this mount: after that, the
     * effect only runs because the view changed, the bounds changed or a
     * button was pressed, and each of those is a request to be framed afresh.
     */
    const first = !mounted.current;
    const pose = first ? recallCamera(memory, signature.current) : null;

    if (pose) {
      mounted.current = true;
      pointed.current = revision;
      camera.position.fromArray(pose.position);
      camera.zoom = pose.zoom;
      camera.updateProjectionMatrix();
      orbit.target.fromArray(pose.target);
      orbit.update();
      invalidate();
      return;
    }

    mounted.current = true;

    /*
     * **Only a press moves the camera. Nothing else does.**
     *
     * Everything else that gets here changed *what* is drawn rather than how
     * it should be looked at: a layer switched on, a different program
     * loaded. Re-framing for those threw away whatever the camera had been
     * dragged to — first the direction, then, once that was kept, the zoom —
     * and both land at the same moment, just after somebody arranged the view
     * to look at something.
     *
     * The cost is real and is the right way round: switch the machine on with
     * the camera zoomed into a corner and the machine is off screen until you
     * zoom out or press a view. That is a view doing what it was told. The
     * other way round, the view stops being something you can set.
     *
     * The pose is still written down under the new signature, so leaving the
     * screen and coming back finds it.
     */
    const pressed = first || revision !== pointed.current;
    pointed.current = revision;

    if (!pressed) {
      rememberCamera(memory, signature.current, camera, orbit.target);
      return;
    }

    const box = new THREE.Box3(
      new THREE.Vector3(bounds.min.x, bounds.min.y, bounds.min.z),
      new THREE.Vector3(bounds.max.x, bounds.max.y, bounds.max.z)
    );

    const from = poseOf(camera, orbit.target);
    // With room for the figures along the grid's edges, so a view shows its
    // rulers too — on a small preview they were framed off the canvas.
    const target = fitCameraToBounds(
      camera,
      box,
      new THREE.Vector3().fromArray(VIEWS[view].direction),
      { padding: RULER_PIXELS }
    );

    // Orbit about what the camera was framed on, rather than about wherever
    // the target happened to be left. Without this a view change puts the
    // object on screen and then spins it about a point off the edge of it.
    orbit.target.copy(target);
    orbit.update();
    rememberCamera(memory, signature.current, camera, orbit.target);

    // Framed; now, where asked for, carried there rather than cut to it —
    // from where the camera was, which the fit above has just overwritten.
    if (glideMs > 0 && !first) {
      const to = poseOf(camera, orbit.target);
      // Put the camera back where it was before anything draws: the fit's
      // own `update()` has already asked for a frame, and that frame showed
      // the destination for an instant before the glide set off towards it
      // — the jump Mateusz saw after zooming out (2026-09-25).
      camera.position.fromArray(from.position);
      camera.zoom = from.zoom;
      camera.updateProjectionMatrix();
      orbit.target.fromArray(from.target);
      orbit.update();
      stopGlide.current?.();
      stopGlide.current = glide({ camera, orbit, from, to, ms: glideMs, invalidate });
      return;
    }
    invalidate();
  }, [camera, view, bounds, revision, invalidate, memory, glideMs]);

  /*
   * **Fill the frame with the object, and do not turn the camera.**
   *
   * A separate effect from the one above because it answers a different
   * question and must not be entangled with it: the view buttons say where to
   * stand, this says what to look at. Running them together would mean a fit
   * that snapped back to the named view's direction, which is the one thing
   * this is not allowed to do.
   *
   * Guarded on the count rather than on the object. `object` changes whenever
   * a new program is loaded or the work zero moves, and neither is somebody
   * asking to be re-framed — the same rule the view effect follows, for the
   * same reason.
   */
  useEffect(() => {
    const orbit = controls.current;
    if (!orbit || !object || fit === fitted.current) {
      return;
    }
    fitted.current = fit;

    const center = fitToBounds(camera, orbit.target, object);
    orbit.target.copy(center);
    orbit.update();
    rememberCamera(memory, signature.current, camera, orbit.target);
    invalidate();
  }, [camera, object, fit, invalidate, memory]);

  return null;
};

export default Controls;
