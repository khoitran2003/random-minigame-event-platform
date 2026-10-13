import React, { useRef } from 'react';
import { Image as ImageIcon } from 'lucide-react';
import { EventConfig } from '../types';
import { useLanguage } from '../LanguageContext';
import { useTheme } from '../ThemeContext';

// Average perceived brightness (0-1) of an image, composited over a fallback color
// so transparent PNGs are judged by what actually shows on screen.
const measureLuminance = (src: string, fallbackColor: string): Promise<number | null> =>
  new Promise(resolve => {
    const img = new Image();
    img.onload = () => {
      try {
        const size = 64;
        const canvas = document.createElement('canvas');
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext('2d');
        if (!ctx) return resolve(null);
        ctx.fillStyle = fallbackColor;
        ctx.fillRect(0, 0, size, size);
        ctx.drawImage(img, 0, 0, size, size);
        const { data } = ctx.getImageData(0, 0, size, size);
        let sum = 0;
        for (let i = 0; i < data.length; i += 4) {
          sum += 0.2126 * data[i] + 0.7152 * data[i + 1] + 0.0722 * data[i + 2];
        }
        resolve(sum / (data.length / 4) / 255);
      } catch {
        resolve(null); // tainted canvas (cross-origin URL)
      }
    };
    img.onerror = () => resolve(null);
    img.src = src;
  });

const LIGHT_BG_THRESHOLD = 0.6;

interface Props {
  config: EventConfig;
  onUpdate: (config: Partial<EventConfig>) => void;
}

export default function BackgroundSettings({ config, onUpdate }: Props) {
  const { t } = useLanguage();
  const { setTheme } = useTheme();
  const bgFileInputRef = useRef<HTMLInputElement>(null);

  const handleBgFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      if (e.target?.result) {
        const dataUrl = e.target.result as string;
        onUpdate({ backgroundUrl: dataUrl });
        measureLuminance(dataUrl, config.backgroundColor).then(lum => {
          if (lum !== null) setTheme(lum > LIGHT_BG_THRESHOLD ? 'light' : 'dark');
        });
      }
    };
    reader.readAsDataURL(file);
  };

  return (
    <div className="flex flex-col gap-2">
      <label className="flex items-center gap-2 text-[14px] font-medium text-white">
        <ImageIcon className="w-4 h-4" /> {t('config.backgroundStyling')}
      </label>
      <div className="flex flex-col gap-4">
        <div className="flex flex-col sm:flex-row gap-4">
          <input
            type="file"
            accept="image/*"
            ref={bgFileInputRef}
            onChange={handleBgFileUpload}
            className="hidden"
          />
          <div className="flex-1 flex gap-2">
            <button
              onClick={() => bgFileInputRef.current?.click()}
              className="bg-white/10 text-white text-[14px] px-4 py-3 rounded-xl border border-white/20 hover:bg-white/15 transition-all h-[50px] whitespace-nowrap"
            >
              {t('config.uploadImage')}
            </button>
            <input
              type="text"
              value={config.backgroundUrl}
              onChange={(e) => onUpdate({ backgroundUrl: e.target.value })}
              placeholder={t('config.orImageUrl')}
              className="flex-1 bg-black/30 text-white text-[14px] px-4 py-3 rounded-xl border border-white/20 focus:outline-none focus:border-white/40 focus:ring-3 focus:ring-[#1E90FF]/20 transition-all h-[50px] placeholder:text-white/50"
            />
          </div>
          <div className="flex items-center gap-3">
            <span className="text-[14px] text-white/80 shrink-0">{t('config.orColor')}</span>
            <input
              type="color"
              value={config.backgroundColor}
              onChange={(e) => onUpdate({ backgroundColor: e.target.value })}
              className="w-12 h-[50px] bg-black/30 rounded-xl border border-white/20 cursor-pointer p-1"
            />
          </div>
        </div>

        {/* Blur Slider */}
        <div className="flex flex-col gap-3 bg-black/20 p-4 rounded-xl border border-white/10">
          <div className="flex items-center gap-4">
            <span className="text-[14px] text-white/80 shrink-0 w-28">{t('config.blurAmount')}</span>
            <input
              type="range"
              min="0"
              max="40"
              value={config.backgroundBlur}
              onChange={(e) => onUpdate({ backgroundBlur: parseInt(e.target.value) })}
              className="flex-1 accent-[#1E90FF] cursor-pointer"
            />
            <span className="text-[14px] text-white/80 w-8 text-right">{config.backgroundBlur}px</span>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-[14px] text-white/80 shrink-0 w-28">{t('config.darkenOverlay')}</span>
            <input
              type="range"
              min="0"
              max="100"
              value={config.backgroundOverlayOpacity}
              onChange={(e) => onUpdate({ backgroundOverlayOpacity: parseInt(e.target.value) })}
              className="flex-1 accent-[#1E90FF] cursor-pointer"
            />
            <span className="text-[14px] text-white/80 w-8 text-right">{config.backgroundOverlayOpacity}%</span>
          </div>
        </div>
      </div>
    </div>
  );
}
