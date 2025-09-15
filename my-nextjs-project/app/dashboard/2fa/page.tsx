'use client';
import { useState } from 'react';
import { Modal, Button, Form } from 'react-bootstrap';
import 'primereact/resources/themes/lara-light-indigo/theme.css'; // theme
import 'primereact/resources/primereact.min.css'; // core css
import 'primeicons/primeicons.css'; // icons

const TwoFA = () => {
  const [showQRModal, setShowQRModal] = useState(false);
  const [showCodeModal, setShowCodeModal] = useState(false);
  const [code, setCode] = useState('');

  // Screenshot & permissions settings (as in your original code)
  const [selectedCount, setSelectedCount] = useState<number>(5); 
  const [screenshotMode, setScreenshotMode] = useState<string>('no-screenshot');
  const [settings, setSettings] = useState({
    allowManagerDeletion: false,
    allowEmployeeDeletion: false,
    allowEmployeeView: false,
    allowViewerView: false,
  });

  const handleSettingToggle = (setting: keyof typeof settings) => {
    setSettings(prev => ({ ...prev, [setting]: !prev[setting] }));
  };

  const handleSave = () => {
    console.log('Saved settings:', {
      screenshotCount: selectedCount,
      screenshotMode,
      ...settings
    });
    alert('Settings saved!');
  };

  const handleVerify = () => {
    console.log("Verifying code:", code);
    alert("2FA Verified!");
    setShowCodeModal(false);
  };

  return (
    <div className="container mt-4">
      <div className="cardWrapper">
        <div className="cardHeader d-flex justify-content-start align-items-center p-4">
          <h5 className="cardTitle text-white m-0">Security</h5>
        </div>
        <div className="switvh-btns-wrap p-4">
          <h5>Two-Factor Authentication (2FA)</h5>
          <button 
            className="btn mb-5" 
            style={{ border: "2px solid #9A4AFD", color: "#9A4AFD" }}
            onClick={() => setShowQRModal(true)}
          >
            Set up Authenticator
          </button>
          <div className="d-flex justify-content-end">
            <button className="btn g-btn" onClick={handleSave}>Save Changes</button>
          </div>
        </div>
      </div>

      {/* QR Code Modal */}
      <Modal show={showQRModal} onHide={() => setShowQRModal(false)} centered>
        <Modal.Header closeButton>
          <Modal.Title>Set Up</Modal.Title>
        </Modal.Header>
        <Modal.Body className="text-center">
          <p>• Scan the QR Code</p>
          <div className="d-flex justify-content-center">

          <img 
            src="/assets/images/Qr Code.png" 
            alt="QR Code" 
            style={{ width: '100px', height: '100px', marginBottom: '20px' }} 
          />
          </div>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowQRModal(false)}>
            Cancel
          </Button>
          <Button variant="primary" onClick={() => {
            setShowQRModal(false);
            setShowCodeModal(true);
          }}>
            Next
          </Button>
        </Modal.Footer>
      </Modal>

      {/* 6-digit Code Modal */}
      <Modal show={showCodeModal} onHide={() => setShowCodeModal(false)} centered>
        <Modal.Header closeButton>
          <Modal.Title>Set Up</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form.Group controlId="formCode">
            <Form.Label>Enter the 6-digit code</Form.Label>
            <Form.Control 
              type="text" 
              maxLength={6} 
              value={code} 
              onChange={(e) => setCode(e.target.value)} 
              placeholder="Enter Code" 
            />
          </Form.Group>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="light" onClick={() => {
            setShowCodeModal(false);
            setShowQRModal(true);
          }}>
            Back
          </Button>
          <Button variant="secondary" onClick={() => setShowCodeModal(false)}>
            Cancel
          </Button>
          <Button variant="primary" onClick={handleVerify}>
            Verify
          </Button>
        </Modal.Footer>
      </Modal>
    </div>
  );
};

export default TwoFA;
