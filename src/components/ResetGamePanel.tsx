import React, { useState } from 'react';
import { Character, Resources } from '../types';
import { RotateCcw, AlertTriangle, ShieldAlert, Check, X, Trash2, RefreshCw } from 'lucide-react';
import { sound } from '../audio';

interface ResetGamePanelProps {
  character: Character;
  resources: Resources;
  inventoryCount: number;
  onResetGame: () => void;
}

export const ResetGamePanel: React.FC<ResetGamePanelProps> = ({
  character,
  resources,
  inventoryCount,
  onResetGame,
}) => {
  const [showConfirmation, setShowConfirmation] = useState<boolean>(false);
  const [confirmText, setConfirmText] = useState<string>('');
  const [resetDoneNotice, setResetDoneNotice] = useState<boolean>(false);

  const handleConfirmReset = () => {
    sound.playClick();
    onResetGame();
    setShowConfirmation(false);
    setConfirmText('');
    setResetDoneNotice(true);
    setTimeout(() => setResetDoneNotice(false), 4000);
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 sm:p-6 space-y-6 select-none max-w-4xl mx-auto">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-slate-800 pb-5">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-rose-500/20 border border-rose-500/40 text-rose-400 rounded-2xl">
            <RotateCcw className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-xl font-black text-slate-100 flex items-center gap-2">
              Reset Game Progress
              <span className="text-xs font-mono font-bold bg-rose-950/80 text-rose-400 px-2 py-0.5 rounded-full border border-rose-800">
                DANGER ZONE
              </span>
            </h2>
            <p className="text-xs text-slate-400 mt-1">
              Сброс игрового прогресса до начального состояния (Уровень 1, стартовые ресурсы)
            </p>
          </div>
        </div>
      </div>

      {resetDoneNotice && (
        <div className="p-4 bg-emerald-950/80 border border-emerald-500/50 rounded-xl text-emerald-300 text-xs font-bold flex items-center gap-2 animate-bounce">
          <Check className="w-5 h-5 text-emerald-400" />
          <span>Игра успешно сброшена до начального состояния!</span>
        </div>
      )}

      {/* Progress Summary Card */}
      <div className="bg-slate-950 p-5 rounded-2xl border border-slate-800/80 space-y-4">
        <h3 className="text-sm font-black text-slate-200 flex items-center gap-2">
          <ShieldAlert className="w-4 h-4 text-amber-400" />
          <span>Текущий прогресс, который будет сброшен:</span>
        </h3>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs font-mono">
          <div className="bg-slate-900 p-3 rounded-xl border border-slate-800">
            <span className="text-slate-500 block text-[10px] uppercase font-sans">Герой</span>
            <span className="text-amber-400 font-bold text-sm">Lvl {character.level}</span>
          </div>
          <div className="bg-slate-900 p-3 rounded-xl border border-slate-800">
            <span className="text-slate-500 block text-[10px] uppercase font-sans">Золото</span>
            <span className="text-amber-300 font-bold text-sm">{resources.gold.toLocaleString()}</span>
          </div>
          <div className="bg-slate-900 p-3 rounded-xl border border-slate-800">
            <span className="text-slate-500 block text-[10px] uppercase font-sans">Гемы</span>
            <span className="text-cyan-400 font-bold text-sm">{resources.gems.toLocaleString()}</span>
          </div>
          <div className="bg-slate-900 p-3 rounded-xl border border-slate-800">
            <span className="text-slate-500 block text-[10px] uppercase font-sans">Инвентарь</span>
            <span className="text-purple-400 font-bold text-sm">{inventoryCount} предметов</span>
          </div>
        </div>

        <div className="p-3 bg-amber-950/40 border border-amber-500/30 rounded-xl text-amber-300 text-xs flex items-start gap-2 leading-relaxed">
          <AlertTriangle className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
          <span>
            При сбросе будут полностью очищены сохранённые ресурсы, статистика, достижения, ферма, уровень героя и инвентарь в локальном хранилище (LocalStorage).
          </span>
        </div>
      </div>

      {/* Reset Action Area */}
      {!showConfirmation ? (
        <div className="pt-2">
          <button
            onClick={() => {
              sound.playClick();
              setShowConfirmation(true);
            }}
            className="w-full py-4 bg-gradient-to-r from-rose-600 via-red-600 to-rose-700 hover:from-rose-500 hover:to-red-500 text-white font-black text-sm rounded-xl shadow-xl shadow-rose-950/50 transition-all flex items-center justify-center gap-2 hover:scale-[1.01] active:scale-[0.99]"
          >
            <Trash2 className="w-5 h-5" />
            <span>СБРОСИТЬ ВЕСЬ ПРОГРЕСС ИГРЫ (RESET GAME)</span>
          </button>
        </div>
      ) : (
        /* Confirmation Modal / Box */
        <div className="p-5 bg-rose-950/40 border-2 border-rose-500/80 rounded-2xl space-y-4 animate-in fade-in zoom-in duration-200">
          <div className="flex items-center gap-3 text-rose-300">
            <AlertTriangle className="w-6 h-6 text-rose-400 animate-pulse flex-shrink-0" />
            <div>
              <h4 className="text-sm font-black text-rose-200 uppercase">
                Вы уверены? Это действие нельзя отменить!
              </h4>
              <p className="text-xs text-rose-300/80 mt-0.5">
                Для подтверждения сброса нажмите кнопку подтверждения ниже.
              </p>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-center gap-3 pt-2">
            <button
              onClick={handleConfirmReset}
              className="w-full sm:w-auto flex-1 py-3 px-6 bg-rose-600 hover:bg-rose-500 text-white font-black text-xs rounded-xl shadow-lg transition-all flex items-center justify-center gap-2 active:scale-95"
            >
              <Check className="w-4 h-4" />
              <span>ДА, Я УВЕРЕН — СБРОСИТЬ ВСЁ</span>
            </button>

            <button
              onClick={() => {
                sound.playClick();
                setShowConfirmation(false);
              }}
              className="w-full sm:w-auto py-3 px-6 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs rounded-xl transition-all flex items-center justify-center gap-2"
            >
              <X className="w-4 h-4" />
              <span>ОТМЕНА</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
