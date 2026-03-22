'use client';

import DumpMode from './DumpMode';

interface BrainDumpModalProps {
  userId: string;
  onClose: () => void;
  onTasksCreated: () => void;
}

export default function BrainDumpModal({ userId, onClose, onTasksCreated }: BrainDumpModalProps) {
  return (
    <DumpMode
      isOpen={true}
      userId={userId}
      onClose={onClose}
      onTasksCreated={onTasksCreated}
    />
  );
}
