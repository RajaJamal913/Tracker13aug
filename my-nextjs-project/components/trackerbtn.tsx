// components/BreakButton.jsx
import { useState } from 'react';
import styles from './BreakButton.module.css'; // optional CSS module if needed

const BreakButton = () => {
  const [isOnBreak, setIsOnBreak] = useState(false);

  const toggleBreak = () => {
    setIsOnBreak(!isOnBreak);
  };

  return (
    <div className="tracker-btn-wrapper">
      <button className="btn track-btn" onClick={toggleBreak}>
        <div className="track-txt">{isOnBreak ? 'End Tracker' : 'Tracker'}</div>
        <div className="icon-wrap">
          <span className={`icon-start ${isOnBreak ? 'd-none' : ''}`}>
            {/* ▶️ Start Icon */}
            <svg width="16" height="18" viewBox="0 0 16 18" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path
                d="M15 10.8668C16.3333 10.097 16.3333 8.17251 15 7.40271L3.43799 0.727385C2.10465 -0.0424156 0.437988 0.919836 0.437988 2.45944V15.8101C0.437988 17.3497 2.10466 18.3119 3.43799 17.5421L15 10.8668Z"
                fill="url(#paint0_linear_29_15333)"
              />
              <defs>
                <linearGradient id="paint0_linear_29_15333" x1="13.9416" y1="-2.57324" x2="11.1833" y2="22.237" gradientUnits="userSpaceOnUse">
                  <stop stopColor="#9A4AFD" />
                  <stop offset="0.541299" stopColor="#955ADD" />
                  <stop offset="1" stopColor="#6E34B5" />
                </linearGradient>
              </defs>
            </svg>
          </span>

          <span className={`icon-stop ${isOnBreak ? '' : 'd-none'}`}>
            {/* ⏹️ Stop Icon */}
            {/* For brevity, you can reuse the long SVG you provided here */}
            <svg width="25" height="26" viewBox="0 0 25 26" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M10.8675 4.14029C10.1966 ..." fill="url(#paint0_linear_29_15335)" />
              {/* Include rest of your SVG paths and gradients here */}
            </svg>
          </span>
        </div>
      </button>
    </div>
  );
};

export default BreakButton;
