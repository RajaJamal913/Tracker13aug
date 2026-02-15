
'use client';
import { useState } from 'react';
import { Dropdown } from 'primereact/dropdown';
import 'bootstrap/dist/css/bootstrap.min.css';
import 'primereact/resources/themes/lara-light-indigo/theme.css'; // theme
import 'primereact/resources/primereact.min.css'; // core css
import 'primeicons/primeicons.css'; // icons





const ScreenshotSettings = () => {
  const [selectedCount, setSelectedCount] = useState<number>(5); // Default to 5x
  const [screenshotMode, setScreenshotMode] = useState<string>('no-screenshot');
  const [settings, setSettings] = useState({
    allowManagerDeletion: false,
    allowEmployeeDeletion: false,
    allowEmployeeView: false,
    allowViewerView: false,
  });

  const handleCountSelect = (count: number) => {
    setSelectedCount(count);
  };

  const handleModeChange = (mode: string) => {
    setScreenshotMode(mode);
  };

  const handleSettingToggle = (setting: keyof typeof settings) => {
    setSettings(prev => ({
      ...prev,
      [setting]: !prev[setting]
    }));
  };

  const handleSave = () => {
    console.log('Saved settings:', {
      screenshotCount: selectedCount,
      screenshotMode,
      ...settings
    });
    // Here you would typically send the data to your backend
    alert('Settings saved!');
  };


  // Options for the default screenshot mode dropdown
  const screenshotModeOptions = [
    { label: 'No screenshot', value: 'no-screenshot' },
    { label: 'Preview On', value: 'preview-on' },
    { label: 'Blurred', value: 'blurred' }
  ];

  // State for selected modes
  const [defaultMode, setDefaultMode] = useState<string>('no-screenshot');
  const [currentMode, setCurrentMode] = useState<string>('no-screenshot');

  return (
    <div className="container mt-4">
      <div className="card">
        <div className="card-header text-white fw-bold" style={{backgroundColor:"rgb(168, 85, 247)"}}>Break Policy</div>
        <div className="card-body">
          <h2 className="card-title">Screenshot</h2>
          <p className="card-text">Set the number of screenshots taken in a 10-minute interval.</p>
          
          <div className="d-flex flex-wrap gap-2 mb-4 select-ss-wrap">
            {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((count) => (
              <button
                key={count}
                className={`btn ${selectedCount === count ? 'g-btn' : 'btn-outline-g'}`}
                onClick={() => handleCountSelect(count)}
              >
                {count}x
              </button>
            ))}
          </div>
          
          <div className="mb-4">
            
            <div className="btn-group" role="group">
             <div className="field">
        <label htmlFor="defaultMode">Default Screenshot Mode</label>
        <Dropdown
          id="defaultMode"
          value={defaultMode}
          options={screenshotModeOptions}
          onChange={(e) => setDefaultMode(e.value)}
          optionLabel="label"
          placeholder="Select a mode"
          className="w-full"
        />
      </div>
            </div>
          </div>
          
          <div className="mb-4">
           
                        <div className="switvh-btns-wrap p-4">
                          
                            
 <div className="form-check form-switch mb-2">
                                <input className="form-check-input" type="checkbox" id="newProjects" />
                                <label className="form-check-label" htmlFor="newProjects">Allow deleting screenshots by managers</label>
                            </div>
                            
                            <div className="form-check form-switch mb-2">
                                <input className="form-check-input" type="checkbox" id="newProjects" />
                                <label className="form-check-label" htmlFor="newProjects">Allow deleting screenshots by employees</label>
                            </div>

                            <div className="form-check form-switch mb-2">
                                <input className="form-check-input" type="checkbox" id="newProjects" />
                                <label className="form-check-label" htmlFor="newProjects">Allow employees to view their screenshots</label>
                            </div>
                            <div className="form-check form-switch mb-2">
                                <input className="form-check-input" type="checkbox" id="newProjects" />
                                <label className="form-check-label" htmlFor="newProjects">llow project viewers to view members' screenshots</label>
                            </div>
                            
                            
                    <div className="d-flex justify-content-end">

                            <button className="btn g-btn" onClick={handleSave}>Save Changes</button>
</div>
                        </div>
          </div>
          
          
      
        </div>
      </div>
      
    
    </div>
  );
};

export default ScreenshotSettings;