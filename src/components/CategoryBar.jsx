import React, { useRef, useState, useEffect } from 'react';

export default function CategoryBar({ categories, activeCategory, onSelect }) {
  const rowRef = useRef(null);
  const isDragging = useRef(false);
  const startX = useRef(0);
  const scrollStart = useRef(0);
  const moved = useRef(false);

  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  const updateScrollButtons = () => {
    const el = rowRef.current;
    if (!el) return;
    setCanScrollLeft(el.scrollLeft > 4);
    setCanScrollRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 4);
  };

  useEffect(() => {
    updateScrollButtons();
    window.addEventListener('resize', updateScrollButtons);
    return () => window.removeEventListener('resize', updateScrollButtons);
  }, [categories]);

  const handleMouseDown = (e) => {
    const el = rowRef.current;
    if (!el) return;
    isDragging.current = true;
    moved.current = false;
    startX.current = e.pageX - el.offsetLeft;
    scrollStart.current = el.scrollLeft;
  };

  const handleMouseMove = (e) => {
    if (!isDragging.current || !rowRef.current) return;
    e.preventDefault();
    const x = e.pageX - rowRef.current.offsetLeft;
    const walk = (x - startX.current) * 1.4;
    if (Math.abs(walk) > 5) moved.current = true;
    rowRef.current.scrollLeft = scrollStart.current - walk;
  };

  const handleMouseUpOrLeave = () => {
    isDragging.current = false;
  };

  const handleWheel = (e) => {
    const el = rowRef.current;
    if (!el || Math.abs(e.deltaY) <= Math.abs(e.deltaX)) return;
    el.scrollLeft += e.deltaY;
  };

  const scrollByAmount = (dir) => {
    if (!rowRef.current) return;
    rowRef.current.scrollBy({ left: dir * 200, behavior: 'smooth' });
  };

  return (
    <div className="cat-swipe-wrapper">
      {canScrollLeft && (
        <button
          type="button"
          className="cat-arrow left"
          aria-label="Scroll categories left"
          onClick={() => scrollByAmount(-1)}
        >
          ‹
        </button>
      )}

      <div
        ref={rowRef}
        className="cat-swipe-track"
        onScroll={updateScrollButtons}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUpOrLeave}
        onMouseLeave={handleMouseUpOrLeave}
        onWheel={handleWheel}
      >
        {categories.map((cat) => {
          const isActive = activeCategory === cat;
          return (
            <button
              key={cat}
              type="button"
              className={`cat-pill ${isActive ? 'active' : ''}`}
              onClick={() => {
                if (!moved.current) onSelect(cat);
              }}
            >
              {cat}
            </button>
          );
        })}
      </div>

      {canScrollRight && (
        <button
          type="button"
          className="cat-arrow right"
          aria-label="Scroll categories right"
          onClick={() => scrollByAmount(1)}
        >
          ›
        </button>
      )}
    </div>
  );
}