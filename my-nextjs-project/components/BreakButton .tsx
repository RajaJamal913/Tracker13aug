// components/BreakButton.jsx
import { useState } from 'react';
import styles from './BreakButton.module.css'; // if you need custom styling

const BreakButton = () => {
  const [isTracking, setIsTracking] = useState(false);

  const toggleTracking = () => {
    setIsTracking(!isTracking);
  };

  return (
    <div className="tracker-btn-wrapper">
      <button className="btn track-btn" onClick={toggleTracking}>
        <div className="track-txt">
          {isTracking ? 'Stop Tracker' : 'Start Tracker'}
        </div>
        <div className="icon-wrap">
          <span className={`icon-play ${isTracking ? 'd-none' : ''}`}>
            {/* ▶️ Play Icon */}
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

          <span className={`icon-stop ${isTracking ? '' : 'd-none'}`}>
            {/* ⏹️ Stop Icon */}
            <svg width="25" height="26" viewBox="0 0 25 26" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path
                d="M10.8675 4.14029C10.1966 4.14029 9.70239 4.64878 9.70239 5.32138V20.6599C9.70239 21.3325 10.1966 21.841 10.8675 21.841H17.4322C18.1031 21.841 18.5973 21.3325 18.5973 20.6599V5.32138C18.5973 4.64878 18.1031 4.14029 17.4322 4.14029H10.8675Z"
                fill="url(#paint0_linear_29_15335)"
              />
              <defs>
                <linearGradient id="paint0_linear_29_15335" x1="16.6203" y1="2.30208" x2="13.5435" y2="24.1586" gradientUnits="userSpaceOnUse">
                  <stop stopColor="#9A4AFD" />
                  <stop offset="0.541299" stopColor="#955ADD" />
                  <stop offset="1" stopColor="#6E34B5" />
                </linearGradient>
              </defs>
            </svg>
          </span>
        </div>
      </button>
    </div>
  );
};

export default BreakButton;
