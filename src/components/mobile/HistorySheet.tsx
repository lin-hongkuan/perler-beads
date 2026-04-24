import React from 'react';
import HistoryTimeline from '../history/HistoryTimeline';
import { HistoryState } from '../../types/history';

interface HistorySheetProps {
  history: HistoryState;
  onUndo: () => void;
  onRedo: () => void;
}

const HistorySheet: React.FC<HistorySheetProps> = ({ history, onUndo, onRedo }) => {
  return <HistoryTimeline history={history} onUndo={onUndo} onRedo={onRedo} />;
};

export default HistorySheet;
