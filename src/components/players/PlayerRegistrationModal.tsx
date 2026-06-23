import React, { useRef, useState, useEffect } from 'react';
import { Camera, Upload, X, Save } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import './PlayerRegistration.css';

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

const PlayerRegistrationModal: React.FC<Props> = ({ isOpen, onClose }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [photoData, setPhotoData] = useState<string | null>(null);
  const [cameraActive, setCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState(false);
  const [step, setStep] = useState(1); // 1: Info, 2: Photo, 3: Documents
  
  // Form State
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [notes, setNotes] = useState('');
  const [kycDocType, setKycDocType] = useState('Aadhaar Card');
  const [kycDocNumber, setKycDocNumber] = useState('');
  const [kycFile, setKycFile] = useState<File | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Clean up camera on close
  useEffect(() => {
    if (!isOpen && cameraActive) {
      stopCamera();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const startCamera = async () => {
    try {
      setCameraError(false);
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        setCameraActive(true);
      }
    } catch (err) {
      console.error("Error accessing camera:", err);
      setCameraError(true);
      // alert("Could not access camera. Please use HTTPS or check permissions.");
    }
  };

  const stopCamera = () => {
    if (videoRef.current && videoRef.current.srcObject) {
      const tracks = (videoRef.current.srcObject as MediaStream).getTracks();
      tracks.forEach(track => track.stop());
      setCameraActive(false);
    }
  };

  const capturePhoto = () => {
    if (videoRef.current && canvasRef.current) {
      const context = canvasRef.current.getContext('2d');
      if (context) {
        canvasRef.current.width = videoRef.current.videoWidth;
        canvasRef.current.height = videoRef.current.videoHeight;
        context.drawImage(videoRef.current, 0, 0);
        const dataUrl = canvasRef.current.toDataURL('image/png');
        setPhotoData(dataUrl);
        stopCamera();
      }
    }
  };

  const retakePhoto = () => {
    setPhotoData(null);
    if (!cameraError) {
      startCamera();
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        setPhotoData(e.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  // Helper to convert base64 data URL to Blob for Supabase Storage
  const dataURLtoBlob = (dataurl: string) => {
    const arr = dataurl.split(',');
    const mime = arr[0].match(/:(.*?);/)?.[1];
    const bstr = atob(arr[1]);
    let n = bstr.length;
    const u8arr = new Uint8Array(n);
    while (n--) {
      u8arr[n] = bstr.charCodeAt(n);
    }
    return new Blob([u8arr], { type: mime });
  };

  const handleComplete = async () => {
    if (!firstName || !lastName || !phone) {
      alert("Please fill out First Name, Last Name, and Phone Number.");
      return;
    }
    
    setIsSubmitting(true);
    let profileImageUrl = null;
    let kycStoragePath = null;

    try {
      // 1. Upload Profile Photo if captured
      if (photoData) {
        const fileExt = 'png';
        const fileName = `${Date.now()}_${firstName}_${lastName}.${fileExt}`;
        const filePath = `profiles/${fileName}`;
        const blob = dataURLtoBlob(photoData);

        const { error: uploadError } = await supabase.storage
          .from('player-profiles')
          .upload(filePath, blob, { contentType: 'image/png' });

        if (uploadError) throw new Error(`Profile upload failed: ${uploadError.message}`);
        
        // Get public URL
        const { data: publicUrlData } = supabase.storage.from('player-profiles').getPublicUrl(filePath);
        profileImageUrl = publicUrlData.publicUrl;
      }

      // 2. Upload KYC Document if selected
      if (kycFile) {
        const fileExt = kycFile.name.split('.').pop();
        const fileName = `${Date.now()}_kyc_${firstName}_${lastName}.${fileExt}`;
        const filePath = `documents/${fileName}`;

        const { error: kycUploadError } = await supabase.storage
          .from('kyc-documents')
          .upload(filePath, kycFile);

        if (kycUploadError) throw new Error(`KYC upload failed: ${kycUploadError.message}`);
        kycStoragePath = filePath;
      }

      // 3. Insert Player Record
      const { data: playerData, error: playerError } = await supabase.from('players').insert([{
        first_name: firstName,
        last_name: lastName,
        phone_number: phone,
        email: email || null,
        internal_notes: notes,
        profile_image_url: profileImageUrl,
        kyc_status: kycStoragePath ? 'Verified' : 'Pending'
      }]).select().single();

      if (playerError) throw new Error(`Player creation failed: ${playerError.message}`);

      // 4. Insert Document Record if uploaded
      if (kycStoragePath && playerData) {
        const { error: docError } = await supabase.from('player_documents').insert([{
          player_id: playerData.id,
          document_type: kycDocType.split(' ')[0], // 'Aadhaar Card' -> 'Aadhaar'
          document_number: kycDocNumber,
          storage_path: kycStoragePath
        }]);
        if (docError) throw new Error(`Document linking failed: ${docError.message}`);
      }

      // Reset and close
      setFirstName('');
      setLastName('');
      setPhone('');
      setEmail('');
      setNotes('');
      setPhotoData(null);
      setKycFile(null);
      setKycDocNumber('');
      setStep(1);
      onClose();

    } catch (err: any) {
      alert(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="modal-overlay animate-fade-in">
      <div className="modal-content animate-slide-up">
        <div className="modal-header">
          <h2>Register New Player</h2>
          <button className="icon-btn" onClick={onClose}><X size={20} /></button>
        </div>
        
        <div className="stepper">
          <div className={`step ${step >= 1 ? 'active' : ''}`}>1. Info</div>
          <div className={`step-line ${step >= 2 ? 'active' : ''}`}></div>
          <div className={`step ${step >= 2 ? 'active' : ''}`}>2. Photo</div>
          <div className={`step-line ${step >= 3 ? 'active' : ''}`}></div>
          <div className={`step ${step >= 3 ? 'active' : ''}`}>3. KYC Docs</div>
        </div>

        <div className="modal-body">
          {step === 1 && (
            <div className="form-grid">
              <div className="form-group">
                <label className="input-label">First Name *</label>
                <input type="text" className="input-field" placeholder="John" value={firstName} onChange={e => setFirstName(e.target.value)} />
              </div>
              <div className="form-group">
                <label className="input-label">Last Name *</label>
                <input type="text" className="input-field" placeholder="Doe" value={lastName} onChange={e => setLastName(e.target.value)} />
              </div>
              <div className="form-group">
                <label className="input-label">Phone Number *</label>
                <input type="tel" className="input-field" placeholder="+1 555-0000" value={phone} onChange={e => setPhone(e.target.value)} />
              </div>
              <div className="form-group">
                <label className="input-label">Email Address</label>
                <input type="email" className="input-field" placeholder="john@example.com" value={email} onChange={e => setEmail(e.target.value)} />
              </div>
              <div className="form-group" style={{ gridColumn: 'span 2' }}>
                <label className="input-label">Internal Notes</label>
                <textarea className="input-field" rows={3} placeholder="Notes..." value={notes} onChange={e => setNotes(e.target.value)}></textarea>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="camera-section">
              {!photoData ? (
                <>
                  {cameraError ? (
                    <div className="camera-placeholder" style={{ padding: '2rem', textAlign: 'center', backgroundColor: 'var(--bg-tertiary)', borderRadius: 'var(--radius-lg)' }}>
                      <Camera size={48} className="text-muted mb-2" />
                      <p className="mb-4" style={{ color: 'var(--accent-warning)' }}>Camera access denied or unavailable. Please upload a photo instead.</p>
                      <button className="btn-secondary" onClick={() => document.getElementById('profile-upload')?.click()}>
                        <Upload size={18} className="mr-2" /> Upload Photo
                      </button>
                      <input 
                        id="profile-upload" 
                        type="file" 
                        accept="image/*" 
                        style={{ display: 'none' }} 
                        onChange={handleFileUpload} 
                      />
                    </div>
                  ) : (
                    <>
                      <div className="video-container">
                        <video ref={videoRef} autoPlay playsInline className={cameraActive ? 'active' : 'hidden'}></video>
                        {!cameraActive && (
                          <div className="camera-placeholder">
                            <Camera size={48} className="text-muted" />
                            <p>Camera is inactive</p>
                          </div>
                        )}
                      </div>
                      <div className="camera-actions">
                        {!cameraActive ? (
                          <button className="btn-primary" onClick={startCamera}>Start Camera</button>
                        ) : (
                          <button className="btn-primary" onClick={capturePhoto}>Capture Photo</button>
                        )}
                      </div>
                    </>
                  )}
                </>
              ) : (
                <div className="photo-preview-container">
                  <img src={photoData} alt="Captured" className="photo-preview" />
                  <button className="btn-secondary mt-2" onClick={retakePhoto}>Retake Photo</button>
                </div>
              )}
              <canvas ref={canvasRef} style={{ display: 'none' }}></canvas>
            </div>
          )}

          {step === 3 && (
            <div className="docs-section">
              <div className="form-group">
                <label className="input-label">Document Type</label>
                <select className="input-field" value={kycDocType} onChange={e => setKycDocType(e.target.value)}>
                  <option>Aadhaar Card</option>
                  <option>PAN Card</option>
                  <option>Passport</option>
                  <option>Driving License</option>
                  <option>Other</option>
                </select>
              </div>
              <div className="form-group mt-2">
                <label className="input-label">Document Number</label>
                <input type="text" className="input-field" placeholder="e.g. 1234-5678-9012" value={kycDocNumber} onChange={e => setKycDocNumber(e.target.value)} />
              </div>
              
              <div className="upload-zone mt-4" onClick={() => document.getElementById('kyc-file-upload')?.click()}>
                <Upload size={32} className="text-primary mb-2" />
                <p>{kycFile ? kycFile.name : 'Drag & Drop or Click to Upload Document'}</p>
                <input 
                  id="kyc-file-upload"
                  type="file" 
                  className="file-input-hidden" 
                  accept="image/*,.pdf" 
                  onChange={(e) => {
                    if (e.target.files && e.target.files.length > 0) {
                      setKycFile(e.target.files[0]);
                    }
                  }}
                />
              </div>
              <p className="text-muted mt-2" style={{ fontSize: '0.8rem' }}>Documents are securely uploaded to 'kyc-documents' bucket. Max 5MB.</p>
            </div>
          )}
        </div>

        <div className="modal-footer">
          {step > 1 ? (
            <button className="btn-secondary" onClick={() => setStep(step - 1)}>Back</button>
          ) : (
            <button className="btn-secondary" onClick={onClose}>Cancel</button>
          )}

          {step < 3 ? (
            <button className="btn-primary" onClick={() => setStep(step + 1)}>Next step</button>
          ) : (
            <button className="btn-primary bg-success" onClick={handleComplete} disabled={isSubmitting}>
              <Save size={18} className="mr-1" />
              {isSubmitting ? 'Saving...' : 'Complete Registration'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default PlayerRegistrationModal;
