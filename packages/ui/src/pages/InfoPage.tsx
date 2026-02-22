import { open } from '@tauri-apps/plugin-shell';
import { Header } from '../components/Header';
import { useState } from 'react';
import { useUpdateCheck } from '../hooks/useUpdateCheck';

// ... inside component ...

<div className="flex justify-center gap-4">
    <button
        onClick={() => open('https://github.com/eduard-lt/Harbor-Download-Organizer')}
        className="flex items-center gap-2 px-6 py-3 bg-slate-900 text-white rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
    >
        <span className="material-icons-round text-lg">code</span>
        GitHub
    </button>
    <button
        onClick={() => open('https://ko-fi.com/eduardolteanu')}
        className="flex items-center gap-2 px-6 py-3 bg-[#FF5E5B] text-white rounded-lg hover:bg-[#ff4f4c] transition-colors cursor-pointer"
    >
        <span className="material-icons-round text-lg">favorite</span>
        Support
    </button>
</div>

export function InfoPage() {
    const { updateState } = useUpdateCheck();
    const { available, version, url } = updateState;
    const [activeTab, setActiveTab] = useState<'guide' | 'about'>('guide');

    return (
        <>
            <Header title="Info & Guide" subtitle="Learn how to get the most out of Harbor." />

            <div className="p-12 max-w-4xl mx-auto w-full overflow-y-auto custom-scrollbar">
                {/* Update Banner */}
                {available && url && (
                    <div className="mb-8 p-4 bg-primary/10 border border-primary/20 rounded-xl flex items-center justify-between animate-in fade-in slide-in-from-top-4">
                        <div className="flex items-center gap-4">
                            <span className="material-icons-round text-primary text-2xl">new_releases</span>
                            <div>
                                <h3 className="font-bold text-slate-800 dark:text-white">Update Available!</h3>
                                <p className="text-sm text-slate-600 dark:text-slate-400">Version {version} is ready to download.</p>
                            </div>
                        </div>
                        <button
                            onClick={() => open(url)}
                            className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors text-sm font-medium flex items-center gap-2"
                        >
                            <span className="material-icons-round text-sm">open_in_new</span>
                            Download
                        </button>
                    </div>
                )}

                {/* Tabs */}
                <div className="flex space-x-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl mb-8 w-fit">
                    <button
                        onClick={() => setActiveTab('guide')}
                        className={`px-6 py-2 rounded-lg text-sm font-semibold transition-all ${activeTab === 'guide'
                            ? 'bg-white dark:bg-slate-700 text-primary shadow-sm'
                            : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
                            }`}
                    >
                        User Guide
                    </button>
                    <button
                        onClick={() => setActiveTab('about')}
                        className={`px-6 py-2 rounded-lg text-sm font-semibold transition-all ${activeTab === 'about'
                            ? 'bg-white dark:bg-slate-700 text-primary shadow-sm'
                            : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
                            }`}
                    >
                        About
                    </button>
                </div>

                {activeTab === 'guide' && (
                    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                        <section>
                            <h2 className="text-2xl font-bold text-slate-800 dark:text-white mb-4">How it Works</h2>
                            <p className="text-slate-600 dark:text-slate-400 leading-relaxed mb-6">
                                Harbor watches your <strong>Downloads</strong> folder in the background. When a new file arrives, it checks your <strong>Rules</strong> to decide where to move it.
                            </p>

                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                <div className="bg-white dark:bg-slate-900 p-6 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
                                    <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-lg flex items-center justify-center mb-4">
                                        <span className="material-icons-round">download</span>
                                    </div>
                                    <h3 className="font-bold text-slate-800 dark:text-white mb-2">1. Download</h3>
                                    <p className="text-sm text-slate-500">You save a file to your Downloads folder as usual.</p>
                                </div>
                                <div className="bg-white dark:bg-slate-900 p-6 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
                                    <div className="w-10 h-10 bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 rounded-lg flex items-center justify-center mb-4">
                                        <span className="material-icons-round">rule</span>
                                    </div>
                                    <h3 className="font-bold text-slate-800 dark:text-white mb-2">2. Match</h3>
                                    <p className="text-sm text-slate-500">Harbor checks the file extension against your Rules.</p>
                                </div>
                                <div className="bg-white dark:bg-slate-900 p-6 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
                                    <div className="w-10 h-10 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 rounded-lg flex items-center justify-center mb-4">
                                        <span className="material-icons-round">folder_open</span>
                                    </div>
                                    <h3 className="font-bold text-slate-800 dark:text-white mb-2">3. Organize</h3>
                                    <p className="text-sm text-slate-500">The file is instantly moved to the correct folder.</p>
                                </div>
                            </div>
                        </section>

                        <section>
                            <h2 className="text-xl font-bold text-slate-800 dark:text-white mb-4">Managing Rules</h2>
                            <ul className="space-y-3">
                                <li className="flex gap-4 items-start">
                                    <span className="material-icons-round text-primary mt-0.5">check_circle</span>
                                    <div>
                                        <strong className="block text-slate-800 dark:text-white">File Extensions</strong>
                                        <p className="text-sm text-slate-500">Group files by type (e.g., <code className="bg-slate-100 dark:bg-slate-800 px-1 rounded">jpg, png</code> for Images).</p>
                                    </div>
                                </li>
                                <li className="flex gap-4 items-start">
                                    <span className="material-icons-round text-primary mt-0.5">check_circle</span>
                                    <div>
                                        <strong className="block text-slate-800 dark:text-white">Destination</strong>
                                        <p className="text-sm text-slate-500">Choose any folder on your computer as the target.</p>
                                    </div>
                                </li>
                                <li className="flex gap-4 items-start">
                                    <span className="material-icons-round text-primary mt-0.5">check_circle</span>
                                    <div>
                                        <strong className="block text-slate-800 dark:text-white">Regex Patterns</strong>
                                        <p className="text-sm text-slate-500">Advanced users can match filenames using Regular Expressions.</p>
                                    </div>
                                </li>
                            </ul>
                        </section>
                    </div>
                )}

                {activeTab === 'about' && (
                    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 text-center py-12">
                        <img src="/harbor.svg" alt="Logo" className="w-24 h-24 mx-auto mb-6" />
                        <h2 className="text-3xl font-bold text-slate-800 dark:text-white mb-2">Harbor</h2>
                        <p className="text-slate-500 mb-8">Version 1.0.0</p>

                        <p className="max-w-lg mx-auto text-slate-600 dark:text-slate-400 mb-8">
                            Harbor is a free, open-source utility designed to keep your digital life organized.
                            It was built with performance and simplicity in mind.
                        </p>

                        <div className="flex justify-center gap-4">
                            <a href="https://github.com/eduard-lt/Harbor-Download-Organizer" target="_blank" rel="noreferrer" className="flex items-center gap-2 px-6 py-3 bg-slate-900 text-white rounded-lg hover:bg-slate-800 transition-colors">
                                <span className="material-icons-round text-lg">code</span>
                                GitHub
                            </a>
                            <a href="https://ko-fi.com/eduardolteanu" target="_blank" rel="noreferrer" className="flex items-center gap-2 px-6 py-3 bg-[#FF5E5B] text-white rounded-lg hover:bg-[#ff4f4c] transition-colors">
                                <span className="material-icons-round text-lg">favorite</span>
                                Support
                            </a>
                        </div>
                    </div>
                )}
            </div>
        </>
    );
}
