'use client';

import { useState, useRef } from 'react';
import { submitFeedback, uploadFeedbackFile } from '@/lib/share';

interface ProfileEditModalProps {
  open: boolean;
  onClose: () => void;
  shareLinkId: string;
  talentId: string;
  talentName: string;
  currentProfile: Record<string, any> | null;
  onSuccess: () => void;
}

const FIELDS = [
  { key: 'age', label: '年齢', placeholder: '例: 32歳' },
  { key: 'birthplace', label: '出身地', placeholder: '例: 東京都' },
  { key: 'residence', label: '現住所', placeholder: '例: 神奈川県横浜市' },
  { key: 'company', label: '会社名', placeholder: '例: 株式会社○○' },
  { key: 'department', label: '部署', placeholder: '例: 経営企画部' },
  { key: 'position', label: '職種', placeholder: '例: マネージャー' },
  { key: 'education', label: '学歴', placeholder: '例: 早稲田大学 商学部' },
  { key: 'side_job_hours', label: '副業希望時間', placeholder: '例: 週10時間' },
  { key: 'side_job_remote', label: '副業リモート', placeholder: '例: フルリモート希望' },
  { key: 'hobbies', label: '趣味・特技', placeholder: '例: テニス、読書' },
  { key: 'mbti', label: 'MBTI', placeholder: '例: INTJ' },
];

export default function ProfileEditModal({
  open,
  onClose,
  shareLinkId,
  talentId,
  talentName,
  currentProfile,
  onSuccess,
}: ProfileEditModalProps) {
  const [values, setValues] = useState<Record<string, string>>(() => {
    const init: Record<string, string> = {};
    FIELDS.forEach((f) => {
      init[f.key] = (currentProfile?.[f.key] as string) || '';
    });
    return init;
  });
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(
    (currentProfile?.profile_photo as string) || null
  );
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  if (!open) return null;

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) return;
    if (file.size > 5 * 1024 * 1024) return;
    setPhotoFile(file);
    setPhotoPreview(URL.createObjectURL(file));
  };

  const handleSubmit = async () => {
    setSending(true);
    try {
      // Build profile update data
      const changes: Record<string, string> = {};
      let hasChanges = false;

      FIELDS.forEach((f) => {
        const newVal = values[f.key]?.trim() || '';
        const oldVal = ((currentProfile?.[f.key] as string) || '').trim();
        if (newVal !== oldVal && newVal) {
          changes[f.key] = newVal;
          hasChanges = true;
        }
      });

      let fileUrl: string | null = null;
      let fileName: string | null = null;
      let fileType: string | null = null;

      if (photoFile) {
        hasChanges = true;
        const uploaded = await uploadFeedbackFile(photoFile, talentId);
        if (uploaded) {
          fileUrl = uploaded.url;
          fileName = photoFile.name;
          fileType = photoFile.type;
          changes['profile_photo_url'] = uploaded.url;
        }
      }

      if (!hasChanges) {
        onClose();
        return;
      }

      await submitFeedback({
        shareLinkId,
        talentId,
        talentName,
        feedbackType: 'profile_update',
        sectionKey: 'プロフィール',
        content: JSON.stringify(changes, null, 2),
        fileUrl,
        fileName,
        fileType,
      });

      setSent(true);
      onSuccess();
      setTimeout(() => {
        setSent(false);
        onClose();
      }, 2000);
    } catch (err) {
      console.error('Profile update error:', err);
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="fixed inset-0 bg-black/40" />
      <div
        className="relative bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[85vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="sticky top-0 bg-white z-10 px-6 py-4 border-b border-gray-100 flex items-center justify-between">
          <div>
            <h3 className="text-[16px] font-semibold text-gray-900">プロフィールを編集</h3>
            <p className="text-[12px] text-gray-400 mt-0.5">変更はじんでんが確認後に反映します</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition p-1">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {sent ? (
          <div className="py-16 text-center">
            <div className="inline-flex items-center justify-center w-14 h-14 rounded-full mb-3" style={{ background: '#E8F5E9' }}>
              <svg className="w-7 h-7 check-anim" style={{ color: '#2E7D32' }} fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <p className="text-[15px] font-semibold text-gray-800">変更リクエストを送信しました</p>
            <p className="text-[13px] text-gray-500 mt-1">じんでんが確認後に反映します</p>
          </div>
        ) : (
          <div className="px-6 py-5 space-y-5">
            {/* Photo */}
            <div className="flex items-center gap-4">
              <div
                className="w-16 h-16 rounded-full bg-gray-100 border-2 border-gray-200 flex items-center justify-center overflow-hidden cursor-pointer hover:border-[#1565C0] transition"
                onClick={() => fileRef.current?.click()}
              >
                {photoPreview ? (
                  <img src={photoPreview} alt="" className="w-full h-full object-cover" />
                ) : (
                  <svg className="w-6 h-6 text-gray-300" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6.827 6.175A2.31 2.31 0 015.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 00-1.134-.175 2.31 2.31 0 01-1.64-1.055l-.822-1.316a2.192 2.192 0 00-1.736-1.039 48.774 48.774 0 00-5.232 0 2.192 2.192 0 00-1.736 1.039l-.821 1.316z" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 12.75a4.5 4.5 0 11-9 0 4.5 4.5 0 019 0z" />
                  </svg>
                )}
              </div>
              <div>
                <button
                  type="button"
                  onClick={() => fileRef.current?.click()}
                  className="text-[13px] text-[#1565C0] font-medium hover:underline"
                >
                  写真を変更
                </button>
                <p className="text-[11px] text-gray-400 mt-0.5">JPG, PNG（5MB以下）</p>
              </div>
              <input
                ref={fileRef}
                type="file"
                className="hidden"
                accept="image/jpeg,image/png"
                onChange={handlePhotoChange}
              />
            </div>

            {/* Fields */}
            {FIELDS.map((f) => (
              <div key={f.key}>
                <label className="block text-[12px] font-semibold text-gray-500 mb-1.5">{f.label}</label>
                <input
                  type="text"
                  value={values[f.key]}
                  onChange={(e) => setValues((prev) => ({ ...prev, [f.key]: e.target.value }))}
                  placeholder={f.placeholder}
                  className="w-full px-4 py-2.5 bg-white border border-gray-200 rounded-lg text-[14px] text-gray-800 placeholder:text-gray-300 focus:outline-none focus:border-[#1565C0] focus:ring-2 focus:ring-[#1565C0]/15 transition"
                />
              </div>
            ))}

            {/* Submit */}
            <button
              type="button"
              onClick={handleSubmit}
              disabled={sending}
              className="w-full py-3 rounded-xl text-[14px] font-semibold text-white transition-all disabled:opacity-50"
              style={{ background: sending ? '#9E9E9E' : '#1565C0' }}
            >
              {sending ? (
                <span className="inline-flex items-center gap-2">
                  <span className="w-4 h-4 border-2 rounded-full" style={{ borderColor: 'rgba(255,255,255,0.3)', borderTopColor: '#fff', animation: 'spin .6s linear infinite' }} />
                  送信中...
                </span>
              ) : (
                '変更をリクエスト'
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
