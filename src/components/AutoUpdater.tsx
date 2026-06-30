import React, { useEffect, useState } from 'react';
import { Filesystem, Directory } from '@capacitor/filesystem';
import { FileOpener } from '@capawesome-team/capacitor-file-opener';
import { Capacitor } from '@capacitor/core';
import { Download, AlertCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import packageJson from '../../package.json';

const UPDATE_URL = 'https://milk-master-app.web.app/update.json'; // This file needs to be hosted on your firebase hosting

export function AutoUpdater() {
  const [updateAvailable, setUpdateAvailable] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [updateInfo, setUpdateInfo] = useState<{ version: string; url: string; notes?: string } | null>(null);

  useEffect(() => {
    if (Capacitor.getPlatform() !== 'android') return;

    const checkForUpdate = async () => {
      try {
        const res = await fetch(UPDATE_URL + '?t=' + new Date().getTime());
        const data = await res.json();
        
        const currentVersion = packageJson.version;
        if (isNewerVersion(currentVersion, data.version)) {
          setUpdateInfo(data);
          setUpdateAvailable(true);
        }
      } catch (err) {
        console.log('Update check failed:', err);
      }
    };
    
    // Check after a short delay
    setTimeout(checkForUpdate, 3000);
  }, []);

  const isNewerVersion = (current: string, latest: string) => {
    const v1 = current.split('.').map(Number);
    const v2 = latest.split('.').map(Number);
    for (let i = 0; i < 3; i++) {
      if ((v2[i] || 0) > (v1[i] || 0)) return true;
      if ((v2[i] || 0) < (v1[i] || 0)) return false;
    }
    return false;
  };

  const handleUpdate = async () => {
    if (!updateInfo) return;
    setDownloading(true);
    setProgress(0);

    try {
      // Simulate progress since Capacitor core fetch doesn't support progress directly easily without plugins
      const progressInterval = setInterval(() => {
        setProgress(p => Math.min(p + 10, 95));
      }, 500);

      // Download file to cache directory
      const path = `update_${updateInfo.version}.apk`;
      
      const downloadResult = await Filesystem.downloadFile({
        url: updateInfo.url,
        path: path,
        directory: Directory.Cache,
      });

      clearInterval(progressInterval);
      setProgress(100);

      if (downloadResult.path) {
        await FileOpener.openFile({
          path: downloadResult.path,
        });
      } else {
        throw new Error("File path is null");
      }
      
      setUpdateAvailable(false);
    } catch (err: any) {
      console.error(err);
      toast.error('Failed to download update: ' + err.message);
    } finally {
      setDownloading(false);
    }
  };

  if (!updateAvailable) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white dark:bg-slate-800 rounded-2xl w-full max-w-sm shadow-2xl p-6 border border-slate-200 dark:border-slate-700 animate-in fade-in zoom-in duration-300">
        <div className="w-12 h-12 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center mx-auto mb-4">
          <Download className="w-6 h-6" />
        </div>
        
        <h3 className="text-xl font-bold text-center text-slate-900 dark:text-white mb-2">
          New Update Available
        </h3>
        
        <p className="text-center text-slate-500 dark:text-slate-400 mb-6 text-sm">
          Version {updateInfo?.version} is ready to install!
          {updateInfo?.notes && <span className="block mt-2 font-medium">{updateInfo.notes}</span>}
        </p>

        {downloading ? (
          <div className="space-y-3">
            <div className="w-full bg-slate-100 rounded-full h-3 overflow-hidden">
              <div 
                className="bg-blue-600 h-3 rounded-full transition-all duration-300 ease-out" 
                style={{ width: `${progress}%` }}
              ></div>
            </div>
            <p className="text-center text-xs text-slate-500 font-medium">Downloading... {progress}%</p>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            <button 
              onClick={handleUpdate}
              className="w-full bg-blue-600 text-white font-semibold py-3 px-4 rounded-xl hover:bg-blue-700 transition-colors flex items-center justify-center gap-2"
            >
              Update Now
            </button>
            <button 
              onClick={() => setUpdateAvailable(false)}
              className="w-full bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 font-semibold py-3 px-4 rounded-xl hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors"
            >
              Later
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
