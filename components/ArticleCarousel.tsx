'use client';

import { useEffect, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, ChevronRight, Newspaper } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { ArticleRecord } from '@/lib/articles';

type ArticleCarouselProps = {
  articles: ArticleRecord[];
};

export default function ArticleCarousel({ articles }: ArticleCarouselProps) {
  const [current, setCurrent] = useState(0);
  const [paused, setPaused] = useState(false);

  const total = articles.length;

  const next = useCallback(() => setCurrent(c => (c + 1) % total), [total]);
  const prev = useCallback(() => setCurrent(c => (c - 1 + total) % total), [total]);

  useEffect(() => {
    if (total <= 1 || paused) return;
    const id = window.setInterval(next, 6000);
    return () => window.clearInterval(id);
  }, [total, paused, next]);

  if (total === 0) return null;

  const article = articles[current]!;

  return (
    <section
      className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      <div className="flex items-center gap-3 mb-8">
        <Newspaper className="h-5 w-5 text-emerald-500" />
        <span className="text-xs font-bold uppercase tracking-[0.3em] text-emerald-500">Town Articles</span>
      </div>

      <div className="relative overflow-hidden rounded-3xl border border-white/5 bg-zinc-900/50">
        <AnimatePresence mode="wait">
          <motion.div
            key={article.id}
            initial={{ opacity: 0, x: 40 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -40 }}
            transition={{ duration: 0.35, ease: 'easeInOut' }}
            className="grid gap-0 lg:grid-cols-2"
          >
            {/* Image area */}
            <div className="relative min-h-[240px] lg:min-h-[360px] overflow-hidden bg-zinc-800">
              {article.images.length > 0 ? (
                <>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={article.images[0]!}
                    alt={article.title}
                    className="absolute inset-0 h-full w-full object-cover"
                  />
                  {article.images[1] && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={article.images[1]}
                      alt=""
                      className="absolute bottom-3 right-3 h-20 w-20 sm:h-28 sm:w-28 rounded-xl object-cover border-2 border-zinc-900 shadow-lg"
                    />
                  )}
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent to-zinc-900/60 lg:to-zinc-900/80" />
                </>
              ) : (
                <div className="absolute inset-0 flex items-center justify-center">
                  <Newspaper className="h-16 w-16 text-zinc-700" />
                </div>
              )}
            </div>

            {/* Content area */}
            <div className="flex flex-col justify-center p-8 lg:p-12">
              <div className="text-[10px] font-bold uppercase tracking-[0.3em] text-emerald-500 mb-3">
                {article.townName}
              </div>
              <h3 className="text-3xl font-bold text-white leading-tight">{article.title}</h3>
              <p className="mt-4 text-zinc-400 text-sm leading-relaxed line-clamp-4">{article.content}</p>
              <p className="mt-6 text-[10px] text-zinc-600 font-medium">
                {article.submittedByName}
              </p>
            </div>
          </motion.div>
        </AnimatePresence>

        {/* Controls */}
        {total > 1 && (
          <>
            <button
              onClick={prev}
              aria-label="Previous article"
              className="absolute left-3 top-1/2 -translate-y-1/2 flex h-9 w-9 items-center justify-center rounded-full bg-zinc-950/60 border border-white/10 text-white backdrop-blur transition hover:bg-zinc-800"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button
              onClick={next}
              aria-label="Next article"
              className="absolute right-3 top-1/2 -translate-y-1/2 flex h-9 w-9 items-center justify-center rounded-full bg-zinc-950/60 border border-white/10 text-white backdrop-blur transition hover:bg-zinc-800"
            >
              <ChevronRight className="h-4 w-4" />
            </button>

            {/* Dots */}
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-1.5">
              {articles.map((_, idx) => (
                <button
                  key={idx}
                  onClick={() => setCurrent(idx)}
                  aria-label={`Go to article ${idx + 1}`}
                  className={cn(
                    'h-1.5 rounded-full transition-all duration-400',
                    idx === current ? 'w-6 bg-emerald-500' : 'w-1.5 bg-white/20 hover:bg-white/40'
                  )}
                />
              ))}
            </div>
          </>
        )}
      </div>
    </section>
  );
}
