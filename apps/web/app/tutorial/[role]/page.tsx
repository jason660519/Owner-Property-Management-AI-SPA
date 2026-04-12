'use client';

import { notFound } from 'next/navigation';
import { use } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { Button } from '@/components/ui/Button';
import {
  TUTORIAL_DATA,
  TUTORIAL_ROLES,
  type TutorialRole,
  type TutorialStep,
} from '@/lib/tutorial-data';
import { useTutorialProgress } from '@/hooks/useTutorialProgress';

interface PageProps {
  params: Promise<{ role: string }>;
}

function isValidRole(role: string): role is TutorialRole {
  return (TUTORIAL_ROLES as string[]).includes(role);
}

function StepCard({
  step,
  index,
  isComplete,
  onMarkComplete,
}: {
  step: TutorialStep;
  index: number;
  isComplete: boolean;
  onMarkComplete: (stepId: string) => void;
}) {
  return (
    <article
      className={`rounded-2xl border p-6 transition-colors ${
        isComplete
          ? 'border-accent bg-bg-secondary opacity-90'
          : 'border-border-default bg-bg-secondary'
      }`}
      aria-label={`步驟 ${index + 1}：${step.title}`}
    >
      {/* Step header */}
      <div className="flex items-center gap-3 mb-4">
        <span
          className={`flex-shrink-0 w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold ${
            isComplete ? 'bg-accent text-white' : 'bg-bg-primary border border-border-default text-text-secondary'
          }`}
          aria-label={isComplete ? '已完成' : `步驟 ${index + 1}`}
        >
          {isComplete ? '✓' : index + 1}
        </span>
        <h2 className="text-lg font-semibold text-text-primary">{step.title}</h2>
      </div>

      {/* Description */}
      <p className="text-text-secondary mb-5">{step.description}</p>

      {/* Media */}
      {step.mediaType === 'screenshot' && step.mediaSrc && (
        <div className="mb-5 rounded-lg overflow-hidden border border-border-default">
          <Image
            src={step.mediaSrc}
            alt={step.mediaAlt ?? step.title}
            width={800}
            height={450}
            className="w-full object-cover"
            unoptimized
          />
        </div>
      )}

      {/* Actions row */}
      <div className="flex flex-wrap gap-3 items-center">
        {step.featureLink && (
          <Link
            href={step.featureLink}
            className="text-sm font-medium text-accent underline underline-offset-2 hover:no-underline"
          >
            {step.featureLinkLabel ?? '體驗功能'}
          </Link>
        )}
        {!isComplete && (
          <Button
            variant="primary"
            onClick={() => onMarkComplete(step.id)}
            aria-label={`標記步驟 ${index + 1} 已完成`}
          >
            標記為已完成
          </Button>
        )}
        {isComplete && (
          <span className="text-sm font-medium text-accent">✓ 已完成</span>
        )}
      </div>
    </article>
  );
}

export default function TutorialRolePage({ params }: PageProps) {
  const { role } = use(params);

  if (!isValidRole(role)) notFound();

  const config = TUTORIAL_DATA[role];
  const { markStepComplete, isStepComplete, completionPercent, isAllComplete } =
    useTutorialProgress(role);

  const percent = completionPercent();

  return (
    <>
      <Header />
      <main className="min-h-screen bg-bg-primary py-12 px-4">
        <div className="max-w-3xl mx-auto">
          {/* Back link */}
          <Link
            href="/tutorial"
            className="inline-flex items-center gap-1 text-sm text-text-secondary hover:text-text-primary mb-8"
          >
            ← 返回角色選擇
          </Link>

          {/* Hero */}
          <header className="mb-10">
            <div className="flex items-center gap-3 mb-3">
              <span className="text-4xl" aria-hidden="true">
                {config.icon}
              </span>
              <h1 className="text-3xl font-bold text-text-primary">{config.label}教學</h1>
            </div>
            <p className="text-text-secondary">{config.description}</p>
          </header>

          {/* Progress bar */}
          <section aria-label="教學完成進度" className="mb-10">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-text-secondary">
                已完成 {Math.round((percent / 100) * config.steps.length)} / {config.steps.length} 步驟
              </span>
              <span className="text-sm font-semibold text-text-primary">{percent}%</span>
            </div>
            <div
              className="h-2 rounded-full bg-bg-primary border border-border-default overflow-hidden"
              role="progressbar"
              aria-valuenow={percent}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-label={`教學進度 ${percent}%`}
            >
              <div
                className="h-full bg-accent transition-all duration-500"
                style={{ width: `${percent}%` }}
              />
            </div>
          </section>

          {/* Completion badge */}
          {isAllComplete && (
            <div
              role="status"
              aria-live="polite"
              className="mb-10 rounded-2xl border border-accent bg-bg-secondary p-6 flex items-center gap-4"
            >
              <span className="text-4xl" aria-hidden="true">🏅</span>
              <div>
                <p className="text-lg font-bold text-text-primary">恭喜完成所有教學步驟！</p>
                <p className="text-sm text-text-secondary">
                  你已解鎖 <strong>{config.label}完成徽章</strong>。歡迎繼續探索其他角色的教學。
                </p>
              </div>
            </div>
          )}

          {/* Steps */}
          <section aria-label="教學步驟" className="space-y-6">
            {config.steps.map((step, index) => (
              <StepCard
                key={step.id}
                step={step}
                index={index}
                isComplete={isStepComplete(step.id)}
                onMarkComplete={markStepComplete}
              />
            ))}
          </section>

          {/* CTA after all steps */}
          <div className="mt-12 text-center">
            <p className="text-text-secondary mb-4">想了解其他角色的功能？</p>
            <Link href="/tutorial">
              <Button variant="secondary">瀏覽其他角色教學</Button>
            </Link>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
