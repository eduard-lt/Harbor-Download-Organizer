import { useState, useEffect } from 'react';
import { ArrowRight, Check } from 'lucide-react';
import { setMonitoringCue } from '../lib/monitoringCue';
import { Dialog } from './Dialog';

interface TutorialModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function TutorialModal({ isOpen, onClose }: TutorialModalProps) {
  const [step, setStep] = useState(1);

  useEffect(() => {
    if (isOpen) setStep(1);
  }, [isOpen]);

  const handleFinish = () => {
    setMonitoringCue(true);
    onClose();
  };

  const steps = (
    <span className="steps" aria-label={`Step ${step} of 2`} role="img">
      <span data-on={step === 1 ? '' : undefined} /><span data-on={step === 2 ? '' : undefined} />
    </span>
  );

  return (
    <Dialog open={isOpen} title={step === 1 ? 'Welcome to Harbor' : 'Monitoring is off for now'}
      onClose={handleFinish} dismissible={false}
      footer={step === 1 ? (
        <>
          <span className="grow">{steps}</span>
          <button type="button" className="btn btn-primary" onClick={() => setStep(2)}>
            Next<ArrowRight size={14} aria-hidden="true" />
          </button>
        </>
      ) : (
        <>
          <span className="grow">{steps}</span>
          <button type="button" className="btn" onClick={() => setStep(1)}>Back</button>
          <button type="button" className="btn btn-primary" onClick={handleFinish}>
            <Check size={14} aria-hidden="true" />Got it
          </button>
        </>
      )}>
      <div className="dialog-body">
        {step === 1 ? (
          <>
            <p>Harbor moves new files out of your Downloads folder and into the folders you choose, using rules you can read and change.</p>
            <p style={{ marginTop: 10 }}>A starter set of rules is ready on the Rules page. Edit them, turn some off, or add your own.</p>
          </>
        ) : (
          <>
            <p>Nothing moves until you turn monitoring on, so you can check your rules first.</p>
            <p style={{ marginTop: 10 }}>When you’re ready, use the <strong style={{ color: 'var(--ink)' }}>Start monitoring</strong> button at the bottom of the sidebar. You can preview moves at any time; preview never moves files.</p>
          </>
        )}
      </div>
    </Dialog>
  );
}
