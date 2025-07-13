'use client';

import React, { useState, CSSProperties } from 'react';

export default function MultiRangeSliderPage() {
  const [range1, setRange1] = useState(25);
  const [range2, setRange2] = useState(63);

  const handleRange1 = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseInt(e.target.value);
    if (val <= range2) setRange1(val);
  };

  const handleRange2 = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseInt(e.target.value);
    if (val >= range1) setRange2(val);
  };

  const sliderContainerStyle: CSSProperties = {
    position: 'relative',
    height: '50px',
    marginBottom: '1rem',
  };

  const trackStyle: CSSProperties = {
    position: 'absolute',
    height: '4px',
    background: '#6c757d',
    width: '100%',
    top: '50%',
    transform: 'translateY(-50%)',
    zIndex: 1,
  };

  const rangeInputStyle: CSSProperties = {
    position: 'absolute',
    width: '100%',
    pointerEvents: 'none',
    background: 'transparent',
    WebkitAppearance: 'none',
    zIndex: 2,
  };

  const thumbStyle = `
    input[type=range].thumb1::-webkit-slider-thumb {
      pointer-events: all;
      width: 20px;
      height: 20px;
      background: #0d6efd; /* Blue */
      border-radius: 50%;
      border: none;
      -webkit-appearance: none;
    }
    input[type=range].thumb2::-webkit-slider-thumb {
      pointer-events: all;
      width: 20px;
      height: 20px;
      background: #ffc107; /* Yellow */
      border-radius: 50%;
      border: none;
      -webkit-appearance: none;
    }

    input[type=range].thumb1::-moz-range-thumb {
      pointer-events: all;
      width: 20px;
      height: 20px;
      background: #0d6efd;
      border-radius: 50%;
      border: none;
    }
    input[type=range].thumb2::-moz-range-thumb {
      pointer-events: all;
      width: 20px;
      height: 20px;
      background: #ffc107;
      border-radius: 50%;
      border: none;
    }
      .track-activity input {
    margin-top: 6px;
}
    .activity-blue-value {
    width: 10px;
    height: 10px;
    background: #0d6efd;
}

.activity-yellow-value {
    width: 10px;
    height: 10px;
    background: #ffc107;
}
  `;

  return (
    <div className="container mt-5 text-black bg-white shadow p-4 rounded track-activity">
      <style>{thumbStyle}</style>

      <h5>Multi-Range Slider</h5>
      <div style={sliderContainerStyle}>
        <div style={trackStyle}></div>

        <input
          type="range"
          min="0"
          max="100"
          value={range1}
          onChange={handleRange1}
          className="thumb1"
          style={rangeInputStyle}
        />

        <input
          type="range"
          min="0"
          max="100"
          value={range2}
          onChange={handleRange2}
          className="thumb2"
          style={rangeInputStyle}
        />
      </div>

      <div>
        <strong>Selected Range:</strong>
        <div className="d-flex align-items-center gap-2"> <div className="activity-blue-value"></div> <div>{range1}</div> </div>
        <div className="d-flex align-items-center gap-2"> <div className="activity-yellow-value"></div> <div>{range2}</div></div>
      </div>
    </div>
  );
}
