import { useCallback, useEffect, useRef, useState } from 'react';
import { EditorSelection } from '@codemirror/state';
import { forEachDiagnostic } from '@codemirror/lint';
import { MIN_THUMB, thumbOf } from '../ui/scrollMetrics';
import { scrollAt, scrollMarks } from './scrollMarks';
import { t } from '../i18n';

// A mark's colour, by the finding's severity.
const FACE = { error: 'bg-red', warning: 'bg-amb' };

/**
 * The editor's own scrollbar, in the panel's style — a thin track and thumb,
 * as every scroller in the panel has (`FadeScroller`) — with the file check's
 * findings marked on the track where they are in the file (Mateusz,
 * 2026-09-26: *"czy scroll może być nasz customowy? z oznaczeniem, gdzie są
 * błędy na scrollu?"*). Red for an error, amber for a warning; a mark is a
 * button to its line. The track itself scrolls: press or drag along it.
 *
 * `view` is the CodeMirror view; `tick` changes whenever the document or its
 * findings may have, so the marks are counted again.
 */
const EditorScrollbar = ({ view, tick }) => {
  const track = useRef(null);
  const [bar, setBar] = useState(null);
  const [marks, setMarks] = useState([]);

  const measure = useCallback(() => {
    const scroller = view?.scrollDOM;
    const height = track.current?.clientHeight ?? 0;
    if (!scroller || !height) {
      return;
    }
    // Measured on the scroller, drawn on the track, which is a little
    // shorter: scaled across.
    const thumb = thumbOf(scroller, MIN_THUMB, 0);
    setBar(thumb ? { ...thumb, scale: height / scroller.clientHeight } : null);
    const found = [];
    const total = Math.max(1, view.contentHeight);
    forEachDiagnostic(view.state, (d, from) => {
      found.push({
        line: view.state.doc.lineAt(from).number,
        top: view.lineBlockAt(from).top / total,
        severity: d.severity,
      });
    });
    setMarks(scrollMarks(found, height));
  }, [view]);

  useEffect(() => {
    const scroller = view?.scrollDOM;
    if (!scroller) {
      return undefined;
    }
    measure();
    scroller.addEventListener('scroll', measure, { passive: true });
    const resize = new ResizeObserver(measure);
    resize.observe(scroller);
    return () => {
      scroller.removeEventListener('scroll', measure);
      resize.disconnect();
    };
  }, [view, measure]);

  useEffect(() => {
    measure();
  }, [tick, measure]);

  /*
   * Press or drag on the track: to that place in the file. Bound on the node,
   * as the scene's controls are, and not on a mark — a mark is a button to
   * its own line.
   */
  useEffect(() => {
    const node = track.current;
    const scroller = view?.scrollDOM;
    if (!node || !scroller) {
      return undefined;
    }
    const follow = (event) => {
      const box = node.getBoundingClientRect();
      scroller.scrollTop = scrollAt(event.clientY - box.top, box.height, scroller.scrollHeight, scroller.clientHeight);
    };
    const press = (event) => {
      if (event.target.closest('button')) {
        return;
      }
      node.setPointerCapture(event.pointerId);
      follow(event);
    };
    const drag = (event) => {
      if (node.hasPointerCapture(event.pointerId)) {
        follow(event);
      }
    };
    node.addEventListener('pointerdown', press);
    node.addEventListener('pointermove', drag);
    return () => {
      node.removeEventListener('pointerdown', press);
      node.removeEventListener('pointermove', drag);
    };
  }, [view]);

  const go = (line) => {
    const at = view.state.doc.line(line).from;
    view.dispatch({ selection: EditorSelection.cursor(at), scrollIntoView: true });
    view.focus();
  };

  return (
    <div
      ref={track}
      className="absolute bottom-1.5 right-0.5 top-1.5 w-2.5 cursor-pointer touch-none"
    >
      {bar ? (
        <>
          <span className="pointer-events-none absolute inset-y-0 right-0.5 w-1 rounded-full bg-line" />
          <span
            className="pointer-events-none absolute right-0.5 top-0 h-[var(--thumbH)] w-1 translate-y-[var(--thumbY)] rounded-full bg-mut"
            ref={(node) => {
              node?.style.setProperty('--thumbH', `${Math.round(bar.height * bar.scale)}px`);
              node?.style.setProperty('--thumbY', `${Math.round(bar.top * bar.scale)}px`);
            }}
          />
        </>
      ) : null}
      {marks.map((mark) => (
        <button
          key={mark.y}
          type="button"
          title={t('editor.markLine', { line: mark.line })}
          aria-label={t('editor.markLine', { line: mark.line })}
          onClick={() => go(mark.line)}
          className={`absolute right-0 top-0 h-[3px] w-2.5 translate-y-[var(--markY)] rounded-full ${FACE[mark.severity] || FACE.warning}`}
          ref={(node) => node?.style.setProperty('--markY', `${mark.y}px`)}
        />
      ))}
    </div>
  );
};

export default EditorScrollbar;
