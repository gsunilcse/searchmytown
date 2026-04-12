'use client';

import { useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ImagePlus, X, Send, Loader2, CheckCircle2 } from 'lucide-react';
import { cn } from '@/lib/utils';

type ArticleSubmitFormProps = {
  townId: string;
  townName: string;
  onSubmitted?: () => void;
};

type UploadedImage = {
  url: string;
  previewUrl: string;
};

async function uploadImage(file: File, townId: string): Promise<string> {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('townId', townId);
  const res = await fetch('/api/articles/upload', { method: 'POST', body: formData });
  const data = (await res.json()) as { url?: string; error?: string };
  if (!res.ok || !data.url) throw new Error(data.error ?? 'Upload failed.');
  return data.url;
}

async function submitArticle(townId: string, townName: string, title: string, content: string, images: string[]) {
  const res = await fetch('/api/articles', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ townId, townName, title, content, images }),
  });
  const data = (await res.json()) as { error?: string };
  if (!res.ok) throw new Error(data.error ?? 'Submission failed.');
}

export default function ArticleSubmitForm({ townId, townName, onSubmitted }: ArticleSubmitFormProps) {
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [images, setImages] = useState<UploadedImage[]>([]);
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const canAddMoreImages = images.length < 2;

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    if (files.length === 0) return;
    const remaining = 2 - images.length;
    const toUpload = files.slice(0, remaining);
    setUploading(true);
    setError(null);
    try {
      const uploaded = await Promise.all(
        toUpload.map(async (file) => {
          const previewUrl = URL.createObjectURL(file);
          const url = await uploadImage(file, townId);
          return { url, previewUrl };
        })
      );
      setImages((prev) => [...prev, ...uploaded].slice(0, 2));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Image upload failed.');
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  }

  function removeImage(index: number) {
    setImages((prev) => {
      const next = [...prev];
      const removed = next.splice(index, 1)[0];
      if (removed) URL.revokeObjectURL(removed.previewUrl);
      return next;
    });
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim() || !content.trim()) {
      setError('Title and content are required.');
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      await submitArticle(townId, townName, title.trim(), content.trim(), images.map((i) => i.url));
      setSuccess(true);
      setTitle('');
      setContent('');
      setImages([]);
      onSubmitted?.();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Submission failed.');
    } finally {
      setSubmitting(false);
    }
  }

  if (success) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="flex flex-col items-center gap-4 rounded-2xl border border-emerald-500/20 bg-emerald-500/5 p-10 text-center"
      >
        <CheckCircle2 className="h-12 w-12 text-emerald-500" />
        <h3 className="text-xl font-bold text-white">Article submitted for review</h3>
        <p className="text-sm text-zinc-400">A super admin will approve it. Once approved it will appear in the town carousel (max 5 active).</p>
        <button
          onClick={() => setSuccess(false)}
          className="mt-2 rounded-full border border-white/10 bg-white/5 px-6 py-2.5 text-sm font-medium text-white transition hover:bg-white/10"
        >
          Submit another
        </button>
      </motion.div>
    );
  }

  return (
    <form onSubmit={(e) => void handleSubmit(e)} className="space-y-6">
      {/* Title */}
      <div className="space-y-2">
        <label className="text-[10px] font-bold uppercase tracking-widest text-zinc-500">Article Title</label>
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          maxLength={120}
          required
          placeholder="Enter a clear, concise title..."
          className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white placeholder-zinc-600 outline-none transition focus:border-emerald-500/50 focus:bg-white/8"
        />
      </div>

      {/* Content */}
      <div className="space-y-2">
        <label className="text-[10px] font-bold uppercase tracking-widest text-zinc-500">Content</label>
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          maxLength={2000}
          required
          rows={5}
          placeholder="Write your article content here..."
          className="w-full resize-none rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white placeholder-zinc-600 outline-none transition focus:border-emerald-500/50"
        />
        <div className="text-right text-[10px] text-zinc-600">{content.length}/2000</div>
      </div>

      {/* Image Upload */}
      <div className="space-y-3">
        <label className="text-[10px] font-bold uppercase tracking-widest text-zinc-500">
          Images <span className="text-zinc-600">(max 2, JPEG/PNG/WebP, 5 MB each)</span>
        </label>

        <div className="flex flex-wrap gap-3">
          <AnimatePresence>
            {images.map((img, idx) => (
              <motion.div
                key={img.url}
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                className="relative h-24 w-24 overflow-hidden rounded-xl border border-white/10"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={img.previewUrl} alt={`Upload ${idx + 1}`} className="h-full w-full object-cover" />
                <button
                  type="button"
                  onClick={() => removeImage(idx)}
                  className="absolute right-1 top-1 flex h-5 w-5 items-center justify-center rounded-full bg-black/70 text-white transition hover:bg-red-500"
                >
                  <X className="h-3 w-3" />
                </button>
              </motion.div>
            ))}
          </AnimatePresence>

          {canAddMoreImages && (
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              className={cn(
                'flex h-24 w-24 flex-col items-center justify-center gap-1.5 rounded-xl border border-dashed border-white/20 text-zinc-500 transition hover:border-emerald-500/40 hover:text-emerald-400',
                uploading && 'cursor-wait opacity-60'
              )}
            >
              {uploading ? <Loader2 className="h-5 w-5 animate-spin" /> : <ImagePlus className="h-5 w-5" />}
              <span className="text-[10px] font-bold uppercase tracking-widest">
                {uploading ? 'Uploading…' : 'Add Image'}
              </span>
            </button>
          )}
        </div>

        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          multiple
          className="hidden"
          onChange={(e) => void handleFileChange(e)}
        />
      </div>

      {error && (
        <p className="rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-400">{error}</p>
      )}

      <button
        type="submit"
        disabled={submitting || uploading}
        className="flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-500 py-4 text-sm font-bold text-zinc-950 transition hover:bg-emerald-400 disabled:cursor-wait disabled:opacity-60"
      >
        {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
        {submitting ? 'Submitting…' : 'Submit for Review'}
      </button>
    </form>
  );
}
