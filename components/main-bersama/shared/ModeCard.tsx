"use client";

import { ArrowRight, Check, Flag, Sparkles, Trophy, Users } from 'lucide-react';
import type { GameMode } from '@/src/main-bersama/domain/types/session';
import styles from './mode-card.module.css';

interface ModeCardProps {
  mode: GameMode;
  selected: boolean;
  onSelect: () => void;
}

/** A full illustration above a readable description; selection uses the existing handler. */
export function ModeCard({ mode, selected, onSelect }: ModeCardProps) {
  const isJelajah = mode === 'jelajah-kata';

  return (
    <button
      type="button"
      aria-pressed={selected}
      onClick={onSelect}
      className={`${styles.card} ${isJelajah ? styles.jelajah : styles.kota}`}
    >
      <span className={styles.art} aria-hidden>
        <span className={styles.badge}>
          {isJelajah ? <Trophy size={12} /> : <Sparkles size={12} />}
          {isJelajah ? 'Kompetisi regu' : 'Kolaborasi kelas'}
        </span>
        <span className={styles.selection}>
          {selected ? <Check size={14} /> : null}
        </span>
      </span>
      <span className={styles.body}>
        <span className={styles.title}>{isJelajah ? 'Jelajah Kata' : 'Kota Cahaya'}</span>
        <span className={styles.description}>
          {isJelajah
            ? 'Ajak regumu berpetualang! Maju bersama lewat setiap jawaban yang tepat.'
            : 'Satu kelas, satu misi. Nyalakan kota dengan kekuatan jawaban bersama.'}
        </span>
        <span className={styles.features}>
          <span><Users size={12} aria-hidden />{isJelajah ? '2–6 regu' : 'Satu kelas'}</span>
          <span>{isJelajah ? <Flag size={12} aria-hidden /> : <Sparkles size={12} aria-hidden />}{isJelajah ? 'Berlomba' : 'Bekerja sama'}</span>
        </span>
        <span className={styles.footer}>
          <span>{selected ? <><Check size={13} aria-hidden />Mode terpilih</> : 'Pilih petualangan ini'}</span>
          <ArrowRight size={15} aria-hidden />
        </span>
      </span>
    </button>
  );
}
