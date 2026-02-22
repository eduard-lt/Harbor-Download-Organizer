import { useState, useEffect } from 'react';

interface TutorialModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export function TutorialModal({ isOpen, onClose }: TutorialModalProps) {
    const [step, setStep] = useState(1);

    useEffect(() => {
        if (isOpen) {
            setStep(1);
        }
    }, [isOpen]);

    const handleFinish = () => {
        onClose();
        // Highlight the sidebar toggle briefly?
        const toggle = document.getElementById('sidebar-service-toggle');
        if (toggle) {
            toggle.classList.add('ring-4', 'ring-primary', 'ring-opacity-50', 'transition-all', 'duration-500');
            setTimeout(() => {
                toggle.classList.remove('ring-4', 'ring-primary', 'ring-opacity-50');
            }, 2000);
        }
    };


    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300">
            <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-lg border border-slate-200 dark:border-slate-800 overflow-hidden relative">

                {/* Background Decorations */}
                <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 pointer-events-none"></div>
                <div className="absolute bottom-0 left-0 w-48 h-48 bg-blue-500/5 rounded-full blur-3xl translate-y-1/2 -translate-x-1/2 pointer-events-none"></div>

                <div className="p-8 relative">
                    {step === 1 && (
                        <div className="space-y-6 animate-in slide-in-from-right-8 duration-300">
                            <div className="w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center mb-4">
                                <span className="material-icons-round text-3xl text-primary">auto_fix_high</span>
                            </div>
                            <div>
                                <h2 className="text-2xl font-bold text-slate-800 dark:text-white mb-2">Welcome to Harbor!</h2>
                                <p className="text-slate-600 dark:text-slate-300 leading-relaxed">
                                    Harbor keeps your desktop and downloads folder organized automatically.
                                    <br /><br />
                                    We've set up some default <strong>Rules</strong> for you to get started. You can customize them or add new ones right here.
                                </p>
                            </div>
                            <div className="pt-4 flex justify-end">
                                <button
                                    onClick={() => setStep(2)}
                                    className="px-6 py-3 bg-primary hover:bg-primary-dark text-white font-bold rounded-xl shadow-lg shadow-primary/20 transition-all flex items-center gap-2"
                                >
                                    Next
                                    <span className="material-icons-round">arrow_forward</span>
                                </button>
                            </div>
                        </div>
                    )}

                    {step === 2 && (
                        <div className="space-y-6 animate-in slide-in-from-right-8 duration-300">
                            <div className="w-16 h-16 bg-emerald-500/10 rounded-2xl flex items-center justify-center mb-4">
                                <span className="material-icons-round text-3xl text-emerald-500">power_settings_new</span>
                            </div>
                            <div>
                                <h2 className="text-2xl font-bold text-slate-800 dark:text-white mb-2">Ready to Launch?</h2>
                                <p className="text-slate-600 dark:text-slate-300 leading-relaxed">
                                    The background service is currently <strong className="text-slate-800 dark:text-white">Stopped</strong> so you can review your rules first.
                                    <br /><br />
                                    When you're ready, simply flip the switch in the sidebar to start organizing!
                                </p>
                            </div>

                            <div className="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-xl border border-slate-100 dark:border-slate-800 flex items-center gap-4">
                                <span className="material-icons-round text-slate-400">info</span>
                                <p className="text-xs text-slate-500 dark:text-slate-400">
                                    You can find the toggle button at the bottom of the sidebar on the left.
                                </p>
                            </div>

                            <div className="pt-4 flex justify-between items-center">
                                <button
                                    onClick={() => setStep(1)}
                                    className="text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 font-medium transition-colors"
                                >
                                    Back
                                </button>
                                <button
                                    onClick={handleFinish}
                                    className="px-6 py-3 bg-emerald-500 hover:bg-emerald-600 text-white font-bold rounded-xl shadow-lg shadow-emerald-500/20 transition-all flex items-center gap-2"
                                >
                                    Got it!
                                    <span className="material-icons-round">check</span>
                                </button>
                            </div>
                        </div>
                    )}
                </div>

                {/* Progress Dots */}
                <div className="absolute bottom-6 left-0 right-0 flex justify-center gap-2">
                    <div className={`w-2 h-2 rounded-full transition-all ${step === 1 ? 'bg-primary w-4' : 'bg-slate-200 dark:bg-slate-700'}`}></div>
                    <div className={`w-2 h-2 rounded-full transition-all ${step === 2 ? 'bg-primary w-4' : 'bg-slate-200 dark:bg-slate-700'}`}></div>
                </div>

            </div>
        </div>
    );
}
